import { useEffect, useRef } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Overview from "./pages/Overview";
import Models from "./pages/Models";
import Usage from "./pages/Usage";
import Billing from "./pages/Billing";
import ApiKeys from "./pages/ApiKeys";
import Settings from "./pages/Settings";
import Information from "./pages/Information";

function RouteEffects() {
  const location = useLocation();
  const previousRoute = useRef(location.pathname + location.search);
  useEffect(() => {
    const heading = document.querySelector("h1");
    document.title =
      location.pathname === "/"
        ? "Takewing AI · Demo"
        : `${heading?.textContent ?? "Page"} · Takewing AI demo`;
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
        <Route path="/dashboard" element={<DashboardLayout />}>
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
    </>
  );
}
