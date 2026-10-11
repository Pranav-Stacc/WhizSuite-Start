// Builds the gen-l10n template from feature-owned message catalogs, then runs gen-l10n.
//
// Each feature owns `l10n/<feature>.arb`; `core.arb` carries `@@locale` and shared strings.
// Keys that still live only in `lib/l10n/app_en.arb` are preserved until migrated into `l10n/*.arb`.
// Usage (from apps/mobile): `dart run tool/l10n.dart`
import 'dart:convert';
import 'dart:io';

const _sourceDir = 'l10n';
const _coreFile = 'core.arb';
const _template = 'lib/l10n/app_en.arb';
const _localeKey = '@@locale';

void main() {
  final files = Directory(_sourceDir)
      .listSync()
      .whereType<File>()
      .where((f) => f.path.endsWith('.arb'))
      .toList()
    ..sort((a, b) => _order(a).compareTo(_order(b)));

  final merged = <String, Object?>{};
  final owners = <String, String>{};
  for (final file in files) {
    final name = file.uri.pathSegments.last;
    final messages = jsonDecode(file.readAsStringSync()) as Map<String, Object?>;
    for (final entry in messages.entries) {
      if (entry.key == _localeKey && name != _coreFile) {
        stderr.writeln('$name: only $_coreFile may declare $_localeKey');
        exit(1);
      }
      if (entry.key == _localeKey || entry.key.startsWith('@')) continue;
      final owner = owners[entry.key];
      if (owner != null) {
        stderr.writeln('Duplicate message "${entry.key}" in $name (already defined in $owner)');
        exit(1);
      }
      owners[entry.key] = name;
      merged[entry.key] = entry.value;
      final meta = messages['@${entry.key}'];
      if (meta != null) merged['@${entry.key}'] = meta;
    }
    if (name == _coreFile && messages.containsKey(_localeKey)) {
      merged[_localeKey] = messages[_localeKey];
    }
  }

  var carried = 0;
  final templateFile = File(_template);
  if (templateFile.existsSync()) {
    final template = jsonDecode(templateFile.readAsStringSync()) as Map<String, Object?>;
    if (!merged.containsKey(_localeKey) && template.containsKey(_localeKey)) {
      merged[_localeKey] = template[_localeKey];
    }
    for (final entry in template.entries) {
      final key = entry.key;
      if (key == _localeKey) continue;
      if (key.startsWith('@')) {
        final messageKey = key.substring(1);
        if (merged.containsKey(messageKey) || owners.containsKey(messageKey)) continue;
        merged[key] = entry.value;
        continue;
      }
      if (owners.containsKey(key)) continue;
      owners[key] = 'template (migrate to l10n/*.arb)';
      merged[key] = entry.value;
      final meta = template['@$key'];
      if (meta != null) merged['@$key'] = meta;
      carried++;
    }
  }

  final ordered = _orderedTemplate(merged);
  templateFile.writeAsStringSync('${const JsonEncoder.withIndent('  ').convert(ordered)}\n');
  stdout.writeln(
    'Merged ${files.length} catalogs (${owners.length} messages, $carried retained from template) into $_template',
  );

  final result = Process.runSync('flutter', ['gen-l10n'], runInShell: true);
  stdout.write(result.stdout);
  stderr.write(result.stderr);
  exit(result.exitCode);
}

/// `core.arb` first so shared strings lead the template, then features alphabetically.
String _order(File file) {
  final name = file.uri.pathSegments.last;
  return name == _coreFile ? '' : name;
}

/// Stable output: locale first, then message keys alphabetically with metadata adjacent.
Map<String, Object?> _orderedTemplate(Map<String, Object?> merged) {
  final out = <String, Object?>{};
  if (merged.containsKey(_localeKey)) out[_localeKey] = merged[_localeKey];

  final messageKeys = merged.keys.where((k) => k != _localeKey && !k.startsWith('@')).toList()..sort();
  for (final key in messageKeys) {
    out[key] = merged[key];
    final meta = merged['@$key'];
    if (meta != null) out['@$key'] = meta;
  }

  // Orphan metadata (should be rare).
  for (final key in merged.keys.where((k) => k.startsWith('@') && !out.containsKey(k))) {
    out[key] = merged[key];
  }
  return out;
}
