import { buildJournalGraph } from './journal-graph.mjs';

// These layouts project the same public journal. They never change a trial.
export const JOURNAL_LAYOUTS = Object.freeze(['generations', 'circle', 'family']);
export const COMPACT_NODE = Object.freeze({ width: 150, height: 168 });
export const FAMILY_NODE = Object.freeze({ width: 208, height: 228 });
const MARGIN = 44;
const generationOf = node => Number.isSafeInteger(node.entry.generation) && node.entry.generation >= 0 ? node.entry.generation : 0;
const compareId = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const center = node => ({ x: node.x + node.width / 2, y: node.y + node.height / 2 });
const coordinate = point => `${point.x.toFixed(3)} ${point.y.toFixed(3)}`;
const cubicPath = segment => `M ${coordinate(segment.from)} C ${coordinate(segment.control1)} ${coordinate(segment.control2)} ${coordinate(segment.to)}`;

function columnsFor(nodes) {
  const columns = new Map();
  for (const node of nodes) {
    const generation = generationOf(node);
    if (!columns.has(generation)) columns.set(generation, []);
    columns.get(generation).push(node);
  }
  return [...columns].sort((a, b) => a[0] - b[0]);
}

function generationsLayout(base) {
  const { width, height } = COMPACT_NODE, gapX = 92, gapY = 26;
  const columns = columnsFor(base.nodes), maxRows = Math.max(1, ...columns.map(([, nodes]) => nodes.length));
  const contentHeight = maxRows * height + (maxRows - 1) * gapY;
  const placed = new Map(), guides = [];
  columns.forEach(([generation, column], columnIndex) => {
    const parentCenter = node => {
      const parents = base.edges.filter(edge => edge.to === node.id).map(edge => placed.get(edge.from)).filter(Boolean);
      return parents.length ? parents.reduce((sum, parent) => sum + center(parent).y, 0) / parents.length : contentHeight / 2;
    };
    column.sort((a, b) => parentCenter(a) - parentCenter(b) || compareId(a.id, b.id));
    const columnHeight = column.length * height + (column.length - 1) * gapY;
    const x = MARGIN + columnIndex * (width + gapX);
    guides.push({ label: `G${generation}`, x, y: 16 });
    column.forEach((node, row) => placed.set(node.id, {
      ...node, width, height, x, y: MARGIN + 24 + (contentHeight - columnHeight) / 2 + row * (height + gapY),
    }));
  });
  return { nodes: base.nodes.map(node => placed.get(node.id)), guides, rings: [], width: MARGIN * 2 + columns.length * width + Math.max(0, columns.length - 1) * gapX, height: MARGIN * 2 + 24 + contentHeight };
}

const overlaps = (a, b, gap = 14) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

function circleLayout(base) {
  const { width, height } = COMPACT_NODE, columns = columnsFor(base.nodes);
  const diagonal = Math.hypot(width, height), nodes = [], rings = [];
  let previousRadius = 0;
  for (const [generation, column] of columns) {
    const count = column.length;
    // Angular spacing bounds rectangles by their circumcircles on each ring.
    const circumferenceRadius = count > 1 ? (diagonal + 18) / (2 * Math.sin(Math.PI / count)) : 0;
    let radius = Math.max(circumferenceRadius, rings.length ? previousRadius + height * .65 : count === 1 ? 0 : 140);
    let ringNodes;
    const turn = (rings.length % 2) * Math.PI / Math.max(1, count);
    // Stagger rings, then expand only as much as real rectangular portraits need.
    for (let attempt = 0; attempt < 100; attempt++) {
      ringNodes = column.map((node, index) => {
        const angle = -Math.PI / 2 + turn + index * Math.PI * 2 / count;
        return { ...node, width, height, x: Math.cos(angle) * radius - width / 2, y: Math.sin(angle) * radius - height / 2, angle };
      });
      if (!ringNodes.some(node => nodes.some(other => overlaps(node, other)))) break;
      radius += 16;
    }
    nodes.push(...ringNodes);
    rings.push({ cx: 0, cy: 0, r: radius, label: `G${generation}` });
    previousRadius = radius;
  }
  const outerRadius = previousRadius;
  const shiftX = MARGIN + outerRadius + width / 2, shiftY = MARGIN + outerRadius + height / 2;
  for (const node of nodes) { node.x += shiftX; node.y += shiftY; }
  for (const ring of rings) { ring.cx = shiftX; ring.cy = shiftY; }
  const ordered = new Map(nodes.map(node => [node.id, node]));
  return { nodes: base.nodes.map(node => ordered.get(node.id)), guides: [], rings, width: shiftX * 2, height: shiftY * 2 };
}

function familyLayout(base, requestedId) {
  const focus = base.nodes.find(node => node.id === requestedId) || [...base.nodes].reverse().find(node => node.entry.status === 'kept') || base.nodes.at(-1);
  const focusId = focus.id;
  const parentIds = new Set(base.edges.filter(edge => edge.to === focusId).map(edge => edge.from));
  const childIds = new Set(base.edges.filter(edge => edge.from === focusId).map(edge => edge.to));
  const parents = base.nodes.filter(node => parentIds.has(node.id));
  const children = base.nodes.filter(node => childIds.has(node.id) && !parentIds.has(node.id) && node.id !== focusId);
  const { width, height } = FAMILY_NODE, gapX = 82, gapY = 28, maxChildRows = 4;
  const childRows = Math.min(maxChildRows, Math.max(1, children.length));
  const rows = Math.max(1, parents.length, childRows), contentHeight = rows * height + (rows - 1) * gapY;
  const childColumns = Math.max(1, Math.ceil(children.length / maxChildRows));
  const nodes = [], offsetY = MARGIN + 28;
  const columnX = column => MARGIN + column * (width + gapX);
  const place = (node, column, row, groupRows) => nodes.push({
    ...node, width, height, x: columnX(column), y: offsetY + (contentHeight - (groupRows * height + (groupRows - 1) * gapY)) / 2 + row * (height + gapY),
  });
  parents.forEach((node, index) => place(node, 0, index, parents.length));
  place(focus, 1, 0, 1);
  children.forEach((node, index) => {
    const column = Math.floor(index / maxChildRows), count = Math.min(maxChildRows, children.length - column * maxChildRows);
    place(node, 2 + column, index % maxChildRows, count);
  });
  return { nodes, focusId, guides: [{ label: 'parents', x: columnX(0), y: 16 }, { label: 'focus', x: columnX(1), y: 16 }, { label: 'children', x: columnX(2), y: 16 }], rings: [], width: MARGIN * 2 + (2 + childColumns) * width + (1 + childColumns) * gapX, height: MARGIN * 2 + 28 + contentHeight };
}

function routedEdges(base, nodes, layout, focusId) {
  const placed = new Map(nodes.map(node => [node.id, node]));
  const edges = base.edges.filter(edge => placed.has(edge.from) && placed.has(edge.to) && (layout !== 'family' || edge.from === focusId || edge.to === focusId));
  const siblings = new Map();
  for (const edge of edges) {
    if (!siblings.has(edge.to)) siblings.set(edge.to, []);
    siblings.get(edge.to).push(edge);
  }
  for (const group of siblings.values()) group.sort((a, b) => compareId(a.from, b.from));
  return edges.map(edge => {
    const from = placed.get(edge.from), to = placed.get(edge.to), startCenter = center(from), endCenter = center(to);
    let start, end, control1, control2;
    if (layout === 'circle') {
      const dx = endCenter.x - startCenter.x, dy = endCenter.y - startCenter.y, length = Math.hypot(dx, dy) || 1;
      const rectangleReach = node => 1 / Math.max(Math.abs(dx / length) / (node.width / 2), Math.abs(dy / length) / (node.height / 2));
      const startReach = rectangleReach(from), endReach = rectangleReach(to);
      start = { x: startCenter.x + dx / length * startReach, y: startCenter.y + dy / length * startReach };
      end = { x: endCenter.x - dx / length * endReach, y: endCenter.y - dy / length * endReach };
      const bend = (siblings.get(edge.to).indexOf(edge) - (siblings.get(edge.to).length - 1) / 2) * 34;
      control1 = { x: start.x + (end.x - start.x) * .32 - dy / length * bend, y: start.y + (end.y - start.y) * .32 + dx / length * bend };
      control2 = { x: start.x + (end.x - start.x) * .68 - dy / length * bend, y: start.y + (end.y - start.y) * .68 + dx / length * bend };
    } else {
      const group = siblings.get(edge.to), port = (group.indexOf(edge) + 1) / (group.length + 1);
      start = { x: from.x + from.width, y: startCenter.y };
      end = { x: to.x, y: to.y + to.height * port };
      const reach = Math.max(30, (end.x - start.x) * .42);
      control1 = { x: start.x + reach, y: start.y };
      control2 = { x: end.x - reach, y: end.y };
    }
    const segment = { type: 'C', from: start, control1, control2, to: end };
    return { ...edge, path: cubicPath(segment), route: { kind: layout, segments: [segment] } };
  });
}

/** Filters alter emphasis only. Family scope is an explicit presentation choice. */
export function buildJournalLayout(entries, matchIds = new Set(), filtered = false, options = {}) {
  const layout = JOURNAL_LAYOUTS.includes(options.layout) ? options.layout : 'generations';
  const base = buildJournalGraph(entries, matchIds, filtered);
  if (!base.nodes.length) return { ...base, layout, focusId: null, guides: [], rings: [], visibleCount: 0, totalCount: 0 };
  const positioned = layout === 'circle' ? circleLayout(base) : layout === 'family' ? familyLayout(base, options.focusId) : generationsLayout(base);
  const focusId = positioned.focusId || (base.nodes.some(node => node.id === options.focusId) ? options.focusId : null);
  return { ...positioned, layout, focusId, edges: routedEdges(base, positioned.nodes, layout, focusId), visibleCount: positioned.nodes.length, totalCount: base.nodes.length };
}
