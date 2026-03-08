import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const { user } = useAuth();
  const unreadCount = useUnreadMessages();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initials, setInitials] = useState("U");

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

  if (location.pathname === "/") return null;

  return (
    <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Mobile: centered logo */}
        <div className="md:hidden flex-1 flex justify-center">
          <Link to="/">
            <img src={logo} alt="Epokowo" className="h-7" />
          </Link>
        </div>

        {/* Desktop: bell + avatar only (logo is in sidebar) */}
        {user && (
          <div className="hidden md:flex items-center gap-2 ml-auto">
            <Link
              to="/kontakt"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200 relative"
              aria-label="Wiadomości"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
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
