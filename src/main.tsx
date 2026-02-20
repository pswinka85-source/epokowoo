import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Footer } from "./components/Footer"; // import stopki

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
    <Footer /> {/* stopka na dole */}
  </React.StrictMode>
);
createRoot(document.getElementById("root")!).render(<App />);
