import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("avatar_url, display_name")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.display_name) setInitials(data.display_name.charAt(0).toUpperCase());
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const checkUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setHasUnreadNotifications((count || 0) > 0);
    };
    checkUnread();
    const interval = setInterval(checkUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (location.pathname === "/") return null;

  return (
    <header className="mx-4 sm:mx-6 px-4 sm:px-6 pt-4 pb-3 mt-4 bg-card/80 backdrop-blur-lg rounded-[1.5rem] shadow-[var(--shadow-card)] border border-border/50">
      <div className="flex items-center justify-between">
        {/* Logo: centered on mobile, left on desktop */}
        <div className="flex-1 flex justify-center md:justify-start">
          <Link to="/">
            <img src={logo} alt="Epokowo" className="h-7" />
          </Link>
        </div>

        {/* Desktop: bell + avatar */}
        {user && (
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/kontakt"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200 relative"
              aria-label="Wiadomości"
            >
              <Bell size={18} />
              {hasUnreadNotifications && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full ring-2 ring-card" />
              )}
            </Link>
            <Link to="/profil">
              <Avatar className="h-9 w-9 border-2 border-border hover:border-primary transition-colors">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="bg-secondary text-foreground text-sm font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
