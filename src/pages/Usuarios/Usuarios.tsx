import { useEffect, useMemo, useState, type FormEvent } from "react";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import { api, getApiErrorMessage } from "../../api/client";
import "./Usuarios.css";

type Rol = {
  id: number;
  nombre: string;
  estado: "Activo" | "Inactivo";
};

type Usuario = {
  id: number;
  usuario: string;
  estado: "Activo" | "Inactivo";
  rol: Rol;
};

const formularioInicial = {
  usuario: "",
  password: "",
  rolId: "",
  estado: "Activo" as "Activo" | "Inactivo",
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [editandoId, setEditandoId] = useState<number | null>(null);
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
      password: "",
      rolId: String(item.rol.id),
      estado: item.estado,
    });
    setMensaje("");
    setError("");
  }

  function cancelarEdicion() {
    setEditandoId(null);
    setFormulario(formularioInicial);
  }

  async function eliminarUsuario(item: Usuario) {
    if (!window.confirm(`¿Deseas eliminar el usuario "${item.usuario}"?`)) return;
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
              <span>
                {editandoId
                  ? "Nueva contraseña (opcional)"
                  : "Contraseña temporal"}
              </span>
              <input
                required={!editandoId}
                type="password"
                minLength={8}
                value={formulario.password}
                onChange={(e) =>
                  setFormulario((actual) => ({
                    ...actual,
                    password: e.target.value,
                  }))
                }
              />
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
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.usuario}</strong></td>
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
