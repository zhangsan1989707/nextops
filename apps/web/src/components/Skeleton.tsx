import type { ComponentType, FC } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, borderRadius = 6, className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="metric-card skeleton-card">
      <Skeleton width={34} height={34} borderRadius={8} />
      <Skeleton width="60%" height={13} />
      <Skeleton width="40%" height={26} />
    </div>
  );
}

export function TableRowSkeleton({ columns = 8 }: { columns?: number }) {
  return (
    <div className="table-row skeleton-row">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={`${80 + Math.random() * 40}px`} height={14} />
      ))}
    </div>
  );
}

export function PanelSkeleton() {
  return (
    <div className="panel skeleton-panel">
      <Skeleton width="30%" height={18} />
      <Skeleton width="100%" height={100} />
    </div>
  );
}

export function ListItemSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton width={24} height={24} borderRadius={6} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="40%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatMessageSkeleton({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
      <Skeleton width={28} height={28} borderRadius="50%" />
      <div>
        <Skeleton width={isUser ? 180 : 320} height={isUser ? 36 : 72} borderRadius={12} />
        <div style={{ marginTop: 5 }}>
          <Skeleton width={80} height={11} />
        </div>
      </div>
    </div>
  );
}