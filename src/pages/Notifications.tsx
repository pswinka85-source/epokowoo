import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Check, AlertTriangle, Info, Calendar, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { pl } from "date-fns/locale";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setNotifications((data as Notification[]) || []);
      setLoading(false);
    };
    loadNotifications();
  }, [user]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "warning":
      case "exam_cancelled":
        return <AlertTriangle size={18} className="text-amber-500" />;
      case "success":
        return <Check size={18} className="text-emerald-500" />;
      case "exam":
        return <Calendar size={18} className="text-primary" />;
      default:
        return <Info size={18} className="text-blue-500" />;
    }
  };

  if (authLoading || !user) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 md:pt-20 md:pb-14">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Bell size={28} className="text-primary" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground leading-[1.1] mb-4">
              Powiadomienia
            </h1>
            <p className="text-lg text-muted-foreground font-body leading-relaxed">
              {unreadCount > 0
                ? `Masz ${unreadCount} nieprzeczytanych powiadomień`
                : "Wszystkie powiadomienia przeczytane"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
          {unreadCount > 0 && (
            <div className="px-6 py-3 border-b border-border/60 bg-secondary/20 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {unreadCount} nieprzeczytanych
              </span>
              <button
                onClick={markAllAsRead}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Oznacz wszystkie jako przeczytane
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4">
                <Bell size={28} className="text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">
                Brak powiadomień
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`p-4 sm:p-6 transition-colors cursor-pointer ${
                    n.read
                      ? "bg-card"
                      : "bg-primary/5 hover:bg-primary/10"
                  }`}
                >
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            n.read ? "text-foreground" : "text-foreground"
                          }`}
                        >
                          {n.title}
                          {!n.read && (
                            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" />
                          )}
                        </h3>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {format(parseISO(n.created_at), "d MMM, HH:mm", {
                            locale: pl,
                          })}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {n.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
