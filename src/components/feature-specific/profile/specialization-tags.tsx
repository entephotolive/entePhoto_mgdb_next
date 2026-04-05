"use client";

import { useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface SpecializationTagsProps {
  value: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
}

export function SpecializationTags({
  value,
  onChange,
  suggestions = [
    "Wedding",
    "Editorial",
    "Corporate",
    "Fine Art",
    "Documentary",
    "Portrait",
    "Event",
    "Fashion",
  ],
  maxTags = 8,
}: SpecializationTagsProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(s)
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= maxTags) return;
    onChange([...value, trimmed]);
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="relative">
      {/* Tag container */}
      <div
        className={cn(
          "min-h-[44px] flex flex-wrap gap-2 items-center px-3 py-2 rounded-xl",
          "bg-white/5 border border-white/10 cursor-text",
          "focus-within:border-cyan-500/50 focus-within:shadow-[0_0_0_1px_rgba(34,211,238,0.2)] transition-all"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="text-cyan-400/60 hover:text-cyan-300 transition-colors rounded-full"
              aria-label={`Remove ${tag}`}
            >
              <X size={11} />
            </button>
          </span>
        ))}

        {/* Input */}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? "+ Add Style" : ""}
            className="flex-1 min-w-[80px] bg-transparent text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none"
          />
        )}
      </div>

      {/* Dropdown suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#141416] border border-white/10 rounded-xl shadow-panel overflow-hidden">
          {filteredSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => addTag(s)}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-300 flex items-center gap-2 transition-colors"
            >
              <Plus size={13} className="text-cyan-500/60" />
              {s}
            </button>
          ))}
        </div>
      )}

      <p className="mt-1.5 text-[10px] text-slate-600">
        Press Enter or comma to add · Backspace to remove
      </p>
    </div>
  );
}
