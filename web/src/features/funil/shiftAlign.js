/** Alinhamento com Shift: encaixa o nó com outros para deixar as conexões retas. */

const DEFAULT_SIZE = { width: 220, height: 140 };

function nodeSize(node) {
  return {
    width: node.measured?.width || node.width || DEFAULT_SIZE.width,
    height: node.measured?.height || node.height || DEFAULT_SIZE.height,
  };
}

/**
 * @returns {{ position: {x:number,y:number}, horizontal: number|null, vertical: number|null, snapped: boolean }}
 */
export function computeShiftAlignSnap(draggingNode, nodes, threshold = 12) {
  const others = nodes.filter((node) => node.id !== draggingNode.id);
  if (!others.length) {
    return {
      position: { ...draggingNode.position },
      horizontal: null,
      vertical: null,
      snapped: false,
    };
  }

  const size = nodeSize(draggingNode);
  const left = draggingNode.position.x;
  const top = draggingNode.position.y;
  const centerX = left + size.width / 2;
  const centerY = top + size.height / 2;

  const xCandidates = [];
  const yCandidates = [];

  for (const other of others) {
    const otherSize = nodeSize(other);
    const oLeft = other.position.x;
    const oTop = other.position.y;
    const oRight = oLeft + otherSize.width;
    const oBottom = oTop + otherSize.height;
    const oCenterX = oLeft + otherSize.width / 2;
    const oCenterY = oTop + otherSize.height / 2;

    // Centro (melhor para linhas horizontais/verticais)
    xCandidates.push({
      guide: oCenterX,
      position: oCenterX - size.width / 2,
      score: Math.abs(centerX - oCenterX),
    });
    yCandidates.push({
      guide: oCenterY,
      position: oCenterY - size.height / 2,
      score: Math.abs(centerY - oCenterY),
    });

    // Bordas
    xCandidates.push(
      {
        guide: oLeft,
        position: oLeft,
        score: Math.abs(left - oLeft),
      },
      {
        guide: oRight,
        position: oRight - size.width,
        score: Math.abs(left + size.width - oRight),
      },
    );
    yCandidates.push(
      {
        guide: oTop,
        position: oTop,
        score: Math.abs(top - oTop),
      },
      {
        guide: oBottom,
        position: oBottom - size.height,
        score: Math.abs(top + size.height - oBottom),
      },
    );
  }

  const bestX = xCandidates
    .filter((item) => item.score <= threshold)
    .sort((a, b) => a.score - b.score)[0];
  const bestY = yCandidates
    .filter((item) => item.score <= threshold)
    .sort((a, b) => a.score - b.score)[0];

  const nextX = bestX ? bestX.position : left;
  const nextY = bestY ? bestY.position : top;

  return {
    position: { x: nextX, y: nextY },
    vertical: bestX ? bestX.guide : null,
    horizontal: bestY ? bestY.guide : null,
    snapped:
      Math.abs(nextX - left) > 0.01 || Math.abs(nextY - top) > 0.01,
  };
}
