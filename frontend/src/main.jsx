import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./PDV.css";
import "./Financeiro.css";
import "./Funcionarios.css";
import App from "./App.jsx";

// ✅ Sempre pedir login no Desktop (Electron), mesmo em dev (http://localhost:5173)
const isElectron = navigator.userAgent.includes("Electron");
if (isElectron) localStorage.removeItem("token");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);