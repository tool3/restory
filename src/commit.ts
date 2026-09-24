import { normalizeDate } from './dates';
import { Field, SearchField } from './fields';

interface Identity {
  readonly name: string;
  readonly email: string;
  readonly date: string;
}

interface Commit {
  readonly sha: string;
  readonly message: string;
  readonly author: Identity;
  readonly committer: Identity;
}

type Person = 'author' | 'committer';
type IdentityKey = keyof Identity;

const SEPARATOR = '\x1f';
const LOG_FORMAT = ['%H', '%an', '%ae', '%aI', '%cn', '%ce', '%cI', '%B'].join('%x1f');

const splitField = (field: Exclude<Field, 'message'>): readonly [Person, IdentityKey] =>
  field.split('.') as unknown as readonly [Person, IdentityKey];

const readField = (commit: Commit, field: SearchField): string => {
  if (field === 'sha') return commit.sha;
  if (field === 'message') return commit.message;
  const [person, key] = splitField(field);
  return commit[person][key];
};

const writeField = (commit: Commit, field: Field, value: string): Commit => {
  if (field === 'message') return { ...commit, message: value };
  const [person, key] = splitField(field);
  return { ...commit, [person]: { ...commit[person], [key]: value } };
};

const parseCommit = (record: string): Commit => {
  const [sha, authorName, authorEmail, authorDate, committerName, committerEmail, committerDate, ...message] = record
    .replace(/^\n/, '')
    .split(SEPARATOR);
  return {
    sha,
    message: message.join(SEPARATOR).replace(/\n+$/, ''),
    author: { name: authorName, email: authorEmail, date: normalizeDate(authorDate) },
    committer: { name: committerName, email: committerEmail, date: normalizeDate(committerDate) },
  };
};

const parseLog = (output: string): readonly Commit[] =>
  output
    .split('\0')
    .filter((record) => record.trim() !== '')
    .map(parseCommit);

const subjectOf = (message: string): string => message.split('\n')[0];

const shortSha = (sha: string): string => sha.slice(0, 7);

export { Commit, Identity, LOG_FORMAT, readField, writeField, parseLog, subjectOf, shortSha };
