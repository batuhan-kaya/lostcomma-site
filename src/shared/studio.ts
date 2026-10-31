/** Studio settings window: meetings per week (0 to 10) to a level · few · some · lots · every day. */
export function meetLevel(n: number): 0 | 1 | 2 | 3 {
  return n <= 2 ? 0 : n <= 5 ? 1 : n <= 8 ? 2 : 3;
}

/** Meetings past this many make the window ask if you are sure. */
export const MEET_WARN = 7;
export const MEET_START = 2;
