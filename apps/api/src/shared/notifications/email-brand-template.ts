import { escapeHtml } from './email-html';

export interface BrandedEmailInput {
  preheader?: string;
  eyebrow?: string;
  headline: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  logoUrl: string;
  webAppUrl: string;
}

/** Table-based layout for clients; matches WhizSuite landing (dark mono). */
export function renderBrandedEmail(input: BrandedEmailInput): string {
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<tr><td style="padding:28px 32px 8px;">
          <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#FFFFFF;color:#04110A;font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;text-decoration:none;padding:14px 26px;border-radius:14px;">${escapeHtml(input.ctaLabel)}</a>
        </td></tr>`
      : '';

  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 12px;font-size:11px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:#8D9B98;">${escapeHtml(input.eyebrow)}</p>`
    : '';

  const footer = input.footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8D9B98;">${escapeHtml(input.footerNote)}</p>`
    : `<p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#8D9B98;">WhizSuite — the operating system for social media agencies.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>${escapeHtml(input.headline)}</title>
</head>
<body style="margin:0;padding:0;background:#000000;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader ?? input.headline)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#000000;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#050505;border:1px solid #1f1f1f;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 32px 8px;">
              <img src="${escapeHtml(input.logoUrl)}" width="168" alt="WhizSuite" style="display:block;border:0;height:auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 0;font-family:Inter,Helvetica,Arial,sans-serif;color:#FFFFFF;">
              ${eyebrow}
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:400;letter-spacing:-0.03em;line-height:1.15;color:#FFFFFF;">${escapeHtml(input.headline)}</h1>
              <div style="font-size:14px;line-height:1.65;color:#D1D1D1;">${input.bodyHtml}</div>
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:8px 32px 28px;font-family:Inter,Helvetica,Arial,sans-serif;">
              ${footer}
              <p style="margin:12px 0 0;font-size:11px;color:#5c6b68;"><a href="${escapeHtml(input.webAppUrl)}" style="color:#8D9B98;text-decoration:underline;">${escapeHtml(input.webAppUrl.replace(/^https?:\/\//, ''))}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
