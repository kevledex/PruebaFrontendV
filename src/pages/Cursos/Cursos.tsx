import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import "./Cursos.css";
import { api, getApiErrorMessage } from "../../api/client";
import { useConfirm } from "../../context/ConfirmContext";

interface AnioLectivo {
  id: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

interface DocenteResumen {
  id: number;
  nombres: string;
  apellidos: string;
}

interface Curso {
  id: number;
  nivel: string;
  grado: string;
  paralelo: string;
  sostenimiento: string;
  tipoOrganizacion: string;
  anioLectivo: AnioLectivo;
  tutor: DocenteResumen | null;
}

interface PeriodoAcademico {
  id: number;
  numero: number;
  fechaInicio: string;
  fechaFin: string;
  cerrado: boolean;
}

const SOSTENIMIENTO_INSTITUCION = "FISCOMISIONAL";
const niveles = ["INICIAL", "PREPARATORIA", "ELEMENTAL", "MEDIA"];
const organizaciones = ["TRIMESTRAL", "QUIMESTRAL", "BIMESTRAL", "CUATRIMESTRAL"];

const formularioAnioInicial = { nombre: "", fechaInicio: "", fechaFin: "" };

const formularioCursoInicial = {
  nivel: "ELEMENTAL",
  grado: "",
  paralelo: "",
  tutorId: "",
  tipoOrganizacion: "TRIMESTRAL",
  anioLectivoId: "",
};

function Cursos() {
  const autenticado = localStorage.getItem("usuarioAutenticado") === "true";
  const confirm = useConfirm();

  const [aniosLectivos, setAniosLectivos] = useState<AnioLectivo[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [docentes, setDocentes] = useState<DocenteResumen[]>([]);
  const [formularioAnio, setFormularioAnio] = useState(formularioAnioInicial);
  const [formularioCurso, setFormularioCurso] = useState(formularioCursoInicial);
  const [editandoCursoId, setEditandoCursoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [cursoExpandidoId, setCursoExpandidoId] = useState<number | null>(null);
  const [periodosPorCurso, setPeriodosPorCurso] = useState<Record<number, PeriodoAcademico[]>>({});
  const [cargandoPeriodos, setCargandoPeriodos] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<AnioLectivo[]>("/anios-lectivos"),
      api.get<Curso[]>("/cursos"),
      api.get<DocenteResumen[]>("/docentes"),
    ])
      .then(([anios, listaCursos, listaDocentes]) => {
        setAniosLectivos(anios);
        setCursos(listaCursos);
        setDocentes(listaDocentes);
        const activo = anios.find((anio) => anio.activo) ?? anios[0];
        if (activo) {
          setFormularioCurso((actual) => ({ ...actual, anioLectivoId: String(activo.id) }));
        }
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  const aniosOrdenados = useMemo(
    () => [...aniosLectivos].sort((a, b) => b.nombre.localeCompare(a.nombre)),
    [aniosLectivos],
  );

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  function actualizarCampoAnio(campo: keyof typeof formularioAnioInicial, valor: string) {
    setFormularioAnio((actual) => ({ ...actual, [campo]: valor }));
    setMensaje("");
  }

  function actualizarCampoCurso(campo: keyof typeof formularioCursoInicial, valor: string) {
    setFormularioCurso((actual) => ({ ...actual, [campo]: valor }));
    setMensaje("");
  }

  async function registrarAnio(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const creado = await api.post<AnioLectivo>("/anios-lectivos", formularioAnio);
      setAniosLectivos((actuales) => [...actuales, creado]);
      setFormularioAnio(formularioAnioInicial);
      setMensaje("Año lectivo registrado correctamente.");
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    }
  }

  async function activarAnio(anio: AnioLectivo) {
    try {
      await api.patch(`/anios-lectivos/${anio.id}/activar`);
      setAniosLectivos((actuales) =>
        actuales.map((item) => ({ ...item, activo: item.id === anio.id })),
      );
      setMensaje(`"${anio.nombre}" es ahora el año lectivo activo.`);
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    }
  }

  async function eliminarAnio(anio: AnioLectivo) {
    const confirmado = await confirm(`¿Deseas eliminar el año lectivo "${anio.nombre}"?`);
    if (!confirmado) return;

    try {
      await api.delete(`/anios-lectivos/${anio.id}`);
      setAniosLectivos((actuales) => actuales.filter((item) => item.id !== anio.id));
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    }
  }

  async function registrarCurso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!formularioCurso.anioLectivoId) {
      setMensaje("Selecciona un año lectivo.");
      return;
    }

    const payload = {
      nivel: formularioCurso.nivel,
      grado: formularioCurso.grado.trim(),
      paralelo: formularioCurso.paralelo.trim().toUpperCase(),
      sostenimiento: SOSTENIMIENTO_INSTITUCION,
      tipoOrganizacion: formularioCurso.tipoOrganizacion,
      anioLectivo: { id: Number(formularioCurso.anioLectivoId) },
      tutor: formularioCurso.tutorId ? { id: Number(formularioCurso.tutorId) } : null,
    };

    try {
      if (editandoCursoId !== null) {
        const guardado = await api.put<Curso>(`/cursos/${editandoCursoId}`, payload);
        setCursos((actuales) =>
          actuales.map((curso) => (curso.id === editandoCursoId ? guardado : curso)),
        );
        setMensaje("Curso actualizado correctamente.");
      } else {
        const guardado = await api.post<Curso>("/cursos", payload);
        setCursos((actuales) => [...actuales, guardado]);
        setMensaje("Curso registrado correctamente.");
      }
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
      return;
    }

    setFormularioCurso((actual) => ({ ...formularioCursoInicial, anioLectivoId: actual.anioLectivoId }));
    setEditandoCursoId(null);
  }

  function editarCurso(curso: Curso) {
    setFormularioCurso({
      nivel: curso.nivel,
      grado: curso.grado,
      paralelo: curso.paralelo,
      tutorId: curso.tutor ? String(curso.tutor.id) : "",
      tipoOrganizacion: curso.tipoOrganizacion,
      anioLectivoId: String(curso.anioLectivo.id),
    });
    setEditandoCursoId(curso.id);
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function alternarPeriodos(curso: Curso) {
    if (cursoExpandidoId === curso.id) {
      setCursoExpandidoId(null);
      return;
    }
    setCursoExpandidoId(curso.id);
    if (periodosPorCurso[curso.id]) return;

    setCargandoPeriodos(true);
    try {
      const periodos = await api.get<PeriodoAcademico[]>(`/cursos/${curso.id}/periodos`);
      setPeriodosPorCurso((actuales) => ({ ...actuales, [curso.id]: periodos }));
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    } finally {
      setCargandoPeriodos(false);
    }
  }

  async function alternarEstadoPeriodo(curso: Curso, periodo: PeriodoAcademico) {
    const accion = periodo.cerrado ? "abrir" : "cerrar";
    try {
      const actualizado = await api.put<PeriodoAcademico>(
        `/cursos/${curso.id}/periodos/${periodo.id}/${accion}`,
        {},
      );
      setPeriodosPorCurso((actuales) => ({
        ...actuales,
        [curso.id]: (actuales[curso.id] ?? []).map((item) =>
          item.id === periodo.id ? actualizado : item,
        ),
      }));
      setMensaje(
        actualizado.cerrado
          ? `Trimestre ${periodo.numero} cerrado.`
          : `Trimestre ${periodo.numero} reabierto.`,
      );
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    }
  }

  async function eliminarCurso(curso: Curso) {
    const confirmado = await confirm(`¿Deseas eliminar el curso ${curso.grado} "${curso.paralelo}"?`);
    if (!confirmado) return;

    try {
      await api.delete(`/cursos/${curso.id}`);
      setCursos((actuales) => actuales.filter((item) => item.id !== curso.id));
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    }
  }

  return (
    <MainLayout>
      <div className="students-page">
        <header className="students-header">
          <div>
            <p className="students-label">Estructura académica</p>
            <h1>Años lectivos y cursos</h1>
            <p>
              Configura el año lectivo activo y los cursos disponibles antes
              de matricular estudiantes.
            </p>
          </div>
          <BackHomeButton />
        </header>

        {mensaje && <p className="students-message">{mensaje}</p>}

        <Card as="section" className="students-form-card">
          <div className="students-card-title">
            <span><i className="bi bi-calendar-range-fill"></i></span>
            <div>
              <p>Configuración</p>
              <h2>Nuevo año lectivo</h2>
            </div>
          </div>

          <form onSubmit={registrarAnio}>
            <div className="students-form-grid">
              <label>
                <span>Nombre</span>
                <input
                  required
                  placeholder="2024-2025"
                  value={formularioAnio.nombre}
                  onChange={(event) => actualizarCampoAnio("nombre", event.target.value)}
                />
              </label>

              <label>
                <span>Fecha de inicio</span>
                <input
                  required
                  type="date"
                  value={formularioAnio.fechaInicio}
                  onChange={(event) => actualizarCampoAnio("fechaInicio", event.target.value)}
                />
              </label>

              <label>
                <span>Fecha de fin</span>
                <input
                  required
                  type="date"
                  value={formularioAnio.fechaFin}
                  onChange={(event) => actualizarCampoAnio("fechaFin", event.target.value)}
                />
              </label>
            </div>

            <div className="students-form-actions">
              <button type="submit" className="students-save-button">
                <i className="bi bi-check-lg"></i>
                Registrar año lectivo
              </button>
            </div>
          </form>
        </Card>

        <Card as="section" className="students-list-card">
          <div className="students-list-header">
            <div>
              <p className="students-label">Registros</p>
              <h2>Años lectivos registrados</h2>
            </div>
          </div>

          <div className="students-table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {aniosOrdenados.map((anio) => (
                  <tr key={anio.id}>
                    <td>{anio.nombre}</td>
                    <td>{anio.fechaInicio}</td>
                    <td>{anio.fechaFin}</td>
                    <td>
                      {anio.activo ? (
                        <span className="students-role-badge">Activo</span>
                      ) : (
                        "Inactivo"
                      )}
                    </td>
                    <td>
                      <div className="students-actions">
                        {!anio.activo && (
                          <button
                            type="button"
                            className="students-action-button students-action-button--edit"
                            onClick={() => activarAnio(anio)}
                            title="Activar"
                          >
                            <i className="bi bi-check2-circle"></i>
                          </button>
                        )}
                        <button
                          type="button"
                          className="students-action-button students-action-button--delete"
                          onClick={() => eliminarAnio(anio)}
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

            {aniosLectivos.length === 0 && (
              <div className="students-empty">
                <i className="bi bi-calendar-x"></i>
                <p>Aún no hay años lectivos registrados.</p>
              </div>
            )}
          </div>
        </Card>

        <Card as="section" className="students-form-card">
          <div className="students-card-title">
            <span><i className="bi bi-mortarboard-fill"></i></span>
            <div>
              <p>{editandoCursoId === null ? "Nuevo registro" : "Edición"}</p>
              <h2>{editandoCursoId === null ? "Datos del curso" : "Actualizar curso"}</h2>
            </div>
          </div>

          <form onSubmit={registrarCurso}>
            <div className="students-form-grid">
              <label>
                <span>Año lectivo</span>
                <select
                  required
                  value={formularioCurso.anioLectivoId}
                  onChange={(event) => actualizarCampoCurso("anioLectivoId", event.target.value)}
                >
                  <option value="">Seleccione un año lectivo</option>
                  {aniosOrdenados.map((anio) => (
                    <option key={anio.id} value={anio.id}>
                      {anio.nombre}
                      {anio.activo ? " (activo)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Nivel educativo</span>
                <select
                  required
                  value={formularioCurso.nivel}
                  onChange={(event) => actualizarCampoCurso("nivel", event.target.value)}
                >
                  {niveles.map((nivel) => (
                    <option key={nivel} value={nivel}>{nivel}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Grado</span>
                <input
                  required
                  placeholder="Ej. Sexto"
                  value={formularioCurso.grado}
                  onChange={(event) => actualizarCampoCurso("grado", event.target.value)}
                />
              </label>

              <label>
                <span>Paralelo</span>
                <select
                  required
                  value={formularioCurso.paralelo}
                  onChange={(event) => actualizarCampoCurso("paralelo", event.target.value)}
                >
                  <option value="">Seleccione</option>
                  <option>A</option>
                  <option>B</option>
                  <option>C</option>
                </select>
              </label>

              <label>
                <span>Tutor designado</span>
                <select
                  value={formularioCurso.tutorId}
                  onChange={(event) => actualizarCampoCurso("tutorId", event.target.value)}
                >
                  <option value="">Sin tutor asignado</option>
                  {docentes.map((docente) => (
                    <option key={docente.id} value={docente.id}>
                      {docente.nombres} {docente.apellidos}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Organización académica del curso</span>
                <select
                  required
                  value={formularioCurso.tipoOrganizacion}
                  onChange={(event) => actualizarCampoCurso("tipoOrganizacion", event.target.value)}
                >
                  {organizaciones.map((valor) => (
                    <option key={valor} value={valor}>{valor}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="students-form-actions">
              <button type="submit" className="students-save-button">
                <i className="bi bi-check-lg"></i>
                {editandoCursoId === null ? "Registrar curso" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Card>

        <Card as="section" className="students-list-card">
          <div className="students-list-header">
            <div>
              <p className="students-label">Registros</p>
              <h2>Cursos registrados</h2>
            </div>
          </div>

          <div className="students-table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Nivel</th>
                  <th>Año lectivo</th>
                  <th>Tutor</th>
                  <th>Organización</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map((curso) => (
                  <Fragment key={curso.id}>
                    <tr>
                      <td>{curso.grado} “{curso.paralelo}”</td>
                      <td>{curso.nivel}</td>
                      <td>{curso.anioLectivo?.nombre}</td>
                      <td>{curso.tutor ? `${curso.tutor.nombres} ${curso.tutor.apellidos}` : "—"}</td>
                      <td>{curso.tipoOrganizacion}</td>
                      <td>
                        <div className="students-actions">
                          <button
                            type="button"
                            className="students-action-button students-action-button--info"
                            onClick={() => alternarPeriodos(curso)}
                            title="Ver trimestres"
                          >
                            <i className="bi bi-calendar3"></i>
                          </button>
                          <button
                            type="button"
                            className="students-action-button students-action-button--edit"
                            onClick={() => editarCurso(curso)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil-square"></i>
                          </button>
                          <button
                            type="button"
                            className="students-action-button students-action-button--delete"
                            onClick={() => eliminarCurso(curso)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash3"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {cursoExpandidoId === curso.id && (
                      <tr>
                        <td colSpan={6}>
                          <div className="periodos-panel">
                            {cargandoPeriodos && !periodosPorCurso[curso.id] ? (
                              <p>Cargando trimestres…</p>
                            ) : (periodosPorCurso[curso.id]?.length ?? 0) === 0 ? (
                              <p>Este curso todavía no tiene trimestres generados.</p>
                            ) : (
                              <ul className="periodos-lista">
                                {periodosPorCurso[curso.id].map((periodo) => (
                                  <li key={periodo.id} className="periodos-item">
                                    <span>
                                      Trimestre {periodo.numero} ({periodo.fechaInicio} – {periodo.fechaFin})
                                    </span>
                                    <span className={periodo.cerrado ? "periodo-badge periodo-badge--cerrado" : "periodo-badge periodo-badge--abierto"}>
                                      {periodo.cerrado ? "Cerrado" : "Abierto"}
                                    </span>
                                    <button
                                      type="button"
                                      className="students-action-button"
                                      onClick={() => alternarEstadoPeriodo(curso, periodo)}
                                      title={periodo.cerrado ? "Reabrir trimestre" : "Cerrar trimestre"}
                                    >
                                      <i className={periodo.cerrado ? "bi bi-unlock" : "bi bi-lock"}></i>
                                      {periodo.cerrado ? " Reabrir" : " Cerrar"}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>

            {cursos.length === 0 && (
              <div className="students-empty">
                <i className="bi bi-search"></i>
                <p>No existen cursos registrados.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}

export default Cursos;
