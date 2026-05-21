interface TrendData {
  label: string;
  cpu: number;
  memory: number;
}

interface LineChartProps {
  data: TrendData[];
}

export function LineChart({ data }: LineChartProps) {
  const w = 800, h = 280, padX = 55, padY = 35;
  const chartW = w - padX * 2, chartH = h - padY * 2;
  const maxVal = Math.max(100, ...data.map((d) => Math.max(d.cpu, d.memory)));
  const toX = (i: number) => padX + (i / Math.max(data.length - 1, 1)) * chartW;
  const toY = (v: number) => padY + chartH - (v / maxVal) * chartH;
  const cpuPts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.cpu).toFixed(1)}`).join(" ");
  const memPts = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.memory).toFixed(1)}`).join(" ");
  const yTicks = [0, 25, 50, 75, 100];

  const maxCpuPoint = data.reduce((max, d) => d.cpu > max.cpu ? d : max, data[0] || { cpu: 0 });

  return (
    <svg className="line-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      <line x1={padX} y1={toY(80)} x2={w - padX} y2={toY(80)} className="threshold-line warning" />
      <line x1={padX} y1={toY(90)} x2={w - padX} y2={toY(90)} className="threshold-line danger" />
      <text x={w - padX + 6} y={toY(80) + 5} className="threshold-label warning" fontSize="12">80%</text>
      <text x={w - padX + 6} y={toY(90) + 5} className="threshold-label danger" fontSize="12">90%</text>

      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padX} y1={toY(v)} x2={w - padX} y2={toY(v)} className="chart-grid" />
          <text x={padX - 6} y={toY(v) + 5} textAnchor="end" className="chart-label" fontSize="13">{v}%</text>
        </g>
      ))}
      
      <defs>
        <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f6feb" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#1f6feb" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33c3a5" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#33c3a5" stopOpacity="0" />
        </linearGradient>
      </defs>
      
      <polyline points={cpuPts} className="chart-line-cpu" strokeWidth="3" />
      <polyline points={memPts} className="chart-line-mem" strokeWidth="3" />
      
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.cpu)} r={d.cpu > 80 ? 7 : 4} className={`chart-dot-cpu ${d.cpu > 80 ? 'anomaly' : ''}`}>
            <title>{d.label} CPU: {d.cpu}%</title>
          </circle>
          <circle cx={toX(i)} cy={toY(d.memory)} r={d.memory > 80 ? 7 : 4} className={`chart-dot-mem ${d.memory > 80 ? 'anomaly' : ''}`}>
            <title>{d.label} 内存: {d.memory}%</title>
          </circle>
          {i % Math.max(1, Math.floor(data.length / 5)) === 0 && (
            <text x={toX(i)} y={h - 8} textAnchor="middle" className="chart-label" fontSize="12">{d.label}</text>
          )}
        </g>
      ))}
      
      {maxCpuPoint && maxCpuPoint.cpu > 80 && (
        <g>
          <circle cx={toX(data.indexOf(maxCpuPoint))} cy={toY(maxCpuPoint.cpu)} r={10} className="anomaly-marker" />
          <text x={toX(data.indexOf(maxCpuPoint))} y={toY(maxCpuPoint.cpu) - 15} textAnchor="middle" className="anomaly-label" fontSize="12">
            峰值 {maxCpuPoint.cpu}%
          </text>
        </g>
      )}
      
      {data.length > 0 && (
        <g>
          <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].cpu)} r={7} className="chart-dot-cpu-active" />
          <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1].memory)} r={7} className="chart-dot-mem-active" />
        </g>
      )}
    </svg>
  );
}
