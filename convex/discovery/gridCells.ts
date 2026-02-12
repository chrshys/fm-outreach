import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";

const MAX_DEPTH = 4;

export const subdivideCell = mutation({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    if (cell.status === "searching") {
      throw new ConvexError("Cannot subdivide while cell is being searched");
    }

    if (cell.depth >= MAX_DEPTH) {
      throw new ConvexError("Cell is already at maximum depth");
    }

    const existingChildren = await ctx.db
      .query("discoveryCells")
      .withIndex("by_parentCellId", (q) => q.eq("parentCellId", args.cellId))
      .collect();

    if (existingChildren.length > 0) {
      return { childIds: existingChildren.map((c) => c._id) };
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
        boundsKey: `${q.swLat.toFixed(6)}_${q.swLng.toFixed(6)}`,
      });
      childIds.push(childId);
    }

    await ctx.db.patch(args.cellId, { isLeaf: false });

    return { childIds };
  },
});

export const undivideCell = mutation({
  args: {
    cellId: v.id("discoveryCells"),
  },
  handler: async (ctx, args) => {
    const cell = await ctx.db.get(args.cellId);
    if (!cell) {
      throw new ConvexError("Cell not found");
    }

    // Determine which cell to collapse: if the cell has a parent, collapse the
    // parent (original behaviour). If it has no parent it IS the subdivided root
    // cell, so collapse itself.
    let targetCellId: typeof args.cellId;

    if (cell.parentCellId) {
      const parentCell = await ctx.db.get(cell.parentCellId);
      if (!parentCell) {
        throw new ConvexError("Parent cell not found");
      }
      targetCellId = cell.parentCellId;
    } else {
      // Root cell — verify it actually has children to undivide
      const children = await ctx.db
        .query("discoveryCells")
        .withIndex("by_parentCellId", (q) =>
          q.eq("parentCellId", args.cellId),
        )
        .collect();
      if (children.length === 0) {
        throw new ConvexError("Cell has no children to undivide");
      }
      targetCellId = args.cellId;
    }

    // BFS-walk all descendants of the target
    const toDelete: { _id: typeof args.cellId; status: string }[] = [];
    const queue: (typeof args.cellId)[] = [targetCellId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = await ctx.db
        .query("discoveryCells")
        .withIndex("by_parentCellId", (q) => q.eq("parentCellId", currentId))
        .collect();

      for (const child of children) {
        toDelete.push({ _id: child._id, status: child.status });
        queue.push(child._id);
      }
    }

    if (toDelete.some((d) => d.status === "searching")) {
      throw new ConvexError(
        "Cannot undivide while a child cell is being searched",
      );
    }

    for (const { _id } of toDelete) {
      await ctx.db.delete(_id);
    }

    await ctx.db.patch(targetCellId, { isLeaf: true });

    return { deletedCount: toDelete.length };
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
        let searchingCount = 0;
        for (const cell of leafCells) {
          if (cell.status === "searched") searchedCount++;
          else if (cell.status === "saturated") saturatedCount++;
          else if (cell.status === "searching") searchingCount++;
        }

        return {
          _id: grid._id,
          name: grid.name,
          region: grid.region,
          province: grid.province,
          queries: grid.queries,
          cellSizeKm: grid.cellSizeKm,
          totalLeadsFound: grid.totalLeadsFound,
          createdAt: grid.createdAt,
          totalLeafCells: leafCells.length,
          searchedCount,
          saturatedCount,
          searchingCount,
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
      parentCellId: cell.parentCellId,
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
      return { claimed: false as const, previousStatus: cell.status };
    }

    const previousStatus = cell.status;
    await ctx.db.patch(args.cellId, { status: "searching" });

    return { claimed: true as const, previousStatus };
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
        name: grid.name,
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

