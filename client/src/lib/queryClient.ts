import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Check if we're in Netlify production environment by checking for the Netlify environment
// This is a more reliable way to detect Netlify environment than checking for the hostname
// We'll also check for the production build which means the app is likely deployed
const isNetlify = window.location.hostname.includes('netlify.app') || 
                  window.location.hostname !== 'localhost' || 
                  import.meta.env.PROD === true;

console.log("Is Netlify environment:", isNetlify);

// Helper to transform API URLs for Netlify deployment
function transformApiUrl(url: string): string {
  // Only transform API URLs
  if (url.startsWith('/api/')) {
    if (isNetlify) {
      const transformedUrl = `/.netlify/functions/api${url.replace('/api', '')}`;
      console.log(`Transformed URL from ${url} to ${transformedUrl}`);
      return transformedUrl;
    }
    return url;
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
