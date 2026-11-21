import { describe, expect, it } from "vitest";
import { formatClockTime, formatClockRange } from "./time-format";

describe("time display preference", () => {
  it("converts midnight, noon and evening correctly for 12-hour displays", () => {
    expect(formatClockTime("00:00", "12h")).toBe("12:00 AM");
    expect(formatClockTime("12:00", "12h")).toBe("12:00 PM");
    expect(formatClockTime("16:45", "12h")).toBe("4:45 PM");
    expect(formatClockTime("09:05", "12h")).toBe("9:05 AM");
  });

  it("preserves 24-hour API values when display format is 24h", () => {
    expect(formatClockTime("16:45", "24h")).toBe("16:45");
    expect(formatClockTime("00:00", "24h")).toBe("00:00");
    expect(formatClockRange("15:00", "19:00", "12h")).toBe("3:00 PM–7:00 PM");
  });

  it("leaves invalid or unknown strings untouched rather than guessing", () => {
    expect(formatClockTime("25:00", "12h")).toBe("25:00");
    expect(formatClockTime("", "12h")).toBe("");
    expect(formatClockTime("16:45:30", "12h")).toBe("4:45:30 PM");
  });
});
