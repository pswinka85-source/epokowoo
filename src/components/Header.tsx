import { Link, useLocation } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import logo from "@/assets/logo.png";

const Header = () => {
  const location = useLocation();
  const { user } = useAuth();
  const unreadCount = useUnreadMessages();

  // Hide header on auth page
  if (location.pathname === "/") return null;

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 pt-6 pb-2">
      <div className="max-w-6xl mx-auto relative">
        <div className="rounded-full bg-card shadow-sm px-6 h-14 flex items-center justify-between relative z-10">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Epokowo" className="h-7" />
          </Link>

          <div className="flex items-center gap-1">
            {user && (
              <Link
                to="/ustawienia"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-foreground hover:bg-secondary transition-all duration-200 relative"
                aria-label="Ustawienia"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
