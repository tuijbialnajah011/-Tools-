import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";

// Register Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("New update available! Reload to update?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("App is ready to work offline.");
  },
});
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

console.log("%c𝙱𝙹𝙴 ~ Tools", "color: #6366f1; font-weight: bold; font-size: 1.2rem;");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
