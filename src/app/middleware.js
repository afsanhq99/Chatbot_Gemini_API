import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';


export function middleware(req) {
    const token = req.cookies.get('token')?.value;

    if (req.nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }
    if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
        if (token) {
            return NextResponse.redirect(new URL('/', req.url))
        }
    }

    if (!token && req.nextUrl.pathname !== '/login' && req.nextUrl.pathname !== '/signup') {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            //   console.error('Token verification failed:', error);
            return NextResponse.redirect(new URL('/login', req.url));
        }
    }
    return NextResponse.next();
}
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}