import { ConvexError, v } from "convex/values";

import { mutation } from "../_generated/server";

const MAX_DEPTH = 4;
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

export const subdivideCell = mutation({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    if (cell.status !== "saturated") {
      throw new ConvexError("Cell must be saturated before subdividing");
    }

    if (cell.depth >= MAX_DEPTH) {
      throw new ConvexError("Cell is already at maximum depth");
    }

    const existingChildren = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
      .first();

    if (existingChildren) {
      throw new ConvexError("Cell has already been subdivided");
    }

    const midLat = (cell.swLat + cell.neLat) / 2;
    const midLng = (cell.swLng + cell.neLng) / 2;
    const childDepth = cell.depth + 1;

    const quadrants = [
      { swLat: cell.swLat, swLng: cell.swLng, neLat: midLat, neLng: midLng },
      { swLat: cell.swLat, swLng: midLng, neLat: midLat, neLng: cell.neLng },
      { swLat: midLat, swLng: cell.swLng, neLat: cell.neLat, neLng: midLng },
      { swLat: midLat, swLng: midLng, neLat: cell.neLat, neLng: cell.neLng },
    ];

    const childIds = [];
    for (const q of quadrants) {
      const childId = await ctx.db.insert("discoveryCells", {
        ...q,
        depth: childDepth,
        parentCellId: args.cellId,
        isLeaf: true,
        status: "unsearched",
        gridId: cell.gridId,
      });
      childIds.push(childId);
    }

    await ctx.db.patch(args.cellId, { isLeaf: false });

    return { childIds };
  },
});
