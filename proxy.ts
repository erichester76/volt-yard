import { NextRequest, NextResponse } from "next/server";
import { isLocale, negotiateLocale } from "@/lib/i18n";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = pathname.split("/")[1];
  if (isLocale(segment)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-volt-yard-locale", segment);
    requestHeaders.set("x-volt-yard-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }
  const url = request.nextUrl.clone();
  url.pathname = `/${negotiateLocale(request.headers.get("accept-language"), request.cookies.get("volt-yard-locale")?.value)}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|images|favicon.ico|robots.txt|sitemap.xml).*)"] };
