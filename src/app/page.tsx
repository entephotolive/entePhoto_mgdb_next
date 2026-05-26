import { redirect } from "next/navigation";
const redirectUrl = process.env.NEXT_PUBLIC_LANDING_PAGE_URL;

export default function Page() {
  redirect(redirectUrl || "https://www.entephoto.co.in");
}
