/**
 * Determine whether a point lies inside a polygon using the ray-casting algorithm.
 * The polygon is defined as an ordered array of vertices (no need to repeat the first vertex).
 *
 * Client-side mirror of convex/lib/pointInPolygon.ts — same logic, usable in React components
 * for preview counting of leads inside a drawn polygon.
 */
export function pointInPolygon(
  point: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].lat;
    const xi = polygon[i].lng;
    const yj = polygon[j].lat;
    const xj = polygon[j].lng;

    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
