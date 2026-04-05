import Image from "next/image";
import { GalleryFolder } from "@/types";
import { Card } from "@/components/ui/card";
import { formatShortDate } from "@/lib/utils/format";

interface GalleryFoldersProps {
  folders: GalleryFolder[];
}

export function GalleryFolders({ folders }: GalleryFoldersProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {folders.map((folder) => (
        <Card key={folder.id} className="overflow-hidden p-0">
          <div className="relative h-56">
            {folder.coverUrl ? (
              <Image src={folder.coverUrl} alt={folder.title} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-300/10 to-rose-300/10 text-sm text-slate-500">
                No cover uploaded yet
              </div>
            )}
          </div>
          <div className="p-6">
            <p className="text-lg font-semibold text-white">{folder.title}</p>
            <p className="mt-2 text-sm text-slate-400">
              {folder.location} • {formatShortDate(folder.date)}
            </p>
            <p className="mt-4 text-xs uppercase tracking-[0.3em] text-sky-300/80">
              {folder.photoCount} assets in folder
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
