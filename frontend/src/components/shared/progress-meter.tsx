import { Progress } from '@/components/ui/progress';
import { toNumber } from '@/lib/format';

export function ProgressMeter({
  value,
  max,
  label,
  unit,
}: {
  value: number | string;
  max: number | string;
  label: string;
  unit?: string;
}) {
  const v = toNumber(value) ?? 0;
  const m = toNumber(max) ?? 0;
  const pct = m > 0 ? Math.min(100, Math.round((v / m) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          {v} / {m}
          {unit ? ` ${unit}` : ''}
        </span>
      </div>
      <Progress value={pct} aria-label={label} />
    </div>
  );
}
