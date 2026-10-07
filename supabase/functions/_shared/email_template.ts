export interface EmailTemplateOptions {
  brand: string;
  title: string;
  messageHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  logoUrl: string;
  preheader?: string;
  footerText?: string;
  signoff?: string;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildHtmlEmail(options: EmailTemplateOptions) {
  const brand = escapeHtml(options.brand);
  const title = escapeHtml(options.title);
  const preheader = escapeHtml(options.preheader ?? `A message from ${options.brand}.`);
  const logoUrl = escapeHtml(options.logoUrl);
  const ctaUrl = options.ctaUrl ? escapeHtml(options.ctaUrl) : undefined;
  const ctaLabel = escapeHtml(options.ctaLabel ?? "Continue");
  const footerText = options.footerText ? escapeHtml(options.footerText) : undefined;
  const signoff = escapeHtml(options.signoff ?? `The ${options.brand} Crew`);

  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width" />',
    `<title>${brand}</title>`,
    '</head>',
    '<body style="margin:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Arial">',
    `<div style="display:none;font-size:1px;color:#f4f6f8;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>`,
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">',
    '<tr><td align="center">',
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 10px 28px rgba(15,23,42,.08);">',
    '<tr><td align="center" style="padding:24px 20px">',
    '<table role="presentation" width="auto" cellspacing="0" cellpadding="0" align="center">',
    '<tr>',
    `<td style="vertical-align:middle"><img src="${logoUrl}" alt="${brand}" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:auto" /></td>`,
    '</tr>',
    '</table>',
    '</td></tr>',
    '<tr><td style="height:1px;background:#e5e7eb;margin:0 28px" aria-hidden="true"></td></tr>',
    '<tr><td style="padding:28px">',
    `<h1 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#020617;text-align:center">${title}</h1>`,
    `<div style="font-size:15px;line-height:1.65;color:#475569;margin-bottom:24px;text-align:center">${options.messageHtml}</div>`,
    ctaUrl
      ? '<table role="presentation" cellspacing="0" cellpadding="0" width="100%"><tr><td align="center">' +
        `<a href="${ctaUrl}" target="_blank" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#000000;color:#ffffff;text-decoration:none;font-weight:600">${ctaLabel}</a>` +
        '</td></tr></table>'
      : '',
    '</td></tr>',
    '<tr><td style="padding:24px 28px;font-size:12px;color:#64748b;line-height:1.6">',
    footerText ? `${footerText}<br><br>` : '',
    ctaUrl ? 'If the button doesn’t work, copy this link:<br>' : '',
    ctaUrl ? `<a href="${ctaUrl}" style="color:#2563eb;word-break:break-all">${ctaUrl}</a><br><br>` : '',
    `<strong>${signoff}</strong>`,
    '</td></tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('');
}