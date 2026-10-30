export interface ProgressBarProps {
  value: number;
  max?: number;
  /** Accessible name for the bar, shown alongside the percent when provided. */
  label?: string;
  showPercent?: boolean;
}

export function ProgressBar({ value, max = 100, label, showPercent = true }: ProgressBarProps) {
  const safeMax = max > 0 ? max : 1;
  const clamped = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((clamped / safeMax) * 100);

  return (
    <div className="progress">
      <div
        className="progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-label={label}
      >
        <div className="progress__fill" style={{ width: `${percent}%` }} />
      </div>
      {showPercent && (
        <div className="progress__label">
          <span>{label}</span>
          <span>{percent}%</span>
        </div>
      )}
    </div>
  );
}
