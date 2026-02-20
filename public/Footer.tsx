import React from "react";
import "./Footer.css"; // jeśli chcesz mieć osobny plik CSS

export const Footer = () => {
  return (
    <footer className="site-footer">
      <div className="footer-content">
        <p>© 2026 Kurs Maturalny - Epokowo. Wszelkie prawa zastrzeżone.</p>
        <p>
          <a href="#">Polityka prywatności</a> | 
          <a href="#">Kontakt</a>
        </p>
      </div>
    </footer>
  );
};
