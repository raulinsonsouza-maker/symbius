import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  reconnectEdge,
} from '@xyflow/react';
import { create } from 'zustand';
import { defaultProject } from './defaultProject';
import {
  createManualOpsTask,
  deriveOpsTasks,
  applyOpsTaskAssignments,
  mergeOpsTasks,
  sanitizeOpsTasks,
} from './deriveOpsTasks';
import { DEFAULT_NODE_DATA, addDaysToDate } from './funnelTypes';
import { parseFunnelGraph } from './graphPersist';
import { simulateFunnel } from './simulation';

const withInteractiveEdges = (graph) => ({
  ...graph,
  edges: (graph.edges || []).map((edge) => {
    const path = (edge.data?.path ?? edge.sourceHandle) === 'no' ? 'no' : 'yes';
    const color = path === 'yes' ? '#4e8cff' : '#c4a574';
    const weightRaw = Number(edge.data?.weight);
    const weight =
      Number.isFinite(weightRaw) && weightRaw > 0 ? weightRaw : undefined;
    return {
      ...edge,
      type: 'deletable',
      data: weight != null ? { path, weight } : { path },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color,
      },
      style: { ...edge.style, stroke: color, strokeWidth: 2 },
    };
  }),
});

const cloneDefaultGraph = () =>
  withInteractiveEdges(JSON.parse(JSON.stringify(defaultProject.graph)));

const normalizeGraph = (graph) => ({
  ...withInteractiveEdges(graph),
  opsTasks: sanitizeOpsTasks(graph.opsTasks || []),
  nodes: (graph.nodes || []).map((node) => {
    if (node.data.kind !== 'traffic') return node;
    const legacyBudget =
      (Number(node.data.visitors) || 0) * (Number(node.data.cpc) || 0);
    const acquisitionModel =
      node.data.acquisitionModel === 'source'
        ? 'source'
        : node.data.acquisitionModel === 'cpm'
          ? 'cpm'
          : 'cpc';
    return {
      ...node,
      data: {
        ...DEFAULT_NODE_DATA.traffic,
        ...node.data,
        monthlyBudget:
          acquisitionModel === 'source'
            ? Math.max(0, Number(node.data.monthlyBudget) || 0)
            : Number(node.data.monthlyBudget) || legacyBudget,
        acquisitionModel,
        sourceType: node.data.sourceType || 'other',
        audienceSize:
          Number(node.data.audienceSize) || Number(node.data.visitors) || 1000,
        engagementRate: Number.isFinite(Number(node.data.engagementRate))
          ? Number(node.data.engagementRate)
          : 10,
      },
    };
  }),
});

const initialGraph = cloneDefaultGraph();

export const useFunnelStore = create((set, get) => ({
  projectId: defaultProject.id,
  projectName: defaultProject.name,
  nodes: initialGraph.nodes,
  edges: initialGraph.edges,
  opsTasks: sanitizeOpsTasks(initialGraph.opsTasks || []),
  selectedNodeId: null,
  selectedEdgeId: null,
  simulation: simulateFunnel(initialGraph.nodes, initialGraph.edges),
  saveStatus: 'loading',
  hydrated: false,
  revision: 0,

  setProjectName: (projectName) =>
    set((state) => ({ projectName, revision: state.revision + 1 })),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  startProjectLoad: (projectId) =>
    set({
      projectId,
      selectedNodeId: null,
      selectedEdgeId: null,
      saveStatus: 'loading',
      hydrated: false,
      revision: 0,
    }),
  loadProject: (project) => {
    const graph = normalizeGraph(
      parseFunnelGraph(project.graph || { nodes: [], edges: [], opsTasks: [] }),
    );
    set({
      projectId: project.id,
      projectName: project.name,
      nodes: graph.nodes,
      edges: graph.edges,
      opsTasks: graph.opsTasks,
      selectedNodeId: null,
      selectedEdgeId: null,
      simulation: simulateFunnel(graph.nodes, graph.edges),
      saveStatus: 'saved',
      hydrated: true,
      revision: 0,
    });
  },
  resetProject: () => {
    const graph = cloneDefaultGraph();
    set((state) => ({
      projectName: defaultProject.name,
      nodes: graph.nodes,
      edges: graph.edges,
      opsTasks: sanitizeOpsTasks(graph.opsTasks || []),
      selectedNodeId: null,
      selectedEdgeId: null,
      simulation: simulateFunnel(graph.nodes, graph.edges),
      revision: state.revision + 1,
    }));
  },
  onNodesChange: (changes) =>
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes);
      const structural = changes.some(
        (change) => change.type === 'add' || change.type === 'remove',
      );
      const dirty = changes.some((change) => change.type !== 'select');
      return {
        nodes,
        simulation: structural
          ? simulateFunnel(nodes, state.edges)
          : state.simulation,
        revision: dirty ? state.revision + 1 : state.revision,
      };
    }),
  onEdgesChange: (changes) =>
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      return {
        edges,
        simulation: simulateFunnel(state.nodes, edges),
        revision: changes.some((change) => change.type !== 'select')
          ? state.revision + 1
          : state.revision,
      };
    }),
  connect: (connection) =>
    set((state) => {
      const path = connection.sourceHandle === 'no' ? 'no' : 'yes';
      const color = path === 'yes' ? '#4e8cff' : '#c4a574';
      const edge = {
        ...connection,
        id: `edge-${crypto.randomUUID()}`,
        type: 'deletable',
        data: { path },
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color,
        },
        style: { stroke: color, strokeWidth: 2 },
      };
      const edges = addEdge(edge, state.edges);
      return {
        edges,
        selectedEdgeId: edge.id,
        selectedNodeId: null,
        simulation: simulateFunnel(state.nodes, edges),
        revision: state.revision + 1,
      };
    }),
  reconnect: (oldEdge, connection) =>
    set((state) => {
      const path = connection.sourceHandle === 'no' ? 'no' : 'yes';
      const color = path === 'yes' ? '#4e8cff' : '#c4a574';
      const updatedEdge = {
        ...oldEdge,
        type: 'deletable',
        data: {
          path,
          ...(Number(oldEdge.data?.weight) > 0
            ? { weight: Number(oldEdge.data.weight) }
            : {}),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
          color,
        },
        style: {
          ...oldEdge.style,
          stroke: color,
          strokeWidth: 2,
        },
      };
      const edges = reconnectEdge(updatedEdge, connection, state.edges);
      return {
        edges,
        simulation: simulateFunnel(state.nodes, edges),
        revision: state.revision + 1,
      };
    }),
  deleteEdge: (id) =>
    set((state) => {
      const edges = state.edges.filter((edge) => edge.id !== id);
      return {
        edges,
        selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        simulation: simulateFunnel(state.nodes, edges),
        revision: state.revision + 1,
      };
    }),
  updateEdgeData: (id, patch) =>
    set((state) => {
      const edges = state.edges.map((edge) => {
        if (edge.id !== id) return edge;
        const nextData = { ...edge.data, ...patch };
        const weightRaw = Number(nextData.weight);
        if (!Number.isFinite(weightRaw) || weightRaw <= 0) {
          delete nextData.weight;
        } else {
          nextData.weight = weightRaw;
        }
        return { ...edge, data: nextData };
      });
      return {
        edges,
        simulation: simulateFunnel(state.nodes, edges),
        revision: state.revision + 1,
      };
    }),
  addNode: (kind, position, patch = {}) =>
    set((state) => {
      const defaults = DEFAULT_NODE_DATA[kind];
      if (!defaults) return state;
      const node = {
        id: `${kind}-${crypto.randomUUID()}`,
        type: 'funnel',
        position,
        data: { ...defaults, ...patch, kind },
      };
      const nodes = [...state.nodes, node];
      return {
        nodes,
        selectedNodeId: node.id,
        selectedEdgeId: null,
        simulation: simulateFunnel(nodes, state.edges),
        revision: state.revision + 1,
      };
    }),
  selectNode: (selectedNodeId) =>
    set({ selectedNodeId, selectedEdgeId: null }),
  selectEdge: (selectedEdgeId) =>
    set({ selectedEdgeId, selectedNodeId: null }),
  updateNodeData: (id, patch) =>
    set((state) => {
      const nodes = state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      );
      return {
        nodes,
        simulation: simulateFunnel(nodes, state.edges),
        revision: state.revision + 1,
      };
    }),
  deleteSelected: () =>
    set((state) => {
      if (state.selectedEdgeId) {
        const edges = state.edges.filter(
          (edge) => edge.id !== state.selectedEdgeId,
        );
        return {
          edges,
          selectedEdgeId: null,
          simulation: simulateFunnel(state.nodes, edges),
          revision: state.revision + 1,
        };
      }
      if (!state.selectedNodeId) return state;
      const nodes = state.nodes.filter(
        (node) => node.id !== state.selectedNodeId,
      );
      const edges = state.edges.filter(
        (edge) =>
          edge.source !== state.selectedNodeId &&
          edge.target !== state.selectedNodeId,
      );
      return {
        nodes,
        edges,
        selectedNodeId: null,
        simulation: simulateFunnel(nodes, edges),
        revision: state.revision + 1,
      };
    }),
  regenerateOpsTasks: (assignments = null) =>
    set((state) => {
      const generated = deriveOpsTasks(
        state.nodes,
        state.edges,
        state.simulation,
      );
      const withAssignments = Array.isArray(assignments)
        ? applyOpsTaskAssignments(generated, assignments)
        : generated;
      return {
        opsTasks: mergeOpsTasks(state.opsTasks, withAssignments, {
          applyAssignments: Array.isArray(assignments),
        }),
        revision: state.revision + 1,
      };
    }),
  previewOpsTasks: () => {
    const state = get();
    const generated = deriveOpsTasks(
      state.nodes,
      state.edges,
      state.simulation,
    );
    const previous = new Map(state.opsTasks.map((task) => [task.id, task]));
    return generated.map((task) => {
      const prev = previous.get(task.id);
      if (!prev) return task;
      return {
        ...task,
        role: prev.role || task.role,
        dueInDays: prev.dueInDays || task.dueInDays,
        dueAt: prev.dueAt || task.dueAt,
        status: prev.status || task.status,
      };
    });
  },
  commitOpsTaskAssignments: (assignments) =>
    set((state) => {
      const generated = deriveOpsTasks(
        state.nodes,
        state.edges,
        state.simulation,
      );
      const assigned = applyOpsTaskAssignments(generated, assignments);
      return {
        opsTasks: mergeOpsTasks(state.opsTasks, assigned, {
          applyAssignments: true,
        }),
        revision: state.revision + 1,
      };
    }),
  updateOpsTask: (id, patch) =>
    set((state) => ({
      opsTasks: state.opsTasks.map((task) => {
        if (task.id !== id) return task;
        const next = { ...task, ...patch, id: task.id };
        if (patch.dueInDays != null && patch.dueAt == null) {
          next.dueAt = addDaysToDate(new Date(), patch.dueInDays);
        }
        return sanitizeOpsTasks([next])[0] || next;
      }),
      revision: state.revision + 1,
    })),
  setOpsTaskStatus: (id, status) =>
    set((state) => ({
      opsTasks: state.opsTasks.map((task) =>
        task.id === id ? { ...task, status } : task,
      ),
      revision: state.revision + 1,
    })),
  addManualOpsTask: (partial = {}) =>
    set((state) => ({
      opsTasks: [...state.opsTasks, createManualOpsTask(partial)],
      revision: state.revision + 1,
    })),
  deleteOpsTask: (id) =>
    set((state) => ({
      opsTasks: state.opsTasks.filter((task) => task.id !== id),
      revision: state.revision + 1,
    })),
  getGraph: () => {
    const { nodes, edges, opsTasks } = get();
    return { nodes, edges, opsTasks };
  },
}));
