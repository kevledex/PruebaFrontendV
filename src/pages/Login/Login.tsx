import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import { api, getApiErrorMessage } from "../../api/client";

function Login() {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  async function iniciarSesion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!usuario.trim() || !contrasena.trim()) {
      setError("Ingrese el usuario y la contraseña.");
      return;
    }

    try {
      setError("");
      const sesion = await api.post<{ usuario: string; rolNombre: string; permisos: string[] }>(
        "/auth/login",
        { usuario: usuario.trim(), password: contrasena },
      );
      localStorage.setItem("usuarioAutenticado", "true");
      localStorage.setItem("nombreUsuario", sesion.usuario);
      localStorage.setItem("rolUsuario", sesion.rolNombre);
      localStorage.setItem("permisosUsuario", JSON.stringify(sesion.permisos));
      navigate("/home");
    } catch (error) {
      setError(getApiErrorMessage(error));
    }
  }

  return (
    <main className="login-page">
      <section className="login-container">
        <div className="login-information">
          <div className="institution-logo">
            <img src="../assets/logoescuela.png" />
          </div>

          <p className="login-subtitle">Sistema Académico</p>

          <h1>Escuela de Educación Básica</h1>

          <h2>República de Venezuela</h2>

          <p className="login-description">
            Plataforma para la gestión de notas, asistencia y consulta
            académica.
          </p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <i className="bi bi-person-circle"></i>

            <h3>Iniciar sesión</h3>

            <p>Ingrese sus credenciales para continuar</p>
          </div>

          <form onSubmit={iniciarSesion}>
            <div className="mb-3">
              <label htmlFor="usuario" className="form-label">
                Usuario
              </label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-person"></i>
                </span>

                <input
                  id="usuario"
                  type="text"
                  className="form-control"
                  placeholder="Ingrese su usuario"
                  value={usuario}
                  onChange={(event) => setUsuario(event.target.value)}
                />
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="contrasena" className="form-label">
                Contraseña
              </label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-lock"></i>
                </span>

                <input
                  id="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  className="form-control"
                  placeholder="Ingrese su contraseña"
                  value={contrasena}
                  onChange={(event) => setContrasena(event.target.value)}
                />

                <button
                  type="button"
                  className="input-group-text btn-mostrar-contrasena"
                  onClick={() => setMostrarContrasena((valor) => !valor)}
                  aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={mostrarContrasena}
                >
                  <i className={mostrarContrasena ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                </button>
              </div>
            </div>

            {error && <div className="alert alert-danger">{error}</div>}

            <button type="submit" className="btn login-button w-100">
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Ingresar
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;