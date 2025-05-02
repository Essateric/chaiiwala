import { QueryClient } from "@tanstack/react-query";

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
function transformApiUrl(url) {
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

async function throwIfResNotOk(res) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method, url, body) {
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include", // <- VERY IMPORTANT
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return res;
}


export const getQueryFn = ({ on401: unauthorizedBehavior }) => async ({ queryKey }) => {
  const url = queryKey[0];
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


