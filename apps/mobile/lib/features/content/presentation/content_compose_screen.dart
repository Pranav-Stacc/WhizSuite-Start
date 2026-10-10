import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/async_value_view.dart';
import '../../../core/widgets/error_message.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/forms.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../../../core/widgets/state_views.dart';
import '../../../core/widgets/surfaces.dart';
import '../../../l10n/app_localizations.dart';
import '../../access/application/access_controller.dart';
import '../../directory/application/directory_providers.dart';
import '../../directory/domain/directory_entry.dart';
import '../application/content_controller.dart';
import '../content_routes.dart';
import '../domain/content.dart';
import '../domain/content_workflow.dart';
import '../domain/hashtags.dart';
import '../domain/platform_limits.dart';
import 'content_compose_fields.dart';
import 'content_labels.dart';
import 'content_preview.dart';

/// Create (no [contentId]) or edit a post.
class ContentComposeScreen extends ConsumerWidget {
  const ContentComposeScreen({this.contentId, this.initialClientId, this.initialScheduledAt, super.key});

  final String? contentId;
  final String? initialClientId;
  final DateTime? initialScheduledAt;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final id = contentId;
    final permission = id == null ? Permissions.contentCreate : Permissions.contentEdit;
    if (!ref.watch(accessPolicyProvider.select((p) => p.can(permission)))) {
      return PageScaffold(title: l10n.contentTitle, body: const ForbiddenState());
    }
    if (id == null) return _Composer(initialClientId: initialClientId);
    final item = ref.watch(contentItemProvider(id));
    return switch (item) {
      AsyncValue(:final value?) when !isContentEditable(value.status) => PageScaffold(
          title: l10n.contentEditTitle,
          body: EmptyState(
            icon: Icons.lock_outline,
            title: l10n.contentNotEditable,
            body: l10n.contentPublishedReadOnly,
            action: OutlinedButton(onPressed: () => context.go(ContentRoutes.detail(id)), child: Text(l10n.details)),
          ),
        ),
      AsyncValue(:final value?) => _Composer(key: ValueKey('${value.id}:${value.version}'), existing: value),
      _ => PageScaffold(
          title: l10n.contentEditTitle,
          body: AsyncValueView<Content>(
            value: item,
            onRetry: () => ref.invalidate(contentItemProvider(id)),
            data: (_) => const SizedBox.shrink(),
          ),
        ),
    };
  }
}

class _Composer extends ConsumerStatefulWidget {
  const _Composer({this.existing, this.initialClientId, this.initialScheduledAt, super.key});

  final Content? existing;
  final String? initialClientId;
  final DateTime? initialScheduledAt;

  @override
  ConsumerState<_Composer> createState() => _ComposerState();
}

class _ComposerState extends ConsumerState<_Composer> {
  static const _wideBreakpoint = 1040.0;
  static const _previewWidth = 380.0;
  static const _formMaxWidth = 720.0;
  static const _aiHashtagCount = 10;
  static const _topicMaxLength = 300;
  static const _captionLines = 3;
  static const _allowedSchemes = {'http', 'https'};

  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _caption;
  late final TextEditingController _pillar;
  late final TextEditingController _cta;
  final _hashtagsText = TextEditingController();
  String? _clientId;
  late String _type;
  late List<String> _platforms;
  late List<String> _hashtags;
  late List<ContentMedia> _media;
  DateTime? _scheduledAt;
  bool _saving = false;
  bool _writing = false;
  bool _suggesting = false;
  String? _error;
  bool _conflict = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final c = widget.existing;
    _clientId = c?.clientId ?? widget.initialClientId;
    _title = TextEditingController(text: c?.title ?? '');
    _caption = TextEditingController(text: c?.caption ?? '')..addListener(_refresh);
    _pillar = TextEditingController(text: c?.pillar ?? '')..addListener(_refresh);
    _cta = TextEditingController(text: c?.ctaUrl ?? '');
    _type = c?.contentType ?? ContentTypes.post;
    _platforms = [...?c?.platforms];
    _hashtags = [...?c?.hashtags];
    _hashtagsText.text = _hashtags.join(' ');
    _media = [...?c?.media];
    _scheduledAt = c?.scheduledAt?.toLocal() ?? widget.initialScheduledAt;
  }

  @override
  void dispose() {
    _title.dispose();
    _caption.dispose();
    _pillar.dispose();
    _cta.dispose();
    _hashtagsText.dispose();
    super.dispose();
  }

  void _setHashtags(List<String> tags) {
    _hashtags = tags;
    final text = tags.join(' ');
    if (_hashtagsText.text != text) {
      _hashtagsText.value = TextEditingValue(
        text: text,
        selection: TextSelection.collapsed(offset: text.length),
      );
    }
  }

  void _refresh() => setState(() {});

  String? _trimmedOrNull(TextEditingController c) {
    final value = c.text.trim();
    return value.isEmpty ? null : value;
  }

  ContentInput _input() => ContentInput(
        clientId: _isEdit ? null : _clientId,
        title: _title.text.trim(),
        contentType: _type,
        caption: _caption.text,
        pillar: _trimmedOrNull(_pillar),
        platforms: _platforms,
        hashtags: _hashtags,
        ctaUrl: _trimmedOrNull(_cta),
        scheduledAt: _scheduledAt,
        mediaAssetIds: [for (final m in _media) m.assetId],
      );

  Future<void> _save({required bool submit}) async {
    if (_saving || !(_formKey.currentState?.validate() ?? false)) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _saving = true;
      _error = null;
      _conflict = false;
    });
    final actions = ref.read(contentActionsProvider);
    try {
      final existing = widget.existing;
      final String id;
      if (existing == null) {
        id = (await actions.create(_input(), submitForReview: submit)).id;
      } else {
        await actions.update(existing, _input(), submitForReview: submit);
        id = existing.id;
      }
      if (!mounted) return;
      showToast(context, submit ? l10n.contentSubmittedToast : (_isEdit ? l10n.savedToast : l10n.createdToast));
      context.go(ContentRoutes.detail(id));
    } on ApiException catch (error) {
      if (!mounted) return;
      setState(() {
        _conflict = error.code == ErrorCodes.contentVersionConflict;
        _error = _conflict ? l10n.contentVersionConflict : describeError(l10n, error);
      });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String _topic() {
    final parts = [_title.text.trim(), _pillar.text.trim(), _caption.text.trim()].where((p) => p.isNotEmpty).join('. ');
    return parts.length > _topicMaxLength ? parts.substring(0, _topicMaxLength) : parts;
  }

  Future<void> _writeCaption(BrandHints brand) async {
    final l10n = AppLocalizations.of(context);
    final topic = _topic();
    if (topic.isEmpty) {
      showToast(context, l10n.contentAiNeedsTopic);
      return;
    }
    setState(() => _writing = true);
    try {
      final suggestion = await ref.read(contentActionsProvider).writeCaption(
            topic: topic,
            tone: brand.voice.isEmpty ? null : brand.voice,
            platform: _platforms.firstOrNull,
            maxLength: tightestCaptionLimit(_platforms),
          );
      if (!mounted) return;
      final previousCaption = _caption.text;
      final previousTags = _hashtags;
      setState(() {
        _caption.text = suggestion.caption;
        if (_hashtags.isEmpty) _setHashtags(normalizeHashtags(suggestion.hashtags));
      });
      showToast(
        context,
        l10n.contentAiCaptionDone,
        action: SnackBarAction(
          label: l10n.contentUndo,
          onPressed: () {
            if (!mounted) return;
            setState(() {
              _caption.text = previousCaption;
              _setHashtags(previousTags);
            });
          },
        ),
      );
    } on ApiException catch (error) {
      if (mounted) showToast(context, describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _writing = false);
    }
  }

  Future<void> _suggestHashtags() async {
    final l10n = AppLocalizations.of(context);
    final topic = _topic();
    final room = contentHashtagsMaxDefault - _hashtags.length;
    if (topic.isEmpty || room <= 0) {
      showToast(context, topic.isEmpty ? l10n.contentAiNeedsTopic : l10n.contentHashtagsFull(contentHashtagsMaxDefault));
      return;
    }
    setState(() => _suggesting = true);
    try {
      final tags = await ref
          .read(contentActionsProvider)
          .suggestHashtags(topic: topic, count: room < _aiHashtagCount ? room : _aiHashtagCount);
      if (!mounted) return;
      final before = _hashtags.length;
      setState(() => _setHashtags(normalizeHashtags([..._hashtags, ...tags])));
      showToast(context, l10n.contentHashtagsAdded(_hashtags.length - before));
    } on ApiException catch (error) {
      if (mounted) showToast(context, describeError(l10n, error));
    } finally {
      if (mounted) setState(() => _suggesting = false);
    }
  }

  String? _validateCta(String? raw) {
    final l10n = AppLocalizations.of(context);
    final value = raw?.trim() ?? '';
    if (value.isEmpty) return null;
    final uri = Uri.tryParse(value);
    final valid = uri != null && _allowedSchemes.contains(uri.scheme) && uri.host.isNotEmpty;
    return valid ? null : l10n.contentCtaInvalid;
  }

  void _showPreviewSheet(String clientName) => showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        useSafeArea: true,
        builder: (context) => SingleChildScrollView(
          padding: EdgeInsets.all(context.tokens.lg),
          child: _preview(clientName),
        ),
      );

  Widget _preview(String clientName) => ContentPreview(
        clientId: _clientId ?? '',
        clientName: clientName,
        contentType: _type,
        platforms: _platforms,
        caption: _caption.text,
        hashtags: _hashtags,
        media: _media,
      );

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final clients = ref.watch(clientDirectoryProvider);
    final directory = clients.value ?? Directory.empty;
    final clientId = _clientId;
    final clientName = directory.nameOf(clientId) ?? l10n.valueUnknown;
    final brand = clientId == null ? BrandHints.empty : ref.watch(contentBrandHintsProvider(clientId)).value ?? BrandHints.empty;
    final connected = clientId == null ? null : ref.watch(contentConnectedPlatformsProvider(clientId)).value;
    final canAi = ref.watch(accessPolicyProvider.select((p) => p.can(Permissions.contentCreate)));
    final status = widget.existing?.status;
    final canSubmit = status != ContentStatuses.inReview;
    final resets = status != null && resetsApprovalOnEdit(status);

    final form = Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FormErrorBanner(message: _error),
          if (_conflict)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton.icon(
                onPressed: () => ref.invalidate(contentItemProvider(widget.existing?.id ?? '')),
                icon: const Icon(Icons.refresh),
                label: Text(l10n.contentReloadLatest),
              ),
            ),
          if (resets) ...[
            _Notice(icon: Icons.info_outline, text: l10n.contentEditResetsApproval),
            SizedBox(height: tokens.lg),
          ],
          SectionCard(
            title: l10n.contentSectionBasics,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_isEdit || widget.initialClientId != null)
                  InfoRow(label: l10n.contentFieldClient, icon: Icons.business_outlined, value: Text(clientName))
                else if (clients.hasValue && directory.entries.isEmpty)
                  _Notice(icon: Icons.warning_amber_outlined, text: l10n.contentNoClients)
                else
                  OptionField<String>(
                    key: ValueKey('client-${clients.hasValue}'),
                    label: l10n.contentFieldClient,
                    value: clientId,
                    options: [for (final c in directory.entries) c.id],
                    labelOf: (id) => directory.nameOf(id) ?? l10n.valueUnknown,
                    validator: (value) => Validators(l10n).required(value),
                    onChanged: (value) => setState(() {
                      _clientId = value;
                      _media = const [];
                    }),
                  ),
                SizedBox(height: tokens.md),
                TextFormField(
                  controller: _title,
                  maxLength: contentTitleMaxLength,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(labelText: l10n.contentFieldTitle, hintText: l10n.contentFieldTitleHint),
                  validator: Validators(l10n).required,
                ),
                SizedBox(height: tokens.md),
                OptionField<String>(
                  label: l10n.contentFieldType,
                  value: _type,
                  options: ContentTypes.values,
                  labelOf: (type) => contentTypeLabel(l10n, type),
                  onChanged: (value) {
                    if (value != null) setState(() => _type = value);
                  },
                ),
                SizedBox(height: tokens.md),
                PlatformPicker(
                  options: Platforms.values,
                  selected: _platforms,
                  connected: connected,
                  onChanged: (value) => setState(() => _platforms = value),
                ),
              ],
            ),
          ),
          SizedBox(height: tokens.lg),
          SectionCard(
            title: l10n.contentSectionMedia,
            child: ContentMediaField(
              clientId: clientId,
              media: _media,
              onChanged: (value) => setState(() => _media = value),
            ),
          ),
          SizedBox(height: tokens.lg),
          SectionCard(
            title: l10n.contentSectionCopy,
            trailing: canAi
                ? _AiButton(
                    label: l10n.contentAiWriteCaption,
                    busy: _writing,
                    onPressed: () => _writeCaption(brand),
                  )
                : null,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (brand.voice.isNotEmpty) ...[
                  _Notice(icon: Icons.record_voice_over_outlined, text: l10n.contentBrandVoice(brand.voice)),
                  SizedBox(height: tokens.md),
                ],
                TextFormField(
                  controller: _caption,
                  minLines: _captionLines,
                  maxLines: null,
                  maxLength: contentCaptionMaxLength,
                  buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
                  decoration: InputDecoration(
                    labelText: l10n.contentFieldCaption,
                    hintText: l10n.contentFieldCaptionHint,
                    alignLabelWithHint: true,
                  ),
                ),
                _CaptionCounter(caption: _caption.text, hashtags: _hashtags, platforms: _platforms),
                SizedBox(height: tokens.md),
                TextFormField(
                  controller: _hashtagsText,
                  maxLines: 2,
                  decoration: InputDecoration(
                    labelText: l10n.contentFieldHashtags,
                    hintText: l10n.contentFieldHashtagsHint,
                    helperText: l10n.contentHashtagsCount(_hashtags.length, contentHashtagsMaxDefault),
                    suffixIcon: canAi
                        ? IconButton(
                            tooltip: l10n.contentAiSuggestHashtags,
                            onPressed: _suggesting ? null : _suggestHashtags,
                            icon: _suggesting
                                ? const SizedBox.square(
                                    dimension: _AiButton._spinner,
                                    child: CircularProgressIndicator(strokeWidth: 2),
                                  )
                                : const Icon(Icons.auto_awesome_outlined),
                          )
                        : null,
                  ),
                  onChanged: (raw) => setState(
                    () => _hashtags = normalizeHashtags(raw.split(RegExp(r'\s+'))),
                  ),
                ),
                SuggestionChips(
                  label: l10n.contentBrandHashtags,
                  suggestions: normalizeHashtags(brand.hashtags)
                      .where((tag) => !_hashtags.any((h) => h.toLowerCase() == tag.toLowerCase()))
                      .toList(),
                  onPick: (tag) => setState(() => _setHashtags(normalizeHashtags([..._hashtags, tag]))),
                ),
              ],
            ),
          ),
          SizedBox(height: tokens.lg),
          SectionCard(
            title: l10n.contentSectionPublishing,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                TextFormField(
                  controller: _pillar,
                  maxLength: contentPillarMaxLength,
                  decoration: InputDecoration(labelText: l10n.contentFieldPillar, hintText: l10n.contentFieldPillarHint),
                ),
                SuggestionChips(
                  label: l10n.contentBrandPillars,
                  suggestions: brand.pillars.where((p) => p != _pillar.text.trim()).toSet().toList(),
                  onPick: (pillar) => _pillar.text = pillar,
                ),
                SizedBox(height: tokens.md),
                TextFormField(
                  controller: _cta,
                  maxLength: contentCtaUrlMaxLength,
                  keyboardType: TextInputType.url,
                  buildCounter: (context, {required currentLength, required isFocused, maxLength}) => null,
                  decoration: InputDecoration(
                    labelText: l10n.contentFieldCta,
                    hintText: l10n.contentFieldCtaHint,
                    prefixIcon: const Icon(Icons.link),
                  ),
                  validator: _validateCta,
                ),
                SizedBox(height: tokens.md),
                DateField(
                  label: l10n.contentFieldScheduledAt,
                  value: _scheduledAt,
                  withTime: true,
                  onChanged: (value) => setState(() => _scheduledAt = value),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    final bottomBar = SafeArea(
      top: false,
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          border: Border(top: BorderSide(color: tokens.border)),
        ),
        padding: EdgeInsets.symmetric(horizontal: tokens.lg, vertical: tokens.md),
        child: Wrap(
          alignment: WrapAlignment.end,
          spacing: tokens.sm,
          runSpacing: tokens.sm,
          children: [
            OutlinedButton(
              onPressed: _saving ? null : () => _save(submit: false),
              child: Text(_isEdit ? l10n.save : l10n.contentSaveDraft),
            ),
            if (canSubmit)
              FilledButton.icon(
                onPressed: _saving ? null : () => _save(submit: true),
                icon: _saving
                    ? const SizedBox.square(dimension: _AiButton._spinner, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.send_outlined),
                label: Text(_isEdit ? l10n.contentSaveAndSubmit : l10n.contentActionSubmit),
              ),
          ],
        ),
      ),
    );

    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = constraints.maxWidth >= _wideBreakpoint;
        final formView = ListView(
          padding: EdgeInsets.all(tokens.lg),
          children: [
            Center(
              child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: _formMaxWidth), child: form),
            ),
          ],
        );
        return PageScaffold(
          title: _isEdit ? l10n.contentEditTitle : l10n.contentNew,
          showShellActions: false,
          actions: [
            if (!wide)
              IconButton(
                tooltip: l10n.contentPreviewTitle,
                icon: const Icon(Icons.visibility_outlined),
                onPressed: () => _showPreviewSheet(clientName),
              ),
          ],
          body: Column(
            children: [
              Expanded(
                child: wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: formView),
                          SizedBox(
                            width: _previewWidth,
                            child: ListView(
                              padding: EdgeInsets.all(tokens.lg),
                              children: [
                                Semantics(
                                  header: true,
                                  child: Text(l10n.contentPreviewTitle, style: Theme.of(context).textTheme.titleMedium),
                                ),
                                SizedBox(height: tokens.md),
                                _preview(clientName),
                              ],
                            ),
                          ),
                        ],
                      )
                    : formView,
              ),
              bottomBar,
            ],
          ),
        );
      },
    );
  }
}

class _AiButton extends StatelessWidget {
  const _AiButton({required this.label, required this.busy, required this.onPressed});

  final String label;
  final bool busy;
  final VoidCallback onPressed;

  static const _spinner = 16.0;

  @override
  Widget build(BuildContext context) => TextButton.icon(
        onPressed: busy ? null : onPressed,
        icon: busy
            ? const SizedBox.square(dimension: _spinner, child: CircularProgressIndicator(strokeWidth: 2))
            : const Icon(Icons.auto_awesome_outlined),
        label: Text(label),
      );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    return Container(
      padding: EdgeInsets.all(tokens.md),
      decoration: BoxDecoration(color: tokens.subtle, borderRadius: tokens.borderRadius),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: tokens.muted),
          SizedBox(width: tokens.md),
          Expanded(child: Text(text, style: Theme.of(context).textTheme.bodySmall)),
        ],
      ),
    );
  }
}

/// Published length (caption + hashtags) against the tightest selected network's limit.
class _CaptionCounter extends StatelessWidget {
  const _CaptionCounter({required this.caption, required this.hashtags, required this.platforms});

  final String caption;
  final List<String> hashtags;
  final List<String> platforms;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final tokens = context.tokens;
    final length = publishedCaption(caption, hashtags).length;
    final limit = tightestCaptionLimit(platforms) ?? contentCaptionMaxLength;
    final over = length > limit;
    final style = Theme.of(context).textTheme.labelSmall?.copyWith(
          color: over ? Theme.of(context).colorScheme.error : tokens.muted,
        );
    return Padding(
      padding: EdgeInsets.only(top: tokens.xs),
      child: Semantics(
        liveRegion: over,
        child: Text(over ? l10n.contentCaptionOver(length, limit) : l10n.contentCaptionCounter(length, limit), style: style, textAlign: TextAlign.end),
      ),
    );
  }
}
