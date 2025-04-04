import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Check if we're in Netlify production environment
// Only use Netlify functions when deployed to Netlify
// We've disabled this check for now to ensure local development works correctly
const isNetlify = false; // Disable Netlify redirects for now

// Helper to transform API URLs for Netlify deployment
function transformApiUrl(url: string): string {
  // Only transform API URLs
  if (url.startsWith('/api/')) {
    return isNetlify ? `/.netlify/functions/api${url.replace('/api', '')}` : url;
  }
  return url;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const transformedUrl = transformApiUrl(url);
  
  const res = await fetch(transformedUrl, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const transformedUrl = transformApiUrl(url);
    
    const res = await fetch(transformedUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
