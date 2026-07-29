import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, PanelLeft, PanelLeftClose, Plus, Trash2 } from 'lucide-react';
import { api } from '../../../lib/api';

const FunnelBuilder = lazy(() =>
  import('../../../features/funil/FunnelBuilder').then((m) => ({
    default: m.FunnelBuilder,
  })),
);

function clientLabel(c) {
  return c?.tradeName || c?.legalName || 'Cliente sem nome';
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const EMPTY_GRAPH = { nodes: [], edges: [] };
const PROJECTS_COLLAPSE_KEY = 'ops-planner-projects-collapsed';

export default function OpsPlanejamentoPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get('clientId') || '';
  const funilId = searchParams.get('funilId') || '';
  const mode = searchParams.get('mode') || 'view';

  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [error, setError] = useState('');

  const [projectsCollapsed, setProjectsCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(PROJECTS_COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let active = true;
    setClientsLoading(true);
    api.listClients()
      .then((list) => {
        if (active) setClients((list || []).filter((c) => !c.archivedAt));
      })
      .catch(() => {})
      .finally(() => { if (active) setClientsLoading(false); });
    return () => { active = false; };
  }, []);

  async function loadProjects(cid) {
    if (!cid) return;
    setProjectsLoading(true);
    setError('');
    try {
      setProjects(await api.listFunnelProjects({ clientId: cid }));
    } catch (err) {
      setError(err.message);
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    if (clientId) loadProjects(clientId);
    else setProjects([]);
  }, [clientId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROJECTS_COLLAPSE_KEY, projectsCollapsed ? '1' : '0');
    } catch { /* ignore */ }
  }, [projectsCollapsed]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === funilId) || null,
    [projects, funilId],
  );

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function selectClient(cid) {
    const next = new URLSearchParams();
    if (cid) next.set('clientId', cid);
    setSearchParams(next, { replace: true });
  }

  function selectProject(pid) {
    setParam('funilId', pid);
    if (!pid) setParam('mode', '');
  }

  function enterEdit() {
    setParam('mode', 'edit');
  }

  function exitEdit() {
    setParam('mode', 'view');
  }

  const handleProjectUpdated = (patch) => {
    if (!patch?.id) return;
    setProjects((cur) =>
      cur.map((p) =>
        p.id === patch.id
          ? { ...p, name: patch.name ?? p.name, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  };

  async function createProject(event) {
    event?.preventDefault?.();
    if (!clientId || creating) return;
    const name = draftName.trim();
    if (name.length < 2) { setError('Dê um nome ao funil.'); return; }
    setCreating(true);
    setError('');
    try {
      const created = await api.createFunnelProject({ clientId, name, graph: EMPTY_GRAPH });
      setComposerOpen(false);
      setDraftName('');
      await loadProjects(clientId);
      selectProject(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function duplicateProject(project, e) {
    e?.stopPropagation?.();
    if (!project?.id || busyId) return;
    setBusyId(project.id);
    try {
      const created = await api.duplicateFunnelProject(project.id);
      await loadProjects(clientId);
      selectProject(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  async function deleteProject(project, e) {
    e?.stopPropagation?.();
    if (!project?.id || busyId) return;
    if (!window.confirm(`Excluir o funil "${project.name}"?`)) return;
    setBusyId(project.id);
    try {
      await api.deleteFunnelProject(project.id);
      if (funilId === project.id) selectProject('');
      await loadProjects(clientId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  }

  const readOnly = mode !== 'edit';

  return (
    <div className={`ops-planner ${selectedProject ? 'is-editing' : ''}`}>
      {/* Toolbar superior */}
      <div className="ops-planner__toolbar">
        <div className="ops-planner__selectors">
          <select
            className="ops-planner__select"
            value={clientId}
            onChange={(e) => selectClient(e.target.value)}
            disabled={clientsLoading}
          >
            <option value="">
              {clientsLoading ? 'Carregando clientes…' : '— Escolha um cliente —'}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {clientLabel(c)}
              </option>
            ))}
          </select>
        </div>

        {selectedProject ? (
          <div className="ops-planner__mode-actions">
            {readOnly ? (
              <button type="button" className="lp-btn" onClick={enterEdit}>
                Editar funil
              </button>
            ) : (
              <button type="button" className="lp-btn lp-btn--ghost" onClick={exitEdit}>
                Sair da edição
              </button>
            )}
          </div>
        ) : null}
      </div>

      {error ? <p className="prop-error" style={{ margin: '8px 20px 0' }}>{error}</p> : null}

      {!clientId ? (
        <div className="ops-planner__empty">
          <p>Escolha um cliente para analisar o funil.</p>
        </div>
      ) : (
        <div className={`funil-page ops-planner__funil-page ${projectsCollapsed ? 'is-projects-collapsed' : ''}`}>
          <aside className="funil-projects">
            {projectsCollapsed ? (
              <button
                type="button"
                className="funil-side__rail"
                onClick={() => setProjectsCollapsed(false)}
                title="Expandir projetos"
              >
                <PanelLeft size={15} strokeWidth={1.6} />
                <span>Projetos</span>
              </button>
            ) : (
              <>
                <div className="funil-projects__head">
                  <strong>Projetos</strong>
                  <span>{projects.length}</span>
                  <button
                    type="button"
                    className="ops-collapse-btn funil-projects__collapse"
                    onClick={() => setProjectsCollapsed(true)}
                    title="Minimizar projetos"
                  >
                    <PanelLeftClose size={15} strokeWidth={1.6} />
                  </button>
                </div>

                {projectsLoading ? (
                  <div className="cp-card"><p className="cp-muted" style={{ margin: 0 }}>Carregando…</p></div>
                ) : (
                  <div className="funil-projects__list">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className={`funil-projects__item ${project.id === funilId ? 'is-active' : ''}`}
                      >
                        <button
                          type="button"
                          className="funil-projects__item-main"
                          onClick={() => selectProject(project.id)}
                          title={project.name}
                        >
                          <strong>{project.name}</strong>
                          <span>Atualizado {formatDate(project.updatedAt || project.createdAt)}</span>
                        </button>
                        <div className="funil-projects__item-actions">
                          <button
                            type="button"
                            className="funil-projects__icon-btn"
                            title="Duplicar funil"
                            disabled={busyId === project.id}
                            onClick={(e) => duplicateProject(project, e)}
                          >
                            <Copy size={13} strokeWidth={1.7} />
                          </button>
                          <button
                            type="button"
                            className="funil-projects__icon-btn funil-projects__icon-btn--danger"
                            title="Excluir funil"
                            disabled={busyId === project.id}
                            onClick={(e) => deleteProject(project, e)}
                          >
                            <Trash2 size={13} strokeWidth={1.7} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {composerOpen ? (
                      <form className="funil-projects__composer" onSubmit={createProject}>
                        <label className="funil-projects__composer-label">
                          Nome do funil
                          <input
                            type="text"
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setComposerOpen(false); }}
                            placeholder="Ex.: Google Ads"
                            maxLength={80}
                            disabled={creating}
                            autoFocus
                          />
                        </label>
                        <div className="funil-projects__composer-actions">
                          <button type="button" className="lp-btn lp-btn--ghost" onClick={() => setComposerOpen(false)} disabled={creating}>Cancelar</button>
                          <button type="submit" className="lp-btn" disabled={creating || draftName.trim().length < 2}>
                            {creating ? 'Criando…' : 'Criar funil'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="funil-projects__add"
                        onClick={() => { setProjectsCollapsed(false); setDraftName(''); setComposerOpen(true); setError(''); }}
                      >
                        <Plus size={18} strokeWidth={1.8} />
                        <span>Novo funil</span>
                      </button>
                    )}

                    {!projects.length && !composerOpen ? (
                      <p className="funil-projects__hint">
                        Separe canais ou campanhas em funis diferentes para comparar cenários.
                      </p>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </aside>

          <div className="funil-workspace">
            {selectedProject ? (
              <Suspense
                fallback={
                  <div className="cp-card">
                    <p className="cp-muted" style={{ margin: 0 }}>Carregando funil…</p>
                  </div>
                }
              >
                <FunnelBuilder
                  projectId={selectedProject.id}
                  onProjectUpdated={handleProjectUpdated}
                  readOnly={readOnly}
                />
              </Suspense>
            ) : (
              <div className="cp-empty funil-workspace__empty">
                <p className="cp-muted" style={{ margin: 0 }}>
                  {projects.length
                    ? 'Selecione um funil na lista ao lado para visualizar.'
                    : 'Use Novo funil para criar o primeiro funil deste cliente.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
