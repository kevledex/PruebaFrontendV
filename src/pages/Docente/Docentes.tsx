import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";

import "./Docentes.css";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import BuscadorSelector from "../../components/common/BuscadorSelector";
import type { RolSistema } from "../../utils/rolesStorage";
import { api, getApiErrorMessage } from "../../api/client";

interface Docente {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string;
  especialidad: string;
  titulo: string;
  telefono: string;
  correo: string;
  rolId: number | null;
  usuario: { id: number; usuario: string; cedula: string | null } | null;
}

interface UsuarioVinculable {
  id: number;
  usuario: string;
  cedula: string | null;
}

const formularioInicial = {
  cedula: "",
  usuarioId: null as number | null,
  nombres: "",
  apellidos: "",
  fechaNacimiento: "",
  especialidad: "",
  titulo: "",
  telefono: "",
  correo: "",
  rolId: "",
};

function Docentes() {
  const [parametros] = useSearchParams();
  const autenticado =
    localStorage.getItem("usuarioAutenticado") === "true";

  const [docentes, setDocentes] =
    useState<Docente[]>([]);

  const [formulario, setFormulario] =
    useState(() => ({ ...formularioInicial, rolId: parametros.get("rol") ?? "" }));

  const [busqueda, setBusqueda] = useState("");

  const [mensaje, setMensaje] = useState("");

  const [paginaActual, setPaginaActual] = useState(1);

  const [editandoId, setEditandoId] =
    useState<number | null>(null);

  const docentesPorPagina = 10;
  const [rolesActivos, setRolesActivos] = useState<RolSistema[]>([]);
  const [usuariosDocente, setUsuariosDocente] = useState<UsuarioVinculable[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<any[]>("/docentes"),
      api.get<RolSistema[]>("/roles"),
      api.get<UsuarioVinculable[]>("/usuarios?rol=Docente"),
    ])
      .then(([lista, roles, usuarios]) => {
        setDocentes(lista.map((docente) => ({ ...docente, rolId: docente.rol?.id ?? null })));
        setRolesActivos(roles.filter((rol) => rol.estado === "Activo"));
        setUsuariosDocente(usuarios);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  const opcionesUsuarios = useMemo(() => {
    const vinculados = new Set(
      docentes
        .filter((docente) => docente.id !== editandoId && docente.usuario)
        .map((docente) => docente.usuario!.id),
    );
    return usuariosDocente
      .filter((usuario) => !vinculados.has(usuario.id))
      .map((usuario) => ({
        id: usuario.id,
        titulo: usuario.usuario,
        subtitulo: usuario.cedula ? `C.I. ${usuario.cedula}` : "Sin cédula registrada",
      }));
  }, [usuariosDocente, docentes, editandoId]);

  function seleccionarUsuarioDocente(usuarioId: number | null) {
    const usuario = usuariosDocente.find((item) => item.id === usuarioId) ?? null;
    setFormulario((actual) => ({
      ...actual,
      usuarioId: usuario?.id ?? null,
      cedula: usuario?.cedula ?? "",
    }));
    setMensaje("");
  }

  const docentesFiltrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();

    return docentes.filter(
      (docente) =>
        !termino ||
        `${docente.cedula} ${docente.nombres} ${docente.apellidos} ${docente.especialidad}`
          .toLowerCase()
          .includes(termino)
    );
  }, [busqueda, docentes]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(docentesFiltrados.length / docentesPorPagina)
  );

  const paginaVisible = Math.min(
    paginaActual,
    totalPaginas
  );

  const inicioPagina =
    (paginaVisible - 1) * docentesPorPagina;

  const docentesPaginados =
    docentesFiltrados.slice(
      inicioPagina,
      inicioPagina + docentesPorPagina
    );

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }
  // ===========================================
// ACTUALIZAR CAMPOS DEL FORMULARIO
// ===========================================
function actualizarCampo(
  campo: keyof typeof formulario,
  valor: string
) {
  setFormulario((actual) => ({
    ...actual,
    [campo]: valor,
  }));
  setMensaje("");
}


async function registrarDocente(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();

  if (!formulario.usuarioId) {
    setMensaje("Selecciona el usuario del docente buscándolo por cédula.");
    return;
  }

  const datosDocente = {
    ...formulario,
    cedula: formulario.cedula.trim(),
    nombres: formulario.nombres.trim(),
    apellidos: formulario.apellidos.trim(),
    especialidad: formulario.especialidad.trim(),
    titulo: formulario.titulo.trim(),
    telefono: formulario.telefono.trim(),
    correo: formulario.correo.trim(),
    rolId: formulario.rolId ? Number(formulario.rolId) : null,
  };

  try {
    const payload = {
      ...datosDocente,
      rol: { id: datosDocente.rolId },
      usuario: { id: datosDocente.usuarioId },
    };
    if (editandoId !== null) {
      const guardado = await api.put<any>(`/docentes/${editandoId}`, payload);
      setDocentes((actuales) => actuales.map((docente) => docente.id === editandoId ? { ...guardado, rolId: guardado.rol?.id ?? null } : docente));
    } else {
      const guardado = await api.post<any>("/docentes", payload);
      setDocentes((actuales) => [...actuales, { ...guardado, rolId: guardado.rol?.id ?? null }]);
    }
  } catch (error) { setMensaje(getApiErrorMessage(error)); return; }

  setFormulario(formularioInicial);
  setEditandoId(null);

  setMensaje(
    editandoId === null
      ? "Docente registrado correctamente."
      : "Información actualizada correctamente."
  );
}


function editarDocente(docente: Docente) {
  setFormulario({
    cedula: docente.cedula,
    usuarioId: docente.usuario?.id ?? null,
    nombres: docente.nombres,
    apellidos: docente.apellidos,
    fechaNacimiento: docente.fechaNacimiento,
    especialidad: docente.especialidad,
    titulo: docente.titulo,
    telefono: docente.telefono,
    correo: docente.correo,
    rolId: docente.rolId ? String(docente.rolId) : "",
  });

  setEditandoId(docente.id);
  setMensaje("");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}


async function eliminarDocente(docente: Docente) {
  if (
    window.confirm(
      `¿Deseas eliminar a ${docente.nombres} ${docente.apellidos}?`
    )
  ) {
    try {
      await api.delete(`/docentes/${docente.id}`);
      setDocentes((actuales) => actuales.filter((item) => item.id !== docente.id));
      setMensaje("Docente eliminado correctamente.");
    } catch (error) { setMensaje(getApiErrorMessage(error)); }
  }
}


return (
  <MainLayout>
    <div className="students-page">

      <header className="students-header">
        <div>
          <p className="students-label">Gestión de docentes</p>
          <h1>Registro de docentes</h1>
          <p>Administra la información del personal docente.</p>
        </div>

        <BackHomeButton/>
      </header>

      <Card as="section" className="students-form-card">

        <div className="students-card-title">
          <span>
            <i className="bi bi-person-badge-fill"></i>
          </span>

          <div>
            <p>{editandoId === null ? "Nuevo docente" : "Edición"}</p>

            <h2>
              {editandoId === null
                ? "Datos del docente"
                : "Actualizar docente"}
            </h2>
          </div>
        </div>

        <form onSubmit={registrarDocente}>

          <div className="students-form-grid">

            <label style={{ gridColumn: "1 / -1" }}>
              <span>Usuario del docente (buscar por cédula) *</span>
              <BuscadorSelector
                opciones={opcionesUsuarios}
                seleccionId={formulario.usuarioId}
                onSeleccionar={seleccionarUsuarioDocente}
                placeholder="Buscar por cédula o nombre de usuario"
                mensajeVacio="No se encontraron usuarios con rol Docente disponibles."
                requerido
              />
              <small>
                ¿Aún no existe el usuario de este docente? Créalo primero en{" "}
                <Link to="/usuarios">Gestión de usuarios</Link>.
              </small>
            </label>

            <label>
              <span>Cédula</span>

              <input
                required
                readOnly
                placeholder="Se completa al elegir el usuario"
                value={formulario.cedula}
              />
            </label>

            <label>
              <span>Nombres</span>

              <input
                required
                maxLength={60}
                placeholder="Ingrese los nombres"
                value={formulario.nombres}
                onChange={(e) =>
                  actualizarCampo("nombres", e.target.value)
                }
              />
            </label>

            <label>
              <span>Apellidos</span>

              <input
                required
                maxLength={60}
                placeholder="Ingrese los apellidos"
                value={formulario.apellidos}
                onChange={(e) =>
                  actualizarCampo("apellidos", e.target.value)
                }
              />
            </label>

            <label>
              <span>Fecha de nacimiento</span>

              <input
                required
                type="date"
                value={formulario.fechaNacimiento}
                onChange={(e) =>
                  actualizarCampo("fechaNacimiento", e.target.value)
                }
              />
            </label>

            <label>
              <span>Especialidad</span>

              <input
                required
                placeholder="Ej. Matemáticas"
                value={formulario.especialidad}
                onChange={(e) =>
                  actualizarCampo("especialidad", e.target.value)
                }
              />
            </label>

            <label>
              <span>Título profesional</span>

              <input
                required
                placeholder="Licenciado en Educación"
                value={formulario.titulo}
                onChange={(e) =>
                  actualizarCampo("titulo", e.target.value)
                }
              />
            </label>

            <label>
              <span>Teléfono</span>

              <input
                required
                inputMode="tel"
                maxLength={10}
                pattern="[0-9]{10}"
                placeholder="0999999999"
                value={formulario.telefono}
                onChange={(e) =>
                  actualizarCampo("telefono", e.target.value)
                }
              />
            </label>

            <label>
              <span>Rol asignado</span>
              <select required value={formulario.rolId} onChange={(e) => actualizarCampo("rolId", e.target.value)}>
                <option value="">Seleccione un rol</option>
                {rolesActivos.map((rol) => <option key={rol.id} value={rol.id}>{rol.nombre}</option>)}
              </select>
            </label>

            <label>
              <span>Correo electrónico</span>

              <input
                required
                type="email"
                placeholder="docente@escuela.edu.ec"
                value={formulario.correo}
                onChange={(e) =>
                  actualizarCampo("correo", e.target.value)
                }
              />
            </label>

          </div>

          <div className="students-form-actions">

            {mensaje && (
              <p
                className={
                  mensaje.startsWith("Ya")
                    ? "students-message students-message--error"
                    : "students-message"
                }
              >
                {mensaje}
              </p>
            )}

            <button
              type="submit"
              className="students-save-button"
            >
              <i className="bi bi-check-lg"></i>

              {editandoId === null
                ? "Registrar docente"
                : "Guardar cambios"}
            </button>

          </div>

        </form>

      </Card>
            <Card as="section" className="students-list-card">

        <div className="students-list-header">

          <div>
            <p className="students-label">Registros</p>
            <h2>Docentes registrados</h2>
          </div>

          <label className="students-search">
            <i className="bi bi-search"></i>

            <input
              type="search"
              placeholder="Buscar por nombre, cédula o especialidad"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </label>

        </div>

        <div className="students-filters">

          <p>
            Mostrando <strong>{docentesFiltrados.length}</strong> de{" "}
            <strong>{docentes.length}</strong> docentes
          </p>

        </div>

        <div className="students-table-wrapper">

          <table className="students-table">

            <thead>
              <tr>
                <th>Docente</th>
                <th>Cédula</th>
                <th>Especialidad</th>
                <th>Título</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>

              {docentesPaginados.map((docente) => (

                <tr key={docente.id}>

                  <td>
                    <div className="students-person">
                      <span>{docente.nombres.charAt(0)}</span>

                      <strong>
                        {docente.nombres} {docente.apellidos}
                      </strong>
                    </div>
                  </td>

                  <td>{docente.cedula}</td>

                  <td>{docente.especialidad}</td>

                  <td>{docente.titulo}</td>

                  <td>{docente.telefono}</td>

                  <td>{docente.correo}</td>

                  <td><span className="students-role-badge">{rolesActivos.find((rol) => rol.id === docente.rolId)?.nombre ?? "Sin rol"}</span></td>

                  <td>

                    <div className="students-actions">

                      <button
                        type="button"
                        className="students-action-button students-action-button--edit"
                        onClick={() => editarDocente(docente)}
                        title="Editar"
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>

                      <button
                        type="button"
                        className="students-action-button students-action-button--delete"
                        onClick={() => eliminarDocente(docente)}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash3"></i>
                      </button>

                    </div>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

          {docentesFiltrados.length === 0 && (

            <div className="students-empty">

              <i className="bi bi-search"></i>

              <p>No existen docentes registrados.</p>

            </div>

          )}

        </div>

        {docentesFiltrados.length > 0 && (

          <div className="students-pagination">

            <button
              type="button"
              disabled={paginaVisible === 1}
              onClick={() =>
                setPaginaActual((pagina) => pagina - 1)
              }
            >
              <i className="bi bi-chevron-left"></i>
              Anterior
            </button>

            <div>

              {Array.from(
                { length: totalPaginas },
                (_, indice) => indice + 1
              ).map((pagina) => (

                <button
                  key={pagina}
                  type="button"
                  className={
                    pagina === paginaVisible
                      ? "students-page-button--active"
                      : ""
                  }
                  onClick={() => setPaginaActual(pagina)}
                >
                  {pagina}
                </button>

              ))}

            </div>

            <button
              type="button"
              disabled={paginaVisible === totalPaginas}
              onClick={() =>
                setPaginaActual((pagina) => pagina + 1)
              }
            >
              Siguiente
              <i className="bi bi-chevron-right"></i>
            </button>

          </div>

        )}

      </Card>
    </div>
  </MainLayout>
);

}

export default Docentes;
