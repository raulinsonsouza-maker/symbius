import { Suspense, useEffect, useMemo, useRef, useState, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, PanelLeft, PanelLeftClose, Plus, Trash2 } from 'lucide-react';
import { api } from '../../lib/api';

const FunnelBuilder = lazy(() =>
  import('./FunnelBuilder').then((module) => ({
    default: module.FunnelBuilder,
  })),
);

const PROJECTS_COLLAPSE_KEY = 'ops-funil-projects-collapsed';

function formatProjectDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const EMPTY_FUNNEL_GRAPH = { nodes: [], edges: [] };

export default function ClientPanelFunil({
  client,
  proposal,
  sectionActive = false,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('funilId') || '';
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyProjectId, setBusyProjectId] = useState('');
  const [error, setError] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const nameInputRef = useRef(null);
  const [projectsCollapsed, setProjectsCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(PROJECTS_COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const clientId = client?.id || proposal?.clientId || '';

  async function loadProjects() {
    if (!clientId) return;
    setLoading(true);
    setError('');
    try {
      setProjects(await api.listFunnelProjects({ clientId }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (sectionActive && clientId) {
      loadProjects();
    }
  }, [clientId, sectionActive]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        PROJECTS_COLLAPSE_KEY,
        projectsCollapsed ? '1' : '0',
      );
    } catch {
      /* ignore */
    }
  }, [projectsCollapsed]);

  useEffect(() => {
    if (composerOpen) {
      nameInputRef.current?.focus();
    }
  }, [composerOpen]);

  const selected = useMemo(
    () => projects.find((item) => item.id === selectedProjectId) || null,
    [projects, selectedProjectId],
  );

  const selectProject = (projectId) => {
    const next = new URLSearchParams(searchParams);
    if (projectId) next.set('funilId', projectId);
    else next.delete('funilId');
    setSearchParams(next, { replace: true });
  };

  const handleProjectUpdated = (patch) => {
    if (!patch?.id) return;
    setProjects((current) =>
      current.map((item) =>
        item.id === patch.id
          ? {
              ...item,
              name: patch.name ?? item.name,
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
  };

  const openComposer = () => {
    if (projectsCollapsed) setProjectsCollapsed(false);
    setDraftName('');
    setComposerOpen(true);
    setError('');
  };

  const closeComposer = () => {
    if (creating) return;
    setComposerOpen(false);
    setDraftName('');
  };

  const createProject = async (event) => {
    event?.preventDefault?.();
    if (!clientId || creating) return;
    const name = draftName.trim();
    if (name.length < 2) {
      setError('Dê um nome ao funil (ex.: Meta Ads ou Google Ads).');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const created = await api.createFunnelProject({
        clientId,
        proposalId: proposal?.id || null,
        name,
        graph: EMPTY_FUNNEL_GRAPH,
      });
      setComposerOpen(false);
      setDraftName('');
      await loadProjects();
      selectProject(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const duplicateProject = async (project, event) => {
    event?.stopPropagation?.();
    if (!project?.id || busyProjectId) return;
    setBusyProjectId(project.id);
    setError('');
    try {
      const created = await api.duplicateFunnelProject(project.id);
      await loadProjects();
      selectProject(created.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyProjectId('');
    }
  };

  const deleteProject = async (project, event) => {
    event?.stopPropagation?.();
    if (!project?.id || busyProjectId) return;
    const confirmed = window.confirm(
      `Excluir o funil "${project.name}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;
    setBusyProjectId(project.id);
    setError('');
    try {
      await api.deleteFunnelProject(project.id);
      if (selectedProjectId === project.id) {
        selectProject('');
      }
      await loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyProjectId('');
    }
  };

  if (!clientId) {
    return (
      <section className="cp-section__body">
        <div className="cp-section__head">
          <div className="cp-section__titles">
            <h1>Planejamento</h1>
            <p className="cp-muted">
              Cadastre o cliente antes de planejar o funil.
            </p>
          </div>
        </div>
        <div className="cp-empty">
          <p className="cp-muted" style={{ margin: 0 }}>
            Esta ferramenta faz parte da operação do cliente e usa o cadastro do
            CRM como base do projeto.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`cp-section__body funil-section ${
        selected ? 'is-editing' : ''
      }`}
    >
      {!selected ? (
        <div className="cp-section__head funil-section__intro">
          <div className="cp-section__titles">
            <h1>Planejamento</h1>
            <p className="cp-muted">
              Crie um funil por canal ou campanha e alterne entre eles nesta
              lista.
            </p>
          </div>
        </div>
      ) : null}

      {error ? <p className="prop-error">{error}</p> : null}

      <div
        className={`funil-page ${
          projectsCollapsed ? 'is-projects-collapsed' : ''
        }`}
      >
        <aside className="funil-projects">
          {projectsCollapsed ? (
            <button
              type="button"
              className="funil-side__rail"
              onClick={() => setProjectsCollapsed(false)}
              title="Expandir projetos"
              aria-label="Expandir projetos"
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
              aria-label="Minimizar projetos"
            >
              <PanelLeftClose size={15} strokeWidth={1.6} />
            </button>
          </div>

          {loading ? (
            <div className="cp-card">
              <p className="cp-muted" style={{ margin: 0 }}>
                Carregando…
              </p>
            </div>
          ) : (
            <div className="funil-projects__list">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`funil-projects__item ${
                    project.id === selectedProjectId ? 'is-active' : ''
                  }`}
                >
                  <button
                    type="button"
                    className="funil-projects__item-main"
                    onClick={() => selectProject(project.id)}
                    title={project.name}
                  >
                    <strong>{project.name}</strong>
                    <span>
                      Atualizado{' '}
                      {formatProjectDate(project.updatedAt || project.createdAt)}
                    </span>
                  </button>
                  <div className="funil-projects__item-actions">
                    <button
                      type="button"
                      className="funil-projects__icon-btn"
                      title="Duplicar funil"
                      aria-label={`Duplicar ${project.name}`}
                      disabled={busyProjectId === project.id}
                      onClick={(event) => duplicateProject(project, event)}
                    >
                      <Copy size={13} strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      className="funil-projects__icon-btn funil-projects__icon-btn--danger"
                      title="Excluir funil"
                      aria-label={`Excluir ${project.name}`}
                      disabled={busyProjectId === project.id}
                      onClick={(event) => deleteProject(project, event)}
                    >
                      <Trash2 size={13} strokeWidth={1.7} />
                    </button>
                  </div>
                </div>
              ))}

              {composerOpen ? (
                <form
                  className="funil-projects__composer"
                  onSubmit={createProject}
                >
                  <label className="funil-projects__composer-label">
                    Nome do funil
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={draftName}
                      onChange={(event) => setDraftName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') closeComposer();
                      }}
                      placeholder="Ex.: Google Ads"
                      maxLength={80}
                      disabled={creating}
                    />
                  </label>
                  <div className="funil-projects__composer-actions">
                    <button
                      type="button"
                      className="lp-btn lp-btn--ghost"
                      onClick={closeComposer}
                      disabled={creating}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="lp-btn"
                      disabled={creating || draftName.trim().length < 2}
                    >
                      {creating ? 'Criando…' : 'Criar funil'}
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="funil-projects__add"
                  onClick={openComposer}
                  title="Criar novo funil"
                >
                  <Plus size={18} strokeWidth={1.8} />
                  <span>Novo funil</span>
                </button>
              )}

              {!projects.length && !composerOpen ? (
                <p className="funil-projects__hint">
                  Separe canais ou campanhas em funis diferentes para comparar
                  cenários com clareza.
                </p>
              ) : null}
            </div>
          )}
            </>
          )}
        </aside>

        <div className="funil-workspace">
          {selected ? (
            <Suspense
              fallback={
                <div className="cp-card">
                  <p className="cp-muted" style={{ margin: 0 }}>
                    Carregando editor do funil…
                  </p>
                </div>
              }
            >
              <FunnelBuilder
                projectId={selected.id}
                onProjectUpdated={handleProjectUpdated}
              />
            </Suspense>
          ) : (
            <div className="cp-empty funil-workspace__empty">
              <p className="cp-muted" style={{ margin: 0 }}>
                {projects.length
                  ? 'Selecione um funil na lista ao lado para abrir o editor.'
                  : 'Use Novo funil na lista ao lado para criar o primeiro projeto deste cliente.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
