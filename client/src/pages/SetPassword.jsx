// client/src/pages/auth/set-password.jsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient'; // Your Supabase client
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
// You might not need useAuth here directly if Supabase client handles the session from URL
// but it can be useful to check if a user session is established from the token.

export default function SetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionEstablished, setSessionEstablished] = useState(false);

  // Check if the invite token has established a session
  useEffect(() => {
    const checkSession = async () => {
      // The onAuthStateChange listener in UseAuth might handle this,
      // but an explicit check here can be good.
      // Supabase client automatically handles the token from the URL hash.
      // We just need to see if a user object becomes available.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && session.provider_token) { // provider_token might be present for invite
        setSessionEstablished(true);
        console.log("Session established from invite token for user:", session.user.email);
      } else if (session?.user) {
        // User might already be fully logged in, perhaps redirect?
        console.log("User already has an active session, not an invite flow:", session.user.email);
        // router.push('/'); // Or to dashboard
      } else {
        // No session from token, this could be an issue or user needs to click link again
        console.warn("No session established from URL token. Ensure you've clicked a valid invite link.");
        // setError("Invalid or expired invitation link. Please request a new one.");
      }
    };

    // Only run if there's a hash in the URL (where Supabase puts tokens)
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        checkSession();
    } else {
        // If no token in URL, this page shouldn't be accessed directly for password set
        // setError("This page is for setting your password after an invitation. Please use the link from your email.");
        console.log("No access token in URL hash, not an invite callback.");
    }
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      toast({ title: "Error", description: "Password cannot be empty.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // The user's session should be active due to the invite token in the URL
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      toast({ title: "Success!", description: "Your password has been set. You can now log in." });
      router.push('/login'); // Redirect to login page
    } catch (err) {
      console.error("Error setting password:", err);
      setError(err.message || "Failed to set password. The link may have expired or already been used.");
      toast({ title: "Error", description: err.message || "Failed to set password.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Optional: Show a loading or message if session isn't established yet from token
  // if (!sessionEstablished && typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
  //   return <p className="p-4 text-center">Verifying invitation...</p>;
  // }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-xl">
      <h1 className="text-2xl font-bold text-center mb-6">Set Your Password</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="password">New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Enter your new password"
            className="mt-1"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-chai-gold hover:bg-yellow-600 text-white">
          {loading ? 'Setting Password...' : 'Set Password & Log In'}
        </Button>
      </form>
    </div>
  );
}
