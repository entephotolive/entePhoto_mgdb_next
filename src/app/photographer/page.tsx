import { redirect } from "next/navigation";
import { getCurrentPhotographerSession } from "@/lib/services/auth.service";

export default async function HomePage() {
  const session = await getCurrentPhotographerSession();
  redirect(session ? "/photographer/dashboard" : "/photographer/login");
}
