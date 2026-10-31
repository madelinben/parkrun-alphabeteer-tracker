import type { LetterCell } from "./alphabet";

/** Contract with the sticker maker (@get-out-there/stickers): same key + shape, no package dependency */
export const BADGE_KEY = "gotc:badge-handoff";

export type BadgeHandoff = {
  /** Letter to feature on the letter badge; null opens the full alphabet badge */
  letter: string | null;
  done: number;
  possible: number;
  cells: LetterCell[];
};

export function sendBadge(badge: BadgeHandoff): void {
  try {
    sessionStorage.setItem(BADGE_KEY, JSON.stringify(badge));
  } catch {}
}
