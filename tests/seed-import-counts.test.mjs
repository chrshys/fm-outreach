import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function parseCsv(csvText) {
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = records;
  const headers = headerRow.map((header) => header.trim());

  return dataRows
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) => {
      const rowObject = {};
      for (let i = 0; i < headers.length; i += 1) {
        const header = headers[i];
        if (!header) {
          continue;
        }
        rowObject[header] = row[i] ?? "";
      }
      return rowObject;
    });
}

function parseCsvRecords(csvText) {
  const rows = [];
  let currentRow = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];

    if (inQuotes) {
      if (char === '"') {
        const nextChar = csvText[i + 1];
        if (nextChar === '"') {
          currentField += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    if (char === "\r") {
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeDedupValue(value) {
  return value.trim().toLocaleLowerCase();
}

function normalizeDedupName(value) {
  return normalizeDedupValue(value)
    .replace(/\bfarmers['’]/g, "farmers")
    .replace(/\bst\.?\b/g, "street");
}

function dedupKeyForLead(lead) {
  return `${normalizeDedupName(lead.name)}::${normalizeDedupValue(lead.city)}`;
}

function toLeadRow(row) {
  return {
    name: row["Name"] ?? "",
    city: row["Town / City"] ?? "",
  };
}

test("seed dataset has expected row volumes", () => {
  const farmsRows = parseCsv(fs.readFileSync("data/farms.csv", "utf8"));
  const marketsRows = parseCsv(fs.readFileSync("data/farmers-markets.csv", "utf8"));

  assert.equal(farmsRows.length, 279);
  assert.equal(marketsRows.length, 168);
});

test("seed dedup logic produces approximately 446 unique inserts", () => {
  const farmsRows = parseCsv(fs.readFileSync("data/farms.csv", "utf8")).map(toLeadRow);
  const marketsRows = parseCsv(fs.readFileSync("data/farmers-markets.csv", "utf8")).map(
    toLeadRow,
  );

  const seenLeadKeys = new Set();
  let farmsInserted = 0;
  let marketsInserted = 0;

  for (const lead of farmsRows) {
    const key = dedupKeyForLead(lead);
    if (seenLeadKeys.has(key)) {
      continue;
    }
    seenLeadKeys.add(key);
    farmsInserted += 1;
  }

  for (const lead of marketsRows) {
    const key = dedupKeyForLead(lead);
    if (seenLeadKeys.has(key)) {
      continue;
    }
    seenLeadKeys.add(key);
    marketsInserted += 1;
  }

  assert.equal(farmsInserted, 278);
  assert.equal(marketsInserted, 167);
  assert.equal(farmsInserted + marketsInserted, 445);
});

test("running the seed a second time inserts 0 records and skips all as duplicates", () => {
  const farmsRows = parseCsv(fs.readFileSync("data/farms.csv", "utf8")).map(toLeadRow);
  const marketsRows = parseCsv(fs.readFileSync("data/farmers-markets.csv", "utf8")).map(
    toLeadRow,
  );

  const seenLeadKeys = new Set();

  for (const lead of farmsRows) {
    seenLeadKeys.add(dedupKeyForLead(lead));
  }

  for (const lead of marketsRows) {
    seenLeadKeys.add(dedupKeyForLead(lead));
  }

  let secondRunFarmsInserted = 0;
  let secondRunFarmsSkipped = 0;
  let secondRunMarketsInserted = 0;
  let secondRunMarketsSkipped = 0;

  for (const lead of farmsRows) {
    const key = dedupKeyForLead(lead);
    if (seenLeadKeys.has(key)) {
      secondRunFarmsSkipped += 1;
      continue;
    }

    seenLeadKeys.add(key);
    secondRunFarmsInserted += 1;
  }

  for (const lead of marketsRows) {
    const key = dedupKeyForLead(lead);
    if (seenLeadKeys.has(key)) {
      secondRunMarketsSkipped += 1;
      continue;
    }

    seenLeadKeys.add(key);
    secondRunMarketsInserted += 1;
  }

  assert.equal(secondRunFarmsInserted, 0);
  assert.equal(secondRunMarketsInserted, 0);
  assert.equal(secondRunFarmsSkipped, farmsRows.length);
  assert.equal(secondRunMarketsSkipped, marketsRows.length);
});
