import 'package:flutter/material.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../roles/domain/role.dart';
import '../../team/domain/member.dart';
import '../domain/workflow.dart';

List<String> _toggleId(List<String> list, String id) =>
    list.contains(id) ? list.where((entry) => entry != id).toList() : [...list, id];

class _DraftStage {
  _DraftStage(this.id, WorkflowStage stage)
      : nameController = TextEditingController(text: stage.name),
        quorumController = TextEditingController(text: '${stage.quorumCount ?? 2}'),
        approvalRule = stage.approvalRule,
        roleIds = List.of(stage.roleIds),
        approverIds = List.of(stage.approverIds);

  final int id;
  final TextEditingController nameController;
  final TextEditingController quorumController;
  String approvalRule;
  List<String> roleIds;
  List<String> approverIds;

  WorkflowStage toStage() => WorkflowStage(
        name: nameController.text.trim(),
        approvalRule: approvalRule,
        quorumCount: approvalRule == ApprovalStepRules.quorum
            ? int.tryParse(quorumController.text.trim()) ?? 2
            : null,
        roleIds: roleIds,
        approverIds: approverIds,
        assigneeRoleId: roleIds.isNotEmpty ? roleIds.first : null,
      );
}

/// Ordered stages with per-stage approval rules, roles, and named approvers.
class WorkflowStagesEditor extends StatefulWidget {
  const WorkflowStagesEditor({
    required this.initial,
    required this.roles,
    required this.members,
    required this.onChanged,
    super.key,
  });

  final List<WorkflowStage> initial;
  final List<Role> roles;
  final List<Member> members;
  final ValueChanged<List<WorkflowStage>> onChanged;

  @override
  State<WorkflowStagesEditor> createState() => _WorkflowStagesEditorState();
}

class _WorkflowStagesEditorState extends State<WorkflowStagesEditor> {
  late final List<_DraftStage> _rows;
  var _nextId = 0;

  @override
  void initState() {
    super.initState();
    final seed = widget.initial.isEmpty
        ? List.generate(minWorkflowStages, (_) => WorkflowStage.empty())
        : widget.initial;
    _rows = [for (final stage in seed) _newRow(stage)];
  }

  @override
  void dispose() {
    for (final row in _rows) {
      row.nameController.dispose();
      row.quorumController.dispose();
    }
    super.dispose();
  }

  _DraftStage _newRow(WorkflowStage stage) {
    final row = _DraftStage(_nextId++, stage);
    row.nameController.addListener(_emit);
    row.quorumController.addListener(_emit);
    return row;
  }

  void _emit() => widget.onChanged([for (final row in _rows) row.toStage()]);

  void _add() {
    setState(() => _rows.add(_newRow(WorkflowStage.empty())));
    _emit();
  }

  void _remove(int index) {
    final removed = _rows.removeAt(index);
    setState(() {});
    _emit();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      removed.nameController.dispose();
      removed.quorumController.dispose();
    });
  }

  void _move(int index, int delta) {
    setState(() {
      final row = _rows.removeAt(index);
      _rows.insert(index + delta, row);
    });
    _emit();
  }

  void _patch(int index, void Function(_DraftStage row) update) {
    setState(() => update(_rows[index]));
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final canRemove = _rows.length > minWorkflowStages;
    final canAdd = _rows.length < maxWorkflowStages;

    String? validate(Object? _) => switch (validateWorkflowStages([for (final row in _rows) row.toStage()])) {
          WorkflowStagesIssue.tooFew => l10n.workflowStagesTooFew(minWorkflowStages),
          WorkflowStagesIssue.tooMany => l10n.workflowStagesTooMany(maxWorkflowStages),
          WorkflowStagesIssue.blank => l10n.workflowStagesBlank,
          WorkflowStagesIssue.tooLong => l10n.workflowStagesTooLong(maxWorkflowStageLength),
          null => null,
        };

    return FormField<Object?>(
      validator: validate,
      builder: (state) => _buildBody(context, state, canAdd: canAdd, canRemove: canRemove),
    );
  }

  Widget _buildBody(
    BuildContext context,
    FormFieldState<Object?> state, {
    required bool canAdd,
    required bool canRemove,
  }) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final validators = Validators(l10n);
    final error = state.errorText;
    final roleOptions = widget.roles.where((role) => !role.isOwner).toList();
    final people = widget.members;

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
            padding: EdgeInsets.only(bottom: tokens.md),
            child: SurfaceCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: row.nameController,
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
                  SizedBox(height: tokens.sm),
                  DropdownButtonFormField<String>(
                    key: ValueKey('rule-${row.id}-${row.approvalRule}'),
                    initialValue: row.approvalRule,
                    decoration: InputDecoration(
                      labelText: l10n.workflowStageApprovalRule,
                      isDense: true,
                    ),
                    items: [
                      for (final rule in ApprovalStepRules.values)
                        DropdownMenuItem(
                          value: rule,
                          child: Text(_approvalRuleLabel(l10n, rule)),
                        ),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      _patch(i, (draft) => draft.approvalRule = value);
                    },
                  ),
                  if (row.approvalRule == ApprovalStepRules.quorum) ...[
                    SizedBox(height: tokens.sm),
                    TextFormField(
                      controller: row.quorumController,
                      decoration: InputDecoration(
                        labelText: l10n.workflowStageQuorum,
                        helperText: l10n.workflowStageQuorumHint,
                        isDense: true,
                      ),
                      keyboardType: TextInputType.number,
                    ),
                  ],
                  SizedBox(height: tokens.md),
                  Text(l10n.workflowStageRoles, style: text.labelLarge),
                  SizedBox(height: tokens.xs),
                  Text(l10n.workflowStageRolesHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
                  SizedBox(height: tokens.sm),
                  _CheckboxPanel(
                    emptyLabel: l10n.workflowStageRolesEmpty,
                    children: [
                      for (final role in roleOptions)
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          controlAffinity: ListTileControlAffinity.leading,
                          title: Text(
                            role.isSystem ? '${role.name} · ${l10n.roleKind('system')}' : role.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          value: row.roleIds.contains(role.id),
                          onChanged: (_) => _patch(
                            i,
                            (draft) => draft.roleIds = _toggleId(draft.roleIds, role.id),
                          ),
                        ),
                    ],
                  ),
                  SizedBox(height: tokens.md),
                  Text(l10n.workflowStagePeople, style: text.labelLarge),
                  SizedBox(height: tokens.xs),
                  Text(l10n.workflowStagePeopleHint, style: text.bodySmall?.copyWith(color: tokens.muted)),
                  SizedBox(height: tokens.sm),
                  _CheckboxPanel(
                    emptyLabel: l10n.workflowStagePeopleEmpty,
                    children: [
                      for (final member in people)
                        CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          dense: true,
                          controlAffinity: ListTileControlAffinity.leading,
                          title: Text(member.name, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: member.title == null
                              ? null
                              : Text(member.title!, maxLines: 1, overflow: TextOverflow.ellipsis),
                          value: row.approverIds.contains(member.userId),
                          onChanged: (_) => _patch(
                            i,
                            (draft) => draft.approverIds = _toggleId(draft.approverIds, member.userId),
                          ),
                        ),
                    ],
                  ),
                ],
              ),
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

String _approvalRuleLabel(AppLocalizations l10n, String rule) => switch (rule) {
      ApprovalStepRules.all => l10n.workflowStageRuleAll,
      ApprovalStepRules.quorum => l10n.workflowStageRuleQuorum,
      _ => l10n.workflowStageRuleAny,
    };

class _CheckboxPanel extends StatelessWidget {
  const _CheckboxPanel({required this.emptyLabel, required this.children});

  final String emptyLabel;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border.all(color: tokens.border),
        borderRadius: BorderRadius.circular(tokens.radius),
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 160),
        child: children.isEmpty
            ? Padding(
                padding: EdgeInsets.all(tokens.md),
                child: Text(emptyLabel, style: text.bodySmall?.copyWith(color: tokens.muted)),
              )
            : SingleChildScrollView(
                padding: EdgeInsets.symmetric(horizontal: tokens.sm),
                child: Column(children: children),
              ),
      ),
    );
  }
}
