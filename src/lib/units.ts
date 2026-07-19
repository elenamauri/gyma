import type { WeightUnit } from "./types";

const KG_TO_LB = 2.2046226218;

export function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) return value;
  if (from === "kg" && to === "lb") return value * KG_TO_LB;
  return value / KG_TO_LB;
}

export function formatWeight(
  value: number | undefined,
  unit: WeightUnit,
  digits = 1,
): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  const rounded =
    Math.abs(value) >= 100
      ? Math.round(value)
      : Number(value.toFixed(digits));
  return `${rounded}`;
}

export function formatWeightWithUnit(
  value: number | undefined,
  unit: WeightUnit,
): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${formatWeight(value, unit)} ${unit}`;
}

export function displayWeight(
  storedKg: number | undefined,
  unit: WeightUnit,
): number | undefined {
  if (storedKg === undefined) return undefined;
  return unit === "kg" ? storedKg : convertWeight(storedKg, "kg", "lb");
}

export function storeWeight(
  displayed: number | undefined,
  unit: WeightUnit,
): number | undefined {
  if (displayed === undefined || Number.isNaN(displayed)) return undefined;
  return unit === "kg" ? displayed : convertWeight(displayed, "lb", "kg");
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}
