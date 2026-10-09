import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/contracts/contracts.g.dart';
import '../../../core/forms/validators.dart';
import '../../../core/theme/app_tokens.dart';
import '../../../core/widgets/forms.dart';
import '../../../l10n/app_localizations.dart';
import '../application/knowledge_controller.dart';
import '../domain/article.dart';
import 'article_body_view.dart';
import 'article_labels.dart';

/// Create (when [article] is null) or edit an article, with a live preview. Resolves to true when saved.
Future<bool> showArticleForm(BuildContext context, WidgetRef ref, {Article? article}) {
  final l10n = AppLocalizations.of(context);
  final title = TextEditingController(text: article?.title);
  final body = TextEditingController(text: article?.body);
  var category = article?.category ?? ArticleCategories.sop;
  var preview = false;
  final validators = Validators(l10n);

  return showFormSheet(
    context,
    title: article == null ? l10n.knowledgeNew : l10n.knowledgeEdit,
    submitLabel: article == null ? l10n.knowledgePublish : l10n.save,
    fields: (context, setState) => [
      TextFormField(
        controller: title,
        autofocus: article == null,
        decoration: InputDecoration(labelText: l10n.knowledgeTitleField, hintText: l10n.knowledgeTitleHint),
        textInputAction: TextInputAction.next,
        maxLength: articleTitleMaxLength,
        validator: validators.required,
      ),
      OptionField<String>(
        label: l10n.knowledgeCategoryField,
        value: category,
        options: ArticleCategories.values,
        labelOf: (value) => articleCategoryLabel(l10n, value),
        onChanged: (value) => setState(() => category = value ?? category),
      ),
      SegmentedButton<bool>(
        segments: [
          ButtonSegment(value: false, icon: const Icon(Icons.edit_note), label: Text(l10n.knowledgeWrite)),
          ButtonSegment(value: true, icon: const Icon(Icons.visibility_outlined), label: Text(l10n.knowledgePreview)),
        ],
        selected: {preview},
        onSelectionChanged: (selection) => setState(() => preview = selection.first),
      ),
      Offstage(
        offstage: preview,
        child: TextFormField(
          controller: body,
          decoration: InputDecoration(
            labelText: l10n.knowledgeBodyField,
            helperText: l10n.knowledgeBodyHint,
            helperMaxLines: 3,
            alignLabelWithHint: true,
          ),
          minLines: 8,
          maxLines: 20,
          maxLength: articleBodyMaxLength,
          keyboardType: TextInputType.multiline,
          validator: validators.required,
        ),
      ),
      if (preview) _Preview(body: body.text),
    ],
    onSubmit: () async {
      final input = ArticleInput(title: title.text.trim(), category: category, body: body.text.trim());
      final actions = ref.read(knowledgeActionsProvider);
      if (article == null) {
        await actions.create(input);
      } else {
        await actions.update(article.id, input);
      }
    },
  );
}

class _Preview extends StatelessWidget {
  const _Preview({required this.body});

  final String body;

  @override
  Widget build(BuildContext context) {
    final tokens = context.tokens;
    final l10n = AppLocalizations.of(context);
    return Container(
      padding: EdgeInsets.all(tokens.lg),
      decoration: BoxDecoration(
        color: tokens.subtle,
        borderRadius: tokens.borderRadius,
        border: Border.all(color: tokens.border),
      ),
      child: body.trim().isEmpty
          ? Text(l10n.knowledgePreviewEmpty, style: TextStyle(color: tokens.muted))
          : ArticleBodyView(body: body),
    );
  }
}
