import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { routing } from './i18n/routing';

const handleIntl = createMiddleware({
  ...routing,
  localeDetection: false
});

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle /admin route authentication protection
  if (pathname.startsWith('/admin')) {
    // Public admin routes that don't require pre-auth session check in middleware
    const isPublicAdminRoute =
      pathname === '/admin/login' ||
      pathname.startsWith('/admin/login/') ||
      pathname.startsWith('/admin/email-actions/');

    if (!isPublicAdminRoute) {
      let response = NextResponse.next({ request });

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && anonKey) {
        const supabase = createServerClient(url, anonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              );
            },
          },
        });

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = '/admin/login';
          return NextResponse.redirect(redirectUrl);
        }
      }
      return response;
    }

    return NextResponse.next();
  }

  // Handle all internationalized public routes
  return handleIntl(request);
}

export const config = {
  // Match both internationalized pathnames and admin routes, excluding api, _next, _vercel, and static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

