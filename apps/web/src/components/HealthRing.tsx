type Severity = "healthy" | "warning" | "critical" | "neutral";

function ringColorClass(severity: Severity): string {
  switch (severity) {
    case "healthy": return "health-ring-healthy";
    case "warning": return "health-ring-warning";
    case "critical": return "health-ring-critical";
    default: return "health-ring-neutral";
  }
}

function severityFromPercentage(pct: number): Severity {
  if (pct >= 90) return "critical";
  if (pct >= 75) return "warning";
  return "healthy";
}

type HealthRingProps = {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subtitle?: string;
  severity?: Severity;
  showValue?: boolean;
};

export function HealthRing({
  percentage,
  size = 52,
  strokeWidth = 4,
  label,
  subtitle,
  severity,
  showValue = true
}: HealthRingProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  const sev = severity ?? severityFromPercentage(percentage);

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div
        className={`health-ring ${ringColorClass(sev)}`}
        style={{
          width: size,
          height: size,
          "--ring-size": `${size}px`,
          "--ring-stroke": `${strokeWidth}px`
        } as React.CSSProperties}
      >
        <svg viewBox={`0 0 ${size} ${size}`}>
          <circle className="ring-bg" cx={size / 2} cy={size / 2} r={r} />
          <circle
            className="ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        {showValue && (
          <div className="ring-value">
            {Math.round(percentage)}%
          </div>
        )}
      </div>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", textAlign: "center" }}>
          {label}
        </span>
      )}
      {subtitle && (
        <span style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}

type StatusDotProps = {
  status: "online" | "warning" | "critical" | "offline";
  label?: string;
  showPulse?: boolean;
};

export function StatusDot({ status, label, showPulse = true }: StatusDotProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <span className={`status-dot ${status}`} />
      {label && (
        <span style={{
          color: status === "online" ? "#059669" :
                 status === "warning" ? "#d97706" :
                 status === "critical" ? "#dc2626" : "var(--text-muted)",
          fontWeight: 600
        }}>
          {label}
        </span>
      )}
    </span>
  );
}