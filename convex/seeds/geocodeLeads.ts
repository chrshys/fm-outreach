import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

import { action, internalMutation, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;
const GOOGLE_GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";
type LeadForGeocode = {
  _id: Id<"leads">;
  address: string;
  city: string;
  province: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildAddress(address: string, city: string, province: string): string {
  return [address, city, province].filter((part) => part.trim().length > 0).join(", ");
}

function buildFallbackAddress(city: string, province: string): string {
  return [city, province].filter((part) => part.trim().length > 0).join(", ");
}

async function fetchCoordinatesForAddress(
  address: string,
  googleMapsApiKey: string,
): Promise<{ lat: number; lng: number } | null> {
  const encodedAddress = encodeURIComponent(address);
  const response = await fetch(
    `${GOOGLE_GEOCODE_URL}?address=${encodedAddress}&key=${googleMapsApiKey}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    status?: string;
    results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } } }>;
  };

  const location = data.results?.[0]?.geometry?.location;
  if (
    data.status !== "OK" ||
    location?.lat === undefined ||
    location?.lng === undefined
  ) {
    return null;
  }

  return { lat: location.lat, lng: location.lng };
}

export const getLeadsForGeocoding = internalQuery({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();

    const missingCoordinates = leads.filter(
      (lead) => lead.latitude === undefined || lead.longitude === undefined,
    );
    const alreadyHadCoordsCount = leads.length - missingCoordinates.length;

    return {
      missingCoordinates,
      alreadyHadCoordsCount,
    };
  },
});

export const patchLeadCoordinates = internalMutation({
  args: {
    leadId: v.id("leads"),
    latitude: v.number(),
    longitude: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.leadId, {
      latitude: args.latitude,
      longitude: args.longitude,
      updatedAt: Date.now(),
    });
  },
});

export const geocodeLeads = action({
  args: {},
  handler: async (ctx) => {
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!googleMapsApiKey) {
      throw new Error("Missing GOOGLE_MAPS_API_KEY environment variable");
    }

    const { missingCoordinates, alreadyHadCoordsCount } = (await ctx.runQuery(
      internal.seeds.geocodeLeads.getLeadsForGeocoding,
      {},
    )) as {
      missingCoordinates: LeadForGeocode[];
      alreadyHadCoordsCount: number;
    };

    let geocodedCount = 0;
    let failedCount = 0;

    for (let index = 0; index < missingCoordinates.length; index += BATCH_SIZE) {
      const batch = missingCoordinates.slice(index, index + BATCH_SIZE);

      await Promise.all(
        batch.map(async (lead) => {
          const fullAddress = buildAddress(lead.address, lead.city, lead.province);
          const fallbackAddress = buildFallbackAddress(lead.city, lead.province);
          const location =
            (await fetchCoordinatesForAddress(fullAddress, googleMapsApiKey)) ??
            (fullAddress === fallbackAddress
              ? null
              : await fetchCoordinatesForAddress(fallbackAddress, googleMapsApiKey));

          if (!location) {
            failedCount += 1;
            return;
          }

          try {
            await ctx.runMutation(
              internal.seeds.geocodeLeads.patchLeadCoordinates,
              {
                leadId: lead._id,
                latitude: location.lat,
                longitude: location.lng,
              },
            );
            geocodedCount += 1;
          } catch {
            failedCount += 1;
          }
        }),
      );

      if (index + BATCH_SIZE < missingCoordinates.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    console.log("Batch geocode complete", {
      geocodedCount,
      failedCount,
      alreadyHadCoordsCount,
    });

    return {
      geocodedCount,
      failedCount,
      alreadyHadCoordsCount,
    };
  },
});
