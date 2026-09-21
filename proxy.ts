import { clerkMiddleware } from "@clerk/nextjs/server";

// Browsing and trying a Rally stays public. Individual APIs enforce identity
// only where a person saves, buys, reviews, or publishes.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
