import { Link } from "react-router-dom";

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="Takewing AI home">
      <svg viewBox="0 0 32 38" aria-hidden="true">
        <path d="M2 18 30 4v10L2 28Zm10 12 18-9v9l-18 8Z" fill="currentColor" />
      </svg>
      <span>
        Takewing <b>AI</b>
      </span>
    </Link>
  );
}
