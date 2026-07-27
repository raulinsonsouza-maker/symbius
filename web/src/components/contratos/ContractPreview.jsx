import { resolvePrintLogo } from '../../lib/printLogo';
import { buildLegalContractDocument } from '../../data/contractLegal';
import SignatureStamp from './SignatureStamp';

function ClauseBlocks({ blocks }) {
  if (!blocks?.length) return null;
  return blocks.map((block, i) => {
    if (block.type === 'ul') {
      return (
        <ul key={i} className="contract-sheet__clause-list">
          {(block.items || []).map((item, j) => (
            <li key={j}>{item}</li>
          ))}
        </ul>
      );
    }
    if (block.type === 'table' && block.table) {
      return (
        <table key={i} className="contract-sheet__legal-table">
          <thead>
            <tr>
              {block.table.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => (
                  <td key={ci}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
    return (
      <p key={i} className="contract-sheet__clause-p">
        {block.text}
      </p>
    );
  });
}

export default function ContractPreview({
  contract,
  settings,
  client,
  printId = 'contract-print',
}) {
  const companyName = settings?.legalName || settings?.companyName || 'Symbius';
  const logoSrc = resolvePrintLogo(settings?.logoUrl);
  const doc = buildLegalContractDocument(contract, settings, client);
  const signed =
    contract.signature?.signed ||
    Boolean(contract.signedAt) ||
    contract.status === 'signed';

  return (
    <div id={printId} className="contract-sheet contract-sheet--legal">
      <header className="contract-sheet__header">
        <div className="contract-sheet__brand">
          <img src={logoSrc} alt={companyName} />
        </div>
        <div className="contract-sheet__meta">
          {contract.number && <p>{contract.number}</p>}
          {contract.startDate && <p>Início: {contract.startDate}</p>}
        </div>
      </header>

      <div className="contract-sheet__title-block">
        <h1>{doc.title}</h1>
        <p className="contract-sheet__legal-sub">{doc.subtitle}</p>
        {doc.projectLine && (
          <p className="contract-sheet__project-line">{doc.projectLine}</p>
        )}
      </div>

      <div className="contract-sheet__parties contract-sheet__parties--legal">
        <div>
          <span>{doc.provider.label}</span>
          <strong>{doc.provider.name}</strong>
          {doc.provider.document && <p>{doc.provider.document}</p>}
          {doc.provider.address && <p>{doc.provider.address}</p>}
          {doc.provider.rep && <p>Representante: {doc.provider.rep}</p>}
          {doc.provider.brandNote && (
            <p className="contract-sheet__brand-note">{doc.provider.brandNote}</p>
          )}
        </div>
        <div>
          <span>{doc.clientParty.label}</span>
          <strong>{doc.clientParty.name}</strong>
          {doc.clientParty.document && <p>{doc.clientParty.document}</p>}
          {doc.clientParty.address && <p>{doc.clientParty.address}</p>}
          {doc.clientParty.rep && (
            <p>
              Representante: {doc.clientParty.rep}
              {doc.clientParty.repDoc ? ` — ${doc.clientParty.repDoc}` : ''}
            </p>
          )}
        </div>
      </div>

      <p className="contract-sheet__preamble">{doc.preamble}</p>

      {doc.clauses.map((clause) => (
        <section key={clause.title} className="contract-sheet__clause">
          <h2>{clause.title}</h2>
          <ClauseBlocks blocks={clause.blocks} />
        </section>
      ))}

      <section className="contract-sheet__section contract-sheet__accept">
        <p className="contract-sheet__clause-p">{doc.closing.agreement}</p>
        <p className="contract-sheet__clause-p">{doc.closing.placeDate}</p>

        {signed ? (
          <SignatureStamp
            client={client}
            partyName={doc.clientParty.name}
            partyDocument={doc.clientParty.document}
            signature={
              contract.signature || {
                signed: true,
                signedAt: contract.signedAt,
                signerName: contract.signerName || doc.clientParty.name,
                signerEmail: contract.signerEmail,
                signerDocument: contract.signerDocument,
                signerIp: contract.signerIp,
                contentHash: contract.contentHash,
              }
            }
          />
        ) : (
          <>
            <div className="contract-sheet__signatures">
              <div>
                <span className="contract-sheet__sign-line" />
                <strong>{doc.closing.providerSignName}</strong>
                <p>{doc.closing.providerSignRole}</p>
                <p>{doc.closing.providerSignPerson}</p>
              </div>
              <div>
                <span className="contract-sheet__sign-line" />
                <strong>{doc.closing.clientSignName}</strong>
                <p>{doc.closing.clientSignRole}</p>
                <p>{doc.closing.clientSignPerson}</p>
              </div>
            </div>
            <div className="contract-sheet__witnesses">
              <p className="contract-sheet__witnesses-label">TESTEMUNHAS</p>
              <div className="contract-sheet__signatures">
                <div>
                  <span className="contract-sheet__sign-line" />
                  <p>Nome / CPF</p>
                </div>
                <div>
                  <span className="contract-sheet__sign-line" />
                  <p>Nome / CPF</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
