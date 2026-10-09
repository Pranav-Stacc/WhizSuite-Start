// Builds the gen-l10n template from feature-owned message catalogs, then runs gen-l10n.
//
// Each feature owns `l10n/<feature>.arb`; `core.arb` carries `@@locale` and shared strings.
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
      final owner = owners[entry.key];
      if (owner != null) {
        stderr.writeln('Duplicate message "${entry.key}" in $name (already defined in $owner)');
        exit(1);
      }
      owners[entry.key] = name;
      merged[entry.key] = entry.value;
    }
  }

  File(_template).writeAsStringSync('${const JsonEncoder.withIndent('  ').convert(merged)}\n');
  stdout.writeln('Merged ${files.length} catalogs (${owners.length} entries) into $_template');

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
