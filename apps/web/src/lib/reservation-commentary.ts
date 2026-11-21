/**
 * The original booking import stored sheet references and party rosters in the
 * free-text note field. Display them as booking details instead of staff notes.
 * This parser also supports the original import format without a data migration.
 */
export interface ReservationCommentary {
  reference: string | null;
  members: string | null;
  note: string | null;
}

export function parseReservationCommentary(value?: string | null): ReservationCommentary {
  const empty: ReservationCommentary = { reference: null, members: null, note: null };
  const text = value?.trim();
  if (!text) return empty;

  const legacyReference = /^Ref\s+(#\d+(?:\/#?\d+)*)(?:\s*·\s*\d+\s+guests?)?$/i.exec(text);
  if (legacyReference) return { ...empty, reference: legacyReference[1] };

  const reference = /^(?:Original sheet reference|Source reference):\s*(.+)$/i.exec(text);
  if (reference) return { ...empty, reference: reference[1] };

  const members = /^(?:Guests|Party members):\s*(.+)$/i.exec(text);
  if (members) return { ...empty, members: members[1] };

  return { ...empty, note: text };
}
