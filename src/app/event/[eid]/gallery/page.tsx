import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { listPublicFoldersByEvent } from "@/lib/services/folder.service";
import { PublicGalleryFolders } from "@/components/feature-specific/gallery/public-gallery-folders";

interface GalleryPageProps {
  params: Promise<{ eid: string }>;
}

export default async function GalleryPage({ params }: GalleryPageProps) {
  const { eid } = await params;
  const folders = await listPublicFoldersByEvent(eid);

  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        {/* Header Section */}
        <div className="mb-16">
          <Badge variant="outline" className="mb-6 border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] tracking-widest text-cyan-400 uppercase">
            Captured Moments
          </Badge>

          <h1 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-4xl font-black text-transparent md:text-6xl tracking-tighter mb-4">
            Memories with you
          </h1>

          <p className="max-w-xl text-lg leading-relaxed text-white/50">
            Every smile, every glance, every heartbeat. Framed forever in our digital darkroom.
          </p>
        </div>

        {/* Dynamic Folders Section */}
        <div className="mt-12">
            {folders.length > 0 ? (
                <PublicGalleryFolders folders={folders} eventId={eid} />
            ) : (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-[40px] bg-white/[0.02]">
                    <p className="text-white/40 font-medium">No galleries have been published for this event yet.</p>
                </div>
            )}
        </div>
      </div>
    </Layout>
  );
}
