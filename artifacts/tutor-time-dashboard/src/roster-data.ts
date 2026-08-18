import sourceHtml from '@assets/index_(1)_1787058498079.html?raw';

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

const dataMatch = sourceHtml.match(/const DATA = (\{[\s\S]*?\});\s*const CLASS_ORDER/);

if (!dataMatch) {
  throw new Error('Roster source data could not be loaded.');
}

export const DATA = JSON.parse(dataMatch[1]) as RosterData;