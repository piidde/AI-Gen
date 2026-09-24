import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/auth.css";
import "./styles/help.css";
import { initAnalytics, initFunnelMeasurement } from "./seo/analytics";
import App from "./BrowserApp";

// Establish denied defaults before any analytics tag can load. No optional
// measurement is sent before consent; advertising stays disabled.
initAnalytics();
initFunnelMeasurement();

const tree = (
  <StrictMode>
    {/* URL-backed controlled inputs need synchronous router state updates. */}
    <BrowserRouter useTransitions={false}>
      <App />
    </BrowserRouter>
  </StrictMode>
);

const root = document.getElementById("root")!;
if (root.dataset.prerendered === "true") hydrateRoot(root, tree);
else createRoot(root).render(tree);
