import { describe, it, expect } from "vitest";
import { clampVolumePercent } from "../src/volume";

describe("clampVolumePercent", () => {
  it("mantém valores entre 0 e 200", () => {
    expect(clampVolumePercent(80)).toBe(80);
    expect(clampVolumePercent(0)).toBe(0);
    expect(clampVolumePercent(200)).toBe(200);
  });

  it("limita abaixo de 0 e acima de 200", () => {
    expect(clampVolumePercent(-5)).toBe(0);
    expect(clampVolumePercent(300)).toBe(200);
  });
});
