import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { clearBackups, grep, list, listBackups, rewrite, undo } from '../src/index';

const git = (cwd: string, ...args: string[]): string => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

const createRepo = (root: string): string => {
  const origin = path.join(root, 'origin.git');
  const repo = path.join(root, 'repo');
  git(root, 'init', '-q', '--bare', origin);
  git(root, 'init', '-q', '-b', 'main', repo);
  git(repo, 'config', 'user.name', 'Tal Hayut');
  git(repo, 'config', 'user.email', 'tal@moon.com');
  [1, 2, 3].forEach((index) => {
    writeFileSync(path.join(repo, `file${index}`), String(index));
    git(repo, 'add', '.');
    execFileSync('git', ['commit', '-q', '-m', `feat: Moon part ${index}`], {
      cwd: repo,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: `2021-01-0${index}T10:00:00+02:00`,
        GIT_COMMITTER_DATE: `2021-01-0${index}T10:00:00+02:00`,
      },
    });
  });
  git(repo, 'remote', 'add', 'origin', origin);
  git(repo, 'push', '-q', 'origin', 'main');
  git(repo, 'fetch', '-q');
  return repo;
};

const withRepo = (test: (repo: string) => Promise<void>) => async (): Promise<void> => {
  const root = mkdtempSync(path.join(tmpdir(), 'restory-test-'));
  await test(createRepo(root)).finally(() => rmSync(root, { recursive: true, force: true }));
};

describe('rewriting a repository', () => {
  it(
    'rewrites the selected commits in one pass and removes origin by default',
    withRepo(async (repo) => {
      const result = await rewrite({ cwd: repo, edits: [{ field: 'name', set: 'Jeb' }], select: { last: 2 } });
      assert.equal(result.changes.length, 2);
      assert.equal(Object.keys(result.rewritten).length, 2);
      assert.equal(git(repo, 'log', '--format=%an|%cn'), 'Jeb|Jeb\nJeb|Jeb\nTal Hayut|Tal Hayut');
      assert.match(result.removedOrigin?.url ?? '', /origin\.git$/);
      assert.equal(git(repo, 'remote'), '');
      assert.equal(git(repo, 'for-each-ref', 'refs/replace'), '');
    }),
  );

  it(
    'keeps origin when asked',
    withRepo(async (repo) => {
      const result = await rewrite({
        cwd: repo,
        edits: [{ field: 'message', replace: 'Moon', with: 'Mun' }],
        keepOrigin: true,
      });
      assert.equal(result.removedOrigin, undefined);
      assert.equal(git(repo, 'remote'), 'origin');
      assert.equal(git(repo, 'log', '--format=%s'), 'feat: Mun part 3\nfeat: Mun part 2\nfeat: Mun part 1');
    }),
  );

  it(
    'touches nothing on a dry run',
    withRepo(async (repo) => {
      const head = git(repo, 'rev-parse', 'HEAD');
      const result = await rewrite({ cwd: repo, edits: [{ field: 'email', set: 'x@y.z' }], dryRun: true });
      assert.equal(result.changes.length, 3);
      assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
      assert.equal(git(repo, 'remote'), 'origin');
    }),
  );

  it(
    'selects by sha and by pattern',
    withRepo(async (repo) => {
      const middle = git(repo, 'rev-parse', 'HEAD~1');
      await rewrite({
        cwd: repo,
        edits: [{ field: 'author.date', set: '2020-06-01T12:00:00+00:00' }],
        select: { shas: [middle.slice(0, 7)] },
        keepOrigin: true,
      });
      assert.equal(
        git(repo, 'log', '--format=%aI'),
        '2021-01-03T10:00:00+02:00\n2020-06-01T12:00:00Z\n2021-01-01T10:00:00+02:00',
      );
      await rewrite({
        cwd: repo,
        edits: [{ field: 'message', set: 'first' }],
        select: { match: { pattern: 'part 1$' } },
        keepOrigin: true,
      });
      assert.equal(git(repo, 'log', '--format=%s'), 'feat: Moon part 3\nfeat: Moon part 2\nfirst');
    }),
  );

  it(
    'refuses to rewrite a dirty working tree',
    withRepo(async (repo) => {
      writeFileSync(path.join(repo, 'file1'), 'dirty');
      await assert.rejects(rewrite({ cwd: repo, edits: [{ field: 'name', set: 'Jeb' }] }), /uncommitted changes/);
    }),
  );

  it(
    'undoes a rewrite and brings origin back',
    withRepo(async (repo) => {
      const head = git(repo, 'rev-parse', 'HEAD');
      await rewrite({ cwd: repo, edits: [{ field: 'name', set: 'Jeb' }] });
      const { restoredOrigin } = await undo({ cwd: repo });
      assert.equal(restoredOrigin, true);
      assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
      assert.equal(git(repo, 'remote'), 'origin');
      assert.deepEqual(await listBackups({ cwd: repo }), []);
    }),
  );

  it(
    'keeps only the newest backups',
    withRepo(async (repo) => {
      const names = ['a', 'b', 'c', 'd'];
      const results = await names.reduce<Promise<readonly Awaited<ReturnType<typeof rewrite>>[]>>(
        async (previous, name) => [
          ...(await previous),
          await rewrite({ cwd: repo, edits: [{ field: 'name', set: name }], keepOrigin: true, keepBackups: 2 }),
        ],
        Promise.resolve([]),
      );
      assert.deepEqual(
        results.map(({ prunedBackups }) => prunedBackups.length),
        [0, 0, 1, 1],
      );
      const backups = await listBackups({ cwd: repo });
      assert.deepEqual(
        backups.map(({ id }) => id),
        results
          .slice(2)
          .map(({ backup }) => backup?.id)
          .toReversed(),
      );
      assert.equal((await clearBackups({ cwd: repo })).length, 2);
      assert.deepEqual(await listBackups({ cwd: repo }), []);
    }),
  );

  it(
    'undo restores the exact refs and branch from before the rewrite',
    withRepo(async (repo) => {
      const head = git(repo, 'rev-parse', 'HEAD');
      await rewrite({ cwd: repo, edits: [{ field: 'name', set: 'Jeb' }], keepOrigin: true });
      git(repo, 'checkout', '-q', '-b', 'after-rewrite');
      git(repo, 'tag', 'v-after');
      await undo({ cwd: repo });
      assert.equal(git(repo, 'symbolic-ref', '--short', 'HEAD'), 'main');
      assert.equal(git(repo, 'rev-parse', 'HEAD'), head);
      assert.equal(git(repo, 'branch', '--format=%(refname:short)'), 'main');
      assert.equal(git(repo, 'tag'), '');
      assert.equal(git(repo, 'rev-parse', 'origin/main'), head);
    }),
  );

  it(
    'lists and greps commits',
    withRepo(async (repo) => {
      assert.equal((await list({ cwd: repo, select: { last: 2 } })).length, 2);
      const { matches, searched } = await grep({
        cwd: repo,
        pattern: 'PART [12]',
        ignoreCase: true,
        fields: ['message'],
      });
      assert.equal(searched, 3);
      assert.deepEqual(
        matches.map(({ commit }) => commit.message),
        ['feat: Moon part 2', 'feat: Moon part 1'],
      );
    }),
  );
});
