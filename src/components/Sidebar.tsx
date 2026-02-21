import React from "react";
import { Link, useLocation } from "react-router-dom";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Nauka", icon: "💡", path: "/epoki" },
    { name: "Wiadomości", icon: "📧", path: "/wiadomosci" },
    { name: "Egzaminy", icon: "📅", path: "/egzaminy" },
    { name: "Ustawienia", icon: "⚙️", path: "/ustawienia" },
    { name: "Panel admina", icon: "🛡️", path: "/admin" },
  ];

  if (location.pathname === "/") return null;

  return (
    <div className="mx-4 mb-4">
      <div className="mb-4 mt-4 md:mt-12">
        <h1 className="text-3xl md:text-4xl text-center leading-[1.1]">Kokpit</h1>
      </div>
      <div className="w-[280px] bg-white p-4 flex flex-col rounded-2xl shadow-lg">
        <nav className="flex-grow">
          <ul className="space-y-3">
            {navItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.path}
                  className={`flex items-center gap-4 p-3 rounded-xl text-lg font-medium transition-colors ${
                    location.pathname === item.path
                      ? "bg-gray-200 text-gray-900"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  <span className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg">
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
  );
};

export default Sidebar;
