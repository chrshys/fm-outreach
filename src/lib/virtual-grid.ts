export type VirtualCell = {
  key: string;
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
};

export function cellKey(swLat: number, swLng: number): string {
  return `${swLat.toFixed(6)}_${swLng.toFixed(6)}`;
}

export function computeBoundsKey(
  swLat: number,
  swLng: number,
  latStep: number,
  lngStep: number,
): string {
  const snappedLat = Math.floor(swLat / latStep) * latStep;
  const snappedLng = Math.floor(swLng / lngStep) * lngStep;
  return `${snappedLat.toFixed(6)}_${snappedLng.toFixed(6)}`;
}

export function computeVirtualGrid(
  bounds: { swLat: number; swLng: number; neLat: number; neLng: number },
  cellSizeKm: number,
  maxCells: number = 500,
): VirtualCell[] {
  const latStep = cellSizeKm / 111;
  // Snap midLat to a coarse 5° band so that lngStep (and therefore grid
  // columns) stay stable across vertical pans within the same latitude zone.
  const LAT_BAND = 5;
  const midLat = Math.round(((bounds.swLat + bounds.neLat) / 2) / LAT_BAND) * LAT_BAND;
  const lngStep = cellSizeKm / (111 * Math.cos(midLat * Math.PI / 180));

  // Snap start coordinates to grid alignment to avoid floating-point drift.
  const startLat = Math.floor(bounds.swLat / latStep) * latStep;
  const startLng = Math.floor(bounds.swLng / lngStep) * lngStep;
  const startLatIdx = Math.round(startLat / latStep);
  const startLngIdx = Math.round(startLng / lngStep);

  const rows = Math.ceil((bounds.neLat - startLat) / latStep);
  const cols = Math.ceil((bounds.neLng - startLng) / lngStep);

  if (rows * cols > maxCells) {
    return [];
  }

  const cells: VirtualCell[] = [];
  for (let r = 0; r < rows; r++) {
    const lat = (startLatIdx + r) * latStep;
    for (let c = 0; c < cols; c++) {
      const lng = (startLngIdx + c) * lngStep;
      cells.push({
        key: cellKey(lat, lng),
        swLat: lat,
        swLng: lng,
        neLat: (startLatIdx + r + 1) * latStep,
        neLng: (startLngIdx + c + 1) * lngStep,
      });
    }
  }

  return cells;
}
