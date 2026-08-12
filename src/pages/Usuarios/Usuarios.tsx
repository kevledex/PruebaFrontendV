import { useEffect, useMemo, useState, type FormEvent } from "react";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import { api, getApiErrorMessage } from "../../api/client";
import { useConfirm } from "../../context/ConfirmContext";
import "./Usuarios.css";

type Rol = {
  id: number;
  nombre: string;
  estado: "Activo" | "Inactivo";
};

type Usuario = {
  id: number;
  usuario: string;
  cedula: string | null;
  estado: "Activo" | "Inactivo";
  rol: Rol;
};

const formularioInicial = {
  usuario: "",
  cedula: "",
  password: "",
  rolId: "",
  estado: "Activo" as "Activo" | "Inactivo",
};

export default function Usuarios() {
  const confirm = useConfirm();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [passwordTocada, setPasswordTocada] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<Usuario[]>("/usuarios"),
      api.get<Rol[]>("/roles"),
    ])
      .then(([listaUsuarios, listaRoles]) => {
        setUsuarios(listaUsuarios);
        setRoles(listaRoles.filter((rol) => rol.estado === "Activo"));
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  const usuariosFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return usuarios.filter(
      (item) =>
        !termino ||
        `${item.usuario} ${item.rol?.nombre ?? ""}`
          .toLowerCase()
          .includes(termino),
    );
  }, [busqueda, usuarios]);

  async function guardarUsuario(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!editandoId && formulario.password.length < 8) {
      setError("La contraseña temporal debe tener al menos 8 caracteres.");
      return;
    }

    const payload = {
      usuario: formulario.usuario.trim(),
      cedula: formulario.cedula.trim(),
      password: formulario.password,
      estado: formulario.estado,
      rol: { id: Number(formulario.rolId) },
    };

    try {
      if (editandoId) {
        const actualizado = await api.put<Usuario>(
          `/usuarios/${editandoId}`,
          payload,
        );
        setUsuarios((lista) =>
          lista.map((item) => (item.id === editandoId ? actualizado : item)),
        );
        setMensaje("Usuario actualizado correctamente.");
      } else {
        const creado = await api.post<Usuario>("/usuarios", payload);
        setUsuarios((lista) => [...lista, creado]);
        setMensaje("Usuario creado correctamente.");
      }
      cancelarEdicion();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  function editarUsuario(item: Usuario) {
    setEditandoId(item.id);
    setFormulario({
      usuario: item.usuario,
      cedula: item.cedula ?? "",
      password: "",
      rolId: String(item.rol.id),
      estado: item.estado,
    });
    setPasswordTocada(false);
    setMensaje("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(formularioInicial);
    setPasswordTocada(false);
  }

  function actualizarCedula(valor: string) {
    const cedula = valor.replace(/\D/g, "").slice(0, 10);
    setFormulario((actual) => ({
      ...actual,
      cedula,
      password: !editandoId && !passwordTocada ? `Rpv${cedula}` : actual.password,
    }));
  }

  async function eliminarUsuario(item: Usuario) {
    const confirmado = await confirm(`¿Deseas eliminar el usuario "${item.usuario}"?`);
    if (!confirmado) return;
    try {
      await api.delete(`/usuarios/${item.id}`);
      setUsuarios((lista) => lista.filter((usuario) => usuario.id !== item.id));
      setMensaje("Usuario eliminado correctamente.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  return (
    <MainLayout>
      <div className="users-page">
        <header className="users-header">
          <div>
            <p>Administración</p>
            <h1>Gestión de usuarios</h1>
            <span>Crea cuentas y asigna los accesos definidos por cada rol.</span>
          </div>
          <BackHomeButton />
        </header>

        <Card as="section" className="users-card">
          <h2>{editandoId ? "Actualizar usuario" : "Crear usuario"}</h2>
          <form onSubmit={guardarUsuario} className="users-form">
            <label>
              <span>Nombre de usuario</span>
              <input
                required
                maxLength={50}
                value={formulario.usuario}
                onChange={(e) =>
                  setFormulario((actual) => ({
                    ...actual,
                    usuario: e.target.value,
                  }))
                }
              />
            </label>
            <label>
              <span>Cédula</span>
              <input
                required
                inputMode="numeric"
                maxLength={10}
                pattern="[0-9]{10}"
                placeholder="10 dígitos"
                value={formulario.cedula}
                onChange={(e) => actualizarCedula(e.target.value)}
              />
            </label>
            <label>
              <span>
                {editandoId
                  ? "Nueva contraseña (opcional)"
                  : "Contraseña temporal"}
              </span>
              <div className="users-password-field">
                <input
                  required={!editandoId}
                  type={mostrarContrasena ? "text" : "password"}
                  minLength={8}
                  value={formulario.password}
                  onChange={(e) => {
                    setPasswordTocada(true);
                    setFormulario((actual) => ({
                      ...actual,
                      password: e.target.value,
                    }));
                  }}
                />
                <button
                  type="button"
                  className="users-toggle-password"
                  onClick={() => setMostrarContrasena((valor) => !valor)}
                  aria-label={mostrarContrasena ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={mostrarContrasena}
                >
                  <i className={mostrarContrasena ? "bi bi-eye-slash" : "bi bi-eye"}></i>
                </button>
              </div>
              {!editandoId && (
                <small>Se autocompleta como "Rpv" + cédula; puedes cambiarla.</small>
              )}
            </label>
            <label>
              <span>Rol</span>
              <select
                required
                value={formulario.rolId}
                onChange={(e) =>
                  setFormulario((actual) => ({
                    ...actual,
                    rolId: e.target.value,
                  }))
                }
              >
                <option value="">Seleccione un rol</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Estado</span>
              <select
                value={formulario.estado}
                onChange={(e) =>
                  setFormulario((actual) => ({
                    ...actual,
                    estado: e.target.value as "Activo" | "Inactivo",
                  }))
                }
              >
                <option>Activo</option>
                <option>Inactivo</option>
              </select>
            </label>

            <div className="users-form-actions">
              {editandoId && (
                <button type="button" className="users-cancel" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="users-save">
                {editandoId ? "Guardar cambios" : "Crear usuario"}
              </button>
            </div>
          </form>
          {error && <p className="users-message users-message--error">{error}</p>}
          {mensaje && <p className="users-message">{mensaje}</p>}
        </Card>

        <Card as="section" className="users-card">
          <div className="users-list-header">
            <h2>Usuarios registrados</h2>
            <input
              type="search"
              placeholder="Buscar usuario o rol"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Cédula</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.usuario}</strong></td>
                    <td>{item.cedula ?? "—"}</td>
                    <td><span className="users-role">{item.rol?.nombre}</span></td>
                    <td>{item.estado}</td>
                    <td>
                      <div className="users-actions">
                        <button type="button" onClick={() => editarUsuario(item)} title="Editar">
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button type="button" onClick={() => eliminarUsuario(item)} title="Eliminar">
                          <i className="bi bi-trash3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
