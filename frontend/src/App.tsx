import { useEffect, useRef } from "react";
import { Route, Routes, useLocation, useParams } from "react-router-dom";
import RequireAuth from "./auth/RequireAuth";
import { applyRouteHead } from "./seo/head";
import { applyStructuredData } from "./seo/structuredData";
import { trackPageView } from "./seo/analytics";
import ConsentBanner from "./components/ConsentBanner";
import DashboardLayout from "./components/DashboardLayout";
import AuthCallback from "./pages/AuthCallback";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Models from "./pages/Models";
import Usage from "./pages/Usage";
import Billing from "./pages/Billing";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import Signup from "./pages/Signup";
import UpdatePassword from "./pages/UpdatePassword";
import Information, { topicSlugs } from "./pages/Information";

/**
 * Serves a content topic at its own path (/docs, /privacy, …). Any other
 * single-segment path is genuinely unknown and must still render not-found,
 * so this never turns arbitrary URLs into soft-404 content pages.
 */
function TopicRoute() {
  const { topic } = useParams();
  const known = topic !== undefined && topicSlugs.includes(topic);
  return <Information missing={!known} />;
}

function RouteEffects() {
  const location = useLocation();
  const previousRoute = useRef(location.pathname + location.search);
  useEffect(() => {
    const heading = document.querySelector("h1");
    // Metadata comes from the route registry so titles, descriptions,
    // canonicals and robots directives stay consistent across the app.
    applyRouteHead(location.pathname, heading?.textContent ?? undefined);
    applyStructuredData(location.pathname);
    trackPageView(location.pathname + location.search, document.title);
    const route = location.pathname + location.search;
    if (previousRoute.current !== route) {
      if (heading instanceof HTMLElement) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      window.scrollTo(0, 0);
    }
    previousRoute.current = route;
  }, [location.pathname, location.search]);
  return null;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/models" element={<Models publicPage />} />
        <Route path="/information" element={<Information />} />
        {/* Each content topic also resolves at its own crawlable URL, e.g.
            /docs and /privacy, so the topics can rank independently. */}
        <Route path="/:topic" element={<TopicRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Overview />} />
          <Route path="models" element={<Models />} />
          <Route path="usage" element={<Usage />} />
          <Route path="billing" element={<Billing />} />
          <Route path="api-keys" element={<ApiKeys />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Information missing />} />
      </Routes>
      <RouteEffects />
      <ConsentBanner />
    </>
  );
}
