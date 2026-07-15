import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export async function updateSession(request: {
  url: string;
  cookies: {
    getAll: () => { name: string; value: string }[];
    set: (name: string, value: string, options?: any) => void;
  };
  headers: Record<string, string>;
}) {
  const response = {
    cookies: [] as { name: string; value: string; options: any }[],
  };

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value, options);
          response.cookies.push({ name, value, options });
        });
      },
    },
  });

  // Refresh the session — this is the key part
  // It reads the session from cookies, checks if expired,
  // and refreshes it if needed
  const { data: { user } } = await supabase.auth.getUser();

  // Protected routes — redirect if not authenticated
  const protectedPaths = ['/home', '/groups', '/wallet', '/reports', '/profile'];
  const isProtected = protectedPaths.some((path) => request.url.includes(path));

  if (isProtected && !user) {
    return { redirect: '/login', cookies: response.cookies };
  }

  // Auth routes — redirect if already authenticated
  const authPaths = ['/login', '/signup'];
  const isAuthRoute = authPaths.some((path) => request.url.includes(path));

  if (isAuthRoute && user) {
    return { redirect: '/home', cookies: response.cookies };
  }

  return { redirect: null, cookies: response.cookies, user };
}
