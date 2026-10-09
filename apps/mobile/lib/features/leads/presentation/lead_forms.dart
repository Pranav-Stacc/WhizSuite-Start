import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/forms/validators.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../application/leads_controller.dart';
import '../domain/lead.dart';
import 'lead_stage.dart';

/// Create (when [lead] is null) or edit a lead. Resolves to true when saved.
Future<bool> showLeadForm(BuildContext context, WidgetRef ref, {Lead? lead}) {
  final l10n = AppLocalizations.of(context);
  final formats = context.formats;
  final validators = Validators(l10n);
  final staff = ref.read(staffDirectoryProvider).value?.entries ?? const [];
  final company = TextEditingController(text: lead?.companyName);
  final contact = TextEditingController(text: lead?.contactName);
  final email = TextEditingController(text: lead?.contactEmail);
  final industry = TextEditingController(text: lead?.industry);
  final website = TextEditingController(text: lead?.website);
  final source = TextEditingController(text: lead?.source);
  final value = TextEditingController(text: lead == null || lead.valueMinor == 0 ? '' : formatLeadValue(lead.valueMinor));
  final nextStep = TextEditingController(text: lead?.nextStep);
  var stage = lead?.stage ?? LeadStages.newValue;
  var ownerId = lead?.ownerId;
  var nextStepAt = lead?.nextStepAt;
  final actions = ref.read(leadsActionsProvider);

  String? optional(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
  String? optionalEmail(String? text) => (text ?? '').trim().isEmpty ? null : validators.email(text);
  String? amount(String? text) => (text ?? '').trim().isEmpty || parseLeadValue(text) != null ? null : l10n.leadValueInvalid;

  TextFormField text(
    TextEditingController controller,
    String label, {
    String? hint,
    TextInputType? keyboard,
    FormFieldValidator<String>? validator,
    int max = leadTextMaxLength,
  }) =>
      TextFormField(
        controller: controller,
        decoration: InputDecoration(labelText: label, hintText: hint),
        textInputAction: TextInputAction.next,
        keyboardType: keyboard,
        maxLength: max,
        validator: validator,
      );

  return showFormSheet(
    context,
    title: lead == null ? l10n.leadNew : l10n.leadEdit,
    submitLabel: lead == null ? l10n.create : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: company,
        autofocus: lead == null,
        decoration: InputDecoration(labelText: l10n.leadCompany, hintText: l10n.leadCompanyHint),
        textInputAction: TextInputAction.next,
        maxLength: leadTextMaxLength,
        validator: validators.required,
      ),
      text(contact, l10n.leadContact),
      text(email, l10n.leadEmail, keyboard: TextInputType.emailAddress, validator: optionalEmail),
      text(industry, l10n.leadIndustry),
      text(website, l10n.leadWebsite, hint: l10n.leadWebsiteHint, keyboard: TextInputType.url),
      text(source, l10n.leadSource, hint: l10n.leadSourceHint),
      TextFormField(
        controller: value,
        decoration: InputDecoration(
          labelText: l10n.leadValue,
          helperText: l10n.leadValueHint(lead?.currency ?? formats.currency),
          prefixIcon: const Icon(Icons.payments_outlined),
        ),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        textInputAction: TextInputAction.next,
        validator: amount,
      ),
      OptionField<String>(
        label: l10n.leadStageLabel,
        value: stage,
        options: LeadStages.values,
        labelOf: (s) => leadStageLabel(l10n, s),
        onChanged: (selected) => setState(() => stage = selected ?? stage),
      ),
      if (staff.isNotEmpty)
        OptionField<String>(
          label: l10n.leadOwner,
          value: staff.any((m) => m.id == ownerId) ? ownerId : null,
          options: [for (final member in staff) member.id],
          labelOf: (id) => staff.firstWhere((m) => m.id == id).name,
          onChanged: (selected) => setState(() => ownerId = selected),
        ),
      text(nextStep, l10n.leadNextStep, hint: l10n.leadNextStepHint, max: leadNextStepMaxLength),
      DateField(
        label: l10n.leadNextStepAt,
        value: nextStepAt,
        onChanged: (selected) => setState(() => nextStepAt = selected),
      ),
    ],
    onSubmit: () async {
      final input = LeadInput(
        companyName: company.text.trim(),
        contactName: optional(contact),
        contactEmail: optional(email),
        industry: optional(industry),
        website: optional(website),
        source: optional(source),
        valueMinor: parseLeadValue(value.text),
        stage: stage,
        ownerId: ownerId,
        nextStep: optional(nextStep),
        nextStepAt: nextStepAt,
      );
      if (lead == null) {
        await actions.create(input);
      } else {
        await actions.update(lead.id, input);
      }
    },
  );
}

/// Edit just the next step and its date.
Future<bool> showNextStepForm(BuildContext context, WidgetRef ref, Lead lead) {
  final l10n = AppLocalizations.of(context);
  final step = TextEditingController(text: lead.nextStep);
  var at = lead.nextStepAt;
  return showFormSheet(
    context,
    title: l10n.leadNextStepEdit,
    submitLabel: l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: step,
        autofocus: true,
        decoration: InputDecoration(labelText: l10n.leadNextStep, hintText: l10n.leadNextStepHint),
        minLines: 1,
        maxLines: 4,
        maxLength: leadNextStepMaxLength,
      ),
      DateField(label: l10n.leadNextStepAt, value: at, onChanged: (selected) => setState(() => at = selected)),
    ],
    onSubmit: () {
      final text = step.text.trim();
      return ref.read(leadsActionsProvider).setNextStep(lead.id, text.isEmpty ? null : text, at);
    },
  );
}

final _groupingOrSpace = RegExp(r'[\s,]');
const _fractionDigits = 2;

/// Major-unit amount typed by the user, in minor units; null when not a non-negative number.
int? parseLeadValue(String? text) {
  final cleaned = (text ?? '').replaceAll(_groupingOrSpace, '');
  if (cleaned.isEmpty) return null;
  final major = double.tryParse(cleaned);
  if (major == null || major < 0 || !major.isFinite) return null;
  return (major * AppFormats.minorUnitsPerMajor).round();
}

/// Minor units as the editable major-unit text (`1500`, `1500.50`).
String formatLeadValue(int minor) => minor % AppFormats.minorUnitsPerMajor == 0
    ? '${minor ~/ AppFormats.minorUnitsPerMajor}'
    : (minor / AppFormats.minorUnitsPerMajor).toStringAsFixed(_fractionDigits);
