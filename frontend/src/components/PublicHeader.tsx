import { Link } from "react-router-dom";
import Brand from "./Brand";
import "../styles/public-chrome.css";

export default function PublicHeader() {
  return <header className="public-chrome-header">
    <Brand />
    <nav className="public-chrome-nav" aria-label="Main navigation">
      <Link to="/models">Models &amp; pricing</Link>
      <Link to="/docs">Docs</Link>
      <Link to="/blog">Blog</Link>
      <Link to="/support">Support</Link>
    </nav>
    <div className="public-chrome-account">
      <Link to="/login">Sign in</Link>
      <Link className="button" to="/signup">Get started</Link>
    </div>
  </header>;
}
