import type { ElementType, ReactNode } from "react";
import "./Card.css";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
}

function Card({
  children,
  className = "",
  as: Component = "div",
}: CardProps) {
  return (
    <Component className={`app-card ${className}`.trim()}>
      {children}
    </Component>
  );
}

export default Card;
