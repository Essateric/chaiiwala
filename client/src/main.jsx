import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/UseAuth";
import { supabase } from './lib/supabaseClient';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import React, { useEffect } from "react";

function InitWrapper() {
  useEffect(() => {
    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("❌ Error fetching user:", error.message);
      } else {
        console.log("✅ Supabase user:", user);
      }
    };

    init();
  }, []);

  return (
    <AuthProvider>
      <App />
      <Toaster />
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider supabaseClient={supabase}>
      <InitWrapper />
    </SessionContextProvider>
  </QueryClientProvider>
);
