import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Lightbulb, Mail, Calendar, Settings, Shield } from "lucide-react";
import logo from "@/assets/logo.png";

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Nauka", icon: <Lightbulb size={20} />, path: "/epoki" },
    { name: "Wiadomości", icon: <Mail size={20} />, path: "/wiadomosci" },
    { name: "Egzaminy", icon: <Calendar size={20} />, path: "/egzaminy" },
    { name: "Ustawienia", icon: <Settings size={20} />, path: "/ustawienia" },
    { name: "Panel admina", icon: <Shield size={20} />, path: "/admin" },
  ];

  if (location.pathname === "/") return null;

  return (
    <div className="w-[280px] bg-gray-100 p-6 flex flex-col rounded-2xl shadow-lg m-4">
      <div className="mb-10 flex items-center">
        <img src={logo} alt="Epokowo Logo" className="h-10 w-auto mr-3" />
        <h1 className="text-2xl font-bold">Kokpit</h1>
      </div>

      <nav className="flex-grow">
        <ul className="space-y-4">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.path}
                className={`flex items-center gap-4 p-4 rounded-xl text-lg font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-black text-white"
                    : "bg-white text-gray-800 hover:bg-gray-50"
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
