// Mirrors CROP_CONFIG in src/farm_ai/config/settings.py
export type CropName = 'Wheat' | 'Rice' | 'Corn';

export interface CropInfo {
  name: CropName;
  plantingCost: number;
  growthDays: number;
  yieldAmount: number;
  basePrice: number;
  tagline: string;
  /** Accent used for UI chips and badges (not chart series). */
  accent: string;
  accentSoft: string;
}

export const CROPS: Record<CropName, CropInfo> = {
  Wheat: {
    name: 'Wheat',
    plantingCost: 1000,
    growthDays: 5,
    yieldAmount: 100,
    basePrice: 40,
    tagline: 'Fast grower, steady price',
    accent: '#d68a00',
    accentSoft: '#fff0c2',
  },
  Rice: {
    name: 'Rice',
    plantingCost: 1500,
    growthDays: 8,
    yieldAmount: 150,
    basePrice: 35,
    tagline: 'Slow paddy, biggest yield',
    accent: '#2b8bb8',
    accentSoft: '#d9f0fb',
  },
  Corn: {
    name: 'Corn',
    plantingCost: 1200,
    growthDays: 6,
    yieldAmount: 120,
    basePrice: 30,
    tagline: 'Tall stalks, sweet cobs',
    accent: '#c25e00',
    accentSoft: '#ffe3c7',
  },
};

export const CROP_LIST: CropInfo[] = [CROPS.Wheat, CROPS.Rice, CROPS.Corn];

export const SEASON_LENGTH = 30;
export const STARTING_CASH = 10000;

export function cropInfo(name: string | null | undefined): CropInfo | null {
  if (!name) return null;
  return (CROPS as Record<string, CropInfo>)[name] ?? null;
}

export type GrowthStage = 'seed' | 'sprout' | 'young' | 'ripening' | 'mature';

export function growthStage(progress: number, growthDays: number, isMature: boolean): GrowthStage {
  if (isMature) return 'mature';
  const ratio = progress / growthDays;
  if (ratio <= 0) return 'seed';
  if (ratio < 0.34) return 'sprout';
  if (ratio < 0.7) return 'young';
  return 'ripening';
}

export const STAGE_LABEL: Record<GrowthStage, string> = {
  seed: 'Seeded',
  sprout: 'Sprouting',
  young: 'Growing',
  ripening: 'Ripening',
  mature: 'Ready to harvest',
};

export function formatMoney(n: number, opts: { sign?: boolean; decimals?: number } = {}): string {
  const { sign = false, decimals = 0 } = opts;
  const abs = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (sign) return `${n >= 0 ? '+' : '−'}₹${abs}`;
  return `${n < 0 ? '−' : ''}₹${abs}`;
}

/** Backend labels are 0-indexed and upper-case ("HARVEST in Field 0"); show them the way players count. */
export function prettyLabel(label: string): string {
  const withFields = label.replace(/Field (\d+)/g, (_, n: string) => `Field ${Number(n) + 1}`);
  return withFields.replace(/^([A-Z_]+)\b/, (w) => w.charAt(0) + w.slice(1).toLowerCase().replace('_', ' '));
}
