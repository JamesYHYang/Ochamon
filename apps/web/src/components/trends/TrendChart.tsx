'use client';

import { useMemo } from 'react';

interface TrendPoint {
  id: string;
  date: string;
  value: number;
  unit: string;
}

interface TrendChartProps {
  data: TrendPoint[];
  unit: string;
  type: 'PRICING' | 'WEATHER' | 'DEMAND' | 'SUPPLY';
}

const TYPE_COLORS: Record<string, { line: string; fill: string }> = {
  PRICING: { line: '#16a34a', fill: 'rgba(22, 163, 74, 0.1)' },
  WEATHER: { line: '#2563eb', fill: 'rgba(37, 99, 235, 0.1)' },
  DEMAND: { line: '#9333ea', fill: 'rgba(147, 51, 234, 0.1)' },
  SUPPLY: { line: '#ea580c', fill: 'rgba(234, 88, 12, 0.1)' },
};

export function TrendChart({ data, unit, type }: TrendChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Sort by date
    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const values = sorted.map((d) => d.value);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Add padding to the range
    const padding = valueRange * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    return {
      points: sorted,
      minValue: adjustedMin,
      maxValue: adjustedMax,
      valueRange: adjustedRange,
    };
  }, [data]);

  if (!chartData || chartData.points.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const colors = TYPE_COLORS[type] || TYPE_COLORS.PRICING;
  const width = 100;
  const height = 100;
  const paddingX = 5;
  const paddingY = 10;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Generate SVG path
  const points = chartData.points.map((point, index) => {
    const x = paddingX + (index / (chartData.points.length - 1)) * chartWidth;
    const y =
      paddingY +
      chartHeight -
      ((point.value - chartData.minValue) / chartData.valueRange) * chartHeight;
    return { x, y, point };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingY + chartHeight} L ${paddingX} ${paddingY + chartHeight} Z`;

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate y-axis labels
  const yLabels = [
    chartData.maxValue,
    (chartData.maxValue + chartData.minValue) / 2,
    chartData.minValue,
  ];

  // Get x-axis labels (first, middle, last)
  const xLabels = [
    chartData.points[0],
    chartData.points[Math.floor(chartData.points.length / 2)],
    chartData.points[chartData.points.length - 1],
  ];

  return (
    <div className="relative h-full w-full">
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500">
        {yLabels.map((label, i) => (
          <span key={i} className="text-right pr-2">
            {typeof label === 'number' ? label.toFixed(1) : label}
          </span>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute left-12 right-0 top-0 bottom-8">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          <g stroke="#e5e7eb" strokeWidth="0.2">
            <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} />
            <line
              x1={paddingX}
              y1={paddingY + chartHeight / 2}
              x2={width - paddingX}
              y2={paddingY + chartHeight / 2}
            />
            <line
              x1={paddingX}
              y1={paddingY + chartHeight}
              x2={width - paddingX}
              y2={paddingY + chartHeight}
            />
          </g>

          {/* Area fill */}
          <path d={areaPath} fill={colors.fill} />

          {/* Line */}
          <path d={linePath} fill="none" stroke={colors.line} strokeWidth="0.5" />

          {/* Data points */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="0.8"
              fill={colors.line}
              className="hover:r-1.5 transition-all"
            >
              <title>
                {formatDate(p.point.date)}: {p.point.value.toFixed(2)} {unit}
              </title>
            </circle>
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-12 right-0 bottom-0 h-8 flex justify-between text-xs text-gray-500">
        {xLabels.map((point, i) => (
          <span key={i}>{formatDate(point.date)}</span>
        ))}
      </div>

      {/* Unit label */}
      <div className="absolute right-2 top-2 text-xs text-gray-400 bg-white px-1 rounded">
        {unit}
      </div>
    </div>
  );
}
