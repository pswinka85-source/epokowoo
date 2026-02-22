import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Search, Send, ArrowLeft, MessageSquare, Bell, Mail } from "lucide-react";
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

interface SystemMessage {
  id: string;
  title: string;
  content: string;
  date: string;
  read: boolean;
  type: 'system' | 'notification';
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
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications'>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Przykładowe wiadomości systemowe
  const [systemMessages] = useState<SystemMessage[]>([
    {
      id: '1',
      title: 'Sprawdź, co warto wiedzieć przed 1 września',
      content: 'Przygotuj się na nowy rok szkolny z naszym kompleksowym przewodnikiem.',
      date: '2024-08-25',
      read: false,
      type: 'system'
    },
    {
      id: '2',
      title: 'EGZAMIN ÓSMOKLASISTY 2026: Miasta egzamin',
      content: 'Poznaj listę miast, w których odbędzie się egzamin ósmoklasisty w 2026 roku.',
      date: '2024-08-20',
      read: false,
      type: 'notification'
    },
    {
      id: '3',
      title: 'Przyjdź na spotkania na nowy rok szkolny',
      content: 'Dołącz do naszych spotkań organizacyjnych przed rozpoczęciem roku szkolnego.',
      date: '2024-08-15',
      read: true,
      type: 'system'
    }
  ]);

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

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
  };

  const getUnreadCount = () => {
    if (activeTab === 'messages') {
      return conversations.reduce((sum, c) => sum + c.unread_count, 0);
    } else {
      return systemMessages.filter(m => !m.read).length;
    }
  };

  if (authLoading) return null;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Skrzynka odbiorcza</h1>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* ŚRODKOWA KOLUMNA - LISTA WIADOMOŚCI */}
          <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col">
            {/* Zakładki */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'messages'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Mail size={16} />
                  <span>Wiadomości</span>
                  {conversations.reduce((sum, c) => sum + c.unread_count, 0) > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {conversations.reduce((sum, c) => sum + c.unread_count, 0)}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'notifications'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Bell size={16} />
                  <span>Powiadomienia</span>
                  {systemMessages.filter(m => !m.read).length > 0 && (
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                      {systemMessages.filter(m => !m.read).length}
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* Search bar */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder={activeTab === 'messages' ? "Szukaj użytkownika..." : "Szukaj powiadomień..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-100 text-sm text-gray-900 placeholder:text-gray-500 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {searchQuery && activeTab === 'messages' && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-64 overflow-y-auto">
                    {searching ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Szukam...
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">
                        Nie znaleziono użytkowników
                      </div>
                    ) : (
                      searchResults.map((p) => (
                        <button
                          key={p.user_id}
                          onClick={() => startConversation(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 shrink-0">
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
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {p.display_name || "Użytkownik"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lista wiadomości */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">Twoje wiadomości</p>
                <p className="text-xs text-gray-500 mt-1">
                  {getUnreadCount()} nieprzeczytanych
                </p>
              </div>

              {activeTab === 'messages' ? (
                conversations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <MessageSquare size={32} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Brak wiadomości</p>
                    <p className="text-xs text-gray-500">Wyszukaj użytkownika, aby rozpocząć rozmowę</p>
                  </div>
                ) : (
                  <div className="px-2">
                    {conversations.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setActiveConvo(c)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left mb-1 ${
                          activeConvo?.id === c.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 shrink-0 relative">
                          {c.other_user?.avatar_url ? (
                            <img
                              src={c.other_user.avatar_url}
                              className="w-full h-full rounded-full object-cover"
                              alt={c.other_user?.display_name || "avatar"}
                            />
                          ) : (
                            <span>{getInitials(c.other_user?.display_name ?? null)}</span>
                          )}
                          {c.unread_count > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                              {c.unread_count > 9 ? "9+" : c.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-semibold truncate ${
                              c.unread_count > 0 ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {c.other_user?.display_name || "Użytkownik"}
                            </span>
                            <span className="text-xs text-gray-500 shrink-0">
                              {formatTime(c.last_message_at)}
                            </span>
                          </div>
                          <p className={`text-xs truncate mt-1 ${
                            c.unread_count > 0 ? 'text-gray-900 font-medium' : 'text-gray-500'
                          }`}>
                            {c.last_message || "Rozpocznij rozmowę"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <div className="px-2">
                  {systemMessages.map((msg) => (
                    <button
                      key={msg.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left mb-1 ${
                        !msg.read
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        {msg.type === 'system' ? (
                          <Bell size={18} className="text-gray-600" />
                        ) : (
                          <Mail size={18} className="text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-semibold truncate ${
                            !msg.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {msg.title}
                          </span>
                          <span className="text-xs text-gray-500 shrink-0">
                            {formatDate(msg.date)}
                          </span>
                        </div>
                        <p className={`text-xs truncate mt-1 ${
                          !msg.read ? 'text-gray-900 font-medium' : 'text-gray-500'
                        }`}>
                          {msg.content}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PRAWA KOLUMNA - PANEL PODGLĄDU */}
          <div className="flex-1 bg-white flex flex-col">
            {activeConvo ? (
              <>
                {/* Chat header */}
                <div className="shrink-0 px-6 py-4 border-b border-gray-200 flex items-center gap-3">
                  <button
                    onClick={() => setActiveConvo(null)}
                    className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-600 shrink-0">
                    {activeConvo.other_user?.avatar_url ? (
                      <img
                        src={activeConvo.other_user.avatar_url}
                        className="w-full h-full rounded-full object-cover"
                        alt={activeConvo.other_user?.display_name || "avatar"}
                      />
                    ) : (
                      <span>{getInitials(activeConvo.other_user?.display_name ?? null)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-gray-900 block truncate">
                      {activeConvo.other_user?.display_name || "Użytkownik"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {activeConvo.last_message_at
                        ? formatTime(activeConvo.last_message_at)
                        : "Aktywny"}
                    </span>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <MessageSquare size={32} className="text-gray-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Nie ma jeszcze wiadomości
                      </p>
                      <p className="text-xs text-gray-500">
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
                            className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                              isMine
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {msg.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isMine
                                  ? "text-blue-100"
                                  : "text-gray-500"
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
                <div className="shrink-0 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Napisz wiadomość..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && !e.shiftKey && sendMessage()
                      }
                      className="flex-1 px-4 py-2 rounded-full bg-gray-100 text-sm text-gray-900 placeholder:text-gray-500 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                  <MessageSquare size={48} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  Witaj w skrzynce odbiorczej
                </h2>
                <p className="text-sm text-gray-600 max-w-md mb-2">
                  Tutaj pojawiają się wszystkie Twoje wiadomości i powiadomienia systemowe.
                </p>
                <p className="text-sm text-gray-500">
                  Wybierz wiadomość, którą chcesz odczytać
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
