/** Remove campos transitórios do React Flow antes de persistir. */
export function sanitizeFunnelGraph(graph = {}) {
  const nodes = (graph.nodes || []).map((node) => ({
    id: node.id,
    type: node.type || 'funnel',
    position: {
      x: Number(node.position?.x) || 0,
      y: Number(node.position?.y) || 0,
    },
    data: { ...(node.data || {}) },
  }));

  const edges = (graph.edges || []).map((edge) => {
    const path =
      (edge.data?.path ?? edge.sourceHandle) === 'no' ? 'no' : 'yes';
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || path,
      targetHandle: edge.targetHandle || undefined,
      type: edge.type || 'deletable',
      data: { path },
    };
  });

  return { nodes, edges };
}

export function parseFunnelGraph(raw) {
  if (!raw) return { nodes: [], edges: [] };
  if (typeof raw === 'string') {
    try {
      return parseFunnelGraph(JSON.parse(raw));
    } catch {
      return { nodes: [], edges: [] };
    }
  }
  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    return { nodes: [], edges: [] };
  }
  return sanitizeFunnelGraph(raw);
}
