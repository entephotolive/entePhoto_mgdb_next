import { Camera } from "lucide-react";

export function BrandMark() {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-cyan-400">
           <Camera size={16} />
        </div>
        <h1 className="text-xl font-bold text-cyan-400 tracking-tight">Photo Ceremony</h1>
      </div>
      <p className="mt-1 ml-10 text-[10px] uppercase tracking-widest text-slate-500 font-medium">Celestial Darkroom</p>
    </div>
  );
}
