import { PhotographerSummary } from "@/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PhotographerPanelProps {
  photographers: PhotographerSummary[];
}

export function PhotographerPanel({ photographers }: PhotographerPanelProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {photographers.map((photographer) => (
        <Card key={photographer.id} className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-white">{photographer.name}</p>
              <p className="text-sm text-slate-400">{photographer.email}</p>
            </div>
            <Badge variant="success">Photographer</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-3xl bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Events</p>
              <p className="mt-3 text-3xl font-semibold text-white">{photographer.eventCount}</p>
            </div>
            <div className="rounded-3xl bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Photos</p>
              <p className="mt-3 text-3xl font-semibold text-white">{photographer.photoCount}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
