import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/widgets/page_scaffold.dart';
import '../application/session_controller.dart';
import '../data/auth_repository.dart';

/// Opens a shareable portal access token (from `/portal-access?token=` deep link or paste).
class PortalAccessScreen extends ConsumerStatefulWidget {
  const PortalAccessScreen({super.key, this.token});

  final String? token;

  @override
  ConsumerState<PortalAccessScreen> createState() => _PortalAccessScreenState();
}

class _PortalAccessScreenState extends ConsumerState<PortalAccessScreen> {
  final _formKey = GlobalKey<FormState>();
  late final _token = TextEditingController(text: widget.token ?? '');
  final _email = TextEditingController();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _password = TextEditingController();

  bool _loading = false;
  bool _passwordRequired = false;
  bool _setPassword = false;
  String? _orgName;
  String? _clientName;
  String? _error;

  @override
  void initState() {
    super.initState();
    if ((widget.token ?? '').isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadPreview());
    }
  }

  @override
  void dispose() {
    _token.dispose();
    _email.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _loadPreview() async {
    final token = _token.text.trim();
    if (token.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final preview = await ref.read(authRepositoryProvider).previewPortalAccess(token);
      if (!mounted) return;
      setState(() {
        _orgName = preview['organizationName'] as String?;
        _clientName = preview['clientName'] as String?;
        _passwordRequired = preview['passwordRequired'] == true;
        _setPassword = _passwordRequired;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.detail ?? e.title ?? 'This link is invalid or expired.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ref.read(sessionProvider.notifier).redeemPortalAccess(
            token: _token.text.trim(),
            email: _email.text.trim(),
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            password: _setPassword ? _password.text : null,
          );
      if (mounted) context.go('/home');
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _error = e.detail ?? e.title ?? 'Could not open portal access.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = _clientName ?? _orgName ?? 'Client portal';
    return PageScaffold(
      title: title,
      showShellActions: false,
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              _orgName == null
                  ? 'Enter the access link token from your agency, or open the shared URL in the app.'
                  : 'Continue as a guest or create a login for $_orgName.',
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _token,
              decoration: const InputDecoration(labelText: 'Access token'),
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              onFieldSubmitted: (_) => _loadPreview(),
            ),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton(onPressed: _loading ? null : _loadPreview, child: const Text('Check link')),
            ),
            TextFormField(
              controller: _firstName,
              decoration: const InputDecoration(labelText: 'First name'),
              textCapitalization: TextCapitalization.words,
              validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            TextFormField(
              controller: _lastName,
              decoration: const InputDecoration(labelText: 'Last name'),
              textCapitalization: TextCapitalization.words,
            ),
            TextFormField(
              controller: _email,
              decoration: const InputDecoration(labelText: 'Email'),
              keyboardType: TextInputType.emailAddress,
              validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
            ),
            if (!_passwordRequired)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Set a permanent password now'),
                value: _setPassword,
                onChanged: _loading ? null : (v) => setState(() => _setPassword = v),
              ),
            if (_setPassword)
              TextFormField(
                controller: _password,
                decoration: InputDecoration(
                  labelText: _passwordRequired ? 'Password' : 'Choose a password',
                ),
                obscureText: true,
                validator: (v) {
                  if (!_setPassword) return null;
                  if (v == null || v.length < 12) return 'At least 12 characters';
                  return null;
                },
              ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Text('Continue to portal'),
            ),
          ],
        ),
      ),
    );
  }
}
