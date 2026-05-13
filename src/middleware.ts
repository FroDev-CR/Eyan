import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Si el usuario está autenticado e intenta acceder a /login, redirigir a /dashboard
    if (pathname === "/login" && token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Verificar permisos por rol para rutas específicas
    // Más específico primero (mis-casos antes de dos-pinos)
    const roleRestrictions: Array<[string, string[]]> = [
      ["/settings", ["admin"]],
      ["/drivers", ["admin"]],
      ["/fleet", ["admin"]],
      ["/planning", ["admin", "dispatcher"]],
      ["/dos-pinos/mis-casos", ["driver"]],
      ["/dos-pinos/rutas", ["admin", "dispatcher"]],
      ["/dos-pinos", ["admin", "dispatcher", "driver"]],
      ["/contabilidad", ["admin"]],
      ["/api/contabilidad", ["admin"]],
      ["/api/users", ["admin"]],
    ];

    for (const [route, allowedRoles] of roleRestrictions) {
      if (pathname.startsWith(route) && token) {
        if (!allowedRoles.includes(token.role as string)) {
          // API: 403 JSON, página: redirect dashboard
          if (pathname.startsWith("/api/")) {
            return NextResponse.json(
              { success: false, error: "No autorizado" },
              { status: 403 }
            );
          }
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
        break;
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Permitir acceso a rutas públicas
        // /api/seed: handler valida (bootstrap si no hay admin, admin-only si existe)
        const publicRoutes = ["/login", "/api/auth", "/api/seed"];
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }

        // Para todas las demás rutas, requerir autenticación
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|icons).*)",
  ],
};
