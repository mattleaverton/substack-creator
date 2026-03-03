import type { PropsWithChildren } from "react";

interface CardProps extends PropsWithChildren {
  title?: string;
  className?: string;
}

export default function Card({
  title,
  className,
  children,
}: CardProps): JSX.Element {
  return (
    <section className={`card ${className ?? ""}`.trim()}>
      {title ? <h3 className="card-title">{title}</h3> : null}
      {children}
    </section>
  );
}
