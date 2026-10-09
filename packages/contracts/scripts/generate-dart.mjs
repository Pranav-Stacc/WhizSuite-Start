#!/usr/bin/env node
/**
 * Emits the contract constants the Flutter app consumes as Dart, so permission keys,
 * statuses, error codes and realtime events have a single source of truth.
 * Run after `pnpm --filter @agency-os/contracts build`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const distEntry = resolve(here, '../dist/index.js');
const output = resolve(here, '../../../apps/mobile/lib/core/contracts/contracts.g.dart');

/** Contract exports mirrored into Dart, in output order. */
const EXPORTS = [
  'Permissions',
  'ScopeTypes',
  'MembershipTypes',
  'ErrorCodes',
  'NotificationTypeKeys',
  'NotificationChannels',
  'DevicePlatforms',
  'RealtimeEvents',
  'REALTIME_NAMESPACE',
  'DEVICE_TOKEN_MAX_LENGTH',
  'DEVICE_META_MAX_LENGTH',
  'PASSWORD_MIN_LENGTH',
  'ORGANIZATION_NAME_MIN_LENGTH',
  'ORGANIZATION_SLUG_PATTERN',
  'PROFILE_NAME_MAX_LENGTH',
  'PROFILE_JOB_TITLE_MAX_LENGTH',
  'TaskStatuses',
  'Priorities',
  'ContentStatuses',
  'ContentTypes',
  'Platforms',
  'ClientStatuses',
  'ProjectStatuses',
  'InvoiceStatuses',
  'ApprovalStatuses',
  'ApprovalActions',
  'AutomationTriggers',
  'AutomationActions',
  'ThemeDensities',
  'ThemeColorKeys',
  'THEME_RADIUS_MIN',
  'THEME_RADIUS_MAX',
  'THEME_COMPACT_DENSITY_FACTOR',
  'THEME_LIGHT_LUMINANCE_THRESHOLD',
  'THEME_CONTRAST_DARK',
  'THEME_CONTRAST_LIGHT',
  'ThemeStatusColors',
  'DEFAULT_THEME',
  'THEME_PRESETS',
];

/** Dart reserved words plus the generated `values` member. */
const RESERVED = new Set([
  'assert', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'else', 'enum',
  'extends', 'false', 'final', 'finally', 'for', 'if', 'in', 'is', 'new', 'null', 'rethrow', 'return',
  'super', 'switch', 'this', 'throw', 'true', 'try', 'var', 'void', 'while', 'with', 'values',
]);

function camel(raw) {
  // SCREAMING_CASE words are lowercased; existing camelCase (e.g. `inApp`) is preserved.
  const words = String(raw)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => (w === w.toUpperCase() ? w.toLowerCase() : w));
  const name = words
    .map((w, i) => (i === 0 ? w[0].toLowerCase() + w.slice(1) : w[0].toUpperCase() + w.slice(1)))
    .join('');
  const safe = /^[0-9]/.test(name) ? `v${name}` : name;
  return RESERVED.has(safe) ? `${safe}Value` : safe;
}

const quote = (value) =>
  `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$')}'`;

function emitClass(name, entries) {
  const fields = entries.map(([key, value]) => `  static const String ${camel(key)} = ${quote(value)};`);
  const all = entries.map(([key]) => camel(key)).join(', ');
  return [
    `abstract final class ${name} {`,
    ...fields,
    '',
    `  static const List<String> values = <String>[${all}];`,
    '}',
  ].join('\n');
}

function literal(value) {
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `<Object>[${value.map(literal).join(', ')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(([k, v]) => `${quote(k)}: ${literal(v)}`);
    return `<String, Object>{${entries.join(', ')}}`;
  }
  throw new Error(`Unsupported contract value: ${value}`);
}

const allStrings = (values) => values.every((v) => typeof v === 'string');

function emit(name, value) {
  if (Array.isArray(value)) {
    return allStrings(value)
      ? emitClass(name, value.map((v) => [v, v]))
      : `const List<Object> ${camel(name)} = ${literal(value)};`;
  }
  if (value && typeof value === 'object') {
    return allStrings(Object.values(value))
      ? emitClass(name, Object.entries(value))
      : `const Map<String, Object> ${camel(name)} = ${literal(value)};`;
  }
  if (typeof value === 'number') {
    return `const ${Number.isInteger(value) ? 'int' : 'double'} ${camel(name)} = ${value};`;
  }
  if (typeof value === 'string') return `const String ${camel(name)} = ${quote(value)};`;
  throw new Error(`Unsupported contract export: ${name}`);
}

const contracts = await import(pathToFileURL(distEntry).href);
const source = contracts.default ?? contracts;

const blocks = EXPORTS.map((name) => {
  if (!(name in source)) throw new Error(`Contract export not found: ${name}`);
  return emit(name, source[name]);
});

const header = [
  '// GENERATED CODE - DO NOT MODIFY BY HAND.',
  '// Source: packages/contracts. Regenerate with `pnpm --filter @agency-os/contracts generate:dart`.',
  '// ignore_for_file: constant_identifier_names',
  '',
].join('\n');

await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${header}\n${blocks.join('\n\n')}\n`);
console.log(`Wrote ${output}`);
