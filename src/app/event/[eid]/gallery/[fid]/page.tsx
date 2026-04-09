import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import Link from "next/link";
import { ChevronLeft, Images } from "lucide-react";
import { listPhotosByFolder, getFolderMeta } from "@/lib/services/photo.service";
import { PublicPhotoGrid } from "@/components/feature-specific/gallery/public-photo-grid";
import { notFound } from "next/navigation";

interface PublicFolderDetailPageProps {
  params: Promise<{ eid: string; fid: string }>;
}

export default async function PublicFolderDetailPage({ params }: PublicFolderDetailPageProps) {
  const { eid, fid } = await params;

  const [meta, photos] = await Promise.all([
    getFolderMeta(fid, eid).catch(() => null),
    listPhotosByFolder(fid, eid).catch(() => []),
  ]);

  if (!meta) {
    notFound();
  }

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">
        {/* Navigation / Header */}
        <div className="mb-12">
            <Link 
                href={`/event/${eid}/gallery`} 
                className="inline-flex items-center gap-2 text-cyan-400 font-bold uppercase tracking-widest text-[10px] hover:text-cyan-300 transition-colors mb-6"
            >
                <ChevronLeft size={14} />
                Back to Gallery
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">
                        {meta.name}
                    </h1>
                    <div className="flex items-center gap-3 text-white/40 font-bold uppercase tracking-widest text-[11px]">
                        <Images size={14} />
                        <span>{photos.length} Captures</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/10 w-full mb-12" />

        {/* Photo Grid */}
        <PublicPhotoGrid photos={photos} />
      </div>
    </Layout>
  );
}
