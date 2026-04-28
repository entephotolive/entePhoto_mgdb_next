import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only want to protect specific sub-routes under /event/[eid]/
  // specifically: /gallery, /live, and /studio
  const eventRouteMatch = pathname.match(/^\/event\/([^\/]+)\/(gallery|live|studio)(?:\/.*)?$/);
  
  if (eventRouteMatch) {
    const eid = eventRouteMatch[1];
    
    // Check for the scan_response cookie
    const hasScanResponse = request.cookies.has('scan_response');
    
    if (!hasScanResponse) {
      // Redirect to the scan page for that event
      return NextResponse.redirect(new URL(`/event/${eid}/scan`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware to all routes except api, static files, images, etc.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
