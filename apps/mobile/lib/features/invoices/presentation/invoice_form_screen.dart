import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/formatting/formats.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/fade_slide_in.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/skeleton.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/invoices_controller.dart';
import '../domain/invoice.dart';
import '../invoices_routes.dart';
import 'invoice_document.dart';
import 'invoice_status.dart';

/// Full-screen create (when [invoiceId] is null) or edit form for a draft invoice.
class InvoiceFormScreen extends ConsumerWidget {
  const InvoiceFormScreen({this.invoiceId, super.key});

  final String? invoiceId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final id = invoiceId;
    final clients = ref.watch(clientDirectoryProvider);

    if (id == null) {
      final number = ref.watch(nextInvoiceNumberProvider);
      final ready = clients.hasValue && (number.hasValue || number.hasError);
      return PageScaffold(
        title: l10n.invoiceNew,
        showShellActions: false,
        body: ready
            ? _InvoiceForm(clients: clients.value ?? Directory.empty, suggestedNumber: number.value ?? '')
            : clients.hasError
            ? ErrorState(
                error: clients.error ?? const ApiException(kind: ApiFailureKind.unknown),
                onRetry: () => ref.invalidate(clientDirectoryProvider),
              )
            : const SkeletonList(leading: false),
      );
    }

    final invoice = ref.watch(invoiceProvider(id));
    return PageScaffold(
      title: invoice.value == null ? l10n.invoiceEdit : l10n.invoiceEditTitle(invoice.value?.number ?? ''),
      showShellActions: false,
      body: AsyncValueView<Invoice>(
        value: invoice,
        onRetry: () => ref.invalidate(invoiceProvider(id)),
        loading: const SkeletonList(leading: false),
        data: (invoice) => invoice.isDraft
            ? _InvoiceForm(clients: clients.value ?? Directory.empty, initial: invoice)
            : EmptyState(
                icon: Icons.lock_outline,
                title: l10n.invoiceNotEditable,
                body: l10n.invoiceNotEditableBody,
                action: OutlinedButton(
                  onPressed: () => context.go(InvoicesRoutes.detail(invoice.id)),
                  child: Text(l10n.invoiceBackToInvoice),
                ),
              ),
      ),
    );
  }
}

/// One editable line; owns its controllers so rows keep their text when reordered.
class _LineDraft {
  _LineDraft({String description = '', int quantity = 1, int? unitMinor})
    : id = _nextId++,
      description = TextEditingController(text: description),
      quantity = TextEditingController(text: '$quantity'),
      unitPrice = TextEditingController(
        text: unitMinor == null ? '' : (unitMinor / AppFormats.minorUnitsPerMajor).toStringAsFixed(_priceDecimals),
      );

  /// Prices are edited in major units with minor-unit precision.
  static const _priceDecimals = 2;

  factory _LineDraft.from(InvoiceLine line) =>
      _LineDraft(description: line.description, quantity: line.quantity, unitMinor: line.unitMinor);

  static int _nextId = 0;

  final int id;
  final TextEditingController description;
  final TextEditingController quantity;
  final TextEditingController unitPrice;

  /// Best-effort line for the live preview; invalid numbers count as zero.
  InvoiceLine get preview => InvoiceLine(
    description: description.text.trim(),
    quantity: int.tryParse(quantity.text.trim()) ?? 0,
    unitMinor: parseMajorToMinor(unitPrice.text) ?? 0,
  );

  void dispose() {
    description.dispose();
    quantity.dispose();
    unitPrice.dispose();
  }
}

class _InvoiceForm extends ConsumerStatefulWidget {
  const _InvoiceForm({required this.clients, this.initial, this.suggestedNumber = ''});

  final Directory clients;
  final Invoice? initial;
  final String suggestedNumber;

  @override
  ConsumerState<_InvoiceForm> createState() => _InvoiceFormState();
}

class _InvoiceFormState extends ConsumerState<_InvoiceForm> {
  /// Two-pane layout (form + sticky summary) from this width.
  static const _wideBreakpoint = 900.0;
  static const _summaryWidth = 340.0;

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _number = TextEditingController(
    text: widget.initial?.number ?? widget.suggestedNumber,
  );
  late final TextEditingController _taxRate = TextEditingController(
    text: _formatRate(widget.initial?.taxRate ?? InvoiceDefaults.taxRate),
  );
  late String? _clientId = widget.initial?.clientId;
  late String _status = widget.initial?.status ?? InvoiceDefaults.status;
  late DateTime? _dueDate =
      widget.initial?.dueDate ??
      DateUtils.dateOnly(DateTime.now()).add(const Duration(days: InvoiceDefaults.paymentTermsDays));
  late final List<_LineDraft> _lines = [
    ...?widget.initial?.lines.map(_LineDraft.from),
    if (widget.initial?.lines.isEmpty ?? true) _LineDraft(),
  ];
  bool _submitting = false;
  String? _error;

  bool get _isEdit => widget.initial != null;

  static String _formatRate(double rate) =>
      rate == rate.roundToDouble() ? rate.toStringAsFixed(0) : rate.toStringAsFixed(InvoiceLimits.taxRateDecimals);

  @override
  void dispose() {
    _number.dispose();
    _taxRate.dispose();
    for (final line in _lines) {
      line.dispose();
    }
    super.dispose();
  }

  double get _rate => parseDecimalInput(_taxRate.text) ?? 0;

  InvoiceTotals get _totals => InvoiceTotals.of(_lines.map((l) => l.preview), _rate);

  void _addLine() => setState(() => _lines.add(_LineDraft()));

  void _removeLine(_LineDraft line) => setState(() {
    _lines.remove(line);
    line.dispose();
  });

  void _move(int index, int delta) => setState(() {
    final line = _lines.removeAt(index);
    _lines.insert(index + delta, line);
  });

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final clientId = _clientId;
    final dueDate = _dueDate;
    if (clientId == null || dueDate == null) return;
    if (_totals.total > InvoiceLimits.maxMinor) {
      setState(() => _error = l10n.invoiceTotalTooLarge);
      return;
    }
    final input = InvoiceInput(
      clientId: clientId,
      dueDate: dueDate,
      taxRate: _rate,
      lines: [for (final line in _lines) line.preview],
      number: _isEdit ? null : _number.text.trim(),
      status: _isEdit ? null : _status,
    );
    setState(() {
      _submitting = true;
      _error = null;
    });
    final actions = ref.read(invoicesActionsProvider);
    try {
      final initial = widget.initial;
      final String id;
      if (initial == null) {
        id = (await actions.create(input)).id;
      } else {
        await actions.update(initial.id, input);
        id = initial.id;
      }
      if (!mounted) return;
      showToast(context, _isEdit ? l10n.savedToast : l10n.createdToast);
      context.go(InvoicesRoutes.detail(id));
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.kind == ApiFailureKind.conflict && !_isEdit
            ? l10n.invoiceNumberTaken
            : describeError(l10n, error);
      });
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Form(
      key: _formKey,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= _wideBreakpoint;
          final summary = _SummaryCard(
            totals: _totals,
            taxRate: _rate,
            currency: widget.initial?.currency,
            submitting: _submitting,
            submitLabel: _submitLabel(AppLocalizations.of(context)),
            onSubmit: _submit,
          );
          final sections = [
            FormErrorBanner(message: _error),
            FadeSlideIn(child: _detailsSection(context)),
            SizedBox(height: tokens.xl),
            FadeSlideIn(index: 1, child: _linesSection(context)),
          ];
          final padding = EdgeInsets.fromLTRB(tokens.lg, tokens.lg, tokens.lg, tokens.xxl * 2);
          if (!wide) {
            return ListView(
              padding: padding,
              children: [
                ...sections,
                SizedBox(height: tokens.xl),
                FadeSlideIn(index: 2, child: summary),
              ],
            );
          }
          return Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: ReadableBody.maxWidth + _summaryWidth),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ListView(padding: padding, children: sections),
                  ),
                  SizedBox(
                    width: _summaryWidth,
                    child: Padding(
                      padding: EdgeInsets.fromLTRB(0, tokens.lg, tokens.lg, tokens.lg),
                      child: SingleChildScrollView(child: FadeSlideIn(index: 2, child: summary)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  String _submitLabel(AppLocalizations l10n) {
    if (_isEdit) return l10n.save;
    return _status == InvoiceStatuses.sent ? l10n.invoiceCreateAndSend : l10n.invoiceSaveDraft;
  }

  Widget _detailsSection(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final validators = Validators(l10n);
    final clientIds = widget.clients.entries.map((e) => e.id).toList();
    final initialClient = widget.initial?.clientId;
    if (initialClient != null && !clientIds.contains(initialClient)) clientIds.insert(0, initialClient);

    return SectionCard(
      title: l10n.invoiceDetailsSection,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OptionField<String>(
            label: l10n.invoiceClient,
            value: _clientId,
            options: clientIds,
            labelOf: (id) => widget.clients.nameOf(id) ?? l10n.invoiceClientUnknown,
            validator: (value) => value == null ? l10n.validationRequired : null,
            onChanged: (value) => setState(() => _clientId = value),
          ),
          SizedBox(height: tokens.md),
          TextFormField(
            controller: _number,
            readOnly: _isEdit,
            decoration: InputDecoration(
              labelText: l10n.invoiceNumber,
              helperText: _isEdit ? l10n.invoiceNumberLocked : l10n.invoiceNumberHint,
            ),
            maxLength: _isEdit ? null : invoiceNumberMaxLength,
            textInputAction: TextInputAction.next,
            validator: validators.required,
          ),
          SizedBox(height: tokens.md),
          if (!_isEdit) ...[
            Text(l10n.invoiceStatusLabel, style: Theme.of(context).textTheme.labelLarge),
            SizedBox(height: tokens.sm),
            SegmentedButton<String>(
              segments: [
                for (final status in InvoiceCreatableStatuses.values)
                  ButtonSegment(value: status, label: Text(invoiceStatusLabel(l10n, status))),
              ],
              selected: {_status},
              onSelectionChanged: (selection) => setState(() => _status = selection.first),
            ),
            SizedBox(height: tokens.xs),
            Text(
              _status == InvoiceStatuses.sent ? l10n.invoiceStatusSentHint : l10n.invoiceStatusDraftHint,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted),
            ),
            SizedBox(height: tokens.lg),
          ],
          LayoutBuilder(
            builder: (context, constraints) {
              final due = DateField(
                label: l10n.invoiceDue,
                value: _dueDate,
                required: true,
                onChanged: (value) => setState(() => _dueDate = value),
              );
              final tax = TextFormField(
                controller: _taxRate,
                decoration: InputDecoration(labelText: l10n.invoiceTaxRate, suffixText: '%'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
                onChanged: (_) => setState(() {}),
                validator: (value) {
                  final rate = parseDecimalInput(value ?? '');
                  if (rate == null) return l10n.validationRequired;
                  if (rate < 0 || rate > invoiceTaxRateMax) return l10n.invoiceTaxRateRange(invoiceTaxRateMax);
                  if (!hasAtMostDecimals(rate, InvoiceLimits.taxRateDecimals)) {
                    return l10n.invoiceDecimalsMax(InvoiceLimits.taxRateDecimals);
                  }
                  return null;
                },
              );
              if (constraints.maxWidth < 480) {
                return Column(children: [due, SizedBox(height: tokens.md), tax]);
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: due),
                  SizedBox(width: tokens.md),
                  Expanded(child: tax),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _linesSection(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final full = _lines.length >= invoiceLinesMaxDefault;
    return SectionCard(
      title: l10n.invoiceLineItems(_lines.length),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, line) in _lines.indexed) ...[
            if (i > 0) Divider(height: tokens.xl),
            _LineEditor(
              key: ValueKey(line.id),
              line: line,
              index: i,
              count: _lines.length,
              currency: widget.initial?.currency,
              onChanged: () => setState(() {}),
              onRemove: _lines.length == 1 ? null : () => _removeLine(line),
              onMoveUp: i == 0 ? null : () => _move(i, -1),
              onMoveDown: i == _lines.length - 1 ? null : () => _move(i, 1),
            ),
          ],
          SizedBox(height: tokens.lg),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: OutlinedButton.icon(
              onPressed: full ? null : _addLine,
              icon: const Icon(Icons.add),
              label: Text(full ? l10n.invoiceLinesFull(invoiceLinesMaxDefault) : l10n.invoiceLineAdd),
            ),
          ),
        ],
      ),
    );
  }
}

class _LineEditor extends StatelessWidget {
  const _LineEditor({
    required this.line,
    required this.index,
    required this.count,
    required this.onChanged,
    this.currency,
    this.onRemove,
    this.onMoveUp,
    this.onMoveDown,
    super.key,
  });

  final _LineDraft line;
  final int index;
  final int count;
  final String? currency;
  final VoidCallback onChanged;
  final VoidCallback? onRemove;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final text = Theme.of(context).textTheme;
    final position = index + 1;

    final description = TextFormField(
      controller: line.description,
      decoration: InputDecoration(labelText: l10n.invoiceLineDescription),
      maxLength: invoiceLineDescriptionMaxLength,
      minLines: 1,
      maxLines: 3,
      textInputAction: TextInputAction.next,
      onChanged: (_) => onChanged(),
      validator: Validators(l10n).required,
    );
    final quantity = TextFormField(
      controller: line.quantity,
      decoration: InputDecoration(labelText: l10n.invoiceLineQuantity),
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      textInputAction: TextInputAction.next,
      onChanged: (_) => onChanged(),
      validator: (value) {
        final qty = int.tryParse(value?.trim() ?? '');
        if (qty == null) return l10n.validationRequired;
        if (qty < 1 || qty > invoiceLineQuantityMax) return l10n.invoiceQuantityRange(invoiceLineQuantityMax);
        return null;
      },
    );
    final unit = TextFormField(
      controller: line.unitPrice,
      decoration: InputDecoration(labelText: l10n.invoiceLineUnitPrice),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]'))],
      onChanged: (_) => onChanged(),
      validator: (value) {
        final raw = value?.trim() ?? '';
        if (raw.isEmpty) return l10n.validationRequired;
        final minor = parseMajorToMinor(raw);
        if (minor == null || minor > InvoiceLimits.maxMinor) return l10n.invoiceAmountInvalid;
        return null;
      },
    );
    final amount = Text(
      invoiceMoney(context, line.preview.amountMinor, currency: currency),
      textAlign: TextAlign.end,
      style: text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
    );

    return Semantics(
      container: true,
      label: l10n.invoiceLinePosition(position, count),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Text(l10n.invoiceLinePosition(position, count), style: text.labelMedium?.copyWith(color: tokens.muted)),
              const Spacer(),
              IconButton(tooltip: l10n.invoiceLineMoveUp, onPressed: onMoveUp, icon: const Icon(Icons.arrow_upward)),
              IconButton(
                tooltip: l10n.invoiceLineMoveDown,
                onPressed: onMoveDown,
                icon: const Icon(Icons.arrow_downward),
              ),
              IconButton(tooltip: l10n.invoiceLineRemove, onPressed: onRemove, icon: const Icon(Icons.delete_outline)),
            ],
          ),
          description,
          SizedBox(height: tokens.sm),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(flex: 2, child: quantity),
              SizedBox(width: tokens.md),
              Expanded(flex: 3, child: unit),
              SizedBox(width: tokens.md),
              Expanded(
                flex: 3,
                child: Padding(
                  padding: EdgeInsets.only(top: tokens.lg),
                  child: Semantics(label: l10n.invoiceLineAmount, child: amount),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.totals,
    required this.taxRate,
    required this.submitting,
    required this.submitLabel,
    required this.onSubmit,
    this.currency,
  });

  final InvoiceTotals totals;
  final double taxRate;
  final String? currency;
  final bool submitting;
  final String submitLabel;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    return SectionCard(
      title: l10n.invoiceSummarySection,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InvoiceTotalsPanel(totals: totals, taxRate: taxRate, currency: currency),
          SizedBox(height: tokens.lg),
          PrimaryButton(label: submitLabel, loading: submitting, onPressed: onSubmit),
          SizedBox(height: tokens.sm),
          Text(l10n.invoiceFormHint, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: tokens.muted)),
        ],
      ),
    );
  }
}
