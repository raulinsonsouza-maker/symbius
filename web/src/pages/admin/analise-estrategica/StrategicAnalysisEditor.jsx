import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../../lib/api';

function linesToText(arr) {
  return (Array.isArray(arr) ? arr : []).join('\n');
}

function textToLines(text) {
  return String(text || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function ensureReport(report) {
  const r = report && typeof report === 'object' ? report : {};
  return {
    heroDiagnosis: r.heroDiagnosis || '',
    highlights: Array.isArray(r.highlights) ? r.highlights : [],
    consolidatedReading: r.consolidatedReading || '',
    maturity: Array.isArray(r.maturity) ? r.maturity : [],
    opportunities: Array.isArray(r.opportunities) ? r.opportunities : [],
    roadmap: {
      short: {
        when: r.roadmap?.short?.when || '0 – 3 MESES',
        title: r.roadmap?.short?.title || 'Curto prazo',
        items: Array.isArray(r.roadmap?.short?.items)
          ? r.roadmap.short.items
          : [],
      },
      medium: {
        when: r.roadmap?.medium?.when || '3 – 9 MESES',
        title: r.roadmap?.medium?.title || 'Médio prazo',
        items: Array.isArray(r.roadmap?.medium?.items)
          ? r.roadmap.medium.items
          : [],
      },
      long: {
        when: r.roadmap?.long?.when || '9 – 18 MESES',
        title: r.roadmap?.long?.title || 'Longo prazo',
        items: Array.isArray(r.roadmap?.long?.items)
          ? r.roadmap.long.items
          : [],
      },
    },
    perception: {
      text: r.perception?.text || '',
      highlight: r.perception?.highlight || '',
    },
    closing: {
      title: r.closing?.title || '',
      paragraphs: Array.isArray(r.closing?.paragraphs)
        ? r.closing.paragraphs
        : [],
    },
  };
}

export default function StrategicAnalysisEditor() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [clientName, setClientName] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [report, setReport] = useState(ensureReport());
  const [gptOutput, setGptOutput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getStrategicAnalysis(id);
      setAnalysis(data);
      setClientName(data.clientName || '');
      setWhatsappMessage(data.whatsappMessage || '');
      setReport(ensureReport(data.report));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const exportPrompt = analysis?.sourceSnapshot?.exportPrompt || '';
  const isReady = analysis?.status === 'ready';

  async function copyPrompt() {
    if (!exportPrompt) return;
    try {
      await navigator.clipboard.writeText(exportPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      setError('Não foi possível copiar o prompt');
    }
  }

  async function copyLink() {
    if (!analysis?.publicSlug) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/a/${analysis.publicSlug}`,
      );
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      setError('Não foi possível copiar o link');
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!gptOutput.trim()) return;
    setImporting(true);
    setError('');
    try {
      const updated = await api.importStrategicAnalysis(id, {
        rawText: gptOutput,
      });
      setAnalysis(updated);
      setReport(ensureReport(updated.report));
      setGptOutput('');
    } catch (err) {
      setError(err.message);
      await load();
    } finally {
      setImporting(false);
    }
  }

  function updateHighlight(index, field, value) {
    setReport((prev) => {
      const highlights = [...prev.highlights];
      highlights[index] = { ...highlights[index], [field]: value };
      return { ...prev, highlights };
    });
  }

  function updateMaturity(index, field, value) {
    setReport((prev) => {
      const maturity = [...prev.maturity];
      maturity[index] = {
        ...maturity[index],
        [field]: field === 'score' ? Number(value) || 0 : value,
      };
      return { ...prev, maturity };
    });
  }

  function updateOpportunity(index, field, value) {
    setReport((prev) => {
      const opportunities = [...prev.opportunities];
      opportunities[index] = { ...opportunities[index], [field]: value };
      return { ...prev, opportunities };
    });
  }

  function updateRoadmap(phase, field, value) {
    setReport((prev) => ({
      ...prev,
      roadmap: {
        ...prev.roadmap,
        [phase]: {
          ...prev.roadmap[phase],
          [field]: field === 'items' ? textToLines(value) : value,
        },
      },
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const updated = await api.updateStrategicAnalysis(id, {
        clientName,
        whatsappMessage,
        report,
      });
      setAnalysis(updated);
      setSavedAt(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-shell sa-admin">
        <main className="admin-shell__main">
          <p className="sa-muted">Carregando…</p>
        </main>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="admin-shell sa-admin">
        <main className="admin-shell__main">
          <p className="sa-error">{error || 'Análise não encontrada'}</p>
          <Link to="/admin/analise-estrategica">← Voltar</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell sa-admin">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin/analise-estrategica" className="sa-admin__back">
            ← Análises
          </Link>
          <span className="admin-shell__label">
            {clientName || 'Análise'}
          </span>
        </div>
        {isReady ? (
          <div className="sa-editor__header-actions">
            <a
              className="sa-btn sa-btn--ghost"
              href={`/a/${analysis.publicSlug}`}
              target="_blank"
              rel="noreferrer"
            >
              Abrir LP
            </a>
            <button type="button" className="sa-btn sa-btn--ghost" onClick={copyLink}>
              {copiedLink ? 'Copiado' : 'Copiar link'}
            </button>
          </div>
        ) : null}
      </header>

      <main className="admin-shell__main sa-admin__main">
        {error ? <p className="sa-error">{error}</p> : null}

        {!isReady ? (
          <section className="sa-editor__section sa-flow">
            <h2>Montar com GPT gratuito</h2>
            <ol className="sa-flow__steps">
              <li>Copie o prompt abaixo</li>
              <li>Cole no ChatGPT (ou outro GPT gratuito)</li>
              <li>Cole a saída JSON aqui e clique em Montar análise</li>
            </ol>

            <label className="sa-field">
              <span>Prompt</span>
              <textarea rows={12} value={exportPrompt} readOnly />
            </label>
            <button
              type="button"
              className="sa-btn sa-btn--primary"
              onClick={copyPrompt}
              disabled={!exportPrompt}
            >
              {copiedPrompt ? 'Prompt copiado' : 'Copiar prompt'}
            </button>

            <form className="sa-flow__import" onSubmit={handleImport}>
              <label className="sa-field">
                <span>Saída do GPT</span>
                <textarea
                  rows={10}
                  placeholder="Cole aqui o JSON que o GPT devolver…"
                  value={gptOutput}
                  onChange={(e) => setGptOutput(e.target.value)}
                />
              </label>
              <button
                type="submit"
                className="sa-btn sa-btn--primary"
                disabled={importing || !gptOutput.trim()}
              >
                {importing ? 'Montando…' : 'Montar análise'}
              </button>
            </form>
          </section>
        ) : (
          <p className="sa-banner">
            Análise pronta.{' '}
            <a href={`/a/${analysis.publicSlug}`} target="_blank" rel="noreferrer">
              Abrir LP pública
            </a>
            . Ajuste os textos abaixo se quiser.
          </p>
        )}

        {isReady ? (
          <form className="sa-editor" onSubmit={handleSave}>
            <section className="sa-editor__section">
              <h2>Dados</h2>
              <label className="sa-field">
                <span>Cliente</span>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </label>
              <label className="sa-field">
                <span>Mensagem WhatsApp (CTA)</span>
                <textarea
                  rows={2}
                  value={whatsappMessage}
                  onChange={(e) => setWhatsappMessage(e.target.value)}
                />
              </label>
            </section>

            <section className="sa-editor__section">
              <h2>Hero</h2>
              <label className="sa-field">
                <span>Diagnóstico</span>
                <textarea
                  rows={2}
                  value={report.heroDiagnosis}
                  onChange={(e) =>
                    setReport((p) => ({ ...p, heroDiagnosis: e.target.value }))
                  }
                />
              </label>
            </section>

            <section className="sa-editor__section">
              <h2>01 — Destaques</h2>
              {report.highlights.map((h, i) => (
                <div key={i} className="sa-editor__card">
                  <label className="sa-field">
                    <span>Título</span>
                    <input
                      value={h.title || ''}
                      onChange={(e) =>
                        updateHighlight(i, 'title', e.target.value)
                      }
                    />
                  </label>
                  <label className="sa-field">
                    <span>Texto</span>
                    <textarea
                      rows={2}
                      value={h.body || ''}
                      onChange={(e) =>
                        updateHighlight(i, 'body', e.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
              <label className="sa-field">
                <span>Leitura consolidada</span>
                <textarea
                  rows={3}
                  value={report.consolidatedReading}
                  onChange={(e) =>
                    setReport((p) => ({
                      ...p,
                      consolidatedReading: e.target.value,
                    }))
                  }
                />
              </label>
            </section>

            <section className="sa-editor__section">
              <h2>02 — Maturidade</h2>
              {report.maturity.map((m, i) => (
                <div key={i} className="sa-editor__maturity">
                  <input
                    value={m.label || ''}
                    onChange={(e) => updateMaturity(i, 'label', e.target.value)}
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={m.score ?? 0}
                    onChange={(e) =>
                      updateMaturity(i, 'score', e.target.value)
                    }
                  />
                </div>
              ))}
            </section>

            <section className="sa-editor__section">
              <h2>03 — Oportunidades</h2>
              {report.opportunities.map((o, i) => (
                <div key={i} className="sa-editor__card">
                  <label className="sa-field">
                    <span>Título</span>
                    <input
                      value={o.title || ''}
                      onChange={(e) =>
                        updateOpportunity(i, 'title', e.target.value)
                      }
                    />
                  </label>
                  <label className="sa-field">
                    <span>Corpo</span>
                    <textarea
                      rows={3}
                      value={o.body || ''}
                      onChange={(e) =>
                        updateOpportunity(i, 'body', e.target.value)
                      }
                    />
                  </label>
                  <label className="sa-field">
                    <span>Frentes (uma por linha)</span>
                    <textarea
                      rows={2}
                      value={linesToText(o.fronts)}
                      onChange={(e) =>
                        updateOpportunity(
                          i,
                          'fronts',
                          textToLines(e.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="sa-field">
                    <span>Impacto (uma por linha)</span>
                    <textarea
                      rows={2}
                      value={linesToText(o.impact)}
                      onChange={(e) =>
                        updateOpportunity(
                          i,
                          'impact',
                          textToLines(e.target.value),
                        )
                      }
                    />
                  </label>
                </div>
              ))}
            </section>

            <section className="sa-editor__section">
              <h2>04 — Roadmap</h2>
              {['short', 'medium', 'long'].map((phase) => (
                <div key={phase} className="sa-editor__card">
                  <label className="sa-field">
                    <span>Quando</span>
                    <input
                      value={report.roadmap[phase].when}
                      onChange={(e) =>
                        updateRoadmap(phase, 'when', e.target.value)
                      }
                    />
                  </label>
                  <label className="sa-field">
                    <span>Título</span>
                    <input
                      value={report.roadmap[phase].title}
                      onChange={(e) =>
                        updateRoadmap(phase, 'title', e.target.value)
                      }
                    />
                  </label>
                  <label className="sa-field">
                    <span>Itens</span>
                    <textarea
                      rows={3}
                      value={linesToText(report.roadmap[phase].items)}
                      onChange={(e) =>
                        updateRoadmap(phase, 'items', e.target.value)
                      }
                    />
                  </label>
                </div>
              ))}
            </section>

            <section className="sa-editor__section">
              <h2>05 — Percepção</h2>
              <label className="sa-field">
                <span>Texto</span>
                <textarea
                  rows={4}
                  value={report.perception.text}
                  onChange={(e) =>
                    setReport((p) => ({
                      ...p,
                      perception: { ...p.perception, text: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="sa-field">
                <span>Trecho em destaque</span>
                <textarea
                  rows={2}
                  value={report.perception.highlight}
                  onChange={(e) =>
                    setReport((p) => ({
                      ...p,
                      perception: {
                        ...p.perception,
                        highlight: e.target.value,
                      },
                    }))
                  }
                />
              </label>
            </section>

            <section className="sa-editor__section">
              <h2>Closing</h2>
              <label className="sa-field">
                <span>Título</span>
                <input
                  value={report.closing.title}
                  onChange={(e) =>
                    setReport((p) => ({
                      ...p,
                      closing: { ...p.closing, title: e.target.value },
                    }))
                  }
                />
              </label>
              <label className="sa-field">
                <span>Parágrafos</span>
                <textarea
                  rows={3}
                  value={linesToText(report.closing.paragraphs)}
                  onChange={(e) =>
                    setReport((p) => ({
                      ...p,
                      closing: {
                        ...p.closing,
                        paragraphs: textToLines(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            </section>

            <div className="sa-editor__footer">
              <button
                type="submit"
                className="sa-btn sa-btn--primary"
                disabled={saving}
              >
                {saving ? 'Salvando…' : 'Salvar alterações'}
              </button>
              {savedAt ? (
                <span className="sa-muted">Salvo às {savedAt}</span>
              ) : null}
            </div>
          </form>
        ) : null}
      </main>
    </div>
  );
}
