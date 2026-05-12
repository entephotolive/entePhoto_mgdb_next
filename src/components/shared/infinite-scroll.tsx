"use client";

import { useEffect } from "react";
import { useInView } from "react-intersection-observer";

interface InfiniteScrollProps {
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  loadingIndicator?: React.ReactNode;
}

export function InfiniteScroll({
  onLoadMore,
  hasMore,
  isLoading,
  loadingIndicator,
}: InfiniteScrollProps) {
  const { ref, inView } = useInView({
    threshold: 0,
    rootMargin: "400px", // Trigger slightly before the user reaches the bottom
  });

  useEffect(() => {
    if (inView && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [inView, hasMore, isLoading, onLoadMore]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="w-full flex justify-center py-6">
      {loadingIndicator || (
        <div className="flex items-center gap-2 text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
          <span className="text-sm">Loading more...</span>
        </div>
      )}
    </div>
  );
}
