import { Card } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  delta: string;
}

export function MetricCard({ label, value, delta }: MetricCardProps) {
  return (
    <Card className="space-y-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">{label}</p>
      <p className="text-4xl font-semibold text-white">{value}</p>
      <p className="text-sm text-slate-400">{delta}</p>
    </Card>
  );
}
