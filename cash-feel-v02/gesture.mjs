/** Pure helpers shared by the visible pointer gesture and its checks. */
export function selectNearbyNotes(candidates, point, capacity, requested = 24, radius = .25) {
  const count = Math.max(0, Math.min(Math.floor(capacity), Math.floor(requested)));
  if (!count) return [];
  return candidates.map(item => ({ ...item, distance: Math.hypot(item.x - point.x, item.z - point.z) }))
    .filter(item => item.distance <= radius)
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))
    .slice(0, count).map(item => item.id);
}

export function resolveIntake(point, hotspots, radius = 44) {
  return Object.entries(hotspots)
    .filter(([, target]) => target.visible)
    .map(([name, target]) => {
      const rect = target.rect;
      const inRect = !!rect && [rect.left, rect.top, rect.right, rect.bottom].every(Number.isFinite)
        && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
      return { name, inRect, distance: Math.hypot(point.x - target.x, point.y - target.y), radius: target.radius ?? radius };
    })
    .filter(target => target.inRect || target.distance <= target.radius)
    .sort((a, b) => Number(b.inRect) - Number(a.inRect) || a.distance / a.radius - b.distance / b.radius)[0]?.name ?? null;
}

export function isTableDrop(point) {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.z) && Math.abs(point.x) <= 1.09 && point.z >= .12 && point.z <= .53;
}
