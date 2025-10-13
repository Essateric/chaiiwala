// client/src/main.jsx
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// ✅ Load theme tokens (fixes invisible inputs/borders/colors)
import "./styles/theme.css";
// Tailwind base/components/utilities
import "./index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";

import { supabase } from "./lib/supabaseClient";
import { SessionContextProvider } from "@supabase/auth-helpers-react";

// Optional: register PWA service worker (vite-plugin-pwa)
try {
  // This import is provided by vite-plugin-pwa at build/dev time
  const { registerSW } = await import("virtual:pwa-register");
  registerSW({ immediate: true });
} catch {
  // no-op if plugin not present
}

function InitWrapper() {
  // Keep your initial user log (unchanged)
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) {
        console.error("❌ Error fetching user:", error.message);
      } else {
        console.log("✅ Supabase user:", user);
      }
    };
    init();
  }, []);

  // ⛔️ No AuthProvider here — App already wraps with it
  return (
    <>
      <App />
      <Toaster />
    </>
  );
}

// ✅ Create exactly one React root (guards HMR/double mounts)
const container = document.getElementById("root");
if (!container.__root) {
  container.__root = createRoot(container);
}

container.__root.render(
  <SessionContextProvider supabaseClient={supabase}>
    <QueryClientProvider client={queryClient}>
      <InitWrapper />
    </QueryClientProvider>
  </SessionContextProvider>
);
