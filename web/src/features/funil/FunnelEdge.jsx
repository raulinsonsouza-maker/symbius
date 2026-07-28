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
}) {
  const deleteEdge = useFunnelStore((state) => state.deleteEdge);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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
      {selected ? (
        <EdgeLabelRenderer>
          <button
            aria-label="Remover conexão"
            className="funil-edge-delete nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();
              deleteEdge(id);
            }}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            }}
            type="button"
          >
            <X size={12} strokeWidth={1.8} />
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
