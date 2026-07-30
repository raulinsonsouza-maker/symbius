import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../lib/api';

export default function StrategicAnalysisCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState('form'); // form | prompt | success
  const [clientName, setClientName] = useState('');
  const [channels, setChannels] = useState('');
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [exportPrompt, setExportPrompt] = useState('');
  const [gptOutput, setGptOutput] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!channels.trim()) return;
    setCreating(true);
    setError('');
    try {
      const created = await api.createStrategicAnalysis({
        clientName: clientName.trim(),
        channels: channels.trim(),
      });
      setAnalysis(created);
      setExportPrompt(created?.sourceSnapshot?.exportPrompt || '');
      setStep('prompt');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

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

  async function handleImport(e) {
    e.preventDefault();
    if (!analysis?.id || !gptOutput.trim()) return;
    setImporting(true);
    setError('');
    try {
      const updated = await api.importStrategicAnalysis(analysis.id, {
        rawText: gptOutput,
      });
      setAnalysis(updated);
      setGptOutput('');
      setStep('success');
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  }

  function handleAccessNow() {
    if (analysis?.publicSlug) {
      window.open(`/a/${analysis.publicSlug}`, '_blank', 'noopener,noreferrer');
    }
    navigate('/admin/analise-estrategica');
  }

  const label = analysis?.clientName || clientName.trim() || 'Nova análise';

  return (
    <div className="admin-shell sa-admin">
      <header className="admin-shell__header">
        <div className="admin-shell__brand">
          <Link to="/admin/analise-estrategica" className="sa-admin__back">
            ← Análises
          </Link>
          <span className="admin-shell__label">{label}</span>
        </div>
      </header>

      <main className="admin-shell__main sa-admin__main">
        <div className="admin-shell__intro">
          <h1 className="admin-shell__title">
            {step === 'success' ? 'Análise gerada' : 'Nova análise'}
          </h1>
          <p className="admin-shell__subtitle">
            {step === 'form'
              ? 'Informe os canais → gere o prompt → cole no GPT → monte a LP.'
              : step === 'prompt'
                ? 'Copie o prompt, cole no ChatGPT e traga a saída JSON.'
                : 'A LP pública está pronta para compartilhar.'}
          </p>
        </div>

        {error ? <p className="sa-error">{error}</p> : null}

        {step === 'form' ? (
          <form className="sa-create" onSubmit={handleCreate}>
            <div className="sa-create__fields sa-create__fields--stack">
              <label className="sa-field">
                <span>Nome do cliente (opcional)</span>
                <input
                  type="text"
                  placeholder="Ex.: Sense Biologicus"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
              </label>
              <label className="sa-field">
                <span>Canais (um link por linha)</span>
                <textarea
                  rows={4}
                  placeholder={
                    'https://cliente.com.br\nhttps://instagram.com/cliente\nhttps://linkedin.com/company/cliente'
                  }
                  value={channels}
                  onChange={(e) => setChannels(e.target.value)}
                  required
                />
              </label>
            </div>
            <button
              type="submit"
              className="sa-btn sa-btn--primary"
              disabled={creating || !channels.trim()}
            >
              {creating ? 'Preparando…' : 'Gerar prompt'}
            </button>
          </form>
        ) : null}

        {step === 'prompt' ? (
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
        ) : null}

        {step === 'success' ? (
          <div className="sa-success">
            <p className="sa-success__title">
              Sua análise foi gerada. Acesse agora.
            </p>
            <p className="sa-success__copy">
              {analysis?.clientName
                ? `A LP de ${analysis.clientName} está pronta.`
                : 'A LP pública está pronta.'}{' '}
              Ao abrir, você volta para a lista de análises.
            </p>
            <div className="sa-success__actions">
              <button
                type="button"
                className="sa-btn sa-btn--primary"
                onClick={handleAccessNow}
                disabled={!analysis?.publicSlug}
              >
                Acesse agora
              </button>
              <button
                type="button"
                className="sa-btn sa-btn--ghost"
                onClick={() => navigate('/admin/analise-estrategica')}
              >
                Voltar à lista
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
