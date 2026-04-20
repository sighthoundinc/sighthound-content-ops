import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasSupabaseAuthCookieNames,
  shouldBypassAuth,
} from "@/lib/middleware-auth";

function hasSupabaseAuthCookie(request: NextRequest) {
  return hasSupabaseAuthCookieNames(
    request.cookies.getAll().map((cookie) => cookie.name)
  );
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (shouldBypassAuth(pathname)) {
    return NextResponse.next();
  }

  if (!hasSupabaseAuthCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const supabaseEnv = getSupabaseEnv();
  if (!supabaseEnv) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseEnv.url, supabaseEnv.anonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  // Matcher explicitly excludes static asset paths (any URL ending in a
  // common image/font/media extension) so anonymous requests for files
  // under `public/` (e.g. `/sighthound-logo-with-text.png`) are served
  // directly by Next's static handler instead of running through the
  // auth middleware. Without this exclusion, anonymous visitors to
  // `/login` would have every <img>/@font subresource redirected to
  // `/login` and rendered as a broken-image icon.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|woff|woff2|ttf|otf|eot|mp4|webm|ogg|mp3|wav|css|map)$).*)",
  ],
};
