/** Volume em percentual aceito pelo bot (0–200). */
export function clampVolumePercent(pct: number): number {
  return Math.max(0, Math.min(200, pct));
}
