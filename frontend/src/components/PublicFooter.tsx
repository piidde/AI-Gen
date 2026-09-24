import { Link } from "react-router-dom";
import Brand from "./Brand";
import "../styles/public-chrome.css";

export default function PublicFooter() {
  return <footer className="public-footer"><Brand /><nav aria-label="Footer navigation">
    <Link to="/docs">Documentation</Link><Link to="/blog">Blog</Link><Link to="/support">Support</Link>
    <Link to="/status">Service status</Link><Link to="/updates">Updates</Link>
    <Link to="/contact">Contact</Link><Link to="/terms">Terms</Link>
    <Link to="/privacy">Privacy</Link><Link to="/privacy#cookie-preferences">Cookie preferences</Link>
  </nav></footer>;
}
