import { normalizeDate, parseDuration, shiftDate } from './dates';
import { fail } from './fail';
import { Field, isDateField, resolveEditField } from './fields';
import { PatternOptions, toRegExp } from './pattern';

interface SetEdit {
  readonly field: string;
  readonly set: string;
}

interface ReplaceEdit {
  readonly field: string;
  readonly replace: string | RegExp;
  readonly with: string;
}

interface ShiftEdit {
  readonly field?: string;
  readonly shift: string | number;
}

type Edit = SetEdit | ReplaceEdit | ShiftEdit;

type Transform = (value: string) => string;

interface FieldEdit {
  readonly field: Field;
  readonly transform: Transform;
}

const replaceWith =
  (regex: RegExp, replacement: string, literal: boolean): Transform =>
  (value) =>
    literal ? value.replace(regex, () => replacement) : value.replace(regex, replacement);

const toSeconds = (shift: string | number): number => {
  if (typeof shift === 'number') return shift;
  const sign = shift.trim().startsWith('-') ? -1 : 1;
  return sign * parseDuration(shift.trim().replace(/^[+-]/, ''));
};

const toTransform = (edit: Edit, options: PatternOptions): Transform => {
  if ('set' in edit) return () => edit.set;
  if ('replace' in edit) return replaceWith(toRegExp(edit.replace, options), edit.with, options.fixed ?? false);
  return shiftDate(toSeconds(edit.shift));
};

const forField = (field: Field, transform: Transform): Transform =>
  isDateField(field) ? (value) => normalizeDate(transform(value)) : transform;

const fieldsOf = (edit: Edit): readonly Field[] => {
  const fields = resolveEditField(edit.field ?? 'date');
  return 'shift' in edit && !fields.every(isDateField)
    ? fail(`shift only works on date fields, got "${edit.field}"`)
    : fields;
};

const resolveEdits = (edits: readonly Edit[], options: PatternOptions = {}): readonly FieldEdit[] =>
  edits.length === 0
    ? fail('nothing to rewrite, no edits were given')
    : edits.flatMap((edit) => {
        const transform = toTransform(edit, options);
        return fieldsOf(edit).map((field) => ({ field, transform: forField(field, transform) }));
      });

export { Edit, SetEdit, ReplaceEdit, ShiftEdit, FieldEdit, resolveEdits };
