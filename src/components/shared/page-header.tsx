import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-sky-300/80">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white lg:text-4xl">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">{description}</p>
      </div>
      {actions}
    </div>
  );
}
