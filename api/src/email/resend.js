import { Resend } from 'resend';

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function appBaseUrl() {
  return (process.env.APP_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
}

function fromAddress() {
  return process.env.EMAIL_FROM || 'Symbius <onboarding@resend.dev>';
}

function esc(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout({ title, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#888;">
              Symbius
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              ${bodyHtml}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:12px;color:#999;">Symbius · contratos digitais</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildReadyToSignEmail({
  clientName,
  contractNumber,
  companyName,
  signUrl,
}) {
  const name = clientName || 'tudo bem';
  const company = companyName || 'Symbius';
  const subject = `Seu contrato ${contractNumber || ''} está pronto para assinatura`.trim();
  const html = layout({
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.25;">
        Seu contrato está pronto para assinatura
      </h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#333;">
        Olá, <strong>${esc(name)}</strong>! Como vai?
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#444;">
        Seu contrato com a <strong>${esc(company)}</strong> já está disponível.
        Revise as informações e, quando estiver tudo certo, finalize a assinatura digitalmente.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f7f7f7;border-radius:12px;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Status do contrato</p>
            <p style="margin:0;font-size:16px;font-weight:600;color:#111;">Aguardando assinatura</p>
            ${
              contractNumber
                ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">${esc(contractNumber)}</p>`
                : ''
            }
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;">
        <a href="${esc(signUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:600;">
          Assinar contrato
        </a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;color:#888;">
        Se precisar de suporte, responda este e-mail. O link de assinatura expira em 14 dias.
      </p>
    `,
  });
  return { subject, html };
}

export function buildSignedEmail({
  clientName,
  contractNumber,
  companyName,
  viewUrl,
}) {
  const name = clientName || 'tudo bem';
  const company = companyName || 'Symbius';
  const subject = `Contrato ${contractNumber || ''} assinado`.trim();
  const html = layout({
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.25;">
        Contrato assinado com sucesso
      </h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55;color:#333;">
        Olá, <strong>${esc(name)}</strong>!
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#444;">
        A assinatura digital do contrato com a <strong>${esc(company)}</strong> foi registrada.
        Segue em anexo o comprovante e o link permanente do documento.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;background:#f7f7f7;border-radius:12px;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Status do contrato</p>
            <p style="margin:0;font-size:16px;font-weight:600;color:#111;">Assinado</p>
            ${
              contractNumber
                ? `<p style="margin:8px 0 0;font-size:13px;color:#666;">${esc(contractNumber)}</p>`
                : ''
            }
          </td>
        </tr>
      </table>
      <p style="margin:0 0 24px;">
        <a href="${esc(viewUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:600;">
          Ver contrato
        </a>
      </p>
    `,
  });
  return { subject, html };
}

const DEFAULT_INTERNAL_NOTIFY = [
  'bruno@symbius.com.br',
  'raul@symbius.com.br',
];

export function internalContractNotifyRecipients() {
  const fromEnv = String(process.env.INTERNAL_CONTRACT_NOTIFY || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length ? fromEnv : [...DEFAULT_INTERNAL_NOTIFY];
}

const moneyBr = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return moneyBr.format(0);
  return moneyBr.format(n);
}

function valueRow(label, value) {
  return `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#666;border-bottom:1px solid #eee;">${esc(label)}</td>
      <td style="padding:8px 0;font-size:14px;font-weight:600;color:#111;text-align:right;border-bottom:1px solid #eee;">${esc(value)}</td>
    </tr>
  `;
}

function commercialValuesHtml({
  setupEnabled,
  setupPrice,
  setupTitle,
  feeEnabled,
  feePrice,
  feeTitle,
  commissionEnabled,
  commissionEstimate,
  mediaEnabled,
  mediaMonthlyBudget,
}) {
  const rows = [];
  if (setupEnabled !== false && Number(setupPrice) > 0) {
    rows.push(valueRow(setupTitle || 'Setup', formatMoney(setupPrice)));
  }
  if (feeEnabled !== false && Number(feePrice) > 0) {
    rows.push(valueRow(feeTitle || 'Fee mensal', formatMoney(feePrice)));
  }
  if (commissionEnabled) {
    rows.push(
      valueRow(
        'Comissão estimada',
        Number(commissionEstimate) > 0
          ? formatMoney(commissionEstimate)
          : 'Ativa (sem estimativa)',
      ),
    );
  }
  if (mediaEnabled && Number(mediaMonthlyBudget) > 0) {
    rows.push(valueRow('Verba de mídia / mês', formatMoney(mediaMonthlyBudget)));
  }
  if (!rows.length) {
    rows.push(valueRow('Valores', 'Não informados no momento'));
  }
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;">
      ${rows.join('')}
    </table>
  `;
}

export function buildInternalContractCreatedEmail({
  clientName,
  contractNumber,
  setupEnabled,
  setupPrice,
  setupTitle,
  feeEnabled,
  feePrice,
  feeTitle,
  commissionEnabled,
  commissionEstimate,
  mediaEnabled,
  mediaMonthlyBudget,
  adminUrl,
}) {
  const client = clientName || 'Cliente';
  const subject = `Contrato gerado · ${client}`;
  const html = layout({
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.25;">
        Contrato gerado
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#444;">
        Um novo contrato foi gerado para <strong>${esc(client)}</strong>.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;background:#f7f7f7;border-radius:12px;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Cliente</p>
            <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">${esc(client)}</p>
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Contrato</p>
            <p style="margin:0;font-size:15px;color:#333;">${esc(contractNumber || '—')}</p>
            ${commercialValuesHtml({
              setupEnabled,
              setupPrice,
              setupTitle,
              feeEnabled,
              feePrice,
              feeTitle,
              commissionEnabled,
              commissionEstimate,
              mediaEnabled,
              mediaMonthlyBudget,
            })}
          </td>
        </tr>
      </table>
      ${
        adminUrl
          ? `<p style="margin:20px 0 0;">
              <a href="${esc(adminUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:600;">
                Abrir no CRM
              </a>
            </p>`
          : ''
      }
    `,
  });
  return { subject, html };
}

export function buildInternalContractSignedEmail({
  clientName,
  contractNumber,
  signerName,
  signerEmail,
  signedAt,
  setupEnabled,
  setupPrice,
  setupTitle,
  feeEnabled,
  feePrice,
  feeTitle,
  commissionEnabled,
  commissionEstimate,
  mediaEnabled,
  mediaMonthlyBudget,
  viewUrl,
}) {
  const client = clientName || 'Cliente';
  const subject = `Contrato assinado · ${client}`;
  const signedLabel = signedAt
    ? new Date(signedAt).toLocaleString('pt-BR')
    : 'agora';
  const html = layout({
    title: subject,
    bodyHtml: `
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.25;">
        Contrato assinado
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#444;">
        O contrato de <strong>${esc(client)}</strong> foi assinado.
      </p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 8px;background:#f7f7f7;border-radius:12px;">
        <tr>
          <td style="padding:16px 18px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Cliente</p>
            <p style="margin:0 0 12px;font-size:16px;font-weight:600;color:#111;">${esc(client)}</p>
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Contrato</p>
            <p style="margin:0 0 12px;font-size:15px;color:#333;">${esc(contractNumber || '—')}</p>
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;color:#888;">Assinante</p>
            <p style="margin:0;font-size:15px;color:#333;">
              ${esc(signerName || '—')}
              ${signerEmail ? ` · ${esc(signerEmail)}` : ''}
            </p>
            <p style="margin:8px 0 0;font-size:13px;color:#666;">Assinado em ${esc(signedLabel)}</p>
            ${commercialValuesHtml({
              setupEnabled,
              setupPrice,
              setupTitle,
              feeEnabled,
              feePrice,
              feeTitle,
              commissionEnabled,
              commissionEstimate,
              mediaEnabled,
              mediaMonthlyBudget,
            })}
          </td>
        </tr>
      </table>
      ${
        viewUrl
          ? `<p style="margin:20px 0 0;">
              <a href="${esc(viewUrl)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:14px 22px;border-radius:999px;font-size:15px;font-weight:600;">
                Ver contrato
              </a>
            </p>`
          : ''
      }
    `,
  });
  return { subject, html };
}

/**
 * @param {{ to: string|string[], subject: string, html: string, attachments?: Array<{filename:string,content:Buffer}> }} opts
 */
export async function sendEmail({ to, subject, html, attachments }) {
  const client = getClient();
  if (!client) {
    const err = new Error(
      'E-mail não configurado. Defina RESEND_API_KEY e EMAIL_FROM.',
    );
    err.code = 'EMAIL_NOT_CONFIGURED';
    throw err;
  }

  const payload = {
    from: fromAddress(),
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
  };

  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
    }));
  }

  const { data, error } = await client.emails.send(payload);
  if (error) {
    const err = new Error(error.message || 'Falha ao enviar e-mail');
    err.code = 'EMAIL_SEND_FAILED';
    err.cause = error;
    throw err;
  }
  return data;
}
