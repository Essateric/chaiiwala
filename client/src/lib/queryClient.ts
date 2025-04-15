import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Check if we're in Netlify production environment
// Only use Netlify functions when deployed to Netlify
// This is a more robust way to detect Netlify environment
const isNetlify = window.location.hostname.includes('netlify.app');

// Force enable for testing
console.log("Netlify detection:", { 
  hostname: window.location.hostname,
  isNetlifyDetected: isNetlify,
  currentUrl: window.location.href
});

// Helper to transform API URLs for Netlify deployment
function transformApiUrl(url: string): string {
  // Only transform API URLs
  if (url.startsWith('/api/')) {
    if (isNetlify) {
      // For Netlify, we need to route all API requests to the serverless function
      // The path rewrite in the function handler will convert back to /api/...
      const transformedUrl = `/.netlify/functions/api${url.substring('/api'.length)}`;
      console.log(`Transforming API URL: ${url} -> ${transformedUrl}`);
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
  
  // Debug log for URL transformation in production
  if (isNetlify) {
    console.log(`API Request: ${method} ${url} → ${transformedUrl}`);
    if (data) {
      console.log(`Request payload:`, data);
    }
  }
  
  try {
    const res = await fetch(transformedUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    // Log response status for debugging
    console.log(`Response from ${url}: status=${res.status}`);
    
    // Don't throw error - we'll handle it in the mutation function
    return res;
  } catch (error) {
    console.error(`Network error for ${url}:`, error);
    throw error;
  }
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
    
    try {
      const res = await fetch(transformedUrl, {
        credentials: "include",
      });

      console.log(`Response from query ${url}: status=${res.status}`);
      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log("Returning null for 401 response as requested");
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error response from ${url}: ${res.status} - ${errorText}`);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }
      
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(`Error in query ${url}:`, error);
      throw error;
    }
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
