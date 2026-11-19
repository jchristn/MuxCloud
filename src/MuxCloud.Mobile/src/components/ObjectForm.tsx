import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/palette';
import { humanize, templateFrom } from '@/lib/forms';
import { Button, Field, Segmented, T, ToggleRow } from './ui';

/** Per-field presentation hints, keyed by property name (or dotted path for nested fields). */
export interface FieldHint {
  label?: string;
  hint?: string;
  options?: string[];
  multiline?: boolean;
  secret?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  /** Treat a string field that may be null as nullable: an empty input saves null. */
  nullable?: boolean;
  /** A number field that may be null (shown empty when null; clearing it saves null). */
  numeric?: boolean;
  /** Template for a new element of an array-of-objects field. */
  itemTemplate?: Record<string, unknown>;
}

export type FieldHints = Record<string, FieldHint>;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Edits any JSON object with native controls: switches for booleans, numeric fields, text fields (with options,
 * secrets, and multi-line hints), one-per-line lists for string arrays, repeatable sub-forms for arrays of objects, and
 * nested sections for objects. New fields mux adds later appear automatically, which keeps the mobile settings
 * screens in parity with the machine without an app update.
 */
export function ObjectForm({
  value,
  onChange,
  hints = {},
  path = '',
}: {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  hints?: FieldHints;
  path?: string;
}) {
  const p = useTheme();
  const { t } = useTranslation();
  const entries = Object.entries(value ?? {});
  return (
    <View style={{ gap: spacing.md }}>
      {entries.map(([key, raw]) => {
        const full = path ? path + '.' + key : key;
        const hint = hints[full] ?? hints[key] ?? {};
        if (hint.hidden) return null;
        const label = hint.label ?? humanize(key);
        const set = (v: unknown) => onChange({ ...value, [key]: v });
        const v = raw as Json;
        if (typeof v === 'boolean') {
          return <ToggleRow key={key} label={label} hint={hint.hint} value={v} onChange={set} disabled={hint.readOnly} />;
        }
        if (typeof v === 'number' || (hint.numeric && (v === null || v === undefined))) {
          return <NumberField key={key} label={label} hint={hint.hint} value={v as number | null} onChange={set} readOnly={hint.readOnly} nullable={hint.numeric} />;
        }
        if (Array.isArray(v)) {
          if (v.every((x) => typeof x === 'string' || typeof x === 'number')) {
            return (
              <Field
                key={key}
                label={label}
                hint={hint.hint ?? t('mobile.form.onePerLine')}
                multiline
                editable={!hint.readOnly}
                value={v.join('\n')}
                onChangeText={(text) => set(text.split('\n').map((s) => s.trim()).filter((s) => s.length > 0))}
                autoCapitalize="none"
                autoCorrect={false}
              />
            );
          }
          const objects = v as Record<string, unknown>[];
          return (
            <View key={key} style={{ gap: spacing.sm }}>
              <T variant="label">{label}</T>
              {objects.map((item, index) => (
                <View key={index} style={{ borderColor: p.line, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm }}>
                  <ObjectForm value={item} hints={hints} path={full} onChange={(next) => set(objects.map((o, i) => (i === index ? next : o)))} />
                  <Button title={t('common.delete')} kind="ghost" compact onPress={() => set(objects.filter((_, i) => i !== index))} />
                </View>
              ))}
              <Button
                title={t('mobile.form.addItem', { name: label })}
                kind="secondary"
                compact
                onPress={() => set([...objects, { ...(hint.itemTemplate ?? templateFrom(objects[0])) }])}
              />
            </View>
          );
        }
        if (v !== null && typeof v === 'object') {
          return (
            <View key={key} style={{ gap: spacing.sm, borderLeftColor: p.line, borderLeftWidth: 2, paddingLeft: spacing.md }}>
              <T variant="label">{label}</T>
              <ObjectForm value={v as Record<string, unknown>} hints={hints} path={full} onChange={set} />
            </View>
          );
        }
        if (hint.options && hint.options.length > 0 && hint.options.length <= 6) {
          return (
            <View key={key} style={{ gap: spacing.xs }}>
              <T variant="small" style={{ fontWeight: '600', color: p.text }}>
                {label}
              </T>
              <Segmented label={label} options={hint.options.map((o) => ({ value: o, label: o }))} value={String(v ?? '')} onChange={set} />
              {hint.hint ? <T variant="small">{hint.hint}</T> : null}
            </View>
          );
        }
        return (
          <Field
            key={key}
            label={label}
            hint={hint.hint ?? (hint.options ? hint.options.join(', ') : undefined)}
            value={v === null || v === undefined ? '' : String(v)}
            editable={!hint.readOnly}
            secureTextEntry={hint.secret}
            multiline={hint.multiline}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={hint.secret ? t('mobile.form.secretPlaceholder') : undefined}
            onChangeText={(text) => set(text === '' && (hint.nullable || v === null || hint.secret) ? null : text)}
          />
        );
      })}
    </View>
  );
}

function NumberField({
  label,
  hint,
  value,
  onChange,
  readOnly,
  nullable,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  readOnly?: boolean;
  nullable?: boolean;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  const [seen, setSeen] = useState(value);
  const { t } = useTranslation();
  if (value !== seen) {
    setSeen(value);
    if (value === null) setText('');
    else if (Number(text) !== value) setText(String(value));
  }
  const invalid = text.trim() !== '' && Number.isNaN(Number(text));
  return (
    <Field
      label={label}
      hint={hint}
      error={invalid ? t('mobile.form.notANumber') : null}
      value={text}
      editable={!readOnly}
      keyboardType="numbers-and-punctuation"
      onChangeText={(next) => {
        setText(next);
        const n = Number(next);
        if (next.trim() === '' && nullable) onChange(null);
        else if (next.trim() !== '' && !Number.isNaN(n)) onChange(n);
      }}
    />
  );
}
