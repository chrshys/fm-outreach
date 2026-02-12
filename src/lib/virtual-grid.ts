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
