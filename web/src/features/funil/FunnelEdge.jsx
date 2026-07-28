import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
} from '@xyflow/react';
import { X } from 'lucide-react';
import { useFunnelStore } from './useFunnelStore';

export function FunnelEdgeLine({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
  data,
  source,
}) {
  const deleteEdge = useFunnelStore((state) => state.deleteEdge);
  const updateEdgeData = useFunnelStore((state) => state.updateEdgeData);
  const edges = useFunnelStore((state) => state.edges);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const path = (data?.path ?? 'yes') === 'no' ? 'no' : 'yes';
  const siblings = edges.filter((edge) => {
    const edgePathValue =
      (edge.data?.path ?? edge.sourceHandle) === 'no' ? 'no' : 'yes';
    return edge.source === source && edgePathValue === path;
  });
  const showWeight = siblings.length > 1;
  const weightValue =
    Number(data?.weight) > 0 ? Number(data.weight) : '';

  return (
    <>
      <BaseEdge
        id={id}
        interactionWidth={24}
        markerEnd={markerEnd}
        path={edgePath}
        style={{
          ...style,
          filter: selected
            ? 'drop-shadow(0 0 5px rgba(78, 140, 255, 0.35))'
            : undefined,
          strokeWidth: selected ? 3 : style?.strokeWidth,
        }}
      />
      {showWeight || selected ? (
        <EdgeLabelRenderer>
          <div
            className={`funil-edge-toolbar nodrag nopan ${
              selected ? 'is-selected' : ''
            }`}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
          >
            {showWeight ? (
              <label className="funil-edge-weight">
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  value={weightValue}
                  placeholder="%"
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    updateEdgeData(id, {
                      weight: Number.isFinite(next) && next > 0 ? next : undefined,
                    });
                  }}
                  aria-label="Peso da ramificação"
                />
                <span>%</span>
              </label>
            ) : null}
            {selected ? (
              <button
                aria-label="Remover conexão"
                className="funil-edge-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteEdge(id);
                }}
                type="button"
              >
                <X size={12} strokeWidth={1.8} />
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
