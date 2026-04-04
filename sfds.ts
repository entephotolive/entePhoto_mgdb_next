// import { NextRequest, NextResponse } from "next/server";
// import { verifySessionToken } from "@/lib/utils/auth";
// import { authCookieName } from "@/lib/utils/constants";

// const authRoutes = ["/login"];
// const protectedRoutes = ["/dashboard", "/events", "/uploads", "/gallery", "/profile", "/photographers"];

// export async function middleware(request: NextRequest) {
//   const token = request.cookies.get(authCookieName)?.value;
//   let isAuthenticated = false;

//   if (token) {
//     try {
//       await verifySessionToken(token);
//       isAuthenticated = true;
//     } catch {
//       isAuthenticated = false;
//     }
//   }

//   const { pathname } = request.nextUrl;
//   const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
//   const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

//   if (!isAuthenticated && isProtectedRoute) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   if (isAuthenticated && isAuthRoute) {
//     return NextResponse.redirect(new URL("/dashboard", request.url));
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/login", "/dashboard/:path*", "/events/:path*", "/uploads/:path*", "/gallery/:path*", "/profile/:path*", "/photographers/:path*"],
// };
