import sourceCsv from '@assets/0_Tutor_Time_Sports_Tournament_1787059478067.csv?raw';

export type RosterRecord = {
  name: string;
  jersey: string;
  size: string;
  class: string;
  sport: string;
};

export type RosterData = {
  records: RosterRecord[];
  sizeCounts: Record<string, number>;
  orderCounts: Record<string, number>;
  sportCounts: Record<string, number>;
  classCounts: Record<string, number>;
  total: number;
  totalOrder: number;
};

const ORDER_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (character === '"') {
      if (inQuotes && input[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && input[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.some((value) => value.trim() !== '')) rows.push(row);
  }

  return rows;
}

const normalizeHeader = (value: string) => value.replace(/^\uFEFF/, '').trim().toLowerCase();
const rows = parseCsv(sourceCsv);
const headers = rows.shift() ?? [];
const headerIndexes = new Map(headers.map((header, index) => [normalizeHeader(header), index]));

const requiredHeaders = {
  name: 'full name',
  class: 'class',
  sport: 'select the sport/event',
  size: 'shirt size',
  jersey: 'jersey name on t-shirt',
} as const;

for (const [field, header] of Object.entries(requiredHeaders)) {
  if (!headerIndexes.has(header)) {
    throw new Error(`Roster CSV is missing the "${header}" column for ${field}.`);
  }
}

const valueAt = (row: string[], header: string) => row[headerIndexes.get(header) ?? -1]?.trim() ?? '';

const records = rows
  .map((row) => ({
    name: valueAt(row, requiredHeaders.name),
    jersey: valueAt(row, requiredHeaders.jersey),
    size: valueAt(row, requiredHeaders.size).toUpperCase() === 'XS' ? 'S' : valueAt(row, requiredHeaders.size).toUpperCase(),
    class: valueAt(row, requiredHeaders.class),
    sport: valueAt(row, requiredHeaders.sport),
  }))
  .filter((record) => record.name && record.jersey && record.size && record.class && record.sport);

if (records.length === 0) {
  throw new Error('Roster CSV did not contain any complete student records.');
}

const countBy = (key: keyof RosterRecord) => records.reduce<Record<string, number>>((counts, record) => {
  counts[record[key]] = (counts[record[key]] ?? 0) + 1;
  return counts;
}, {});

const sizeCounts = countBy('size');
const orderFor = (count: number) => Math.ceil(count / 5) * 5;
const orderCounts = Object.fromEntries(
  ORDER_SIZES.map((size) => [size, orderFor(sizeCounts[size] ?? 0)]),
);

export const DATA: RosterData = {
  records,
  sizeCounts,
  orderCounts,
  sportCounts: countBy('sport'),
  classCounts: countBy('class'),
  total: records.length,
  totalOrder: ORDER_SIZES.reduce((total, size) => total + (orderCounts[size] ?? 0), 0),
};