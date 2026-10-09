import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/workflow.dart';

/// Ordered list of stage names with add, remove and reorder, bounded by the contract limits.
class WorkflowStagesEditor extends StatefulWidget {
  const WorkflowStagesEditor({required this.initial, required this.onChanged, super.key});

  final List<String> initial;
  final ValueChanged<List<String>> onChanged;

  @override
  State<WorkflowStagesEditor> createState() => _WorkflowStagesEditorState();
}

class _Row {
  _Row(this.id, String text) : controller = TextEditingController(text: text);

  final int id;
  final TextEditingController controller;
}

class _WorkflowStagesEditorState extends State<WorkflowStagesEditor> {
  late final List<_Row> _rows;
  var _nextId = 0;

  @override
  void initState() {
    super.initState();
    final seed = widget.initial.isEmpty ? List.filled(minWorkflowStages, '') : widget.initial;
    _rows = [for (final stage in seed) _newRow(stage)];
  }

  @override
  void dispose() {
    for (final row in _rows) {
      row.controller.dispose();
    }
    super.dispose();
  }

  _Row _newRow(String text) {
    final row = _Row(_nextId++, text);
    row.controller.addListener(_emit);
    return row;
  }

  void _emit() => widget.onChanged([for (final row in _rows) row.controller.text.trim()]);

  void _add() {
    setState(() => _rows.add(_newRow('')));
    _emit();
  }

  void _remove(int index) {
    final removed = _rows.removeAt(index);
    setState(() {});
    _emit();
    WidgetsBinding.instance.addPostFrameCallback((_) => removed.controller.dispose());
  }

  void _move(int index, int delta) {
    setState(() {
      final row = _rows.removeAt(index);
      _rows.insert(index + delta, row);
    });
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final canRemove = _rows.length > minWorkflowStages;
    final canAdd = _rows.length < maxWorkflowStages;

    String? validate(Object? _) => switch (validateWorkflowStages([for (final row in _rows) row.controller.text])) {
          WorkflowStagesIssue.tooFew => l10n.workflowStagesTooFew(minWorkflowStages),
          WorkflowStagesIssue.tooMany => l10n.workflowStagesTooMany(maxWorkflowStages),
          WorkflowStagesIssue.blank => l10n.workflowStagesBlank,
          WorkflowStagesIssue.tooLong => l10n.workflowStagesTooLong(maxWorkflowStageLength),
          null => null,
        };

    return FormField<Object?>(
      validator: validate,
      builder: (state) => _buildRows(context, state, canAdd: canAdd, canRemove: canRemove),
    );
  }

  Widget _buildRows(BuildContext context, FormFieldState<Object?> state, {required bool canAdd, required bool canRemove}) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final validators = Validators(l10n);
    final error = state.errorText;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Text(l10n.workflowStagesField, style: text.titleSmall)),
            Text(
              l10n.workflowStagesCount(_rows.length, maxWorkflowStages),
              style: text.labelSmall?.copyWith(color: tokens.muted),
            ),
          ],
        ),
        SizedBox(height: tokens.xs),
        Text(l10n.workflowStagesHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
        SizedBox(height: tokens.sm),
        for (final (i, row) in _rows.indexed)
          Padding(
            key: ValueKey(row.id),
            padding: EdgeInsets.only(bottom: tokens.sm),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: TextFormField(
                    controller: row.controller,
                    decoration: InputDecoration(
                      labelText: l10n.workflowStageLabel(i + 1),
                      isDense: true,
                      counterText: '',
                    ),
                    maxLength: maxWorkflowStageLength,
                    textInputAction: TextInputAction.next,
                    validator: validators.required,
                  ),
                ),
                IconButton(
                  tooltip: l10n.workflowStageMoveUp,
                  onPressed: i == 0 ? null : () => _move(i, -1),
                  icon: const Icon(Icons.arrow_upward, size: 20),
                ),
                IconButton(
                  tooltip: l10n.workflowStageMoveDown,
                  onPressed: i == _rows.length - 1 ? null : () => _move(i, 1),
                  icon: const Icon(Icons.arrow_downward, size: 20),
                ),
                IconButton(
                  tooltip: l10n.workflowStageRemove(i + 1),
                  onPressed: canRemove ? () => _remove(i) : null,
                  icon: const Icon(Icons.close, size: 20),
                ),
              ],
            ),
          ),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: TextButton.icon(
            onPressed: canAdd ? _add : null,
            icon: const Icon(Icons.add),
            label: Text(l10n.workflowStageAdd),
          ),
        ),
        if (error != null)
          Semantics(
            liveRegion: true,
            child: Text(error, style: text.bodySmall?.copyWith(color: Theme.of(context).colorScheme.error)),
          ),
      ],
    );
  }
}
