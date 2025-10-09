'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export function Sparkline({ data, width = 220, height = 48, color = 'currentColor' }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const stepX = width / (data.length - 1);
  const scaleY = (val: number) => {
    if (max === min) return height / 2;
    return height - ((val - min) / (max - min)) * height;
  };
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${i * stepX} ${scaleY(v)}`).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className='text-primary'>
      <path d={d} fill='none' stroke={color} strokeWidth={2} />
    </svg>
  );
}


