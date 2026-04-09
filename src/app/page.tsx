import { redirect } from "next/navigation";

export default async function HomePage() {
  redirect("/qr-scanner");
}

// export default async function Page() {
//   await new Promise((resolve) => setTimeout(resolve, 5000));

//   return <div>Page Loaded</div>;
// }
