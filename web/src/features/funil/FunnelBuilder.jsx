import '@xyflow/react/dist/style.css';
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  ViewportPortal,
} from '@xyflow/react';
import {
  Check,
  CloudAlert,
  CloudCog,
  PanelLeft,
  PanelRight,
  Plus,
  Save,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api';
import { FunnelEdgeLine } from './FunnelEdge';
import { FunnelNodeCard } from './FunnelNode';
import { sanitizeFunnelGraph } from './graphPersist';
import { InsightsPanel } from './InsightsPanel';
import { NodePalette } from './NodePalette';
import { computeShiftAlignSnap } from './shiftAlign';
import { useFunnelStore } from './useFunnelStore';

const nodeTypes = { funnel: FunnelNodeCard };
const edgeTypes = { deletable: FunnelEdgeLine };
const PALETTE_COLLAPSE_KEY = 'ops-funil-palette-collapsed';
const INSIGHTS_COLLAPSE_KEY = 'ops-funil-insights-collapsed';

function readCollapsed(key) {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(key, value) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function SaveIndicator() {
  const status = useFunnelStore((state) => state.saveStatus);
  const labels = {
    loading: { icon: CloudCog, text: 'Carregando' },
    saving: { icon: Save, text: 'Salvando' },
    saved: { icon: Check, text: 'Salvo' },
    error: { icon: CloudAlert, text: 'Falha ao salvar' },
  };
  const item = labels[status] || labels.loading;
  const Icon = item.icon;
  return (
    <span className={`funil-save funil-save--${status}`}>
      <Icon size={14} /> {item.text}
    </span>
  );
}

function BuilderCanvas({ projectId, onProjectUpdated }) {
  const nodes = useFunnelStore((state) => state.nodes);
  const edges = useFunnelStore((state) => state.edges);
  const currentProjectId = useFunnelStore((state) => state.projectId);
  const projectName = useFunnelStore((state) => state.projectName);
  const setProjectName = useFunnelStore((state) => state.setProjectName);
  const onNodesChange = useFunnelStore((state) => state.onNodesChange);
  const onEdgesChange = useFunnelStore((state) => state.onEdgesChange);
  const connect = useFunnelStore((state) => state.connect);
  const reconnect = useFunnelStore((state) => state.reconnect);
  const addNode = useFunnelStore((state) => state.addNode);
  const selectNode = useFunnelStore((state) => state.selectNode);
  const selectEdge = useFunnelStore((state) => state.selectEdge);
  const loadProject = useFunnelStore((state) => state.loadProject);
  const startProjectLoad = useFunnelStore((state) => state.startProjectLoad);
  const setSaveStatus = useFunnelStore((state) => state.setSaveStatus);
  const hydrated = useFunnelStore((state) => state.hydrated);
  const revision = useFunnelStore((state) => state.revision);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const [paletteCollapsed, setPaletteCollapsed] = useState(() =>
    readCollapsed(PALETTE_COLLAPSE_KEY),
  );
  const [insightsCollapsed, setInsightsCollapsed] = useState(() =>
    readCollapsed(INSIGHTS_COLLAPSE_KEY),
  );
  const [alignGuides, setAlignGuides] = useState({
    horizontal: null,
    vertical: null,
  });
  const [shiftHeld, setShiftHeld] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Shift') setShiftHeld(true);
    };
    const onKeyUp = (event) => {
      if (event.key === 'Shift') {
        setShiftHeld(false);
        setAlignGuides({ horizontal: null, vertical: null });
      }
    };
    const onBlur = () => {
      setShiftHeld(false);
      setAlignGuides({ horizontal: null, vertical: null });
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    writeCollapsed(PALETTE_COLLAPSE_KEY, paletteCollapsed);
  }, [paletteCollapsed]);

  useEffect(() => {
    writeCollapsed(INSIGHTS_COLLAPSE_KEY, insightsCollapsed);
  }, [insightsCollapsed]);

  useEffect(() => {
    let active = true;
    const previous = useFunnelStore.getState();
    const shouldFlush =
      previous.hydrated &&
      previous.revision > 0 &&
      previous.projectId &&
      previous.projectId !== projectId;

    const boot = async () => {
      if (shouldFlush) {
        try {
          await api.updateFunnelProject(previous.projectId, {
            name: previous.projectName,
            graph: sanitizeFunnelGraph(previous.getGraph()),
          });
        } catch {
          /* mantém fluxo de carga mesmo se o flush falhar */
        }
      }
      if (!active) return;
      startProjectLoad(projectId);
      try {
        const project = await api.getFunnelProject(projectId);
        if (!active) return;
        loadProject(project);
        window.setTimeout(() => fitView({ padding: 0.22, duration: 400, maxZoom: 1 }), 80);
      } catch {
        if (active) setSaveStatus('error');
      }
    };

    boot();
    return () => {
      active = false;
    };
  }, [fitView, loadProject, projectId, setSaveStatus, startProjectLoad]);

  useEffect(() => {
    if (!hydrated || revision === 0) return undefined;
    const saveProjectId = currentProjectId;
    setSaveStatus('saving');
    const timer = window.setTimeout(async () => {
      try {
        // Ignora resposta se o usuário trocou de projeto no meio do save.
        if (useFunnelStore.getState().projectId !== saveProjectId) return;
        const latest = useFunnelStore.getState();
        const payload = {
          name: latest.projectName,
          graph: sanitizeFunnelGraph(latest.getGraph()),
        };
        await api.updateFunnelProject(saveProjectId, payload);
        if (useFunnelStore.getState().projectId !== saveProjectId) return;
        setSaveStatus('saved');
        onProjectUpdated?.({
          id: saveProjectId,
          name: payload.name,
        });
      } catch {
        if (useFunnelStore.getState().projectId === saveProjectId) {
          setSaveStatus('error');
        }
      }
    }, 750);
    return () => window.clearTimeout(timer);
  }, [hydrated, currentProjectId, revision, setSaveStatus, onProjectUpdated]);

  const parsePalettePayload = (raw) => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.kind) {
        return { kind: parsed.kind, patch: parsed.patch || {} };
      }
    } catch {
      /* payload legado: só o kind */
    }
    return { kind: raw, patch: {} };
  };

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const payload = parsePalettePayload(
        event.dataTransfer.getData('application/funnel-node'),
      );
      if (!payload?.kind) return;
      addNode(
        payload.kind,
        screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        payload.patch,
      );
    },
    [addNode, screenToFlowPosition],
  );

  const onQuickAdd = useCallback(
    (kind, patch = {}) => {
      addNode(
        kind,
        {
          x: 180 + (nodes.length % 4) * 250,
          y: 130 + (nodes.length % 3) * 190,
        },
        patch,
      );
    },
    [addNode, nodes.length],
  );

  const isValidConnection = useCallback(
    (connection) => {
      if (
        !connection.source ||
        !connection.target ||
        connection.source === connection.target
      ) {
        return false;
      }
      const visited = new Set();
      const reachesSource = (id) => {
        if (id === connection.source) return true;
        if (visited.has(id)) return false;
        visited.add(id);
        return edges
          .filter((edge) => edge.source === id)
          .some((edge) => reachesSource(edge.target));
      };
      return !reachesSource(connection.target);
    },
    [edges],
  );

  const onNodeDrag = useCallback(
    (event, node) => {
      if (!event.shiftKey && !shiftHeld) {
        setAlignGuides({ horizontal: null, vertical: null });
        return;
      }
      const currentNodes = useFunnelStore.getState().nodes;
      const snap = computeShiftAlignSnap(node, currentNodes, 12);
      setAlignGuides({
        horizontal: snap.horizontal,
        vertical: snap.vertical,
      });
      if (snap.snapped) {
        onNodesChange([
          {
            id: node.id,
            type: 'position',
            position: snap.position,
            dragging: true,
          },
        ]);
      }
    },
    [onNodesChange, shiftHeld],
  );

  const onNodeDragStop = useCallback(() => {
    setAlignGuides({ horizontal: null, vertical: null });
  }, []);

  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'deletable',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 18,
        height: 18,
        color: '#7c8596',
      },
      style: { stroke: '#7c8596', strokeWidth: 2 },
    }),
    [],
  );

  return (
    <div className="funil-builder">
      <div className="funil-builder__top">
        <div className="funil-builder__title">
          <small>Projeto aberto</small>
          <input
            aria-label="Nome do projeto"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
          />
        </div>
        <div className="funil-builder__actions">
          <SaveIndicator />
          <button
            type="button"
            className="lp-btn lp-btn--ghost"
            onClick={() => onQuickAdd('optin')}
          >
            <Plus size={14} strokeWidth={1.6} /> Nova etapa
          </button>
        </div>
      </div>

      <div
        className={[
          'funil-builder__body',
          paletteCollapsed ? 'is-palette-collapsed' : '',
          insightsCollapsed ? 'is-insights-collapsed' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="funil-side funil-side--palette">
          {paletteCollapsed ? (
            <button
              type="button"
              className="funil-side__rail"
              onClick={() => setPaletteCollapsed(false)}
              title="Expandir blocos"
            >
              <PanelLeft size={15} strokeWidth={1.6} />
              <span>Blocos</span>
            </button>
          ) : (
            <NodePalette
              onQuickAdd={onQuickAdd}
              onCollapse={() => setPaletteCollapsed(true)}
            />
          )}
        </div>
        <section className="funil-canvas">
          <div className="funil-canvas__head">
            <div>
              <strong>Cenário principal</strong>
              <span>
                {shiftHeld
                  ? 'Shift ativo — alinhe os blocos pelas guias'
                  : 'Planejamento mensal do funil · Segure Shift ao arrastar para alinhar'}
              </span>
            </div>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={connect}
            onReconnect={reconnect}
            isValidConnection={isValidConnection}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => selectNode(node.id)}
            onEdgeClick={(_, edge) => selectEdge(edge.id)}
            onPaneClick={() => {
              selectNode(null);
              selectEdge(null);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={onDrop}
            defaultEdgeOptions={defaultEdgeOptions}
            deleteKeyCode={null}
            selectionKeyCode="Control"
            multiSelectionKeyCode="Meta"
            edgesReconnectable
            reconnectRadius={18}
            connectionRadius={28}
            snapToGrid={shiftHeld}
            snapGrid={[8, 8]}
            minZoom={0.2}
            maxZoom={1.6}
            fitView
            fitViewOptions={{ padding: 0.22, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
            className={shiftHeld ? 'is-shift-align' : undefined}
          >
            <Background
              color="rgba(255,255,255,0.08)"
              gap={24}
              size={1}
              variant={BackgroundVariant.Dots}
            />
            <Controls position="bottom-left" showInteractive={false} />
            <ViewportPortal>
              {alignGuides.vertical != null ? (
                <div
                  className="funil-align-guide funil-align-guide--vertical"
                  style={{
                    transform: `translate(${alignGuides.vertical}px, 0)`,
                  }}
                />
              ) : null}
              {alignGuides.horizontal != null ? (
                <div
                  className="funil-align-guide funil-align-guide--horizontal"
                  style={{
                    transform: `translate(0, ${alignGuides.horizontal}px)`,
                  }}
                />
              ) : null}
            </ViewportPortal>
          </ReactFlow>
          <div className="funil-canvas__legend">
            <span>
              <i className="funil-canvas__dot funil-canvas__dot--yes" /> caminho
              sim
            </span>
            <span>
              <i className="funil-canvas__dot funil-canvas__dot--no" /> caminho
              não
            </span>
            <span className="funil-canvas__hint">
              Segure <kbd>Shift</kbd> ao arrastar para alinhar
            </span>
          </div>
        </section>
        <div className="funil-side funil-side--insights">
          {insightsCollapsed ? (
            <button
              type="button"
              className="funil-side__rail"
              onClick={() => setInsightsCollapsed(false)}
              title="Expandir insights"
            >
              <PanelRight size={15} strokeWidth={1.6} />
              <span>Insights</span>
            </button>
          ) : (
            <InsightsPanel onCollapse={() => setInsightsCollapsed(true)} />
          )}
        </div>
      </div>
    </div>
  );
}

export function FunnelBuilder({ projectId, onProjectUpdated }) {
  return (
    <ReactFlowProvider>
      <BuilderCanvas
        projectId={projectId}
        onProjectUpdated={onProjectUpdated}
      />
    </ReactFlowProvider>
  );
}
