import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send, ArrowLeft, MessageSquare, Mail, AlertTriangle, Info, Calendar, Check, Plus, Sparkles, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import envelopeIllustration from "@/assets/envelope-illustration.png";
import notificationIcon from "@/assets/notification-icon.png";

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

type UnifiedItem =
  | { kind: "conversation"; data: Conversation; sortDate: string }
  | { kind: "notification"; data: AppNotification; sortDate: string };

/* Skeleton for message loading */
const MessagesSkeleton = () => (
  <div className="flex-1 px-4 md:px-6 py-5 space-y-4">
    {[...Array(6)].map((_, i) => (
      <div key={i} className={`flex ${i % 3 === 0 ? 'justify-start' : 'justify-end'}`}>
        {i % 3 === 0 && <Skeleton className="w-7 h-7 rounded-full shrink-0 mr-2 mt-1" />}
        <Skeleton className={`h-10 rounded-2xl ${i % 3 === 0 ? 'w-[55%]' : 'w-[45%]'}`} />
      </div>
    ))}
  </div>
);

/* Skeleton for conversation list */
const ConversationListSkeleton = () => (
  <div className="space-y-4 p-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl">
        <Skeleton className="w-11 h-11 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    ))}
  </div>
);

const Contact = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<Set<string>>(new Set());
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [convosLoading, setConvosLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setConvosLoading(true);
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos) { setConvosLoading(false); return; }

    const otherIds = convos.map((c) => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", otherIds);

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", otherIds)
      .in("role", ["admin", "examiner"]);

    const verifiedSet = new Set((roles || []).map((r) => r.user_id));
    setVerifiedUsers(verifiedSet);

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
    setConvosLoading(false);
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
    setMessagesLoading(true);
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConvo.id)
        .order("created_at", { ascending: true });
      setMessages(data || []);
      setMessagesLoading(false);
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
    setShowSearch(false);
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

  const formatTimeAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Teraz";
    if (diffMin < 60) return `${diffMin} min temu`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h temu`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d temu`;
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "warning":
      case "exam_cancelled":
        return <AlertTriangle size={18} className="text-warning" />;
      case "success":
        return <Check size={18} className="text-success" />;
      case "exam":
        return <Calendar size={18} className="text-primary" />;
      default:
        return <Info size={18} className="text-info" />;
    }
  };

  const getNotificationSubtype = (type: string) => {
    switch (type) {
      case "exam_cancelled": return "Automatyczne powiadomienie";
      case "exam": return "Powiadomienie";
      case "warning": return "Automatyczne powiadomienie";
      default: return "Powiadomienie";
    }
  };

  const unifiedItems: UnifiedItem[] = [
    ...conversations.map((c): UnifiedItem => ({ kind: "conversation", data: c, sortDate: c.last_message_at })),
    ...notifications.map((n): UnifiedItem => ({ kind: "notification", data: n, sortDate: n.created_at })),
  ].sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  const isDetailOpen = Boolean(activeConvo || activeNotification);

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";
    msgs.forEach((msg) => {
      const msgDate = new Date(msg.created_at).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });
    return groups;
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-background">
      {/* Header — matching Index page layout */}
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-14">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-2">
            Centrum Wiadomości
          </h1>
          <p className="text-lg text-muted-foreground font-body leading-relaxed">
            Bądź na bieżąco z najnowszymi wiadomościami!
          </p>
        </div>
      </header>

      {/* Main container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-8">
        <div className="flex gap-4 overflow-hidden" style={{ height: "min(600px, calc(100vh - 260px))", minHeight: 400 }}>

          {/* LEFT PANEL — conversation list */}
          <div className={`${isDetailOpen ? 'hidden md:flex' : 'flex'} w-full md:w-[360px] flex-col shrink-0 rounded-3xl bg-card border border-border/30 overflow-hidden`}>

            {/* Panel header */}
            <div className="shrink-0 px-5 py-4 border-b border-border/20 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Wiadomości</span>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
              >
                {showSearch ? <ArrowLeft size={16} /> : <Plus size={16} />}
              </button>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="px-3 py-3 border-b border-border/20">
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Szukaj użytkownika..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary/60 text-sm text-foreground placeholder:text-muted-foreground/40 border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                  {searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-[var(--shadow-elevated)] border border-border/40 z-20 max-h-64 overflow-y-auto">
                      {searching ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Szukam...</div>
                      ) : searchResults.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">Nie znaleziono</div>
                      ) : (
                        searchResults.map((p) => (
                          <button
                            key={p.user_id}
                            onClick={() => startConversation(p)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                          >
                            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
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
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {convosLoading ? (
                <ConversationListSkeleton />
              ) : unifiedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                    <Mail size={24} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">Brak wiadomości</p>
                  <p className="text-xs text-muted-foreground/50">Kliknij + aby rozpocząć rozmowę</p>
                </div>
              ) : (
                <div className="py-1">
                  {unifiedItems.map((item) => {
                    if (item.kind === "conversation") {
                      const c = item.data;
                      const isActive = activeConvo?.id === c.id;
                      return (
                        <button
                          key={`conv-${c.id}`}
                          onClick={() => { setActiveConvo(c); setActiveNotification(null); }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 text-left ${
                            isActive
                              ? 'bg-primary/[0.08]'
                              : 'hover:bg-secondary/50'
                          }`}
                        >
                          {/* Avatar */}
                          <div className={`relative w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${
                            c.unread_count > 0 ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-card' : ''
                          } bg-gradient-to-br from-primary/20 to-accent/20 text-primary`}>
                            {c.other_user?.avatar_url ? (
                              <img src={c.other_user.avatar_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <span className="text-xs">{getInitials(c.other_user?.display_name ?? null)}</span>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-sm truncate ${c.unread_count > 0 ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                                  {c.other_user?.display_name || "Użytkownik"}
                                </span>
                                {verifiedUsers.has(c.user1_id === user?.id ? c.user2_id : c.user1_id) && (
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary shrink-0" title="Zweryfikowany">
                                    <Check size={10} strokeWidth={3.5} className="text-primary-foreground" />
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted-foreground/50 shrink-0 ml-2">
                                {formatTimeAgo(c.last_message_at)}
                              </span>
                            </div>
                            {c.last_message && (
                              <p className={`text-[13px] truncate leading-snug ${c.unread_count > 0 ? 'text-foreground/80 font-medium' : 'text-muted-foreground/60'}`}>
                                {c.last_message}
                              </p>
                            )}
                          </div>

                          {/* Unread badge */}
                          {c.unread_count > 0 && (
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                              {c.unread_count}
                            </span>
                          )}
                        </button>
                      );
                    } else {
                      const n = item.data;
                      const isActive = activeNotification?.id === n.id;
                      return (
                        <button
                          key={`notif-${n.id}`}
                          onClick={() => { setActiveNotification(n); setActiveConvo(null); if (!n.read) markNotificationAsRead(n.id); }}
                          className={`w-full flex items-center gap-3 px-4 py-3.5 transition-all duration-200 text-left ${
                            isActive
                              ? 'bg-primary/[0.08]'
                              : !n.read
                                ? 'bg-primary/[0.03] hover:bg-primary/[0.06]'
                                : 'hover:bg-secondary/50'
                          }`}
                        >
                          {/* Notification icon */}
                          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0">
                            <img src={notificationIcon} className="w-full h-full object-cover" alt="Powiadomienie" />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className={`text-sm truncate ${!n.read ? 'font-bold text-foreground' : 'font-semibold text-foreground'}`}>
                                Epokowo
                              </span>
                              <span className="text-[11px] text-muted-foreground/50 shrink-0 ml-2">
                                {formatTimeAgo(n.created_at)}
                              </span>
                            </div>
                            <p className={`text-[13px] truncate leading-snug ${!n.read ? 'text-foreground/80 font-medium' : 'text-muted-foreground/60'}`}>
                              {n.title}
                            </p>
                          </div>

                          {!n.read && (
                            <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                          )}
                        </button>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className={`${isDetailOpen ? 'flex' : 'hidden md:flex'} flex-1 flex-col rounded-3xl bg-card border border-border/30 overflow-hidden`}>
            {activeConvo ? (
              <>
                {/* Chat header */}
                <div className="shrink-0 px-5 py-3.5 border-b border-border/20 flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvo(null)}
                    className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0 overflow-hidden">
                    {activeConvo.other_user?.avatar_url ? (
                      <img src={activeConvo.other_user.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>{getInitials(activeConvo.other_user?.display_name ?? null)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground block truncate text-sm">
                      {activeConvo.other_user?.display_name || "Użytkownik"}
                    </span>
                    <span className="text-[11px] text-muted-foreground/50">
                      Aktywny: {formatTimeAgo(activeConvo.last_message_at)}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                {messagesLoading ? (
                  <MessagesSkeleton />
                ) : (
                  <div className="flex-1 overflow-y-auto px-4 md:px-6 py-5">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare size={32} className="text-muted-foreground/30 mb-3" />
                        <p className="text-sm text-muted-foreground/60">Napisz pierwszą wiadomość!</p>
                      </div>
                    ) : (
                      groupMessagesByDate(messages).map((group) => (
                        <div key={group.date}>
                          <div className="flex items-center gap-3 my-5">
                            <div className="flex-1 h-px bg-border/30" />
                            <span className="text-[11px] font-medium text-muted-foreground/50 px-3 py-1">{group.date}</span>
                            <div className="flex-1 h-px bg-border/30" />
                          </div>
                          <div className="space-y-1.5">
                            {group.messages.map((msg, idx) => {
                              const isMine = msg.sender_id === user?.id;
                              const prevMsg = idx > 0 ? group.messages[idx - 1] : null;
                              const isConsecutive = prevMsg && prevMsg.sender_id === msg.sender_id;
                              return (
                                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} ${!isConsecutive ? 'mt-3' : ''}`}>
                                  {!isMine && !isConsecutive && (
                                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0 mr-2 mt-1">
                                      {getInitials(activeConvo.other_user?.display_name ?? null)}
                                    </div>
                                  )}
                                  {!isMine && isConsecutive && <div className="w-7 mr-2 shrink-0" />}
                                  <div className={`max-w-[70%] group relative ${
                                    isMine
                                      ? 'px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-[20px] rounded-br-[6px] shadow-sm'
                                      : 'px-4 py-2.5 text-sm bg-secondary/60 text-foreground rounded-[20px] rounded-bl-[6px]'
                                  }`}>
                                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                                    <p className={`text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "text-primary-foreground/50" : "text-muted-foreground/50"}`}>
                                      {formatTime(msg.created_at)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}

                {/* Input */}
                <div className="shrink-0 px-4 md:px-5 py-3 border-t border-border/20">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Napisz wiadomość..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                        className="w-full px-4 py-3 rounded-2xl bg-secondary/50 text-sm text-foreground placeholder:text-muted-foreground/40 border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      />
                    </div>
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center hover:shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.5)] active:scale-[0.96] transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
                    >
                      <Send size={16} className="translate-x-[1px]" />
                    </button>
                  </div>
                </div>
              </>
            ) : activeNotification ? (
              <>
                <div className="shrink-0 px-5 py-3.5 border-b border-border/20 flex items-center gap-3">
                  <button
                    onClick={() => setActiveNotification(null)}
                    className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    activeNotification.type === 'exam_cancelled' ? 'bg-warning/10' : 'bg-primary/10'
                  }`}>
                    {getNotificationIcon(activeNotification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground block truncate text-sm">{activeNotification.title}</span>
                    <span className="text-[11px] text-muted-foreground/50">{formatDate(activeNotification.created_at)}</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-8">
                  <div className="max-w-xl mx-auto">
                    <h2 className="text-xl font-bold text-foreground mb-4 leading-tight">{activeNotification.title}</h2>
                    <div className="bg-secondary/30 rounded-2xl p-5">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {activeNotification.message?.trim() || 'To powiadomienie nie zawiera dodatkowej treści.'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <img src={envelopeIllustration} alt="" className="w-48 h-48 object-contain mb-5 opacity-60" />
                <p className="text-base text-muted-foreground/60 max-w-[280px] leading-relaxed font-medium">
                  Wybierz konwersację,<br />aby zobaczyć wiadomości.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </main>
  );
};

export default Contact;
