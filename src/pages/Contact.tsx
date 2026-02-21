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
    <main className="min-h-screen bg-background">
      {/* Hero section */}
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-14">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-4">
            Wiadomości
          </h1>
          <p className="text-lg text-muted-foreground font-body leading-relaxed">
            Skontaktuj się z innymi użytkownikami Epokowo
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div
          className="bg-white rounded-3xl shadow-lg border border-border/60 overflow-hidden"
          style={{ minHeight: "560px", height: "calc(100vh - 220px)" }}
        >
          <div className="flex h-full flex-col md:flex-row">
            {/* Left sidebar - conversation list */}
            <div
              className={`w-full md:w-80 lg:w-[340px] border-b md:border-b-0 md:border-r border-border/60 flex flex-col shrink-0 ${
                activeConvo ? "hidden md:flex" : "flex"
              }`}
            >
              {/* Search bar - zawsze widoczny */}
              <div className="p-4 pb-3 border-b border-border/60">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Szukaj użytkownika..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 text-sm font-body text-foreground placeholder:text-muted-foreground border border-transparent focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/30 transition-all"
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-[var(--shadow-elevated)] border border-border/60 z-20 max-h-64 overflow-y-auto py-1">
                      {searching ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          Szukam...
                        </div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          Nie znaleziono użytkowników
                        </div>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p.user_id}
                            onClick={() => startConversation(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors text-left"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 overflow-hidden ring-2 ring-border/40">
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  className="w-full h-full rounded-full object-cover"
                                  alt={p.display_name || "avatar"}
                                />
                              ) : (
                                <span>{getInitials(p.display_name)}</span>
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
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                      <MessageSquare size={28} className="text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium text-foreground">Brak wiadomości</p>
                    <p className="text-xs text-muted-foreground mt-1.5 max-w-[200px]">
                      Wyszukaj użytkownika powyżej, aby rozpocząć rozmowę
                    </p>
                  </div>
                ) : (
                  <div className="py-2">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveConvo(c)}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 mx-2 rounded-xl transition-all text-left ${
                          activeConvo?.id === c.id
                            ? "bg-primary/10 ring-1 ring-primary/20"
                            : "hover:bg-secondary/50"
                        }`}
                      >
                        <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0 relative overflow-hidden ring-2 ring-border/30">
                          {c.other_user?.avatar_url ? (
                            <img
                              src={c.other_user.avatar_url}
                              className="w-full h-full rounded-full object-cover"
                              alt={c.other_user?.display_name || "avatar"}
                            />
                          ) : (
                            getInitials(c.other_user?.display_name ?? null)
                          )}
                          {c.unread_count > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                              {c.unread_count > 9 ? "9+" : c.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm truncate ${
                                c.unread_count > 0
                                  ? "font-semibold text-foreground"
                                  : "font-medium text-foreground"
                              }`}
                            >
                              {c.other_user?.display_name || "Użytkownik"}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatTime(c.last_message_at)}
                            </span>
                          </div>
                          <p
                            className={`text-xs truncate mt-0.5 ${
                              c.unread_count > 0
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            }`}
                          >
                            {c.last_message || "Rozpocznij rozmowę"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side - chat */}
            <div
              className={`flex-1 flex flex-col min-w-0 ${
                !activeConvo ? "hidden md:flex" : "flex"
              }`}
            >
              {activeConvo ? (
                <>
                  {/* Chat header */}
                  <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-border/60 flex items-center gap-3 bg-card/80">
                    <button
                      onClick={() => setActiveConvo(null)}
                      className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      aria-label="Wróć do listy"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary overflow-hidden ring-2 ring-border/30 shrink-0">
                      {activeConvo.other_user?.avatar_url ? (
                        <img
                          src={activeConvo.other_user.avatar_url}
                          className="w-full h-full rounded-full object-cover"
                          alt={activeConvo.other_user?.display_name || "avatar"}
                        />
                      ) : (
                        getInitials(activeConvo.other_user?.display_name ?? null)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-display font-semibold text-foreground block truncate">
                        {activeConvo.other_user?.display_name || "Użytkownik"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {activeConvo.last_message_at
                          ? formatTime(activeConvo.last_message_at)
                          : "Aktywny"}
                      </span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4 bg-background/30 min-h-0">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                          <MessageSquare size={24} className="text-muted-foreground/40" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Nie ma jeszcze wiadomości
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          Napisz pierwszą wiadomość!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`group max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm font-body shadow-sm ${
                                isMine
                                  ? "bg-primary text-primary-foreground rounded-br-md"
                                  : "bg-card text-foreground rounded-bl-md border border-border/50"
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {msg.content}
                              </p>
                              <p
                                className={`text-[10px] mt-1.5 ${
                                  isMine
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="shrink-0 p-4 sm:p-6 pt-3 border-t border-border/60 bg-card/50">
                    <div className="flex items-center gap-3">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Napisz wiadomość..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && !e.shiftKey && sendMessage()
                        }
                        className="flex-1 px-4 py-3 rounded-xl bg-background border border-border/60 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shrink-0"
                        aria-label="Wyślij wiadomość"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-16">
                  <div className="w-20 h-20 rounded-2xl bg-secondary/40 flex items-center justify-center mb-6">
                    <MessageSquare size={36} className="text-muted-foreground/40" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground text-lg mb-2">
                    Wybierz rozmowę
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-[260px]">
                    Wybierz konwersację z listy lub wyszukaj użytkownika, aby
                    rozpocząć nową
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