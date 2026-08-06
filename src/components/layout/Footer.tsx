import "./Footer.css";

function Footer() {
  return (
    <footer className="system-footer">
      <p>
        © 2026 Escuela de Educación Básica República de Venezuela
      </p>

      <a
        className="facebook-link"
        href="https://www.facebook.com/p/EGB-Rep%C3%BAblica-de-Venezuela-61560183287780/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Visitar la página oficial de Facebook de la escuela"
        title="Facebook oficial"
      >
        <i className="bi bi-facebook" aria-hidden="true"></i>
      </a>
    </footer>
  );
}

export default Footer;
