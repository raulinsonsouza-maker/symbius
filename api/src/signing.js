import { createHash } from 'crypto';
import { customAlphabet } from 'nanoid';

const tokenId = customAlphabet(
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  32,
);

const SIGNING_TTL_DAYS = 14;

export function createSigningToken() {
  return tokenId();
}

export function signingExpiresAt(from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + SIGNING_TTL_DAYS);
  return d;
}

/** Canonical payload used for content integrity hash. */
export function contractHashPayload(contract) {
  return {
    id: contract.id,
    number: contract.number,
    title: contract.title,
    subtitle: contract.subtitle,
    startDate: contract.startDate,
    minTermDays: contract.minTermDays,
    meetingCadenceDays: contract.meetingCadenceDays,
    objective: contract.objective,
    scopeItems: contract.scopeItems || [],
    providerResponsibilities: contract.providerResponsibilities || [],
    clientResponsibilities: contract.clientResponsibilities || [],
    outOfScope: contract.outOfScope || [],
    meetingTopics: contract.meetingTopics || [],
    importantNotes: contract.importantNotes || [],
    setupEnabled: contract.setupEnabled,
    setupTitle: contract.setupTitle,
    setupPrice: contract.setupPrice,
    setupDescription: contract.setupDescription,
    feeEnabled: contract.feeEnabled,
    feeTitle: contract.feeTitle,
    feePrice: contract.feePrice,
    feeDescription: contract.feeDescription,
    commissionEnabled: contract.commissionEnabled,
    commissionBaseLabel: contract.commissionBaseLabel,
    commissionTiers: contract.commissionTiers || [],
    commissionCloseDay: contract.commissionCloseDay,
    commissionPayDay: contract.commissionPayDay,
    mediaEnabled: contract.mediaEnabled,
    mediaMonthlyBudget: contract.mediaMonthlyBudget,
    mediaNotes: contract.mediaNotes,
    acceptanceProviderName: contract.acceptanceProviderName,
    acceptanceClientName: contract.acceptanceClientName,
    providerSignedAt: contract.providerSignedAt || null,
    providerSignerName: contract.providerSignerName || '',
    providerSignerEmail: contract.providerSignerEmail || '',
    providerSignerDocument: contract.providerSignerDocument || '',
  };
}

export function hashContractContent(contract) {
  const json = JSON.stringify(contractHashPayload(contract));
  return createHash('sha256').update(json).digest('hex');
}

export function resolveProviderSigner(settings, contract) {
  const name =
    String(settings?.legalRepName || contract?.acceptanceProviderName || '').trim() ||
    'Bruno Reis';
  const email =
    String(
      settings?.providerSignerEmail ||
        settings?.contactEmail ||
        'bruno@symbius.com.br',
    )
      .trim()
      .toLowerCase() || 'bruno@symbius.com.br';
  const document = String(settings?.legalRepDocument || '').trim();
  return { name, email, document };
}

export function isSigningTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

export function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '';
}

export function publicSignatureView(contract) {
  if (!contract) return null;
  const signed = Boolean(contract.signedAt) || contract.status === 'signed';
  const providerSigned = Boolean(contract.providerSignedAt);
  return {
    signed,
    signedAt: contract.signedAt || null,
    signerName: contract.signerName || '',
    signerEmail: contract.signerEmail || '',
    signerDocument: contract.signerDocument || '',
    contentHash: contract.contentHash || '',
    hasPdf: Boolean(contract.signedPdfPath),
    providerSigned,
    providerSignedAt: contract.providerSignedAt || null,
    providerSignerName: contract.providerSignerName || '',
    providerSignerEmail: contract.providerSignerEmail || '',
    providerSignerDocument: contract.providerSignerDocument || '',
  };
}

export function stripSigningSecrets(contract) {
  if (!contract) return null;
  const {
    signingToken: _t,
    signingTokenExpiresAt: _e,
    signedPdfPath: _p,
    ...rest
  } = contract;
  return {
    ...rest,
    signature: publicSignatureView(contract),
  };
}
