/** Cabeçalho padrão das seções do painel (título + ações no topo) */
export default function ClientPanelSection({
  title,
  meta,
  actions,
  children,
  error,
}) {
  return (
    <div className="cp-section">
      <div className="cp-section__head">
        <div className="cp-section__titles">
          <h1>{title}</h1>
          {meta ? <span className="cp-muted">{meta}</span> : null}
        </div>
        {actions?.length > 0 && (
          <div className="cp-toolbar">{actions}</div>
        )}
      </div>
      {error && <p className="prop-error">{error}</p>}
      <div className="cp-section__body">{children}</div>
    </div>
  );
}
