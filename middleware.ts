import { NextRequest, NextResponse } from "next/server";
import { isLocale, negotiateLocale } from "@/lib/i18n";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  if (isLocale(segment)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/${negotiateLocale(request.headers.get("accept-language"), request.cookies.get("volt-yard-locale")?.value)}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|favicon.ico|robots.txt|sitemap.xml).*)"] };
