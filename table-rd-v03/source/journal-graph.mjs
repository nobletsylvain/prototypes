// Layout operates only on the journal's public entries.
export const GRAPH_LAYOUT = Object.freeze({
  nodeWidth: 196, nodeHeight: 118, gapX: 36, gapY: 96,
  margin: 32, labelGutter: 28, laneGap: 18, routeInset: 24,
});

const generationOf = entry => Number.isSafeInteger(entry.generation) && entry.generation >= 0 ? entry.generation : 0;
const timeOf = entry => Number.isFinite(entry.createdAt) ? entry.createdAt : 0;
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const compareEntries = (a, b) => generationOf(a) - generationOf(b) || timeOf(a) - timeOf(b) || compareId(a.id, b.id);
const edgeId = (from, to) => JSON.stringify([from, to]);
const parentsOf = entry => [...new Set(Array.isArray(entry.parentEntryIds) ? entry.parentEntryIds : [])];

/** Stable geometry is independent of filters. lineage includes matches and ancestors. */
export function buildJournalGraph(entries, matchIds = new Set(), filtered = false) {
  const { nodeWidth, nodeHeight, gapX, gapY, margin, labelGutter, laneGap, routeInset } = GRAPH_LAYOUT;
  const byId = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry && typeof entry.id === 'string' && !byId.has(entry.id)) byId.set(entry.id, entry);
  }
  const ordered = [...byId.values()].sort(compareEntries);
  if (!ordered.length) return { nodes: [], edges: [], width: margin * 2 + labelGutter, height: margin * 2 };

  const rows = new Map();
  for (const entry of ordered) {
    const generation = generationOf(entry);
    if (!rows.has(generation)) rows.set(generation, []);
    rows.get(generation).push(entry);
  }
  const maxColumns = Math.max(...[...rows.values()].map(row => row.length));
  const contentWidth = maxColumns * nodeWidth + (maxColumns - 1) * gapX;
  const positions = new Map();
  for (const [generation, row] of rows) {
    const parentCenter = entry => {
      const known = parentsOf(entry).map(id => positions.get(id)).filter(Boolean);
      return known.length ? known.reduce((sum, position) => sum + position.x + nodeWidth / 2, 0) / known.length : contentWidth / 2;
    };
    // A barycentre pass keeps related children near their already placed parents.
    row.sort((a, b) => parentCenter(a) - parentCenter(b) || compareEntries(a, b));
    const rowWidth = row.length * nodeWidth + (row.length - 1) * gapX;
    row.forEach((entry, index) => positions.set(entry.id, {
      x: (contentWidth - rowWidth) / 2 + index * (nodeWidth + gapX),
      y: margin + generation * (nodeHeight + gapY),
    }));
  }

  const relations = ordered.flatMap(entry => parentsOf(entry)
    .filter(parentId => parentId !== entry.id && byId.has(parentId))
    .sort(compareId)
    .map(parentId => ({ id: edgeId(parentId, entry.id), from: parentId, to: entry.id })));
  let leftLanes = 0, rightLanes = 0;
  for (const relation of relations) {
    const from = positions.get(relation.from), to = positions.get(relation.to);
    const adjacent = generationOf(byId.get(relation.to)) - generationOf(byId.get(relation.from)) === 1;
    if (adjacent) continue;
    relation.side = (from.x + to.x + nodeWidth) / 2 <= contentWidth / 2 ? 'left' : 'right';
    relation.lane = relation.side === 'left' ? leftLanes++ : rightLanes++;
  }

  const left = margin + labelGutter + leftLanes * laneGap;
  const width = left + contentWidth + rightLanes * laneGap + margin;
  const maxGeneration = Math.max(...rows.keys());
  const height = margin * 2 + maxGeneration * (nodeHeight + gapY) + nodeHeight;
  const requested = new Set(matchIds || []), lineageIds = new Set(), highlightedIds = new Set();
  if (filtered) {
    const incoming = new Map();
    for (const relation of relations) {
      if (!incoming.has(relation.to)) incoming.set(relation.to, []);
      incoming.get(relation.to).push(relation);
    }
    const pending = [...requested].filter(id => byId.has(id));
    while (pending.length) {
      const id = pending.pop();
      if (lineageIds.has(id)) continue;
      lineageIds.add(id);
      for (const relation of incoming.get(id) || []) {
        highlightedIds.add(relation.id); pending.push(relation.from);
      }
    }
  }
  const nodes = ordered.map(entry => ({
    id: entry.id, x: left + positions.get(entry.id).x, y: positions.get(entry.id).y,
    width: nodeWidth, height: nodeHeight, match: !filtered || requested.has(entry.id),
    lineage: !filtered || lineageIds.has(entry.id), entry,
  }));
  const placed = new Map(nodes.map(node => [node.id, node]));
  const edges = relations.map(relation => {
    const from = placed.get(relation.from), to = placed.get(relation.to);
    const startX = from.x + nodeWidth / 2, startY = from.y + nodeHeight;
    const endX = to.x + nodeWidth / 2, endY = to.y;
    let path;
    if (!relation.side) {
      const middleY = (startY + endY) / 2;
      path = `M ${startX} ${startY} L ${startX} ${middleY} L ${endX} ${middleY} L ${endX} ${endY}`;
    } else {
      const laneX = relation.side === 'left'
        ? left - (relation.lane + 1) * laneGap
        : left + contentWidth + (relation.lane + 1) * laneGap;
      const exitY = startY + routeInset, enterY = endY - routeInset;
      path = `M ${startX} ${startY} L ${startX} ${exitY} L ${laneX} ${exitY} L ${laneX} ${enterY} L ${endX} ${enterY} L ${endX} ${endY}`;
    }
    return { id: relation.id, from: relation.from, to: relation.to, path, highlighted: !filtered || highlightedIds.has(relation.id) };
  });
  return { nodes, edges, width, height };
}
