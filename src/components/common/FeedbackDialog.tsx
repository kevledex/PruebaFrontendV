import { useEffect } from "react";
import "./FeedbackDialog.css";

interface FeedbackDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
  buttonLabel?: string;
}

function FeedbackDialog({
  open,
  title,
  message,
  onClose,
  buttonLabel = "Aceptar",
}: FeedbackDialogProps) {
  useEffect(() => {
    if (!open) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", cerrarConEscape);
    return () => document.removeEventListener("keydown", cerrarConEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="feedback-backdrop" onMouseDown={onClose}>
      <div
        className="feedback-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-dialog-title"
        aria-describedby="feedback-dialog-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="feedback-icon" aria-hidden="true">
          <i className="bi bi-check-lg"></i>
        </div>

        <p className="feedback-label">Proceso completado</p>
        <h2 id="feedback-dialog-title">{title}</h2>
        <p id="feedback-dialog-message">{message}</p>

        <button type="button" autoFocus onClick={onClose}>
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}

export default FeedbackDialog;
