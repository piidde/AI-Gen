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
      <Link className="button" to="/signup">Get started</Link>
    </div>
  </header>;
}
