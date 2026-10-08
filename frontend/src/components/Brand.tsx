import { Link } from "react-router-dom";

// Same geometry as assets/brand/aiapi-mark.svg (and public/favicon.svg); inlined
// so the header needs no extra request.
function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#FFDD33" />
      <g transform="rotate(-18 32 32) translate(32 32) scale(1.14) translate(-32 -32)">
        <path
          d="M9 32 21.5 18H50a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H21.5Z"
          fill="#111111"
          stroke="#111111"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="20.5" cy="32" r="2.9" fill="#FFDD33" />
        <circle cx="33" cy="26.5" r="3.3" fill="#FFDD33" />
        <circle cx="45" cy="37.5" r="3.3" fill="#FFDD33" />
        <path d="M46 24.5 32 39.5" stroke="#FFDD33" strokeWidth="3.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="AIAPI.deals home">
      <BrandMark />
      <span>AIAPI</span>
      <b>.deals</b>
    </Link>
  );
}
