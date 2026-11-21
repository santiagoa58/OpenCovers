/** Pure table layout geometry; no React state or DOM dependencies. */
export const GRID_SNAP = 8;

export const snap = (v: number) => Math.round(v / GRID_SNAP) * GRID_SNAP;

// Older data and the demo template say "rect" for a rectangular table.
export const shapeOf = (shape: string | undefined) => (shape === "rect" ? "rectangle" : (shape ?? "round"));

export function tableSize(shape: string | undefined, seats: number): { w: number; h: number } {
  if (shape === "rectangle") return { w: 64, h: 46 };
  if (shape === "square") return { w: 52, h: 52 };
  // A long (banquet) table gets about 20 px per chair along each side.
  if (shape === "long") return { w: Math.min(Math.max(Math.ceil(seats / 2) * 20 + 14, 110), 220), h: 36 };
  if (shape === "oval") return { w: Math.min(56 + seats * 4, 96), h: 44 };
  const d = Math.min(46 + seats * 3, 60);
  return { w: d, h: d };
}

/**
 * The room a label drawn upright has on a table: the table's width when it lies flat, its depth when it stands on end,
 * and in between the chord a horizontal line makes across the turned table.
 */
function labelRoom(size: { w: number; h: number }, rotation: number): number {
  const across = Math.abs(Math.sin((rotation * Math.PI) / 180));
  return Math.min(size.w, across < 0.001 ? size.w : size.h / across) - 6;
}

/** The width a line of text can take on a table. A round or oval top is narrower away from its middle line. */
export function textRoom(shape: string, size: { w: number; h: number }, rotation: number, lines: number): number {
  if (shape === "round") {
    const r = size.w / 2 - 2;
    const reach = Math.min(lines * 5, r - 4);
    return Math.floor(2 * Math.sqrt(r * r - reach * reach)) - 2;
  }
  if (shape === "oval") return Math.floor(labelRoom(size, rotation) * (lines > 2 ? 0.7 : 0.8));
  return labelRoom(size, rotation);
}

const CHAIR_GAP = 8;

export function chairPositions(
  shape: string | undefined,
  seats: number,
  size: { w: number; h: number },
): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  if (shape === "rectangle" || shape === "long") {
    const perSide = Math.ceil(seats / 2);
    const span = size.w - 14;
    for (let i = 0; i < seats; i++) {
      if (i < perSide) {
        pts.push({ x: -span / 2 + ((i + 0.5) / perSide) * span, y: -(size.h / 2 + CHAIR_GAP) });
      } else {
        pts.push({ x: span / 2 - ((i - perSide + 0.5) / perSide) * span, y: size.h / 2 + CHAIR_GAP });
      }
    }
  } else if (shape === "oval") {
    // Chairs go round the outline, a little off the ellipse so they sit beside the table edge.
    const rx = size.w / 2 + CHAIR_GAP;
    const ry = size.h / 2 + CHAIR_GAP;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * 2 * Math.PI - Math.PI / 2;
      pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
    }
  } else if (shape === "square") {
    // Spread the chairs over the four sides (top, bottom, right, left first), centered on each side.
    const half = size.w / 2 + CHAIR_GAP;
    const span = size.w - 12;
    const order = [0, 2, 1, 3];
    for (const side of order) {
      const count = Math.floor(seats / 4) + (order.indexOf(side) < seats % 4 ? 1 : 0);
      for (let k = 0; k < count; k++) {
        const along = -span / 2 + ((k + 0.5) / count) * span;
        if (side === 0) pts.push({ x: along, y: -half });
        else if (side === 1) pts.push({ x: half, y: along });
        else if (side === 2) pts.push({ x: -along, y: half });
        else pts.push({ x: -half, y: -along });
      }
    }
  } else {
    const radius = size.w / 2 + CHAIR_GAP;
    for (let i = 0; i < seats; i++) {
      const a = (i / seats) * 2 * Math.PI - Math.PI / 2;
      pts.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius });
    }
  }
  return pts;
}

