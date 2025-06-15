import { useEffect } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { toast } from "../../hooks/use-toast.jsx";

export default function NotificationListener() {
  const supabase = useSupabaseClient();

  useEffect(() => {
    const sub = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          toast(payload.new.message); // display notification
        })
      .subscribe();
    return () => { supabase.removeChannel(sub); }
  }, [supabase]);
  return null;
}
