import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/UseAuth";
import { supabase } from './lib/supabaseClient'; 
import { SessionContextProvider } from '@supabase/auth-helpers-react';

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider supabaseClient={supabase}> {/* 👉 WRAP HERE */}
      <AuthProvider>
        <App />
        <Toaster />
      </AuthProvider>
    </SessionContextProvider>
  </QueryClientProvider>
);

async function init() {
  const { data: user } = await supabase.auth.getUser();
}
