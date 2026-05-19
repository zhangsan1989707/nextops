type SparklineProps = {
  data: number[];
  height?: number;
  color?: "rising" | "stable" | "falling";
};

export function Sparkline({ data, height = 32, color = "stable" }: SparklineProps) {
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);

  return (
    <div className="sparkline" style={{ height }}>
      {data.map((val, i) => {
        const barHeight = Math.max(4, Math.round((val / max) * height));
        const barColor = val > 80 ? "critical"
          : val > 60 ? "falling"
          : val > 40 ? "stable"
          : "rising";
        return (
          <span
            key={i}
            className={`sparkline-bar ${barColor}`}
            style={{ height: barHeight }}
          />
        );
      })}
    </div>
  );
}

type TrendArrowProps = {
  current: number;
  previous: number;
  label?: string;
};

export function TrendArrow({ current, previous, label }: TrendArrowProps) {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  const trend = diff > 3 ? "up" : diff < -3 ? "down" : "stable";

  return (
    <span className={`trend-indicator trend-${trend}`}>
      {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
      {Math.abs(pct)}%
      {label ? ` ${label}` : ""}
    </span>
  );
}