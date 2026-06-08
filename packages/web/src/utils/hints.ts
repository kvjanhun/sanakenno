/** Visible web hint IDs. Hidden legacy IDs are intentionally excluded. */
export const VISIBLE_HINT_IDS = ['summary', 'distribution', 'pairs'] as const;

export type VisibleHintId = (typeof VISIBLE_HINT_IDS)[number];

const VISIBLE_HINT_ID_SET = new Set<string>(VISIBLE_HINT_IDS);

/** Return true when an ID maps to a visible, unlockable web hint. */
export function isVisibleHintId(id: string): id is VisibleHintId {
  return VISIBLE_HINT_ID_SET.has(id);
}

/** Drop legacy hidden or unknown hint IDs while preserving visible order. */
export function filterVisibleHintIds(ids: Iterable<string>): VisibleHintId[] {
  const seen = new Set<VisibleHintId>();
  for (const id of ids) {
    if (isVisibleHintId(id)) {
      seen.add(id);
    }
  }
  return VISIBLE_HINT_IDS.filter((id) => seen.has(id));
}
