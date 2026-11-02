import { Link } from "react-router-dom";
import Brand from "./Brand";
import "../styles/public-chrome.css";

export default function PublicFooter() {
  return <footer className="public-footer"><Brand /><nav aria-label="Footer navigation">
    <Link to="/docs">Documentation</Link><Link to="/blog">Blog</Link><Link to="/support">Support</Link>
    <Link to="/status">Service status</Link><Link to="/updates">Updates</Link>
    <Link to="/contact">Contact</Link><Link to="/terms">Terms</Link>
    <Link to="/privacy">Privacy</Link><Link to="/privacy#cookie-preferences">Cookie preferences</Link>
  </nav>
  {/* Model names are used descriptively; this states the relationship plainly. */}
  <p className="public-footer-note">AIAPI.deals is an independent service and is not affiliated with, endorsed by or sponsored by OpenAI, Google or any other model provider. Model and product names belong to their respective owners.</p>
  </footer>;
}
