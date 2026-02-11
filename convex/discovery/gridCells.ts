import { v } from "convex/values";

import { mutation } from "../_generated/server";

const DEFAULT_CELL_SIZE_KM = 20;

const DEFAULT_QUERIES = [
  "farms",
  "farmers market",
  "orchard",
  "farm stand",
  "pick your own",
];

export const generateGrid = mutation({
  args: {
    name: v.string(),
    region: v.string(),
    province: v.string(),
    queries: v.optional(v.array(v.string())),
    swLat: v.number(),
    swLng: v.number(),
    neLat: v.number(),
    neLng: v.number(),
    cellSizeKm: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cellSizeKm = args.cellSizeKm ?? DEFAULT_CELL_SIZE_KM;
    const queries = args.queries ?? DEFAULT_QUERIES;
    const now = Date.now();

    const gridId = await ctx.db.insert("discoveryGrids", {
      name: args.name,
      region: args.region,
      province: args.province,
      queries,
      swLat: args.swLat,
      swLng: args.swLng,
      neLat: args.neLat,
      neLng: args.neLng,
      cellSizeKm,
      totalLeadsFound: 0,
      createdAt: now,
    });

    const midLat = (args.swLat + args.neLat) / 2;
    const latStep = cellSizeKm / 111;
    const lngStep = cellSizeKm / (111 * Math.cos((midLat * Math.PI) / 180));

    const cellIds: string[] = [];

    for (let lat = args.swLat; lat < args.neLat; lat += latStep) {
      for (let lng = args.swLng; lng < args.neLng; lng += lngStep) {
        const cellNeLat = Math.min(lat + latStep, args.neLat);
        const cellNeLng = Math.min(lng + lngStep, args.neLng);

        const cellId = await ctx.db.insert("discoveryCells", {
          swLat: lat,
          swLng: lng,
          neLat: cellNeLat,
          neLng: cellNeLng,
          depth: 0,
          isLeaf: true,
          status: "unsearched",
          gridId,
        });

        cellIds.push(cellId);
      }
    }

    return { gridId, cellCount: cellIds.length };
  },
});
