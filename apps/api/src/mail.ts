import { createModuleLogger } from './logger.js';
import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from './config.js';

const log = createModuleLogger('mail');

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

export async function sendVerificationEmail(email: string, url: string): Promise<void> {
  if (!BREVO_API_KEY) {
    log.warn('Brevo API key not configured — skipping email send');
    return;
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f4f6;margin:0;padding:24px">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table style="max-width:480px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
<tr><td style="padding:32px 24px 0;text-align:center">
<img src="https://app.qwenweaver.xyz/logo.png" alt="QwenWeaver" style="height:32px" />
<h2 style="margin:16px 0 8px;font-size:20px;color:#1e293b">Verify your email</h2>
<p style="color:#64748b;font-size:14px;line-height:1.5;margin:0 0 24px">
Click the button below to verify your email address and activate your QwenWeaver account.</p>
<a href="${url}" style="display:inline-block;padding:12px 32px;background:#1e293b;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Verify Email</a>
<p style="color:#94a3b8;font-size:12px;margin-top:24px">This link expires in 24 hours.</p>
</td></tr>
<tr><td style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8">
QwenWeaver &mdash; Multi-Agent Orchestration Platform</td></tr>
</table></td></tr></table>
</body></html>`;

  try {
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { email: BREVO_SENDER_EMAIL, name: BREVO_SENDER_NAME },
        to: [{ email }],
        subject: 'Verify your email address',
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      log.error({ status: res.status, body }, 'Brevo API error');
    } else {
      log.info({ email }, 'Verification email sent via Brevo');
    }
  } catch (err) {
    log.error({ err, email }, 'Failed to send verification email');
  }
}
