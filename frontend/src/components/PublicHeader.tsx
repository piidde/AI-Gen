import { Link, NavLink } from "react-router-dom";
import Brand from "./Brand";
import "../styles/public-chrome.css";

export default function PublicHeader() {
  return <header className="public-chrome-header">
    <Brand />
    <nav className="public-chrome-nav" aria-label="Main navigation">
      <NavLink to="/models">Models &amp; pricing</NavLink>
      <NavLink to="/docs">Docs</NavLink>
      <NavLink to="/blog">Blog</NavLink>
      <NavLink to="/support">Support</NavLink>
    </nav>
    <div className="public-chrome-account">
      <Link to="/login">Sign in</Link>
      <Link className="button" to="/signup">
        <svg className="key-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" />
        </svg>
        Get API key for free
      </Link>
    </div>
  </header>;
}
