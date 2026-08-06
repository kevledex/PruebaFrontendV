import { Link } from "react-router-dom";
import "./BackHomeButton.css";

interface BackHomeButtonProps {
  label?: string;
  className?: string;
}

function BackHomeButton({
  label = "Volver al inicio",
  className = "",
}: BackHomeButtonProps) {
  return (
    <Link
      to="/home"
      className={`back-home-link ${className}`.trim()}
    >
      <i className="bi bi-arrow-left" aria-hidden="true"></i>
      {label}
    </Link>
  );
}

export default BackHomeButton;
