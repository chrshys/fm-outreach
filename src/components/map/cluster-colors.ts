const CLUSTER_PALETTE = [
  "#3b82f6", // blue-500
  "#ef4444", // red-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#a855f7", // purple-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#8b5cf6", // violet-500
]

export function getClusterColor(index: number): string {
  return CLUSTER_PALETTE[index % CLUSTER_PALETTE.length]
}
