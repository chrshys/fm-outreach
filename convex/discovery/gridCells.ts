import { ConvexError, v } from "convex/values";

import { internal } from "../_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

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

export const listGrids = query({
  args: {},
  handler: async (ctx) => {
    const grids = await ctx.db.query("discoveryGrids").collect();

    const results = await Promise.all(
      grids.map(async (grid) => {
        const leafCells = await ctx.db
          .query("discoveryCells")
          .withIndex("by_gridId_isLeaf", (q) =>
            q.eq("gridId", grid._id).eq("isLeaf", true),
          )
          .collect();

        let searchedCount = 0;
        let saturatedCount = 0;
        for (const cell of leafCells) {
          if (cell.status === "searched") searchedCount++;
          else if (cell.status === "saturated") saturatedCount++;
        }

        return {
          _id: grid._id,
          name: grid.name,
          region: grid.region,
          province: grid.province,
          cellSizeKm: grid.cellSizeKm,
          totalLeadsFound: grid.totalLeadsFound,
          createdAt: grid.createdAt,
          totalLeafCells: leafCells.length,
          searchedCount,
          saturatedCount,
        };
      }),
    );

    return results;
  },
});

export const updateGridQueries = mutation({
  args: {
    gridId: v.id("discoveryGrids"),
    queries: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const grid = await ctx.db.get(args.gridId);
    if (!grid) {
      throw new ConvexError("Grid not found");
    }

    await ctx.db.patch(args.gridId, { queries: args.queries });
  },
});

export const listCells = query({
  args: {
    gridId: v.id("discoveryGrids"),
  },
  handler: async (ctx, args) => {
    const cells = await ctx.db
      .query("discoveryCells")
      .withIndex("by_gridId_isLeaf", (q) =>
        q.eq("gridId", args.gridId).eq("isLeaf", true),
      )
      .collect();

    return cells.map((cell) => ({
      _id: cell._id,
      swLat: cell.swLat,
      swLng: cell.swLng,
      neLat: cell.neLat,
      neLng: cell.neLng,
      depth: cell.depth,
      status: cell.status,
      resultCount: cell.resultCount,
      querySaturation: cell.querySaturation,
      lastSearchedAt: cell.lastSearchedAt,
    }));
  },
});

export const claimCellForSearch = internalMutation({
  args: {
    cellId: v.id("discoveryCells"),
    expectedStatuses: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    if (!args.expectedStatuses.includes(cell.status)) {
      throw new ConvexError(
        `Cell status is "${cell.status}", expected one of: ${args.expectedStatuses.join(", ")}`,
      );
    }

    const previousStatus = cell.status;
    await ctx.db.patch(args.cellId, { status: "searching" });

    return { previousStatus };
  },
});

export const getCell = internalQuery({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    const grid = await ctx.db.get(cell.gridId);
    if (!grid) {
      throw new ConvexError("Grid not found");
    }

    return {
      ...cell,
      grid: {
        _id: grid._id,
        queries: grid.queries,
        region: grid.region,
        province: grid.province,
      },
    };
  },
});

export const updateCellStatus = internalMutation({
  args: {
    cellId: v.id("discoveryCells"),
    status: v.union(
      v.literal("unsearched"),
      v.literal("searched"),
      v.literal("saturated"),
      v.literal("searching"),
    ),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    await ctx.db.patch(args.cellId, { status: args.status });
  },
});

export const updateCellSearchResult = internalMutation({
  args: {
    cellId: v.id("discoveryCells"),
    status: v.union(
      v.literal("unsearched"),
      v.literal("searched"),
      v.literal("saturated"),
      v.literal("searching"),
    ),
    resultCount: v.number(),
    querySaturation: v.array(
      v.object({ query: v.string(), count: v.number() }),
    ),
    lastSearchedAt: v.number(),
    newLeadsCount: v.number(),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    await ctx.db.patch(args.cellId, {
      status: args.status,
      resultCount: args.resultCount,
      querySaturation: args.querySaturation,
      lastSearchedAt: args.lastSearchedAt,
    });

    const grid = await ctx.db.get(cell.gridId);
    if (!grid) {
      throw new ConvexError("Grid not found");
    }

    await ctx.db.patch(cell.gridId, {
      totalLeadsFound: grid.totalLeadsFound + args.newLeadsCount,
    });
  },
});

const DELETE_BATCH_SIZE = 500;

export const deleteCellBatch = internalMutation({
  args: {
    gridId: v.id("discoveryGrids"),
  },
  handler: async (ctx, args) => {
    const cells = await ctx.db
      .query("discoveryCells")
      .withIndex("by_gridId", (q) => q.eq("gridId", args.gridId))
      .take(DELETE_BATCH_SIZE);

    for (const cell of cells) {
      await ctx.db.delete(cell._id);
    }

    return { deleted: cells.length };
  },
});

export const deleteGrid = internalAction({
  args: {
    gridId: v.id("discoveryGrids"),
  },
  handler: async (ctx, args) => {
    let totalDeleted = 0;
    let done = false;

    while (!done) {
      // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
      const { deleted } = await ctx.runMutation(
        internal.discovery.gridCells.deleteCellBatch,
        { gridId: args.gridId },
      );
      totalDeleted += deleted;

      if (deleted < DELETE_BATCH_SIZE) {
        done = true;
      }
    }

    // @ts-ignore TS2589 nondeterministic deep type instantiation in generated Convex API types
    await ctx.runMutation(internal.discovery.gridCells.deleteGridRecord, {
      gridId: args.gridId,
    });

    return { totalCellsDeleted: totalDeleted };
  },
});

export const deleteGridRecord = internalMutation({
  args: {
    gridId: v.id("discoveryGrids"),
  },
  handler: async (ctx, args) => {
    const grid = await ctx.db.get(args.gridId);
    if (!grid) {
      throw new ConvexError("Grid not found");
    }
    await ctx.db.delete(args.gridId);
  },
});

export const requestDeleteGrid = mutation({
  args: {
    gridId: v.id("discoveryGrids"),
  },
  handler: async (ctx, args) => {
    const grid = await ctx.db.get(args.gridId);
    if (!grid) {
      throw new ConvexError("Grid not found");
    }

    await ctx.scheduler.runAfter(
      0,
      internal.discovery.gridCells.deleteGrid,
      { gridId: args.gridId },
    );
  },
});
