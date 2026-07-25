import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';
import {
  createBlankDraft,
  createBrandGrowthDraft,
  createSocialDraft,
} from '../../../data/proposalTemplates';
import { downloadProposalPdf } from '../../../lib/proposalPdf';
import ProposalPreview from '../../../components/propostas/ProposalPreview';
import SettingsModal from '../../../components/propostas/SettingsModal';

function BlockEditor({
  enabled,
  onToggle,
  title,
  onTitle,
  price,
  onPrice,
  footer,
  onFooter,
  services,
  selectedIds,
  onToggleService,
  natureLabel,
}) {
  return (
    <section className={`prop-block ${enabled ? 'is-on' : 'is-off'}`}>
      <header className="prop-block__header">
        <label className="prop-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span>{title || 'Bloco'}</span>
        </label>
        <span className="prop-block__nature">{natureLabel}</span>
      </header>

      {enabled && (
        <div className="prop-block__body">
          <div className="prop-form-row">
            <label>
              Nome da linha
              <input value={title} onChange={(e) => onTitle(e.target.value)} />
            </label>
            <label>
              Preço da linha
              <input
                type="number"
                min="0"
                step="100"
                value={price}
                onChange={(e) => onPrice(Number(e.target.value))}
              />
            </label>
          </div>
          <label className="prop-full">
            Rodapé do item
            <input value={footer} onChange={(e) => onFooter(e.target.value)} />
          </label>
          <div className="prop-checklist">
            <p>Serviços inclusos</p>
            <div className="prop-checklist__grid">
              {services.map((service) => (
                <label key={service.id} className="prop-check">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(service.id)}
                    onChange={() => onToggleService(service.id)}
                  />
                  <span>{service.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function ProposalEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'nova';
  const navigate = useNavigate();
  const previewRef = useRef(null);

  const [proposal, setProposal] = useState(null);
  const [settings, setSettings] = useState(null);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savedId, setSavedId] = useState(isNew ? null : id);

  const setupServices = useMemo(
    () => services.filter((s) => s.block === 'setup' && s.active),
    [services],
  );
  const operationServices = useMemo(
    () => services.filter((s) => s.block === 'operacao' && s.active),
    [services],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setLoading(true);
      setError('');
      try {
        const [settingsData, servicesData] = await Promise.all([
          api.getSettings(),
          api.listServices(),
        ]);
        if (cancelled) return;
        setSettings(settingsData);
        setServices(servicesData);

        if (isNew) {
          setProposal(createBrandGrowthDraft(settingsData, servicesData));
        } else {
          const existing = await api.getProposal(id);
          if (cancelled) return;
          setProposal(existing);
          setSavedId(existing.id);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  function patch(partial) {
    setProposal((prev) => ({ ...prev, ...partial }));
  }

  function toggleService(field, serviceId) {
    setProposal((prev) => {
      const current = prev[field] || [];
      const next = current.includes(serviceId)
        ? current.filter((x) => x !== serviceId)
        : [...current, serviceId];
      return { ...prev, [field]: next };
    });
  }

  function applyTemplate(template) {
    if (!settings) return;
    let draft;
    if (template === 'blank') draft = createBlankDraft(settings);
    else if (template === 'social') draft = createSocialDraft(settings, services);
    else draft = createBrandGrowthDraft(settings, services);
    setProposal((prev) => ({
      ...draft,
      id: prev?.id,
      number: prev?.number,
      publicSlug: prev?.publicSlug,
      clientName: prev?.clientName || '',
      responsibleName: prev?.responsibleName || draft.responsibleName,
      date: prev?.date || draft.date,
    }));
  }

  async function save() {
    if (!proposal) return null;
    setSaving(true);
    setError('');
    try {
      let saved;
      if (savedId) {
        saved = await api.updateProposal(savedId, proposal);
      } else {
        saved = await api.createProposal(proposal);
        setSavedId(saved.id);
        navigate(`/admin/propostas/${saved.id}`, { replace: true });
      }
      setProposal(saved);
      return saved;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handlePdf() {
    const printEl = document.getElementById('proposal-print');
    if (!printEl) return;
    setPdfLoading(true);
    try {
      await save();
      await downloadProposalPdf(printEl, proposal.clientName);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  async function openPublicLp() {
    const saved = await save();
    if (saved?.publicSlug) {
      window.open(`/p/${saved.publicSlug}`, '_blank', 'noopener');
    }
  }

  async function handleGenerateContract() {
    const saved = await save();
    const targetId = saved?.id || savedId;
    if (targetId) {
      navigate(`/admin/propostas/${targetId}/contrato`);
    }
  }

  if (loading || !proposal || !settings) {
    return (
      <div className="admin-shell prop-shell">
        <main className="admin-shell__main">
          <p className="prop-muted">{error || 'Carregando editor…'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell prop-shell">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin/propostas" className="prop-back">
            ← Propostas
          </Link>
          <span className="admin-shell__label">
            {proposal.number || 'Nova proposta'}
          </span>
        </div>
        <div className="prop-header-actions">
          <button
            type="button"
            className="prop-icon-btn"
            aria-label="Configurações"
            onClick={() => setSettingsOpen(true)}
          >
            ⚙
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={openPublicLp}
          >
            Abrir LP
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--ghost lp-btn--sm"
            onClick={handleGenerateContract}
            disabled={saving}
          >
            Gerar contrato
          </button>
          <button
            type="button"
            className="lp-btn lp-btn--solid lp-btn--sm"
            onClick={handlePdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? 'Gerando…' : 'Baixar PDF'}
          </button>
        </div>
      </header>

      <main className="prop-editor">
        {error && <p className="prop-error">{error}</p>}

        <div className="prop-editor__form">
          <section className="prop-card">
            <h3>Template</h3>
            <div className="prop-template-row">
              {[
                ['brandgrowth', 'BrandGrowth'],
                ['social', 'Mídias sociais'],
                ['blank', 'Em branco'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`prop-chip ${proposal.template === value ? 'is-active' : ''}`}
                  onClick={() => applyTemplate(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="prop-card">
            <h3>Identificação</h3>
            <div className="prop-form-row">
              <label>
                Cliente
                <input
                  value={proposal.clientName}
                  onChange={(e) => patch({ clientName: e.target.value })}
                  placeholder="Nome do cliente"
                />
              </label>
              <label>
                Responsável
                <input
                  value={proposal.responsibleName}
                  onChange={(e) => patch({ responsibleName: e.target.value })}
                />
              </label>
            </div>
            <div className="prop-form-row">
              <label>
                Data
                <input
                  value={proposal.date}
                  onChange={(e) => patch({ date: e.target.value })}
                />
              </label>
              <label>
                Título
                <input
                  value={proposal.title}
                  onChange={(e) => patch({ title: e.target.value })}
                />
              </label>
            </div>
            <label className="prop-full">
              Subtítulo
              <input
                value={proposal.subtitle}
                onChange={(e) => patch({ subtitle: e.target.value })}
              />
            </label>
          </section>

          {proposal.template !== 'blank' && (
            <>
              <section className="prop-card">
                <h3>Escopo (bullets)</h3>
                {(proposal.scopeItems || []).map((item, index) => (
                  <div key={`${item}-${index}`} className="prop-inline-form">
                    <input
                      value={item}
                      onChange={(e) => {
                        const next = [...proposal.scopeItems];
                        next[index] = e.target.value;
                        patch({ scopeItems: next });
                      }}
                    />
                    <button
                      type="button"
                      className="prop-link"
                      onClick={() =>
                        patch({
                          scopeItems: proposal.scopeItems.filter(
                            (_, i) => i !== index,
                          ),
                        })
                      }
                    >
                      Remover
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="lp-btn lp-btn--ghost lp-btn--sm"
                  onClick={() =>
                    patch({ scopeItems: [...(proposal.scopeItems || []), ''] })
                  }
                >
                  + Item de escopo
                </button>
              </section>

              <section className="prop-card">
                <h3>Manifesto</h3>
                <textarea
                  rows={4}
                  value={proposal.manifesto}
                  onChange={(e) => patch({ manifesto: e.target.value })}
                />
              </section>

              <BlockEditor
                enabled={proposal.setupEnabled}
                onToggle={(setupEnabled) => patch({ setupEnabled })}
                title={proposal.setupTitle}
                onTitle={(setupTitle) => patch({ setupTitle })}
                price={proposal.setupPrice}
                onPrice={(setupPrice) => patch({ setupPrice })}
                footer={proposal.setupFooter}
                onFooter={(setupFooter) => patch({ setupFooter })}
                services={setupServices}
                selectedIds={proposal.setupServiceIds || []}
                onToggleService={(sid) => toggleService('setupServiceIds', sid)}
                natureLabel="Único"
              />

              <BlockEditor
                enabled={proposal.operationEnabled}
                onToggle={(operationEnabled) => patch({ operationEnabled })}
                title={proposal.operationTitle}
                onTitle={(operationTitle) => patch({ operationTitle })}
                price={proposal.operationPrice}
                onPrice={(operationPrice) => patch({ operationPrice })}
                footer={proposal.operationFooter}
                onFooter={(operationFooter) => patch({ operationFooter })}
                services={operationServices}
                selectedIds={proposal.operationServiceIds || []}
                onToggleService={(sid) =>
                  toggleService('operationServiceIds', sid)
                }
                natureLabel="Mensal"
              />

              <section
                className={`prop-block ${proposal.trafficEnabled ? 'is-on' : 'is-off'}`}
              >
                <header className="prop-block__header">
                  <label className="prop-switch">
                    <input
                      type="checkbox"
                      checked={proposal.trafficEnabled}
                      onChange={(e) =>
                        patch({ trafficEnabled: e.target.checked })
                      }
                    />
                    <span>Tráfego pago</span>
                  </label>
                  <span className="prop-block__nature">À parte</span>
                </header>
                {proposal.trafficEnabled && (
                  <div className="prop-block__body">
                    <div className="prop-form-row">
                      <label>
                        Valor
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={proposal.trafficPrice}
                          onChange={(e) =>
                            patch({ trafficPrice: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Rodapé
                        <input
                          value={proposal.trafficFooter}
                          onChange={(e) =>
                            patch({ trafficFooter: e.target.value })
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {proposal.template === 'blank' && (
            <section className="prop-card">
              <h3>Itens de orçamento</h3>
              {(proposal.blankItems || []).map((item, index) => (
                <div key={item.id} className="prop-blank-item">
                  <input
                    placeholder="Descrição"
                    value={item.description}
                    onChange={(e) => {
                      const blankItems = [...proposal.blankItems];
                      blankItems[index] = {
                        ...item,
                        description: e.target.value,
                      };
                      patch({ blankItems });
                    }}
                  />
                  <input
                    placeholder="Condição"
                    value={item.unitDetail}
                    onChange={(e) => {
                      const blankItems = [...proposal.blankItems];
                      blankItems[index] = {
                        ...item,
                        unitDetail: e.target.value,
                      };
                      patch({ blankItems });
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Valor"
                    value={item.totalValue}
                    onChange={(e) => {
                      const blankItems = [...proposal.blankItems];
                      blankItems[index] = {
                        ...item,
                        totalValue: Number(e.target.value),
                      };
                      patch({ blankItems });
                    }}
                  />
                  <button
                    type="button"
                    className="prop-link"
                    onClick={() =>
                      patch({
                        blankItems: proposal.blankItems.filter(
                          (_, i) => i !== index,
                        ),
                      })
                    }
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="lp-btn lp-btn--ghost lp-btn--sm"
                onClick={() =>
                  patch({
                    blankItems: [
                      ...(proposal.blankItems || []),
                      {
                        id: crypto.randomUUID(),
                        description: '',
                        totalValue: 0,
                        unitDetail: 'Único',
                        footerDetail: '',
                      },
                    ],
                  })
                }
              >
                + Item
              </button>
            </section>
          )}

          <section className="prop-card">
            <h3>Observações</h3>
            {(proposal.observations || []).map((item, index) => (
              <div key={`${item}-${index}`} className="prop-inline-form">
                <input
                  value={item}
                  onChange={(e) => {
                    const observations = [...proposal.observations];
                    observations[index] = e.target.value;
                    patch({ observations });
                  }}
                />
                <button
                  type="button"
                  className="prop-link"
                  onClick={() =>
                    patch({
                      observations: proposal.observations.filter(
                        (_, i) => i !== index,
                      ),
                    })
                  }
                >
                  Remover
                </button>
              </div>
            ))}
            <button
              type="button"
              className="lp-btn lp-btn--ghost lp-btn--sm"
              onClick={() =>
                patch({
                  observations: [...(proposal.observations || []), ''],
                })
              }
            >
              + Observação
            </button>
          </section>
        </div>

        <div className="prop-editor__preview" ref={previewRef}>
          <ProposalPreview
            proposal={proposal}
            settings={settings}
            services={services}
          />
        </div>
      </main>

      {settingsOpen && (
        <SettingsModal
          onClose={async () => {
            setSettingsOpen(false);
            const [s, list] = await Promise.all([
              api.getSettings(),
              api.listServices(),
            ]);
            setSettings(s);
            setServices(list);
          }}
        />
      )}
    </div>
  );
}
