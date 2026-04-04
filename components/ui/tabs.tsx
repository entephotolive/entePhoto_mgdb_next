"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultValue?: string;
}

export const Tabs = ({ children, defaultValue, className, ...props }: TabsProps) => {
  const [activeTab, setActiveTab] = React.useState(defaultValue);
  
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { activeTab, setActiveTab });
        }
        return child;
      })}
    </div>
  );
};

export const TabsList = ({ activeTab, setActiveTab, children, className, ...props }: any) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-[#121214]/50 p-1 text-slate-400 border border-white/5 backdrop-blur-sm",
      className
    )}
    {...props}
  >
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, { activeTab, setActiveTab });
      }
      return child;
    })}
  </div>
);

export const TabsTrigger = ({ activeTab, setActiveTab, value, children, className, ...props }: any) => (
  <button
    type="button"
    onClick={() => setActiveTab(value)}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      activeTab === value
        ? "bg-[#27272a] text-white shadow-sm"
        : "hover:bg-white/5 hover:text-slate-200",
      className
    )}
    {...props}
  >
    {children}
  </button>
);

export const TabsContent = ({ activeTab, value, children, className, ...props }: any) => (
  activeTab === value ? (
    <div
      className={cn(
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  ) : null
);
