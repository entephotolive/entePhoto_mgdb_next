import { connectToDatabase } from "@/lib/db/mongodb";
import { PortfolioModel } from "@/models/Portfolio";
import { PortfolioMoment } from "@/types";

function mapDoc(doc: {
  _id: string;
  url: string;
  publicId: string;
  caption?: string;
}): PortfolioMoment {
  return {
    id: doc._id.toString(),
    url: doc.url,
    publicId: doc.publicId,
    caption: doc.caption ?? "",
  };
}

export async function fetchPortfolioByUser(
  userId: string
): Promise<PortfolioMoment[]> {
  await connectToDatabase();
  const docs = await PortfolioModel.find({ uploadedBy: userId })
    .sort({ createdAt: -1 })
    .lean();
  return docs.map((d) => mapDoc(d as never));
}

export async function insertPortfolioMoment(
  userId: string,
  url: string,
  publicId: string,
  caption?: string
): Promise<PortfolioMoment> {
  await connectToDatabase();
  const doc = await PortfolioModel.create({
    uploadedBy: userId,
    url,
    publicId,
    caption: caption ?? "",
  });
  return mapDoc(doc as never);
}

export async function deletePortfolioMomentById(
  momentId: string,
  userId: string
): Promise<{ publicId: string } | null> {
  await connectToDatabase();
  const doc = await PortfolioModel.findOneAndDelete({
    _id: momentId,
    uploadedBy: userId, // ensure ownership
  }).lean();

  if (!doc) return null;
  return { publicId: (doc as { publicId: string }).publicId };
}
