import { describe, expect, it } from "vitest";
import { chairPositions, GRID_SNAP, shapeOf, snap, tableSize, textRoom } from "./geometry";

describe("floor geometry", () => {
  it("keeps layout changes aligned with the existing grid", () => {
    expect(GRID_SNAP).toBe(8);
    expect(snap(11)).toBe(8);
    expect(snap(13)).toBe(16);
  });

  it("normalizes historical rectangular shapes", () => {
    expect(shapeOf("rect")).toBe("rectangle");
    expect(shapeOf(undefined)).toBe("round");
  });

  it("places exactly one chair per seat on supported shapes", () => {
    for (const shape of ["round", "square", "oval", "long", "rectangle"]) {
      const dimensions = tableSize(shape, 6);
      const positions = chairPositions(shape, 6, dimensions);
      expect(positions).toHaveLength(6);
      expect(positions.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
    }
  });

  it("keeps text within finite table space", () => {
    expect(textRoom("round", tableSize("round", 4), 0, 2)).toBeGreaterThan(0);
  });
});
