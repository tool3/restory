import { Commit, readField, shortSha, subjectOf, writeField } from './commit';
import { toRawDate } from './dates';
import { FIELDS, Field, isDateField } from './fields';
import { FieldEdit } from './edit';

interface Change {
  readonly field: Field;
  readonly before: string;
  readonly after: string;
}

interface CommitChange {
  readonly sha: string;
  readonly subject: string;
  readonly changes: readonly Change[];
}

type FilterRepoPlan = Readonly<Record<string, Readonly<Record<string, string>>>>;

const withContext = <T>(sha: string, compute: () => T): T => {
  try {
    return compute();
  } catch (error) {
    throw new Error(`commit ${shortSha(sha)}: ${(error as Error).message}`);
  }
};

const applyEdits = (commit: Commit, edits: readonly FieldEdit[]): Commit =>
  edits.reduce(
    (current, { field, transform }) =>
      writeField(
        current,
        field,
        withContext(commit.sha, () => transform(readField(current, field))),
      ),
    commit,
  );

const planCommit =
  (edits: readonly FieldEdit[]) =>
  (commit: Commit): CommitChange => {
    const edited = applyEdits(commit, edits);
    return {
      sha: commit.sha,
      subject: subjectOf(commit.message),
      changes: FIELDS.map((field) => ({
        field,
        before: readField(commit, field),
        after: readField(edited, field),
      })).filter(({ before, after }) => before !== after),
    };
  };

const planRewrite = (commits: readonly Commit[], edits: readonly FieldEdit[]): readonly CommitChange[] =>
  commits.map(planCommit(edits)).filter(({ changes }) => changes.length > 0);

const toFilterRepoValue = (field: Field, value: string): string =>
  isDateField(field) ? toRawDate(value) : field === 'message' ? `${value}\n` : value;

const toFilterRepoPlan = (changes: readonly CommitChange[]): FilterRepoPlan =>
  Object.fromEntries(
    changes.map(({ sha, changes: fieldChanges }) => [
      sha,
      Object.fromEntries(
        fieldChanges.map(({ field, after }) => [field.replace('.', '_'), toFilterRepoValue(field, after)]),
      ),
    ]),
  );

export { Change, CommitChange, FilterRepoPlan, planRewrite, toFilterRepoPlan };
