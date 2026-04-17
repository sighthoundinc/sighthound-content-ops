import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  hasSupabaseAuthCookieNames,
  shouldBypassAuth,
} from "@/lib/middleware-auth";
import { isAllowedEmail } from "@/lib/allowed-email";

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

function redirectToLogin(
  request: NextRequest,
  reason?: "session" | "domain" | "env"
) {
  const loginUrl = new URL("/login", request.url);
  if (reason) {
    loginUrl.searchParams.set("reason", reason);
  }
  const response = NextResponse.redirect(loginUrl);
  // Clear any stale Supabase auth cookies so the login page is not misled.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.set({
        name: cookie.name,
        value: "",
        maxAge: 0,
        path: "/",
      });
    }
  }
  return response;
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
    // Fail closed: without Supabase env we cannot verify the session,
    // so we refuse to serve protected pages. Previously returned next().
    return redirectToLogin(request, "env");
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
    return redirectToLogin(request, "session");
  }

  // Domain allowlist enforcement. Defense in depth in case a non-@sighthound
  // account makes it through Supabase (for example through provider misconfig
  // or a stale session issued before this rule was enforced).
  if (!isAllowedEmail(user.email)) {
    await supabase.auth.signOut().catch(() => {
      /* best effort — fall through to cookie clear */
    });
    return redirectToLogin(request, "domain");
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
