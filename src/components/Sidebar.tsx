import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Nauka", icon: "💡", path: "/epoki" },
    { name: "Wiadomości", icon: "📧", path: "/kontakt" },
    { name: "Egzaminy", icon: "📅", path: "/egzaminy" },
    { name: "Ustawienia", icon: "⚙️", path: "/ustawienia" },
    { name: "Panel admina", icon: "🛡️", path: "/admin" },
  ];

  if (location.pathname === "/") return null;

  return (
    <div className="mx-8 mb-4">
      <div className="pt-12 md:pt-20">
        <div className="w-[300px] bg-white p-4 flex flex-col rounded-3xl shadow-lg mx-auto">
          <nav className="flex-grow">
            <ul className="space-y-3">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-4 p-2 rounded-2xl text-lg font-bold transition-colors ${
                      location.pathname === item.path
                        ? "bg-black text-white font-bold"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    <span className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      location.pathname === item.path
                        ? "bg-white text-black font-bold"
                        : "bg-white"
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
