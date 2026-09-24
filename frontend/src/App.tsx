import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { applyRouteHead } from "./seo/head";
import { applyStructuredData } from "./seo/structuredData";
import { trackPageView } from "./seo/analytics";
import ConsentBanner from "./components/ConsentBanner";
import Home from "./pages/Home";
import Models from "./pages/Models";
import ModelDetail from "./pages/ModelDetail";
import Information, { topicSlugs } from "./pages/Information";
import Support from "./pages/Support";
import Policy from "./pages/Policy";
import Status from "./pages/Status";
import Updates from "./pages/Updates";
import Blog from "./pages/Blog";
import BlogArticle from "./pages/BlogArticle";

/**
 * Serves a content topic at its own path (/docs, /privacy, …). Any other
 * single-segment path is genuinely unknown and must still render not-found,
 * so this never turns arbitrary URLs into soft-404 content pages.
 */
function TopicRoute() {
  const { topic } = useParams();
  const known = topic !== undefined && topicSlugs.includes(topic);
  if (topic === "support") return <Support />;
  if (topic === "status") return <Status />;
  if (topic === "contact" || topic === "privacy" || topic === "terms") return <Policy kind={topic} />;
  return <Information missing={!known} />;
}

function LegacyInformation() {
  const { search, hash } = useLocation();
  const topic = new URLSearchParams(search).get("topic");
  return topic && topicSlugs.includes(topic) ? <Navigate replace to={`/${topic}${hash}`} /> : <Information missing />;
}

function RouteEffects() {
  const location = useLocation();
  const contentRoute = location.pathname === "/information"
    ? `${location.pathname}?topic=${new URLSearchParams(location.search).get("topic") ?? ""}`
    : location.pathname;
  const previousRoute = useRef(contentRoute);
  useEffect(() => {
    if (!location.hash) return;
    // Resolve an actual ID; do not turn a user-controlled fragment into a selector.
    let id: string;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const section = document.getElementById(id);
    if (section) {
      section.scrollIntoView();
      section.focus({ preventScroll: true });
    }
  }, [location.pathname, location.hash]);
  useEffect(() => {
    const heading = document.querySelector("h1");
    // Metadata comes from the route registry so titles, descriptions,
    // canonicals and robots directives stay consistent across the app.
    applyRouteHead(location.pathname, heading?.textContent ?? undefined);
    applyStructuredData(location.pathname);
    trackPageView(location.pathname + location.search, document.title);
    // Filters change the current view, not the page: preserve input focus/scroll.
    const route = contentRoute;
    if (previousRoute.current !== route && !location.hash) {
      if (heading instanceof HTMLElement) {
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      window.scrollTo(0, 0);
    }
    previousRoute.current = route;
  }, [location.pathname, location.search, location.hash, contentRoute]);
  return null;
}

export default function App({ children }: { children?: ReactNode }) {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/models" element={<Models publicPage />} />
        <Route path="/models/:slug" element={<ModelDetail />} />
        <Route path="/information" element={<LegacyInformation />} />
        <Route path="/updates" element={<Updates />} />
        <Route path="/updates/:slug" element={<Updates />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
        {/* Each content topic also resolves at its own crawlable URL, e.g.
            /docs and /privacy, so the topics can rank independently. */}
        <Route path="/:topic" element={<TopicRoute />} />
        {children}
        <Route path="*" element={<Information missing />} />
      </Routes>
      <RouteEffects />
      <ConsentBanner />
    </>
  );
}
