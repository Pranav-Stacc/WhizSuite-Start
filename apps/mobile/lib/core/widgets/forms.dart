import 'package:flutter/material.dart';

import '../../l10n/app_localizations.dart';
import '../formatting/formats.dart';
import '../network/api_exception.dart';
import '../theme/app_tokens.dart';
import 'app_dialog.dart';
import 'buttons.dart';
import 'error_message.dart';

/// Inline error banner for form submission failures.
class FormErrorBanner extends StatelessWidget {
  const FormErrorBanner({required this.message, super.key});

  final String? message;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final error = Theme.of(context).colorScheme.error;
    return AnimatedSize(
      duration: AppMotion.medium,
      curve: AppMotion.standard,
      child: message == null
          ? const SizedBox(width: double.infinity)
          : Padding(
              padding: EdgeInsets.only(bottom: tokens.lg),
              child: Semantics(
                liveRegion: true,
                child: Container(
                  padding: EdgeInsets.all(tokens.md),
                  decoration: BoxDecoration(
                    color: error.withValues(alpha: 0.08),
                    border: Border.all(color: error.withValues(alpha: 0.4)),
                    borderRadius: tokens.borderRadius,
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline, color: error, size: 18),
                      SizedBox(width: tokens.sm),
                      Expanded(child: Text(message!, style: TextStyle(color: tokens.fg))),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}

/// Opens a form in a dialog or bottom sheet; resolves to true when submitted successfully.
Future<bool> showFormSheet(
  BuildContext context, {
  required String title,
  required String submitLabel,
  required List<Widget> Function(BuildContext context, StateSetter setState) fields,
  required Future<void> Function() onSubmit,
  String? subtitle,
  AppDialogSize size = AppDialogSize.standard,
  AppDialogPresentation presentation = AppDialogPresentation.dialog,
}) async {
  final saved = await showAppAdaptiveSurface<bool>(
    context,
    size: size,
    presentation: presentation,
    builder: (dialogContext) => FormSheet(
      title: title,
      subtitle: subtitle,
      submitLabel: submitLabel,
      fields: fields,
      onSubmit: onSubmit,
      size: size,
    ),
  );
  return saved ?? false;
}

/// Validated form body with a submit button that shows progress and API failures inline.
class FormSheet extends StatefulWidget {
  const FormSheet({
    required this.title,
    required this.submitLabel,
    required this.fields,
    required this.onSubmit,
    this.subtitle,
    this.size = AppDialogSize.standard,
    super.key,
  });

  final String title;
  final String? subtitle;
  final String submitLabel;
  final List<Widget> Function(BuildContext context, StateSetter setState) fields;
  final Future<void> Function() onSubmit;
  final AppDialogSize size;

  @override
  State<FormSheet> createState() => _FormSheetState();
}

class _FormSheetState extends State<FormSheet> {
  final _formKey = GlobalKey<FormState>();
  bool _submitting = false;
  String? _error;

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await widget.onSubmit();
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) setState(() => _error = describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final fields = widget.fields(context, setState);
    final compact = widget.size == AppDialogSize.compact;
    final body = [
      FormErrorBanner(message: _error),
      for (final field in fields) Padding(padding: EdgeInsets.only(bottom: tokens.lg), child: field),
    ];

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ConstrainedBox(
        constraints: AppDialogLayout.constraintsOf(context, size: widget.size),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.sm, tokens.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            header: true,
                            child: Text(widget.title, style: Theme.of(context).textTheme.titleLarge),
                          ),
                          if (widget.subtitle != null) ...[
                            SizedBox(height: tokens.xs),
                            Text(
                              widget.subtitle!,
                              style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: tokens.muted),
                            ),
                          ],
                        ],
                      ),
                    ),
                    IconButton(
                      tooltip: MaterialLocalizations.of(context).closeButtonLabel,
                      onPressed: () => Navigator.of(context).pop(false),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
              ),
              Divider(height: 1, color: tokens.border),
              if (compact)
                Padding(
                  padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.md),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: body),
                )
              else
                Flexible(
                  child: ListView(
                    padding: EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.md),
                    children: body,
                  ),
                ),
              Divider(height: 1, color: tokens.border),
              Padding(
                padding: EdgeInsets.fromLTRB(tokens.lg, tokens.md, tokens.lg, tokens.lg),
                child: PrimaryButton(label: widget.submitLabel, loading: _submitting, onPressed: _submit),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PickerNone {
  const _PickerNone();
}

const _pickerNone = _PickerNone();

/// Read-only row that opens a picker dialog instead of an in-form dropdown.
class PickerField<T> extends StatelessWidget {
  const PickerField({
    required this.label,
    required this.value,
    required this.labelOf,
    required this.onChanged,
    required this.options,
    this.dialogTitle,
    this.allowNone = false,
    this.noneLabel,
    super.key,
  });

  final String label;
  final T? value;
  final String Function(T value) labelOf;
  final ValueChanged<T?> onChanged;
  final List<T> options;
  final String? dialogTitle;
  final bool allowNone;
  final String? noneLabel;

  Future<void> _pick(BuildContext context) async {
    final l10n = AppLocalizations.of(context);
    final picked = await showPickerDialog<Object>(
      context,
      title: dialogTitle ?? label,
      size: options.length > 8 ? AppDialogSize.fullscreen : AppDialogSize.large,
      presentation: options.length > 12 ? AppDialogPresentation.bottomSheet : AppDialogPresentation.dialog,
      options: [
        if (allowNone) PickerOption<Object>(value: _pickerNone, label: noneLabel ?? l10n.valueNone),
        for (final option in options) PickerOption<Object>(value: option as Object, label: labelOf(option)),
      ],
    );
    if (picked == null) return;
    onChanged(picked == _pickerNone ? null : picked as T);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final display = value == null ? (noneLabel ?? l10n.valueNone) : labelOf(value as T);
    return InkWell(
      onTap: () => _pick(context),
      borderRadius: context.tokens.borderRadius,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          suffixIcon: const Icon(Icons.chevron_right),
        ),
        isEmpty: value == null,
        child: Text(display, maxLines: 2, overflow: TextOverflow.ellipsis),
      ),
    );
  }
}

/// Dropdown over a fixed set of values with localized labels.
class OptionField<T> extends StatelessWidget {
  const OptionField({
    required this.label,
    required this.value,
    required this.options,
    required this.labelOf,
    required this.onChanged,
    this.validator,
    this.allowNone = false,
    super.key,
  });

  final String label;
  final T? value;
  final List<T> options;
  final String Function(T value) labelOf;
  final ValueChanged<T?> onChanged;
  final FormFieldValidator<T>? validator;

  /// Adds a leading "None" entry that clears the value.
  final bool allowNone;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    return DropdownButtonFormField<T>(
      initialValue: value,
      isExpanded: true,
      decoration: InputDecoration(labelText: label),
      validator: validator,
      onChanged: onChanged,
      items: [
        if (allowNone) DropdownMenuItem<T>(child: Text(l10n.valueNone)),
        for (final option in options)
          DropdownMenuItem<T>(value: option, child: Text(labelOf(option), overflow: TextOverflow.ellipsis)),
      ],
    );
  }
}

/// Read-only field that opens a date picker; optionally clearable.
class DateField extends StatelessWidget {
  const DateField({
    required this.label,
    required this.value,
    required this.onChanged,
    this.firstDate,
    this.lastDate,
    this.withTime = false,
    this.required = false,
    super.key,
  });

  static const _yearsAround = 5;

  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final bool withTime;
  final bool required;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final initial = value?.toLocal() ?? now;
    final day = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: firstDate ?? DateTime(now.year - _yearsAround),
      lastDate: lastDate ?? DateTime(now.year + _yearsAround),
    );
    if (day == null || !context.mounted) return;
    if (!withTime) return onChanged(day);
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(initial));
    if (time == null) return;
    onChanged(DateTime(day.year, day.month, day.day, time.hour, time.minute));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final formats = context.formats;
    final text = value == null ? '' : (withTime ? formats.dateTime(value!) : formats.date(value!));
    return FormField<DateTime>(
      initialValue: value,
      validator: (_) => required && value == null ? l10n.validationRequired : null,
      builder: (state) => InkWell(
        onTap: () => _pick(context),
        borderRadius: context.tokens.borderRadius,
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: label,
            errorText: state.errorText,
            suffixIcon: value != null && !required
                ? IconButton(
                    tooltip: l10n.valueClear,
                    icon: const Icon(Icons.close),
                    onPressed: () => onChanged(null),
                  )
                : const Icon(Icons.calendar_today_outlined),
          ),
          isEmpty: value == null,
          child: Text(text),
        ),
      ),
    );
  }
}

/// Free-text tags (hashtags, labels) entered one at a time and shown as removable chips.
class TagsField extends StatefulWidget {
  const TagsField({
    required this.label,
    required this.values,
    required this.onChanged,
    this.normalize,
    this.maxTags,
    super.key,
  });

  final String label;
  final List<String> values;
  final ValueChanged<List<String>> onChanged;
  final String Function(String raw)? normalize;
  final int? maxTags;

  @override
  State<TagsField> createState() => _TagsFieldState();
}

class _TagsFieldState extends State<TagsField> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _add() {
    final raw = _controller.text.trim();
    if (raw.isEmpty) return;
    final tag = widget.normalize?.call(raw) ?? raw;
    final full = widget.maxTags != null && widget.values.length >= widget.maxTags!;
    if (!widget.values.contains(tag) && !full) widget.onChanged([...widget.values, tag]);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            labelText: widget.label,
            suffixIcon: IconButton(tooltip: l10n.valueAdd, icon: const Icon(Icons.add), onPressed: _add),
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _add(),
        ),
        if (widget.values.isNotEmpty) ...[
          SizedBox(height: tokens.sm),
          Wrap(
            spacing: tokens.sm,
            runSpacing: tokens.sm,
            children: [
              for (final value in widget.values)
                InputChip(
                  label: Text(value),
                  onDeleted: () => widget.onChanged(widget.values.where((v) => v != value).toList()),
                  deleteButtonTooltipMessage: l10n.valueRemove(value),
                ),
            ],
          ),
        ],
      ],
    );
  }
}
