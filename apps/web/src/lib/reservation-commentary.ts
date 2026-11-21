/**
 * Imported reservations originally stored sheet references and party rosters
 * in commentary. Keep those details separate from operational staff notes.
 * Supports both legacy one-line imports and metadata plus a staff note.
 */
export interface ReservationCommentary {
  reference: string | null;
  members: string | null;
  note: string | null;
}

export function parseReservationCommentary(value?: string | null): ReservationCommentary {
  const text = value?.trim();
  const empty: ReservationCommentary = { reference: null, members: null, note: null };
  if (!text) return empty;

  const legacyReference = /^Ref\s+(#\d+(?:\/#?\d+)*)(?:\s*·\s*\d+\s+guests?)?$/i.exec(text);
  if (legacyReference) return { ...empty, reference: legacyReference[1] };

  let reference: string | null = null;
  let members: string | null = null;
  const notes: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const source = /^(?:Original sheet reference|Source reference):\s*(.+)$/i.exec(line);
    if (source && reference === null) {
      reference = source[1];
      continue;
    }
    const party = /^(?:Guests|Party members):\s*(.+)$/i.exec(line);
    if (party && members === null) {
      members = party[1];
      continue;
    }
    const staff = /^Staff note:\s*(.*)$/i.exec(line);
    notes.push(staff ? staff[1] : line);
  }
  return { reference, members, note: notes.join("\n").trim() || null };
}

/** Preserve original sheet details when staff edit the note field. */
export function formatReservationCommentary(original: string | null | undefined, staffNote: string): string {
  const { reference, members } = parseReservationCommentary(original);
  const note = staffNote.trim();
  if (!reference && !members) return note;
  const lines = [
    reference ? `Original sheet reference: ${reference}` : null,
    members ? `Party members: ${members}` : null,
    note ? `Staff note: ${note}` : null,
  ];
  return lines.filter((line): line is string => line !== null).join("\n");
}
