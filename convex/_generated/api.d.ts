/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as clusters from "../clusters.js";
import type * as leads from "../leads.js";
import type * as lib_activitiesList from "../lib/activitiesList.js";
import type * as lib_csvParser from "../lib/csvParser.js";
import type * as lib_dbscan from "../lib/dbscan.js";
import type * as lib_leadsList from "../lib/leadsList.js";
import type * as lib_searchLeads from "../lib/searchLeads.js";
import type * as seedHelpers from "../seedHelpers.js";
import type * as seeds_geocodeLeads from "../seeds/geocodeLeads.js";
import type * as seeds_importLeads from "../seeds/importLeads.js";
import type * as seeds_importLeadsMapper from "../seeds/importLeadsMapper.js";
import type * as seeds_runSeed from "../seeds/runSeed.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  clusters: typeof clusters;
  leads: typeof leads;
  "lib/activitiesList": typeof lib_activitiesList;
  "lib/csvParser": typeof lib_csvParser;
  "lib/dbscan": typeof lib_dbscan;
  "lib/leadsList": typeof lib_leadsList;
  "lib/searchLeads": typeof lib_searchLeads;
  seedHelpers: typeof seedHelpers;
  "seeds/geocodeLeads": typeof seeds_geocodeLeads;
  "seeds/importLeads": typeof seeds_importLeads;
  "seeds/importLeadsMapper": typeof seeds_importLeadsMapper;
  "seeds/runSeed": typeof seeds_runSeed;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
