import Navbar from "@/components/Navbar";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { liveFeedData } from "@/data/livefeed.data";

export default function LiveFeedPage() {
  return (
    <Layout>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold md:text-5xl">
            The Live Moment
          </h1>

          <p className="text-sm text-gray-300 md:text-base">
            Every capture, shared instantly. Join the story in real-time.
          </p>
        </div>

        <div className="columns-2 gap-5 space-y-5 md:columns-3 lg:columns-4">
          {liveFeedData.map((image) => (
            <div
              key={image.id}
              className="group relative cursor-pointer overflow-hidden rounded-xl break-inside-avoid"
            >
              <img
                src={image.src}
                alt={image.caption}
                className="w-full rounded-xl transition duration-500 group-hover:scale-110"
              />

              <div className="absolute inset-0 bg-black/20 opacity-0 transition group-hover:opacity-100"></div>

              <Badge
                variant="destructive"
                className="absolute top-3 right-3 text-[10px] uppercase tracking-widest opacity-0 shadow-[0_0_10px_rgba(255,0,0,0.8)] transition animate-pulse group-hover:opacity-100"
              >
                LIVE
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
