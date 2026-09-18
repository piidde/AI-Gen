import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "./styles/tokens.css";
import "./styles/global.css";
import "./styles/auth.css";
import { AuthProvider } from "./auth/AuthProvider";
import { initAnalytics } from "./seo/analytics";
import App from "./App";

// Establish Consent Mode defaults before any tag can load, so pre-consent
// traffic is modelled rather than dropped. Loads nothing when no tag is set.
initAnalytics();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
