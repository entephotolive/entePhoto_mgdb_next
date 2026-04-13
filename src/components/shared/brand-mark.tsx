export function BrandMark() {
  return (
    <div className="mb-6">
      <div className="flex flex-col items-center gap-4">
        <div className="group relative flex h-20 w-22 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black border border-white/10 p-1 transition-all duration-500 hover:border-cyan-500/50">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
          <img
            src="/logo.jpeg"
            alt="Ente photo logo"
            className="flex h-20 w-29 items-center justify-center "
          />
        </div>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-black tracking-tighter text-white">
            ENTE <span className="text-cyan-400">PHOTO</span>
          </h1>
          <div className="mt-1 h-[2px] w-8 bg-cyan-500 rounded-full" />
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
            Celestial Darkroom
          </p>
        </div>
      </div>
    </div>
  );
}
