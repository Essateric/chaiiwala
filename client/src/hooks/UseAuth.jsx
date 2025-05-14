import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSupabaseClient, useSession } from "@supabase/auth-helpers-react";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const session = useSession();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      console.log("🔥 useEffect running to fetch user and profile");

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        const currentUser = authData?.user;
        console.log("🛡️ User role from metadata:", currentUser?.user_metadata?.role);
        setUser(currentUser);

        // Get fresh session with token
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const token = sessionData?.session?.access_token ?? null;
        console.log("🔑 Access token:", token);
        setAccessToken(token);

        if (!currentUser) {
          console.log("ℹ️ No authenticated user found.");
          setProfile(null);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("auth_id", currentUser.id)
          .single();

        if (profileError) throw profileError;

        console.log("✅ Profile fetched:", profileData);
        setProfile(profileData);

      } catch (err) {
        console.error("❌ Error fetching user/profile:", err.message);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      const currentUser = newSession?.user ?? null;
      setUser(currentUser);
      setAccessToken(newSession?.access_token ?? null);
      if (!currentUser) setProfile(null);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.clear();
      setUser(null);
      setProfile(null);
      setAccessToken(null);
      toast({ title: "Signed out successfully", variant: "success" });
    },
    onError: (error) => {
      toast({
        title: "Sign out failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

useEffect(() => {
  if (session === null) {
    console.log("⏳ Waiting for session...");
  } else if (!session) {
    console.log("❌ No session found (user not logged in)");
  } else {
    console.log("✅ Session loaded:", session);
  }
}, [session]);


  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
        accessToken,
        logoutMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
