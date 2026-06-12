// Format a number of seconds as m:ss for the seekbar / recording timers.
export const formatTime = (seconds: number): string => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${`${remainder}`.padStart(2, '0')}`;
};
