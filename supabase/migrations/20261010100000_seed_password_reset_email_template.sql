-- Password reset email, managed from the admin Notification Center.
-- Rendered by the send-password-reset edge function (not notification-dispatcher).
-- Placeholder: {{action_url}} (the one-time recovery link).
-- Safe to re-run: admin edits to an existing row are never overwritten.

INSERT INTO public.notification_templates
  (type, title_template, message_template, email_subject_template, email_html_template, email_text_template, variables, channels, is_active)
SELECT
  'password_reset',
  'Reset your password',
  'Use the link we emailed you to reset your Ketravelan password',
  'Reset your Ketravelan password',
  $html$<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>Ketravelan</title></head><body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial"><div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Reset your Ketravelan password.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);"><tr><td align="center" style="padding:24px 20px"><img src="https://ketravelan.com/ketravelan_logo.png" alt="Ketravelan" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td></tr><tr><td style="height:1px;background:#e5e7eb" aria-hidden="true"></td></tr><tr><td style="padding:28px"><h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">Reset your password</h1><div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">We received a request to reset the password for your Ketravelan account. Tap the button below to choose a new one.</div><table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center"><a href="{{action_url}}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">Reset Password</a></td></tr></table></td></tr><tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">If you didn’t request this, you can safely ignore this email — your password won’t change.<br><br>If the button doesn’t work, copy this link:<br><a href="{{action_url}}" style="color:#2563eb;word-break:break-all">{{action_url}}</a><br><br><strong>The Ketravelan Crew</strong></td></tr></table></td></tr></table></body></html>$html$,
  $text$Reset your password

We received a request to reset the password for your Ketravelan account. Open the link below to choose a new one:

{{action_url}}

If you didn't request this, you can safely ignore this email. Your password won't change.

The Ketravelan Crew$text$,
  '["action_url"]'::jsonb,
  ARRAY['email']::text[],
  true
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates t WHERE t.type = 'password_reset');
