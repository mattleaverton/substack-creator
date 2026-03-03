interface ProgressBarProps {
  progress: number;
  label?: string;
}

export default function ProgressBar({
  progress,
  label,
}: ProgressBarProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div
      className="progress-wrap"
      role="status"
      aria-label={label ?? "Progress"}
      data-testid="progress-bar"
    >
      {label ? <p className="progress-label">{label}</p> : null}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
