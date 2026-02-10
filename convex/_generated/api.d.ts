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
import type * as campaigns from "../campaigns.js";
import type * as clusters from "../clusters.js";
import type * as crons from "../crons.js";
import type * as email_generateEmail from "../email/generateEmail.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as enrichment_batchEnrich from "../enrichment/batchEnrich.js";
import type * as enrichment_batchEnrichPublic from "../enrichment/batchEnrichPublic.js";
import type * as enrichment_claudeAnalysis from "../enrichment/claudeAnalysis.js";
import type * as enrichment_googlePlaces from "../enrichment/googlePlaces.js";
import type * as enrichment_hunter from "../enrichment/hunter.js";
import type * as enrichment_orchestrator from "../enrichment/orchestrator.js";
import type * as enrichment_orchestratorHelpers from "../enrichment/orchestratorHelpers.js";
import type * as enrichment_socialDiscovery from "../enrichment/socialDiscovery.js";
import type * as enrichment_websiteScraper from "../enrichment/websiteScraper.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as lib_activitiesList from "../lib/activitiesList.js";
import type * as lib_csvParser from "../lib/csvParser.js";
import type * as lib_dbscan from "../lib/dbscan.js";
import type * as lib_getSettings from "../lib/getSettings.js";
import type * as lib_leadsList from "../lib/leadsList.js";
import type * as lib_searchLeads from "../lib/searchLeads.js";
import type * as seedHelpers from "../seedHelpers.js";
import type * as seeds_geocodeLeads from "../seeds/geocodeLeads.js";
import type * as seeds_importLeads from "../seeds/importLeads.js";
import type * as seeds_importLeadsMapper from "../seeds/importLeadsMapper.js";
import type * as seeds_runSeed from "../seeds/runSeed.js";
import type * as seeds_seedTemplates from "../seeds/seedTemplates.js";
import type * as settings from "../settings.js";
import type * as smartlead_actions from "../smartlead/actions.js";
import type * as smartlead_analyticsCron from "../smartlead/analyticsCron.js";
import type * as smartlead_client from "../smartlead/client.js";
import type * as smartlead_rateLimiter from "../smartlead/rateLimiter.js";
import type * as smartlead_unsubscribe from "../smartlead/unsubscribe.js";
import type * as smartlead_webhookHandlers from "../smartlead/webhookHandlers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  campaigns: typeof campaigns;
  clusters: typeof clusters;
  crons: typeof crons;
  "email/generateEmail": typeof email_generateEmail;
  emailTemplates: typeof emailTemplates;
  "enrichment/batchEnrich": typeof enrichment_batchEnrich;
  "enrichment/batchEnrichPublic": typeof enrichment_batchEnrichPublic;
  "enrichment/claudeAnalysis": typeof enrichment_claudeAnalysis;
  "enrichment/googlePlaces": typeof enrichment_googlePlaces;
  "enrichment/hunter": typeof enrichment_hunter;
  "enrichment/orchestrator": typeof enrichment_orchestrator;
  "enrichment/orchestratorHelpers": typeof enrichment_orchestratorHelpers;
  "enrichment/socialDiscovery": typeof enrichment_socialDiscovery;
  "enrichment/websiteScraper": typeof enrichment_websiteScraper;
  http: typeof http;
  leads: typeof leads;
  "lib/activitiesList": typeof lib_activitiesList;
  "lib/csvParser": typeof lib_csvParser;
  "lib/dbscan": typeof lib_dbscan;
  "lib/getSettings": typeof lib_getSettings;
  "lib/leadsList": typeof lib_leadsList;
  "lib/searchLeads": typeof lib_searchLeads;
  seedHelpers: typeof seedHelpers;
  "seeds/geocodeLeads": typeof seeds_geocodeLeads;
  "seeds/importLeads": typeof seeds_importLeads;
  "seeds/importLeadsMapper": typeof seeds_importLeadsMapper;
  "seeds/runSeed": typeof seeds_runSeed;
  "seeds/seedTemplates": typeof seeds_seedTemplates;
  settings: typeof settings;
  "smartlead/actions": typeof smartlead_actions;
  "smartlead/analyticsCron": typeof smartlead_analyticsCron;
  "smartlead/client": typeof smartlead_client;
  "smartlead/rateLimiter": typeof smartlead_rateLimiter;
  "smartlead/unsubscribe": typeof smartlead_unsubscribe;
  "smartlead/webhookHandlers": typeof smartlead_webhookHandlers;
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
