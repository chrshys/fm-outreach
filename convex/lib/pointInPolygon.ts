const EARTH_RADIUS_KM = 6371;

/**
 * Determine whether a point lies inside a polygon using the ray-casting algorithm.
 * The polygon is defined as an ordered array of vertices (no need to repeat the first vertex).
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

/**
 * Compute the geometric centroid of a polygon.
 * Uses the standard signed-area centroid formula for simple polygons.
 */
export function polygonCentroid(
  polygon: { lat: number; lng: number }[],
): { lat: number; lng: number } {
  if (polygon.length === 0) return { lat: 0, lng: 0 };
  if (polygon.length === 1) return { lat: polygon[0].lat, lng: polygon[0].lng };
  if (polygon.length === 2) {
    return {
      lat: (polygon[0].lat + polygon[1].lat) / 2,
      lng: (polygon[0].lng + polygon[1].lng) / 2,
    };
  }

  let area = 0;
  let cLat = 0;
  let cLng = 0;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const cross = polygon[j].lng * polygon[i].lat - polygon[i].lng * polygon[j].lat;
    area += cross;
    cLat += (polygon[j].lat + polygon[i].lat) * cross;
    cLng += (polygon[j].lng + polygon[i].lng) * cross;
  }

  area /= 2;
  const factor = 1 / (6 * area);
  return { lat: cLat * factor, lng: cLng * factor };
}

/**
 * Return the maximum Haversine distance (in km) from a center point to any vertex of a polygon.
 */
export function boundingRadius(
  center: { lat: number; lng: number },
  polygon: { lat: number; lng: number }[],
): number {
  let maxDist = 0;
  for (const vertex of polygon) {
    const dist = haversineKm(center.lat, center.lng, vertex.lat, vertex.lng);
    if (dist > maxDist) maxDist = dist;
  }
  return maxDist;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
