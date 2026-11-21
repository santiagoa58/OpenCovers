import { describe, expect, it } from "vitest";
import { formatReservationCommentary, parseReservationCommentary } from "./reservation-commentary";

describe("parseReservationCommentary", () => {
  it("separates an imported sheet reference from staff notes", () => {
    expect(parseReservationCommentary("Ref #302 · 5 guests")).toEqual({
      reference: "#302", members: null, note: null,
    });
    expect(parseReservationCommentary("Ref #623/#310 · 10 guests").reference).toBe("#623/#310");
    expect(parseReservationCommentary("Ref #610/12 · 3 guests").reference).toBe("#610/12");
    expect(parseReservationCommentary("Original sheet reference: #302").reference).toBe("#302");
  });

  it("recognizes party members, retaining guest numbers where present", () => {
    expect(parseReservationCommentary("Guests: Denise Kahn (#301); Alice Byers (#309).")).toEqual({
      reference: null, members: "Denise Kahn (#301); Alice Byers (#309).", note: null,
    });
    expect(parseReservationCommentary("Party members: Barbara Verno; Stephanie Ambrose (#316).").members)
      .toBe("Barbara Verno; Stephanie Ambrose (#316).");
  });

  it("keeps staff-entered notes intact and ignores empty values", () => {
    expect(parseReservationCommentary("Requested a quiet table")).toEqual({
      reference: null, members: null, note: "Requested a quiet table",
    });
    expect(parseReservationCommentary("  ")).toEqual({ reference: null, members: null, note: null });
    expect(parseReservationCommentary(null)).toEqual({ reference: null, members: null, note: null });
  });

  it("keeps imported details when a new staff note is entered", () => {
    const stored = formatReservationCommentary("Original sheet reference: #302", "Requested a quiet table");
    expect(stored).toBe("Original sheet reference: #302\\nStaff note: Requested a quiet table");
    expect(parseReservationCommentary(stored)).toEqual({
      reference: "#302", members: null, note: "Requested a quiet table",
    });
    expect(formatReservationCommentary(stored, "")).toBe("Original sheet reference: #302");
    expect(formatReservationCommentary("Window seat", "Table near entrance")).toBe("Table near entrance");
  });

  it("does not reclassify unrelated notes that happen to contain reference numbers", () => {
    expect(parseReservationCommentary("Call guest about Ref #302").note).toBe("Call guest about Ref #302");
  });
});
