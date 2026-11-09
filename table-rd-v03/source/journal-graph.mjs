// Layout operates only on the journal's public entries.
export const GRAPH_LAYOUT = Object.freeze({
  nodeWidth: 208, nodeHeight: 228, gapX: 110, gapY: 38,
  margin: 48, labelGutter: 32, laneGap: 24, routeInset: 30, cornerRadius: 14,
});

const generationOf = entry => Number.isSafeInteger(entry.generation) && entry.generation >= 0 ? entry.generation : 0;
const timeOf = entry => Number.isFinite(entry.createdAt) ? entry.createdAt : 0;
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const compareEntries = (a, b) => generationOf(a) - generationOf(b) || timeOf(a) - timeOf(b) || compareId(a.id, b.id);
const edgeId = (from, to) => JSON.stringify([from, to]);
const parentsOf = entry => [...new Set(Array.isArray(entry.parentEntryIds) ? entry.parentEntryIds : [])];
const point = (x, y) => ({ x, y });
const coordinates = p => `${p.x} ${p.y}`;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const approach = (from, toward, amount) => {
  const length = distance(from, toward);
  return point(from.x + (toward.x - from.x) * amount / length, from.y + (toward.y - from.y) * amount / length);
};

function roundedRoute(points, radius) {
  const segments = [];
  let cursor = points[0];
  for (let index = 1; index < points.length - 1; index++) {
    const corner = points[index], before = points[index - 1], after = points[index + 1];
    const bend = Math.min(radius, distance(before, corner) / 2, distance(corner, after) / 2);
    const entry = approach(corner, before, bend), exit = approach(corner, after, bend);
    segments.push({ type: 'L', from: cursor, to: entry }, { type: 'Q', from: entry, control: corner, to: exit });
    cursor = exit;
  }
  segments.push({ type: 'L', from: cursor, to: points.at(-1) });
  return segments;
}
function pathFor(segments) {
  return `M ${coordinates(segments[0].from)} ` + segments.map(segment => segment.type === 'C'
    ? `C ${coordinates(segment.control1)} ${coordinates(segment.control2)} ${coordinates(segment.to)}`
    : segment.type === 'Q' ? `Q ${coordinates(segment.control)} ${coordinates(segment.to)}`
      : `L ${coordinates(segment.to)}`).join(' ');
}

/** Stable horizontal geometry is independent of filters. lineage includes matches and ancestors. */
export function buildJournalGraph(entries, matchIds = new Set(), filtered = false) {
  const { nodeWidth, nodeHeight, gapX, gapY, margin, labelGutter, laneGap, routeInset, cornerRadius } = GRAPH_LAYOUT;
  const byId = new Map();
  for (const entry of Array.isArray(entries) ? entries : []) {
    if (entry && typeof entry.id === 'string' && !byId.has(entry.id)) byId.set(entry.id, entry);
  }
  const ordered = [...byId.values()].sort(compareEntries);
  if (!ordered.length) return { nodes: [], edges: [], width: margin * 2, height: margin * 2 };

  const columns = new Map();
  for (const entry of ordered) {
    const generation = generationOf(entry);
    if (!columns.has(generation)) columns.set(generation, []);
    columns.get(generation).push(entry);
  }
  const maxRows = Math.max(...[...columns.values()].map(column => column.length));
  const contentHeight = maxRows * nodeHeight + (maxRows - 1) * gapY;
  const positions = new Map();
  for (const [generation, column] of columns) {
    const parentCenter = entry => {
      const known = parentsOf(entry).map(id => positions.get(id)).filter(Boolean);
      return known.length ? known.reduce((sum, position) => sum + position.y + nodeHeight / 2, 0) / known.length : contentHeight / 2;
    };
    // A barycentre pass orders siblings near their already placed parents.
    column.sort((a, b) => parentCenter(a) - parentCenter(b) || compareEntries(a, b));
    const columnHeight = column.length * nodeHeight + (column.length - 1) * gapY;
    column.forEach((entry, index) => positions.set(entry.id, {
      x: margin + generation * (nodeWidth + gapX),
      y: (contentHeight - columnHeight) / 2 + index * (nodeHeight + gapY),
    }));
  }

  const relations = ordered.flatMap(entry => parentsOf(entry)
    .filter(parentId => parentId !== entry.id && byId.has(parentId))
    .sort(compareId)
    .map(parentId => ({ id: edgeId(parentId, entry.id), from: parentId, to: entry.id })));
  let topLanes = 0, bottomLanes = 0;
  for (const relation of relations) {
    const from = positions.get(relation.from), to = positions.get(relation.to);
    const adjacent = generationOf(byId.get(relation.to)) - generationOf(byId.get(relation.from)) === 1;
    if (adjacent) continue;
    relation.side = (from.y + to.y + nodeHeight) / 2 <= contentHeight / 2 ? 'top' : 'bottom';
    relation.lane = relation.side === 'top' ? topLanes++ : bottomLanes++;
  }

  const top = margin + labelGutter + topLanes * laneGap;
  const maxGeneration = Math.max(...columns.keys());
  const width = margin * 2 + maxGeneration * (nodeWidth + gapX) + nodeWidth;
  const height = top + contentHeight + bottomLanes * laneGap + margin;
  const requested = new Set(matchIds || []), lineageIds = new Set(), highlightedIds = new Set();
  const incoming = new Map(), outgoing = new Map();
  for (const relation of relations) {
    if (!incoming.has(relation.to)) incoming.set(relation.to, []);
    if (!outgoing.has(relation.from)) outgoing.set(relation.from, []);
    incoming.get(relation.to).push(relation); outgoing.get(relation.from).push(relation);
  }
  if (filtered) {
    const pending = [...requested].filter(id => byId.has(id));
    while (pending.length) {
      const id = pending.pop();
      if (lineageIds.has(id)) continue;
      lineageIds.add(id);
      for (const relation of incoming.get(id) || []) { highlightedIds.add(relation.id); pending.push(relation.from); }
    }
  }
  const nodes = ordered.map(entry => ({
    id: entry.id, x: positions.get(entry.id).x, y: top + positions.get(entry.id).y,
    width: nodeWidth, height: nodeHeight, match: !filtered || requested.has(entry.id),
    lineage: !filtered || lineageIds.has(entry.id), entry,
  }));
  const placed = new Map(nodes.map(node => [node.id, node]));
  const corridors = new Map();
  for (const relation of relations.filter(relation => relation.side)) {
    for (const [end, generation] of [['exit', generationOf(byId.get(relation.from))], ['enter', generationOf(byId.get(relation.to)) - 1]]) {
      if (!corridors.has(generation)) corridors.set(generation, []);
      corridors.get(generation).push({ relation, end });
    }
  }
  for (const [generation, ports] of corridors) {
    ports.sort((a, b) => compareId(a.relation.id, b.relation.id) || compareId(a.end, b.end));
    ports.forEach(({ relation, end }, index) => {
      relation[`${end}X`] = margin + generation * (nodeWidth + gapX) + nodeWidth + routeInset + (gapX - routeInset * 2) * (index + 1) / (ports.length + 1);
    });
  }
  // Separate ports prevent reused parents and unrelated edges sharing a visual bus.
  for (const related of outgoing.values()) related.sort((a, b) => placed.get(a.to).y - placed.get(b.to).y || compareId(a.to, b.to));
  for (const related of incoming.values()) related.sort((a, b) => placed.get(a.from).y - placed.get(b.from).y || compareId(a.from, b.from));
  const portY = (node, related, relation) => node.y + nodeHeight * (related.indexOf(relation) + 1) / (related.length + 1);
  const edges = relations.map(relation => {
    const from = placed.get(relation.from), to = placed.get(relation.to);
    const start = point(from.x + nodeWidth, portY(from, outgoing.get(from.id), relation));
    const end = point(to.x, portY(to, incoming.get(to.id), relation));
    let route;
    if (!relation.side) {
      const controlDistance = (end.x - start.x) * .45;
      route = { kind: 'adjacent', segments: [{ type: 'C', from: start, control1: point(start.x + controlDistance, start.y), control2: point(end.x - controlDistance, end.y), to: end }] };
    } else {
      const laneY = relation.side === 'top'
        ? top - labelGutter - (relation.lane + 1) * laneGap
        : top + contentHeight + (relation.lane + 1) * laneGap;
      const exitX = relation.exitX, enterX = relation.enterX;
      const points = [start, point(exitX, start.y), point(exitX, laneY), point(enterX, laneY), point(enterX, end.y), end];
      route = { kind: 'outer', side: relation.side, segments: roundedRoute(points, cornerRadius) };
    }
    return { id: relation.id, from: relation.from, to: relation.to, path: pathFor(route.segments), route, highlighted: !filtered || highlightedIds.has(relation.id) };
  });
  return { nodes, edges, width, height };
}
