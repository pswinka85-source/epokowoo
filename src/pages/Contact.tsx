import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send, ArrowLeft, MessageSquare, Bell, Mail, Sparkles, AlertTriangle, Info, Calendar, Check } from "lucide-react";
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

interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

const Contact = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'notifications') setActiveTab('notifications');
  }, [searchParams]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setNotifications((data as AppNotification[]) || []);
  }, [user]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => loadNotifications())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadNotifications]);

  const markNotificationAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos) return;

    const otherIds = convos.map((c) => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", otherIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

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

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("messages-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (activeConvo && msg.conversation_id === activeConvo.id) {
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then();
          }
        }
        loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConvo, loadConversations]);

  useEffect(() => {
    if (!activeConvo || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvo.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!searchQuery.trim() || !user) { setSearchResults([]); return; }
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
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${otherUser.user_id}),and(user1_id.eq.${otherUser.user_id},user2_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setActiveConvo({ ...existing, other_user: otherUser, unread_count: 0 });
    } else {
      const { data: newConvo } = await supabase
        .from("conversations")
        .insert({ user1_id: user.id, user2_id: otherUser.user_id })
        .select()
        .single();
      if (newConvo) {
        setActiveConvo({ ...newConvo, other_user: otherUser, unread_count: 0 });
        loadConversations();
      }
    }
    setSearchQuery("");
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConvo || !user) return;
    const content = newMessage.trim();
    setNewMessage("");
    await supabase.from("messages").insert({ conversation_id: activeConvo.id, sender_id: user.id, content });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", activeConvo.id);
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return d.toLocaleDateString("pl-PL", { weekday: "short" });
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  };

  const getUnreadCount = () => {
    return activeTab === 'messages'
      ? conversations.reduce((sum, c) => sum + c.unread_count, 0)
      : notifications.filter(n => !n.read).length;
  };

  const handleTabChange = (tab: 'messages' | 'notifications') => {
    setActiveTab(tab);
    if (tab === 'messages') setActiveNotification(null);
    else setActiveConvo(null);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
      case "exam_cancelled":
        return <AlertTriangle size={16} className="text-warning" />;
      case "success":
        return <Check size={16} className="text-success" />;
      case "exam":
        return <Calendar size={16} className="text-primary" />;
      default:
        return <Info size={16} className="text-info" />;
    }
  };

  const isDetailOpen = Boolean(activeConvo || activeNotification);

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-background pb-8">
      {/* Hero / Page header */}
      <div className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-14">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-2">
            Centrum wiadomości 💬
          </h1>
          <p className="text-lg text-muted-foreground font-body leading-relaxed">
            {getUnreadCount() > 0 ? `Masz ${getUnreadCount()} nieprzeczytanych wiadomości.` : "Wszystko przeczytane ✓"}
          </p>
        </div>
      </div>

      {/* Main content card */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden flex flex-col" style={{ height: "calc(100vh - 200px)", minHeight: 400 }}>
          <div className="flex flex-1 overflow-hidden">
            
            {/* LEFT PANEL — list */}
            <div className={`${isDetailOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] flex-col border-r border-border/40`}>
              
              {/* Tabs as pill toggles */}
              <div className="p-3 pb-0">
                <div className="flex gap-1 p-1 rounded-xl bg-secondary/60">
                  <button
                    onClick={() => handleTabChange('messages')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === 'messages'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Mail size={15} />
                    <span>Wiadomości</span>
                    {conversations.reduce((sum, c) => sum + c.unread_count, 0) > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleTabChange('notifications')}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeTab === 'notifications'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Bell size={15} />
                    <span>Powiadomienia</span>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="p-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder={activeTab === 'messages' ? "Szukaj użytkownika..." : "Szukaj powiadomień..."}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  />
                  {searchQuery && activeTab === 'messages' && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-xl shadow-[var(--shadow-elevated)] border border-border/60 z-20 max-h-64 overflow-y-auto">
                      {searching ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Szukam...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nie znaleziono użytkowników</div>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p.user_id}
                            onClick={() => startConversation(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
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

              {/* List */}
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {activeTab === 'messages' ? (
                  conversations.length === 0 ? (
                    <EmptyState icon={<MessageSquare size={28} className="text-muted-foreground/40" />} title="Brak wiadomości" subtitle="Wyszukaj użytkownika, aby rozpocząć rozmowę" />
                  ) : (
                    <div className="space-y-1">
                      {conversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setActiveConvo(c); setActiveNotification(null); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                            activeConvo?.id === c.id
                              ? 'bg-primary/8 ring-1 ring-primary/20'
                              : 'hover:bg-secondary/60'
                          }`}
                        >
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                              c.unread_count > 0 ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'
                            }`}>
                              {c.other_user?.avatar_url ? (
                                <img src={c.other_user.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                              ) : (
                                <span>{getInitials(c.other_user?.display_name ?? null)}</span>
                              )}
                            </div>
                            {c.unread_count > 0 && (
                              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-card">
                                {c.unread_count > 9 ? "9+" : c.unread_count}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm truncate ${c.unread_count > 0 ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                                {c.other_user?.display_name || "Użytkownik"}
                              </span>
                              <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(c.last_message_at)}</span>
                            </div>
                            <p className={`text-xs truncate mt-0.5 ${c.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                              {c.last_message || "Rozpocznij rozmowę"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                ) : notifications.length === 0 ? (
                  <EmptyState icon={<Bell size={28} className="text-muted-foreground/40" />} title="Brak powiadomień" subtitle="Tutaj pojawią się powiadomienia o egzaminach" />
                ) : (
                  <div className="space-y-1">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => { setActiveNotification(n); setActiveConvo(null); if (!n.read) markNotificationAsRead(n.id); }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          activeNotification?.id === n.id
                            ? 'bg-primary/8 ring-1 ring-primary/20'
                            : !n.read
                              ? 'bg-primary/5 hover:bg-primary/8'
                              : 'hover:bg-secondary/60'
                        }`}
                      >
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          !n.read ? 'bg-primary/10' : 'bg-secondary'
                        }`}>
                          {getNotificationIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm truncate ${!n.read ? 'font-bold text-foreground' : 'font-medium text-foreground/80'}`}>
                              {n.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground shrink-0">{formatTime(n.created_at)}</span>
                          </div>
                          {n.message && (
                            <p className={`text-xs truncate mt-0.5 ${!n.read ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                              {n.message}
                            </p>
                          )}
                        </div>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL — detail */}
            <div className={`${isDetailOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background/50`}>
              {activeConvo ? (
                <>
                  {/* Chat header */}
                  <div className="shrink-0 px-5 py-3.5 border-b border-border/40 bg-card flex items-center gap-3">
                    <button
                      onClick={() => setActiveConvo(null)}
                      className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                      {activeConvo.other_user?.avatar_url ? (
                        <img src={activeConvo.other_user.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        <span>{getInitials(activeConvo.other_user?.display_name ?? null)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground block truncate text-sm">
                        {activeConvo.other_user?.display_name || "Użytkownik"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {activeConvo.last_message_at ? formatTime(activeConvo.last_message_at) : "Aktywny"}
                      </span>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
                    {messages.length === 0 ? (
                      <EmptyState icon={<MessageSquare size={28} className="text-muted-foreground/40" />} title="Nie ma jeszcze wiadomości" subtitle="Napisz pierwszą wiadomość!" />
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === user?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] px-4 py-2.5 text-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md"
                                : "bg-card text-foreground rounded-2xl rounded-bl-md border border-border/40 shadow-sm"
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                              <p className={`text-[10px] mt-1.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
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
                  <div className="shrink-0 px-5 py-3.5 border-t border-border/40 bg-card">
                    <div className="flex items-center gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Napisz wiadomość..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                      >
                        <Send size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : activeNotification ? (
                <>
                  <div className="shrink-0 px-5 py-3.5 border-b border-border/40 bg-card flex items-center gap-3">
                    <button
                      onClick={() => setActiveNotification(null)}
                      className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      activeNotification.type === 'exam_cancelled' ? 'bg-warning/10' : 'bg-primary/10'
                    }`}>
                      {getNotificationIcon(activeNotification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground block truncate text-sm">{activeNotification.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(activeNotification.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-6">
                    <div className="max-w-2xl">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-5 ${
                        activeNotification.type === 'exam_cancelled'
                          ? 'bg-warning/10 text-warning'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {getNotificationIcon(activeNotification.type)}
                        {activeNotification.type === 'exam_cancelled' ? 'Egzamin anulowany' : 'Powiadomienie'}
                      </div>
                      <h2 className="text-lg font-bold text-foreground mb-3">{activeNotification.title}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {activeNotification.message?.trim() || 'To powiadomienie nie zawiera dodatkowej treści.'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* Empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                    {activeTab === 'notifications' ? (
                      <Bell size={28} className="text-muted-foreground/40" />
                    ) : (
                      <MessageSquare size={28} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-foreground mb-1">
                    {activeTab === 'notifications' ? 'Powiadomienia' : 'Wiadomości'}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {activeTab === 'notifications'
                      ? 'Wybierz powiadomienie z listy, aby zobaczyć szczegóły'
                      : 'Wybierz rozmowę lub wyszukaj użytkownika, aby rozpocząć'}
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

/* Shared empty state component */
const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-3">
      {icon}
    </div>
    <p className="text-sm font-semibold text-foreground mb-0.5">{title}</p>
    <p className="text-xs text-muted-foreground">{subtitle}</p>
  </div>
);

export default Contact;
