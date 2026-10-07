import { Link } from "react-router-dom";

export default function Brand() {
  return (
    <Link className="brand" to="/" aria-label="AIAPI.deals home">
      <span>AIAPI</span>
      <b>.deals</b>
    </Link>
  );
}
