import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/supabase/database.types';

const STATIC_ASSET_REGEX =
  /^\/(_next\/static|_next\/image|_next\/data|favicon\.ico|robots\.txt|sitemap\.xml|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2|ttf|eot))($|\/)/;
const ALLOWED_ROLES = ['importer', 'supplier', 'broker'] as const;
type DashboardRole = (typeof ALLOWED_ROLES)[number];

function getDashboardPath(role?: string | null) {
  return ALLOWED_ROLES.includes(role as DashboardRole)
    ? `/dashboard/${role}`
    : null;
}

async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return profile?.role ?? null;
}

function applySupabaseCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set({
      name: cookie.name,
      value: cookie.value,
      path: cookie.path,
      expires: cookie.expires,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets through immediately
  if (STATIC_ASSET_REGEX.test(pathname)) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isLoginRoute = pathname === '/login';

  // Unauthenticated users cannot access dashboard routes
  if (!user && isDashboardRoute) {
    const redirectUrl = new URL('/login', request.url);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    applySupabaseCookies(response, redirectResponse);
    return redirectResponse;
  }

  // Fetch role only when needed to direct users correctly
  let userRole: string | null = null;
  if (user && (isDashboardRoute || isLoginRoute)) {
    userRole = await getUserRole(supabase, user.id);
  }

  // Logged-in users should not see the login page when we know their role
  if (user && isLoginRoute) {
    const redirectPath = getDashboardPath(userRole);
    if (redirectPath) {
      const redirectResponse = NextResponse.redirect(
        new URL(redirectPath, request.url)
      );
      applySupabaseCookies(response, redirectResponse);
      return redirectResponse;
    }
  }

  // Direct dashboard root to the correct role-based dashboard
  if (user && pathname === '/dashboard') {
    const redirectPath = getDashboardPath(userRole) ?? '/login';
    const redirectResponse = NextResponse.redirect(
      new URL(redirectPath, request.url)
    );
    applySupabaseCookies(response, redirectResponse);
    return redirectResponse;
  }

  // Prevent cross-role access to other dashboard sections
  if (user && isDashboardRoute) {
    const requestedRole = pathname.split('/')[2];
    const targetDashboard = getDashboardPath(userRole);

    // Unknown or mismatched roles get bounced to a valid dashboard path
    const isRequestedRoleAllowed = ALLOWED_ROLES.includes(
      requestedRole as DashboardRole
    );

    if (!targetDashboard || !isRequestedRoleAllowed || (userRole && requestedRole && requestedRole !== userRole)) {
      const redirectResponse = NextResponse.redirect(
        new URL(targetDashboard ?? '/login', request.url)
      );
      applySupabaseCookies(response, redirectResponse);
      return redirectResponse;
    }
  }

  // Public routes and non-dashboard traffic proceed normally
  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|woff|woff2|ttf|eot)$).*)',
  ],
};
