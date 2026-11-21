import { describe, expect, it } from "vitest";
import { pacingLevel, pacingSlotAtTime, peakSlot } from "./pacing";

const slot = (covers: number, capacity = 10, time = "20:00") => ({ time, covers, capacity });

describe("pacingLevel", () => {
  it("classifies a slot by the share of its capacity that is booked", () => {
    expect(pacingLevel(slot(0))).toBe("empty");
    expect(pacingLevel(slot(4))).toBe("low");
    expect(pacingLevel(slot(5))).toBe("medium");
    expect(pacingLevel(slot(7))).toBe("medium");
    expect(pacingLevel(slot(8))).toBe("high");
    expect(pacingLevel(slot(12))).toBe("high");
  });

  it("treats a slot with no capacity but covers as low rather than dividing by zero", () => {
    expect(pacingLevel(slot(3, 0))).toBe("low");
  });
});

describe("peakSlot", () => {
  it("returns the fullest slot relative to its capacity", () => {
    const peak = peakSlot([slot(4, 10, "20:00"), slot(3, 4, "20:15"), slot(0, 10, "20:30")]);
    expect(peak?.time).toBe("20:15");
  });

  it("returns null when nothing is booked", () => {
    expect(peakSlot([slot(0), slot(0, 10, "20:15")])).toBeNull();
  });
});

describe("pacingSlotAtTime", () => {
  it("uses the same actual slot boundaries for arbitrary selected times", () => {
    const slots = [slot(2, 10, "16:10"), slot(3, 10, "16:40"), slot(4, 10, "17:10")];
    expect(pacingSlotAtTime("16:46", slots)).toMatchObject({ slot: slots[1], start: 1000, end: 1030 });
    expect(pacingSlotAtTime("17:09", slots)?.slot.time).toBe("16:40");
    expect(pacingSlotAtTime("17:10", slots)?.slot.time).toBe("17:10");
    expect(pacingSlotAtTime("16:09", slots)).toBeNull();
    expect(pacingSlotAtTime("17:40", slots)).toBeNull();
  });

  it("uses a 15-minute default for an isolated slot", () => {
    const slots = [slot(2, 10, "16:45")];
    expect(pacingSlotAtTime("16:59", slots)?.slot.time).toBe("16:45");
    expect(pacingSlotAtTime("17:00", slots)).toBeNull();
  });
});
