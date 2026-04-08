import Image from "next/image";
import Link from "next/link";
import { GalleryFolder } from "@/types";
import { Images } from "lucide-react";
import { FolderActionsMenu } from "./folder-actions-menu";

interface GalleryFoldersProps {
  folders: GalleryFolder[];
  eventId?: string;
}

export function GalleryFolders({ folders, eventId }: GalleryFoldersProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {folders.map((folder) => {
        const href = `/admin/gallery/${folder.id}${eventId ? `?eventId=${eventId}` : ""}`;

        return (
          <div
            key={folder.id}
            className="group flex flex-col bg-[#141416]/50 border border-white/5 rounded-[40px] p-2 hover:bg-[#141416] transition-all hover:scale-[1.02]"
          >
            {/* Card Top: Clickable image area */}
            <Link href={href} className="block">
              <div className="relative aspect-[4/3] rounded-[32px] overflow-hidden bg-white/5 mb-4 cursor-pointer">
                {folder.coverUrl ? (
                  <Image
                    src={folder.coverUrl}
                    alt={folder.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-600">
                    <Images size={48} className="opacity-20" />
                  </div>
                )}
              </div>
            </Link>

            {/* Card Bottom: Info */}
            <div className="px-6 pb-6 pt-2 flex items-center justify-between">
              <Link href={href} className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-white tracking-tight leading-tight mb-1 hover:text-cyan-400 transition-colors truncate">
                  {folder.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  <Images size={12} className="opacity-50" />
                  <span>{folder.photoCount} PHOTOS</span>
                </div>
              </Link>

              {/* CRUD Dropdown — client island */}
              {folder.id !== "all" && (
                <FolderActionsMenu folderId={folder.id} folderName={folder.title} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
