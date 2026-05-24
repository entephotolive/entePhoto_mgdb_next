import { redirect } from "next/navigation";
const redirect_url = process.env.NEXT_PUBLIC_LANDING_PAGE_URL || "https://www.entephoto.co.in";


export default function Page() {
  redirect(redirect_url!);
}