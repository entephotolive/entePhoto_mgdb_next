import Image from "next/image";
import Link from "next/link";
import { Images } from "lucide-react";

interface PublicGalleryFoldersProps {
  folders: any[];
  eventId: string;
}

export function PublicGalleryFolders({ folders, eventId }: PublicGalleryFoldersProps) {
  return (
    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {folders.map((folder) => {
        const href = `/event/${eventId}/gallery/${folder.id}`;

        return (
          <div
            key={folder.id}
            className="group flex flex-col bg-white/5 border border-white/10 rounded-[32px] p-2 hover:bg-white/[0.08] transition-all hover:scale-[1.02]"
          >
            {/* Card Top: Clickable image area */}
            <Link href={href} className="block">
              <div className="relative aspect-[4/3] rounded-[26px] overflow-hidden bg-white/5 mb-4 cursor-pointer">
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
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold text-white border border-white/20">
                        VIEW FOLDER
                    </div>
                </div>
              </div>
            </Link>

            {/* Card Bottom: Info */}
            <div className="px-6 pb-6 pt-2">
              <Link href={href}>
                <h3 className="text-2xl font-bold text-white tracking-tight leading-tight mb-2 hover:text-cyan-400 transition-colors truncate">
                  {folder.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  <Images size={12} className="opacity-50" />
                  <span>{folder.photoCount} PHOTOS</span>
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
