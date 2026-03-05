import { cn } from '@/lib/utils';

interface SupplyBarProps {
  label: string;
  level: number;
  color?: string;
}

export function SupplyBar({ label, level, color }: SupplyBarProps) {
  const getColor = () => {
    if (color) return color;
    if (level < 10) return 'hsl(var(--destructive))';
    if (level < 20) return 'hsl(var(--warning))';
    return 'hsl(var(--success))';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-mono font-semibold", level < 10 ? 'text-destructive' : level < 20 ? 'text-warning' : 'text-foreground')}>
          {level}%
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${level}%`, backgroundColor: getColor() }}
        />
      </div>
    </div>
  );
}
