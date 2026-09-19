/** Notes follow the time axis, never a series value or a bar's geometry. */
export function chartNoteAnchor(
  points: readonly { date: string; timestamp: number }[],
  activeLabel: string | number | undefined,
) {
  const valid = points.filter((point) => Number.isFinite(point.timestamp));
  const activeTimestamp = activeLabel === undefined ? NaN : Number(activeLabel);
  return valid.find((point) => point.timestamp === activeTimestamp) ?? valid.at(-1);
}

export function chartNoteButtonPosition(
  plot: { x: number; y: number; width: number; height: number },
  dateX: number,
) {
  const inset = Math.min(14, plot.width / 2);
  return {
    x: Math.max(plot.x + inset, Math.min(dateX, plot.x + plot.width - inset)),
    y: plot.y + plot.height - Math.min(14, plot.height / 2),
  };
}
