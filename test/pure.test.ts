import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Commit } from '../src/commit';
import { normalizeDate, parseDuration, shiftDate, toRawDate } from '../src/dates';
import { resolveEdits } from '../src/edit';
import { resolveEditField, resolveSearchFields } from '../src/fields';
import { planRewrite, toFilterRepoPlan } from '../src/plan';
import { search } from '../src/search';

const commit = (overrides: Partial<Commit> = {}): Commit => ({
  sha: 'a'.repeat(40),
  message: 'feat: land on the Moon\n\nthe Moon is nice',
  author: { name: 'Tal Hayut', email: 'tal@moon.com', date: '2021-01-23T10:00:00+02:00' },
  committer: { name: 'Tal Hayut', email: 'tal@moon.com', date: '2021-01-23T10:00:00+02:00' },
  ...overrides,
});

describe('dates', () => {
  it('keeps an explicit offset', () => {
    assert.equal(normalizeDate('2021-01-23T10:00:00+02:00'), '2021-01-23T10:00:00+02:00');
    assert.equal(normalizeDate('1984-01-23T10:00:00-0530'), '1984-01-23T10:00:00-05:30');
  });

  it('converts to the raw git format', () => {
    assert.equal(toRawDate('2021-01-23T10:00:00+02:00'), '1611388800 +0200');
    assert.equal(toRawDate('@1611388800'), `1611388800 ${toRawDate('@1611388800').split(' ')[1]}`);
  });

  it('rejects invalid and pre-epoch dates', () => {
    assert.throws(() => normalizeDate('not a date'), /invalid date/);
    assert.throws(() => toRawDate('1960-01-01T00:00:00+00:00'), /before 1970/);
  });

  it('parses durations', () => {
    assert.equal(parseDuration('2h'), 7200);
    assert.equal(parseDuration('1d 2h30m'), 95400);
    assert.throws(() => parseDuration('2x'), /invalid duration/);
  });

  it('shifts dates and keeps the offset', () => {
    assert.equal(shiftDate(-26 * 3600)('2021-01-23T10:00:00+02:00'), '2021-01-22T08:00:00+02:00');
  });
});

describe('fields', () => {
  it('expands aliases and old underscore names', () => {
    assert.deepEqual(resolveEditField('name'), ['author.name', 'committer.name']);
    assert.deepEqual(resolveEditField('author_email'), ['author.email']);
    assert.deepEqual(resolveSearchFields(['author', 'msg']), ['author.name', 'author.email', 'author.date', 'message']);
  });

  it('names the valid fields on a typo', () => {
    assert.throws(() => resolveEditField('nme'), /unknown field "nme".*author\.name/);
  });
});

describe('planRewrite', () => {
  it('sets, replaces and shifts in a single plan', () => {
    const edits = resolveEdits([
      { field: 'author.name', set: 'Jebediah Kerman' },
      { field: 'message', replace: 'Moon', with: 'Mun' },
      { field: 'date', shift: '-1h' },
    ]);
    const [change] = planRewrite([commit()], edits);
    assert.deepEqual(
      change.changes.map(({ field, after }) => [field, after]),
      [
        ['message', 'feat: land on the Mun\n\nthe Mun is nice'],
        ['author.name', 'Jebediah Kerman'],
        ['author.date', '2021-01-23T09:00:00+02:00'],
        ['committer.date', '2021-01-23T09:00:00+02:00'],
      ],
    );
  });

  it('supports capture groups, and literal replacements with fixed strings', () => {
    const [captured] = planRewrite(
      [commit()],
      resolveEdits([{ field: 'email', replace: /(\w+)@moon/, with: '$1@mun' }]),
    );
    assert.equal(captured.changes[0].after, 'tal@mun.com');
    const [literal] = planRewrite(
      [commit()],
      resolveEdits([{ field: 'msg', replace: 'the (Moon)', with: '$1!' }], { fixed: true }),
    );
    assert.equal(literal, undefined);
    const [plain] = planRewrite(
      [commit()],
      resolveEdits([{ field: 'msg', replace: 'the Moon', with: '$&!' }], { fixed: true }),
    );
    assert.equal(plain.changes[0].after, 'feat: land on $&!\n\n$&! is nice');
  });

  it('replaces inside the ISO form of a date', () => {
    const [change] = planRewrite([commit()], resolveEdits([{ field: 'author.date', replace: '^2021', with: '1984' }]));
    assert.deepEqual(change.changes, [
      { field: 'author.date', before: '2021-01-23T10:00:00+02:00', after: '1984-01-23T10:00:00+02:00' },
    ]);
  });

  it('skips commits that would not change', () => {
    assert.deepEqual(planRewrite([commit()], resolveEdits([{ field: 'name', set: 'Tal Hayut' }])), []);
    assert.deepEqual(planRewrite([commit()], resolveEdits([{ field: 'date', set: '2021-01-23 10:00:00 +0200' }])), []);
  });

  it('reports which commit holds an invalid date', () => {
    assert.throws(
      () => planRewrite([commit()], resolveEdits([{ field: 'date', replace: '2021', with: 'soon' }])),
      /commit aaaaaaa: invalid date/,
    );
  });

  it('refuses to shift non-date fields', () => {
    assert.throws(() => resolveEdits([{ field: 'message', shift: '1h' }]), /only works on date fields/);
  });

  it('builds the filter-repo plan in git formats', () => {
    const changes = planRewrite(
      [commit()],
      resolveEdits([
        { field: 'message', set: 'hi' },
        { field: 'author.date', shift: 60 },
      ]),
    );
    assert.deepEqual(toFilterRepoPlan(changes), {
      ['a'.repeat(40)]: { message: 'hi\n', author_date: '1611388860 +0200' },
    });
  });
});

describe('search', () => {
  const commits = [
    commit(),
    commit({ sha: 'b'.repeat(40), message: 'chore: nothing', author: { ...commit().author, email: 'x@y.z' } }),
  ];

  it('searches every field by default', () => {
    assert.deepEqual(
      search(commits, { pattern: 'moon', ignoreCase: true }).map(({ hits }) => hits.map(({ field }) => field)),
      [['message', 'author.email', 'committer.email'], ['committer.email']],
    );
  });

  it('narrows to the requested fields', () => {
    assert.equal(search(commits, { pattern: 'moon', ignoreCase: true, fields: ['author.email'] }).length, 1);
    assert.equal(search(commits, { pattern: '^bbb', fields: ['sha'] }).length, 1);
  });
});
