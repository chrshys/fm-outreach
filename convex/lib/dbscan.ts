export type GeoPoint = {
  id: string;
  lat: number;
  lng: number;
  city?: string;
};

export type Cluster = {
  name: string;
  pointIds: string[];
};

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(
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

function regionQuery(
  points: GeoPoint[],
  pointIndex: number,
  eps: number,
): number[] {
  const neighbors: number[] = [];
  const p = points[pointIndex];
  for (let i = 0; i < points.length; i++) {
    if (haversineDistance(p.lat, p.lng, points[i].lat, points[i].lng) <= eps) {
      neighbors.push(i);
    }
  }
  return neighbors;
}

const NOISE = -1;
const UNVISITED = -2;

export function dbscan(
  points: GeoPoint[],
  eps: number = 15,
  minPoints: number = 3,
): Cluster[] {
  const labels = new Array<number>(points.length).fill(UNVISITED);
  let clusterId = 0;

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== UNVISITED) continue;

    const neighbors = regionQuery(points, i, eps);
    if (neighbors.length < minPoints) {
      labels[i] = NOISE;
      continue;
    }

    labels[i] = clusterId;
    const seed = new Set(neighbors);
    seed.delete(i);
    const queue = [...seed];

    while (queue.length > 0) {
      const j = queue.shift()!;

      if (labels[j] === NOISE) {
        labels[j] = clusterId;
      }

      if (labels[j] !== UNVISITED) continue;

      labels[j] = clusterId;
      const jNeighbors = regionQuery(points, j, eps);
      if (jNeighbors.length >= minPoints) {
        for (const n of jNeighbors) {
          if (!seed.has(n)) {
            seed.add(n);
            queue.push(n);
          }
        }
      }
    }

    clusterId++;
  }

  const clusterMap = new Map<number, string[]>();
  for (let i = 0; i < points.length; i++) {
    if (labels[i] < 0) continue;
    const existing = clusterMap.get(labels[i]);
    if (existing) {
      existing.push(points[i].id);
    } else {
      clusterMap.set(labels[i], [points[i].id]);
    }
  }

  const clusters: Cluster[] = [];
  for (const [, pointIds] of clusterMap) {
    clusters.push({
      name: mostFrequentCity(points, pointIds),
      pointIds,
    });
  }

  return clusters;
}

/**
 * Compute the convex hull of a set of 2D points using the gift-wrapping algorithm.
 * Returns vertices in counter-clockwise order.
 */
export function convexHull(
  points: Array<{ lat: number; lng: number }>,
): Array<{ lat: number; lng: number }> {
  if (points.length < 3) return [...points];

  // Find leftmost point
  let start = 0;
  for (let i = 1; i < points.length; i++) {
    if (
      points[i].lng < points[start].lng ||
      (points[i].lng === points[start].lng && points[i].lat < points[start].lat)
    ) {
      start = i;
    }
  }

  const hull: Array<{ lat: number; lng: number }> = [];
  let current = start;

  do {
    hull.push(points[current]);
    let next = 0;
    for (let i = 1; i < points.length; i++) {
      if (i === current) continue;
      if (next === current) {
        next = i;
        continue;
      }
      const cross =
        (points[i].lng - points[current].lng) *
          (points[next].lat - points[current].lat) -
        (points[i].lat - points[current].lat) *
          (points[next].lng - points[current].lng);
      if (cross > 0) {
        next = i;
      }
    }
    current = next;
  } while (current !== start);

  return hull;
}

function mostFrequentCity(points: GeoPoint[], pointIds: string[]): string {
  const idSet = new Set(pointIds);
  const counts = new Map<string, number>();
  for (const p of points) {
    if (!idSet.has(p.id)) continue;
    const city = p.city ?? "Unknown";
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  let best = "Unknown";
  let bestCount = 0;
  for (const [city, count] of counts) {
    if (count > bestCount) {
      best = city;
      bestCount = count;
    }
  }
  return best;
}
