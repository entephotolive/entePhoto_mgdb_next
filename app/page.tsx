import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/services/auth.service";

export default async function HomePage() {
  const session = await getCurrentSession();
  redirect(session ? "/dashboard" : "/login");
}
