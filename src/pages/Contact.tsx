import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send, ArrowLeft, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  other_user?: Profile;
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const Contact = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos) return;

    const otherIds = convos.map((c) =>
      c.user1_id === user.id ? c.user2_id : c.user1_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", otherIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Get last message and unread count for each conversation
    const enriched = await Promise.all(
      convos.map(async (c) => {
        const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("read", false)
          .neq("sender_id", user.id);

        return {
          ...c,
          other_user: profileMap.get(otherId),
          last_message: lastMsg?.content,
          unread_count: count || 0,
        };
      })
    );

    setConversations(enriched);
  }, [user]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          if (activeConvo && msg.conversation_id === activeConvo.id) {
            setMessages((prev) => [...prev, msg]);
            // Mark as read if we're viewing
            if (msg.sender_id !== user.id) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", msg.id)
                .then();
            }
          }
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeConvo, loadConversations]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConvo || !user) return;

    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvo.id)
        .order("created_at", { ascending: true });

      setMessages(data || []);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", activeConvo.id)
        .neq("sender_id", user.id)
        .eq("read", false);

      loadConversations();
    };
    load();
  }, [activeConvo, user, loadConversations]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Search users
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .neq("user_id", user.id)
        .ilike("display_name", `%${searchQuery}%`)
        .limit(10);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, user]);

  const startConversation = async (otherUser: Profile) => {
    if (!user) return;

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `and(user1_id.eq.${user.id},user2_id.eq.${otherUser.user_id}),and(user1_id.eq.${otherUser.user_id},user2_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      const convo: Conversation = {
        ...existing,
        other_user: otherUser,
        unread_count: 0,
      };
      setActiveConvo(convo);
    } else {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({
          user1_id: user.id,
          user2_id: otherUser.user_id,
        })
        .select()
        .single();

      if (newConvo) {
        setActiveConvo({
          ...newConvo,
          other_user: otherUser,
          unread_count: 0,
        });
        loadConversations();
      }
    }
    setShowSearch(false);
    setSearchQuery("");
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo || !user) return;
    const content = newMessage.trim();
    setNewMessage("");

    await supabase.from("messages").insert({
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content,
    });

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeConvo.id);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("pl-PL", { weekday: "short" });
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-background pt-4 pb-10 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] overflow-hidden" style={{ height: "calc(100vh - 120px)" }}>
          <div className="flex h-full">
            {/* Left sidebar - conversation list */}
            <div className={`w-full md:w-80 lg:w-96 border-r border-secondary flex flex-col ${activeConvo ? "hidden md:flex" : "flex"}`}>
              {/* Header */}
              <div className="p-4 border-b border-secondary">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-display font-bold text-foreground">Wiadomości</h2>
                  <button
                    onClick={() => setShowSearch(!showSearch)}
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <Search size={18} />
                  </button>
                </div>

                {showSearch && (
                  <div className="relative animate-in fade-in slide-in-from-top-2 duration-200">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Szukaj użytkownika..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary/60 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      autoFocus
                    />
                    {searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl shadow-[var(--shadow-elevated)] border border-secondary z-10 max-h-60 overflow-y-auto">
                        {searching ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Szukam...</div>
                        ) : searchResults.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">Nie znaleziono</div>
                        ) : (
                          searchResults.map((p) => (
                            <button
                              key={p.user_id}
                              onClick={() => startConversation(p)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                            >
                              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {p.avatar_url ? (
                                  <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" />
                                ) : (
                                  getInitials(p.display_name)
                                )}
                              </div>
                              <span className="text-sm font-medium text-foreground truncate">
                                {p.display_name || "Użytkownik"}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <MessageSquare size={40} className="text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Brak wiadomości</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Kliknij 🔍 aby znaleźć użytkownika
                    </p>
                  </div>
                ) : (
                  conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveConvo(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 transition-colors text-left ${
                        activeConvo?.id === c.id
                          ? "bg-primary/5"
                          : "hover:bg-secondary/40"
                      }`}
                    >
                      <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0 relative">
                        {c.other_user?.avatar_url ? (
                          <img src={c.other_user.avatar_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          getInitials(c.other_user?.display_name ?? null)
                        )}
                        {c.unread_count > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                            {c.unread_count}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm truncate ${c.unread_count > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                            {c.other_user?.display_name || "Użytkownik"}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-2 shrink-0">
                            {formatTime(c.last_message_at)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                          {c.last_message || "Rozpocznij rozmowę"}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right side - messages */}
            <div className={`flex-1 flex flex-col ${!activeConvo ? "hidden md:flex" : "flex"}`}>
              {activeConvo ? (
                <>
                  {/* Chat header */}
                  <div className="px-4 py-3 border-b border-secondary flex items-center gap-3">
                    <button
                      onClick={() => setActiveConvo(null)}
                      className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {activeConvo.other_user?.avatar_url ? (
                        <img src={activeConvo.other_user.avatar_url} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getInitials(activeConvo.other_user?.display_name ?? null)
                      )}
                    </div>
                    <span className="font-display font-semibold text-foreground">
                      {activeConvo.other_user?.display_name || "Użytkownik"}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
                    {messages.map((msg) => {
                      const isMine = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-body ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-secondary text-foreground rounded-bl-md"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {formatTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-secondary">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Napisz wiadomość..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/60 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                  <MessageSquare size={48} className="text-muted-foreground/20 mb-4" />
                  <h3 className="font-display font-semibold text-foreground mb-1">Wybierz rozmowę</h3>
                  <p className="text-sm text-muted-foreground">
                    Lub wyszukaj użytkownika, aby rozpocząć nową
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Contact;
