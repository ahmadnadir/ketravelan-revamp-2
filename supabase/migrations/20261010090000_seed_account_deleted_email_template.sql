-- Account deletion confirmation email, managed from the admin Notification Center.
-- Rendered by the delete-account edge function (not notification-dispatcher: the user no longer exists).
-- Placeholders: {{recipient_name}} (falls back to "there"), {{deletion_line}}.
-- Safe to re-run: admin edits to an existing row are never overwritten.

INSERT INTO public.notification_templates
  (type, title_template, message_template, email_subject_template, email_html_template, email_text_template, variables, channels, is_active)
SELECT
  'account_deleted',
  'Account deleted',
  'Your Ketravelan account has been deleted',
  'Your Ketravelan account has been deleted',
  $html$<!doctype html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /><title>Ketravelan</title></head><body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial"><div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">Your Ketravelan account has been deleted.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);"><tr><td align="center" style="padding:24px 20px"><img src="https://ketravelan.com/ketravelan_logo.png" alt="Ketravelan" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td></tr><tr><td style="height:1px;background:#e5e7eb" aria-hidden="true"></td></tr><tr><td style="padding:28px"><h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">Account deletion confirmed</h1><div style="font-size:15px;line-height:1.65;color:#475569;text-align:center">Hi <strong>{{recipient_name}}</strong>,<br><br>{{deletion_line}}<br><br>We are grateful for the time you spent with Ketravelan. Your presence was truly appreciated, and we hope our platform served you well.<br><br>Wishing you success and great journeys ahead.</div></td></tr><tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">If this was not you, please contact us immediately at <a href="mailto:support@ketravelan.com" style="color:#2563eb">support@ketravelan.com</a>.<br><br><strong>The Ketravelan Crew</strong></td></tr></table></td></tr></table></body></html>$html$,
  $text$Hi {{recipient_name}},

{{deletion_line}}

We are grateful for the time you spent with Ketravelan. Your presence was truly appreciated, and we hope our platform served you well.

Wishing you success and great journeys ahead.

If this was not you, please contact us immediately at support@ketravelan.com.

The Ketravelan Crew$text$,
  '["recipient_name","deletion_line"]'::jsonb,
  ARRAY['email']::text[],
  true
WHERE NOT EXISTS (SELECT 1 FROM public.notification_templates t WHERE t.type = 'account_deleted');
