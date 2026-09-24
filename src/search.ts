import { Commit, readField } from './commit';
import { SearchField, resolveSearchFields } from './fields';
import { PatternOptions, matches, toRegExp } from './pattern';

interface Query extends PatternOptions {
  readonly pattern: string | RegExp;
  readonly fields?: readonly string[];
}

interface Hit {
  readonly field: SearchField;
  readonly value: string;
}

interface Match {
  readonly commit: Commit;
  readonly hits: readonly Hit[];
}

const findHits = (commit: Commit, fields: readonly SearchField[], regex: RegExp): readonly Hit[] =>
  fields.map((field) => ({ field, value: readField(commit, field) })).filter(({ value }) => matches(regex, value));

const search = (commits: readonly Commit[], query: Query): readonly Match[] => {
  const regex = toRegExp(query.pattern, query);
  const fields = resolveSearchFields(query.fields);
  return commits
    .map((commit) => ({ commit, hits: findHits(commit, fields, regex) }))
    .filter(({ hits }) => hits.length > 0);
};

export { Query, Hit, Match, search };
