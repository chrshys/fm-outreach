import assert from "node:assert/strict"
import fs from "node:fs"
import test from "node:test"

const source = fs.readFileSync("convex/social/generateDM.ts", "utf8")

// --- LeadData type includes lead-specific fields ---

test("LeadData type includes region field", () => {
  assert.match(source, /region:\s*string/)
})

test("LeadData type includes type field", () => {
  assert.match(source, /type:\s*string/)
})

test("LeadData type includes salesChannels field", () => {
  assert.match(source, /salesChannels\?:\s*string\[\]/)
})

// --- buildLeadContext includes location details ---

test("buildLeadContext outputs location with city and region", () => {
  assert.match(source, /Location: \$\{lead\.city\}, \$\{lead\.region\}/)
})

test("buildLeadContext outputs lead type", () => {
  assert.match(source, /Type: \$\{formatLeadType\(lead\.type\)\}/)
})

// --- buildLeadContext includes product details ---

test("buildLeadContext outputs raw products list", () => {
  assert.match(source, /Products: \$\{lead\.products\?\.join/)
})

test("buildLeadContext outputs structured products grouped by category", () => {
  assert.match(source, /Detailed products: \$\{productLines\}/)
})

// --- buildLeadContext includes enrichment details ---

test("buildLeadContext outputs specialties from enrichment", () => {
  assert.match(source, /Specialties: \$\{desc\.specialties\.join/)
})

test("buildLeadContext outputs certifications from enrichment", () => {
  assert.match(source, /Certifications: \$\{desc\.certifications\.join/)
})

test("buildLeadContext outputs enriched summary", () => {
  assert.match(source, /Enriched summary: \$\{desc\.summary\}/)
})

test("buildLeadContext outputs sales channels when available", () => {
  assert.match(source, /Sales channels: \$\{lead\.salesChannels\.join/)
})

// --- formatLeadType helper ---

test("formatLeadType maps known lead types to labels", () => {
  assert.match(source, /function formatLeadType\(type:\s*string\):\s*string/)
  assert.match(source, /farm:\s*"Farm"/)
  assert.match(source, /farmers_market:\s*"Farmers Market"/)
  assert.match(source, /retail_store:\s*"Retail Store"/)
  assert.match(source, /roadside_stand:\s*"Roadside Stand"/)
})

// --- System prompt requires specific product and location references ---

test("system prompt requires mentioning specific products", () => {
  assert.match(source, /You MUST mention at least one specific product or product category/)
})

test("system prompt requires referencing farm location", () => {
  assert.match(source, /You MUST reference the farm's location \(city or region\)/)
})

test("system prompt encourages weaving in specialties and certifications", () => {
  assert.match(source, /specialties or certifications are available, weave them in/)
})

test("system prompt instructs to use only verified data", () => {
  assert.match(source, /Use ONLY verified data from the lead context/)
})
