import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      console.log("🔥 useEffect running to fetch user and profile");

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        const currentUser = authData.user;
        console.log("👤 Authenticated user:", currentUser);
        setUser(currentUser);

        if (currentUser) {
          const { data: profileData, error: profileError } = await supabase
            .from("users")
            .select("permissions, store_id, first_name, last_name")
            .eq("auth_id", currentUser.id)
            .single();

          if (profileError) throw profileError;

          console.log("✅ Profile fetched:", profileData);
          setProfile(profileData);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error("❌ Error fetching user/profile:", err.message);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
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
