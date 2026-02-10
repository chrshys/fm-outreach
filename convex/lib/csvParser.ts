export function parseCsv(csvText: string): Array<Record<string, string>> {
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = records;
  const headers = headerRow.map((header) => header.trim());

  return dataRows
    .filter((row) => !isEmptyRow(row))
    .map((row) => {
      const rowObject: Record<string, string> = {};
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

function parseCsvRecords(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
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

function isEmptyRow(row: string[]): boolean {
  return row.every((value) => value.trim().length === 0);
}
