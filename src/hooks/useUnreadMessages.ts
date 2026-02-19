import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useUnreadMessages = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    // Get all conversation IDs for this user
    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    if (!convos || convos.length === 0) {
      setUnreadCount(0);
      return;
    }

    const ids = convos.map((c) => c.id);
    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .in("conversation_id", ids)
      .eq("read", false)
      .neq("sender_id", user.id);

    setUnreadCount(count || 0);
  }, [user]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCount]);

  return unreadCount;
};
