import { Link, useSearchParams } from "react-router-dom";
import Brand from "../components/Brand";

const topics: Record<string, { title: string; description: string }> = {
  docs: {
    title: "Documentation is being prepared",
    description:
      "Quickstart examples and API reference will follow the verified API contract. No provisional endpoint or request schema is presented as working documentation.",
  },
  support: {
    title: "Support information is being prepared",
    description:
      "A verified support channel has not been configured for this demo.",
  },
  status: {
    title: "Service status is not connected",
    description:
      "This demo does not monitor a live service or report operational availability.",
  },
  contact: {
    title: "Contact information is being prepared",
    description: "Verified contact information will be added before launch.",
  },
  privacy: {
    title: "Privacy information is being prepared",
    description:
      "The final privacy notice depends on the confirmed service and data-handling arrangements.",
  },
  terms: {
    title: "Terms are being prepared",
    description:
      "Commercial terms have not been published. This local demo does not offer a paid service.",
  },
  signin: {
    title: "Sign-in is not connected",
    description:
      "Authentication is still being coordinated. You can explore the dashboard with fictional sample data.",
  },
};
export default function Information({
  missing = false,
}: {
  missing?: boolean;
}) {
  const [params] = useSearchParams();
  const topicKey = params.get("topic") ?? "";
  const topic = Object.hasOwn(topics, topicKey) ? topics[topicKey] : undefined;
  return (
    <main id="main-content" className="information">
      <Brand />
      <h1 tabIndex={-1}>
        {missing || !topic ? "Page not found" : topic.title}
      </h1>
      <p>
        {missing || !topic
          ? "This address is not part of the Takewing AI demo."
          : topic.description}
      </p>
      <div className="actions">
        <Link className="button" to="/">
          Back to home
        </Link>
        <Link className="text-link" to="/dashboard">
          Explore dashboard demo ↗
        </Link>
      </div>
    </main>
  );
}
