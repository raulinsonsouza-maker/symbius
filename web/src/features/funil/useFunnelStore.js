import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  reconnectEdge,
} from '@xyflow/react';
import { create } from 'zustand';
import { defaultProject } from './defaultProject';
import { DEFAULT_NODE_DATA } from './funnelTypes';
import { parseFunnelGraph } from './graphPersist';
import { simulateFunnel } from './simulation';

const withInteractiveEdges = (graph) => ({
  ...graph,
  edges: (graph.edges || []).map((edge) => {
    const path = (edge.data?.path ?? edge.sourceHandle) === 'no' ? 'no' : 'yes';
    const color = path === 'yes' ? '#4e8cff' : '#c4a574';
    return {
      ...edge,
      type: 'deletable',
      data: { path },
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
  selectedNodeId: null,
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
      saveStatus: 'loading',
      hydrated: false,
      revision: 0,
    }),
  loadProject: (project) => {
    const graph = normalizeGraph(
      parseFunnelGraph(project.graph || { nodes: [], edges: [] }),
    );
    set({
      projectId: project.id,
      projectName: project.name,
      nodes: graph.nodes,
      edges: graph.edges,
      selectedNodeId: null,
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
      selectedNodeId: null,
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
        data: { path },
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
        simulation: simulateFunnel(state.nodes, edges),
        revision: state.revision + 1,
      };
    }),
  addNode: (kind, position) =>
    set((state) => {
      const node = {
        id: `${kind}-${crypto.randomUUID()}`,
        type: 'funnel',
        position,
        data: { ...DEFAULT_NODE_DATA[kind] },
      };
      const nodes = [...state.nodes, node];
      return {
        nodes,
        selectedNodeId: node.id,
        simulation: simulateFunnel(nodes, state.edges),
        revision: state.revision + 1,
      };
    }),
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
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
  getGraph: () => {
    const { nodes, edges } = get();
    return { nodes, edges };
  },
}));
