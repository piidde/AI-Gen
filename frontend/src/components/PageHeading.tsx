import type { ReactNode } from "react";

export default function PageHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
