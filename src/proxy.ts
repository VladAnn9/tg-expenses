import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const protectedRoutes = ["/dashboard"];
const publicRoutes = ["/login"];

export async function proxy(req: NextRequest) {
  let response = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch (e) {
    console.warn("[proxy] auth.getUser() failed, treating as unauthenticated:", (e as Error).message);
  }

  const path = req.nextUrl.pathname;
  const isProtected = protectedRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );
  const isPublic = publicRoutes.some(
    (route) => path === route || path.startsWith(route + "/"),
  );

  if (isProtected && !user) {
    const loginUrl = new URL("/login", req.nextUrl);
    // Preserve the full path + query so we can redirect back after login
    loginUrl.searchParams.set("redirectTo", path + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && user) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
