function formatSignedAt(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return String(value);
  }
}

function partyDocumentLabel(client, fallbackDocument) {
  if (client?.document) {
    const kind = client.documentType === 'cpf' ? 'CPF' : 'CNPJ';
    return `${kind} nº ${client.document}`;
  }
  if (fallbackDocument) {
    return fallbackDocument;
  }
  return null;
}

function partyDisplayName(client, fallbackName) {
  return (
    client?.legalName ||
    client?.tradeName ||
    fallbackName ||
    null
  );
}

export default function SignatureStamp({
  signature,
  client,
  partyName,
  partyDocument,
  compact = false,
}) {
  if (!signature?.signed && !signature?.signedAt) return null;

  const companyName = partyDisplayName(client, partyName);
  const documentLine =
    partyDocumentLabel(client, partyDocument) ||
    (signature.signerDocument
      ? `Documento ${signature.signerDocument}`
      : null);
  const hash = signature.contentHash
    ? `${signature.contentHash.slice(0, 12)}…`
    : null;
  const signerName = signature.signerName || null;

  return (
    <aside
      className={`signature-stamp${compact ? ' signature-stamp--compact' : ''}`}
      aria-label="Evidência de assinatura eletrônica"
    >
      <p className="signature-stamp__label">Assinado eletronicamente</p>
      {companyName ? (
        <p className="signature-stamp__name">{companyName}</p>
      ) : (
        <p className="signature-stamp__name">
          {signerName || 'Signatário'}
        </p>
      )}
      {documentLine && (
        <p className="signature-stamp__doc">{documentLine}</p>
      )}
      {companyName && signerName && (
        <p className="signature-stamp__meta">
          Representante: {signerName}
        </p>
      )}
      <p className="signature-stamp__meta">
        {formatSignedAt(signature.signedAt)}
        {signature.signerEmail ? ` · ${signature.signerEmail}` : ''}
      </p>
      {(signature.signerIp || hash) && (
        <p className="signature-stamp__meta">
          {[
            signature.signerIp ? `IP ${signature.signerIp}` : null,
            hash ? `Hash ${hash}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}
    </aside>
  );
}
