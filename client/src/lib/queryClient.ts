import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Check if we're in Netlify production environment
// Only use Netlify functions when deployed to Netlify
// This is a more robust way to detect Netlify environment
const isNetlify = window.location.hostname.includes('netlify.app') || 
                 (typeof process !== 'undefined' && process.env?.NETLIFY);

// Helper to transform API URLs for Netlify deployment
function transformApiUrl(url: string): string {
  // Only transform API URLs
  if (url.startsWith('/api/')) {
    if (isNetlify) {
      // For Netlify, we need to route all API requests to the serverless function
      return `/.netlify/functions/api${url.substring('/api'.length)}`;
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
  
  // Debug log for URL transformation in production
  if (isNetlify) {
    console.log(`API Request: ${method} ${url} → ${transformedUrl}`);
  }
  
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
    
    // Debug log for query URL transformation
    if (isNetlify) {
      console.log(`Query Request: GET ${url} → ${transformedUrl}`);
    }
    
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
