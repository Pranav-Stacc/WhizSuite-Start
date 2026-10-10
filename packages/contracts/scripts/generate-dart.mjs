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
  'AssignableScopeTypes',
  'RoleKinds',
  'PermissionEffects',
  'MembershipTypes',
  'EmploymentTypes',
  'MemberDocumentTypes',
  'MemberDocumentStatuses',
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
  'LeadStages',
  'ArticleCategories',
  'AssetKinds',
  'MediaAssetStatuses',
  'Visibilities',
  'CalendarSourceTypes',
  'CustomFieldEntityTypes',
  'CustomFieldTypes',
  'ReportStatuses',
  'TemplateTypes',
  'TemplateScopes',
  'IntegrationConnectionStatuses',
  'FeedbackThreadStatuses',
  'FeedbackSubjectTypes',
  'ApprovalStepRules',
  'ApiContentTypes',
  'ContentCreatableStatuses',
  'ContentReviewOutcomes',
  'CONTENT_TRANSITIONS',
  'InvoiceCreatableStatuses',
  'INVOICE_TRANSITIONS',
  'ChatRoomTypes',
  'ChatMemberRoles',
  'ChatMentionTypes',
  'ChatMessageTypes',
  'ChatAttachmentKinds',
  'ChatNotificationLevels',
  'WHIZ_AGENT_TARGET_ID',
  'WHIZ_AGENT_DISPLAY',
  'RESOURCE_NAME_MIN_LENGTH',
  'RESOURCE_NAME_MAX_LENGTH',
  'RESOURCE_KEY_MAX_LENGTH',
  'RESOURCE_TEXT_MAX_LENGTH',
  'APPROVAL_STEPS_MAX',
  'PROJECT_NAME_MAX_LENGTH',
  'PROJECT_TYPE_MAX_LENGTH',
  'CONTENT_TITLE_MAX_LENGTH',
  'CONTENT_CAPTION_MAX_LENGTH',
  'CONTENT_PILLAR_MAX_LENGTH',
  'CONTENT_HASHTAG_MAX_LENGTH',
  'CONTENT_CTA_URL_MAX_LENGTH',
  'CONTENT_HASHTAGS_MAX_DEFAULT',
  'HASHTAG_PATTERN',
  'INVOICE_NUMBER_MAX_LENGTH',
  'INVOICE_LINES_MAX_DEFAULT',
  'INVOICE_LINE_DESCRIPTION_MAX_LENGTH',
  'INVOICE_LINE_QUANTITY_MAX',
  'INVOICE_TAX_RATE_MAX',
  'BASIS_POINTS_PER_PERCENT',
  'LEAD_TEXT_MAX_LENGTH',
  'LEAD_NEXT_STEP_MAX_LENGTH',
  'ARTICLE_TITLE_MAX_LENGTH',
  'ARTICLE_BODY_MAX_LENGTH',
  'TIME_ENTRY_MINUTES_MAX',
  'TIME_ENTRY_NOTE_MAX_LENGTH',
  'CHAT_MESSAGE_MAX_LENGTH',
  'CHAT_ROOM_NAME_MAX_LENGTH',
  'CHAT_PREVIEW_MAX_LENGTH',
  'CHAT_MESSAGES_PAGE_MAX',
  'CHAT_ROOMS_PAGE_MAX',
  'FEEDBACK_COMMENT_MAX_LENGTH_DEFAULT',
  'MEDIA_FILENAME_MAX_LENGTH',
  'ROLE_NAME_MAX_LENGTH',
  'ROLE_DESCRIPTION_MAX_LENGTH',
  'MEMBER_ROLES_MAX',
  'MEMBER_DESIGNATIONS_MAX',
  'DESIGNATION_NAME_MAX_LENGTH',
  'DESIGNATION_NAME_MIN_LENGTH',
  'DEPARTMENT_NAME_MIN_LENGTH',
  'DEPARTMENT_NAME_MAX_LENGTH',
  'WORKFLOW_STAGE_SEPARATOR',
  'MIN_WORKFLOW_STAGES',
  'MAX_WORKFLOW_STAGES',
  'MAX_WORKFLOW_SLA_HOURS',
  'MAX_WORKFLOW_STAGE_LENGTH',
  'MAX_AUTOMATION_RUN_DETAIL_LENGTH',
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
const allStringLists = (values) => values.every((v) => Array.isArray(v) && allStrings(v));

function emitStringListMap(name, value) {
  const entries = Object.entries(value).map(
    ([k, list]) => `  ${quote(k)}: <String>[${list.map(quote).join(', ')}],`,
  );
  return [`const Map<String, List<String>> ${camel(name)} = <String, List<String>>{`, ...entries, '};'].join('\n');
}

function emit(name, value) {
  if (value instanceof RegExp) return `const String ${camel(name)} = ${quote(value.source)};`;
  if (Array.isArray(value)) {
    return allStrings(value)
      ? emitClass(name, value.map((v) => [v, v]))
      : `const List<Object> ${camel(name)} = ${literal(value)};`;
  }
  if (value && typeof value === 'object') {
    if (allStringLists(Object.values(value))) return emitStringListMap(name, value);
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
