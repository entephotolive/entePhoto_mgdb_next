import Link from "next/link";
import { Images } from "lucide-react";

interface PublicGalleryFoldersProps {
  folders: any[];
  eventId: string;
}

export function PublicGalleryFolders({ folders, eventId }: PublicGalleryFoldersProps) {
  // Inject a virtual "My Photos" folder at the top if it isn't already present
  const myPhotosFolder = {
    id: "my-photos",
    title: "My Photos",
    photoCount: null, // we don't know the count server-side
    coverUrl: null,
    isVirtual: true,
  };

  const allFolders = [myPhotosFolder, ...folders.filter((f) => f.id !== "all" && f.id !== "my-photos")];

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-8 lg:grid-cols-3">
      {allFolders.map((folder) => {
        const href = `/event/${eventId}/gallery/${folder.id}`;

        return (
          <div
            key={folder.id}
            className="group flex flex-col bg-white/5 border border-white/10 rounded-[24px] sm:rounded-[32px] p-2 hover:bg-white/[0.08] transition-all hover:scale-[1.02]"
          >
            {/* Card Top: Clickable image area */}
            <Link href={href} className="block">
              <div className="relative aspect-[4/3] rounded-[18px] sm:rounded-[26px] overflow-hidden bg-white/5 mb-3 sm:mb-4 cursor-pointer">
                {folder.coverUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={folder.coverUrl}
                    alt={folder.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    {folder.isVirtual ? (
                      <span className="text-3xl sm:text-5xl">🪪</span>
                    ) : (
                      <Images size={32} className="text-slate-600 opacity-20 sm:w-12 sm:h-12" />
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold text-white border border-white/20">
                    VIEW FOLDER
                  </div>
                </div>
              </div>
            </Link>

            {/* Card Bottom: Info */}
            <div className="px-3 sm:px-6 pb-4 sm:pb-6 pt-1 sm:pt-2">
              <Link href={href}>
                <h3 className="text-lg sm:text-2xl font-bold text-white tracking-tight leading-tight mb-1 sm:mb-2 hover:text-cyan-400 transition-colors truncate">
                  {folder.title}
                </h3>
                <div className="flex items-center gap-2 text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                  <Images size={12} className="opacity-50" />
                  <span>
                    {folder.isVirtual ? "YOUR MATCHED CAPTURES" : `${folder.photoCount} PHOTOS`}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
