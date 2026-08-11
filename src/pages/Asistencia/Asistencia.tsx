import { useEffect, useMemo, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import "./Asistencia.css";
import { api, getApiErrorMessage } from "../../api/client";

type EstadoAsistencia = "Presente" | "Atraso" | "Falta Justificada" | "Falta Injustificada";

interface Curso {
  id: number;
  nivel: string;
  grado: string;
  paralelo: string;
}

interface AlumnoApi {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  curso: { id: number };
}

interface Estudiante {
  id: number;
  nombre: string;
  identificacion: string;
  estado: EstadoAsistencia;
}

const ESTADOS: EstadoAsistencia[] = ["Presente", "Atraso", "Falta Justificada", "Falta Injustificada"];

function claseEstado(estado: EstadoAsistencia): string {
  return `estado-${estado.toLowerCase().replace(/\s+/g, "-")}`;
}

function obtenerFechaActual(): string {
  const fecha = new Date();
  const fechaLocal = new Date(
    fecha.getTime() - fecha.getTimezoneOffset() * 60_000
  );

  return fechaLocal.toISOString().split("T")[0];
}

function Asistencia() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [materias, setMaterias] = useState<Array<{ id: number; nombre: string }>>([]);

  const [fecha, setFecha] = useState(obtenerFechaActual());
  const [asignatura, setAsignatura] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<Curso[]>("/mis-cursos"),
      api.get<Array<{ id: number; nombre: string }>>("/materias"),
    ])
      .then(([cursosData, listaMaterias]) => {
        setCursos(cursosData);
        setMaterias(listaMaterias);
        if (cursosData.length) setCursoId(cursosData[0].id);
        if (listaMaterias.length) setAsignatura(listaMaterias[0].nombre);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  useEffect(() => {
    if (!cursoId) {
      setEstudiantes([]);
      return;
    }
    api
      .get<AlumnoApi[]>(`/alumnos?cursoId=${cursoId}`)
      .then((alumnosData) => {
        setEstudiantes(
          alumnosData.map((alumno) => ({
            id: alumno.id,
            nombre: `${alumno.nombres} ${alumno.apellidos}`,
            identificacion: alumno.cedula,
            estado: "Presente" as EstadoAsistencia,
          })),
        );
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, [cursoId]);

  const cursoSeleccionado = cursos.find((curso) => curso.id === cursoId);

  const estudiantesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    if (!texto) {
      return estudiantes;
    }

    return estudiantes.filter(
      (estudiante) =>
        estudiante.nombre.toLowerCase().includes(texto) ||
        estudiante.identificacion.includes(texto)
    );
  }, [busqueda, estudiantes]);

  const totalPresentes = estudiantes.filter(
    (estudiante) => estudiante.estado === "Presente"
  ).length;

  const totalAusentes = estudiantes.filter(
    (estudiante) => estudiante.estado === "Falta Justificada" || estudiante.estado === "Falta Injustificada"
  ).length;

  const cambiarAsistencia = (id: number, estado: EstadoAsistencia) => {
    setMensaje("");

    setEstudiantes((listaActual) =>
      listaActual.map((estudiante) =>
        estudiante.id === id
          ? {
              ...estudiante,
              estado,
            }
          : estudiante
      )
    );
  };

  const marcarTodos = (estado: EstadoAsistencia) => {
    setMensaje("");

    setEstudiantes((listaActual) =>
      listaActual.map((estudiante) => ({
        ...estudiante,
        estado,
      }))
    );
  };

  const guardarAsistencia = async () => {
    setGuardando(true);
    setMensaje("");

    const materia = materias.find((item) => item.nombre === asignatura);
    if (!materia) { setGuardando(false); setMensaje("Seleccione una materia valida."); return; }
    if (!estudiantes.length) { setGuardando(false); setMensaje("No hay estudiantes para registrar."); return; }
    try {
      await api.post("/asistencias/lote", {
        fecha,
        materiaId: materia.id,
        estudiantes: estudiantes.map((item) => ({ alumnoId: item.id, estado: item.estado, observacion: "" })),
      });
      setMensaje("La asistencia se guardo correctamente.");
    } catch (error) { setMensaje(getApiErrorMessage(error)); } finally { setGuardando(false); }


  };

  return (
    <MainLayout>
      <div className="pagina-asistencia">
      {/* Contenido */}
      <main className="contenido-asistencia">
        <section className="encabezado-pagina">
          <div>
            <span className="etiqueta-pagina">GESTIÓN ACADÉMICA</span>
            <h1>Ingreso de asistencia</h1>
            <p>Registra y verifica la asistencia diaria de los estudiantes.</p>
          </div>

          <BackHomeButton />
        </section>

        {/* Datos de la clase */}
        <Card as="section" className="tarjeta tarjeta-filtros">
          <div className="titulo-tarjeta">
            <div className="icono-tarjeta">▼</div>

            <div>
              <h2>Datos de la clase</h2>
              <p>Selecciona el curso, la fecha y la asignatura.</p>
            </div>
          </div>

          <div className="filtros-asistencia">
            <div className="campo">
              <label htmlFor="curso">Curso</label>

              <select
                id="curso"
                value={cursoId ?? ""}
                onChange={(evento) => setCursoId(Number(evento.target.value))}
              >
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.grado} "{curso.paralelo}" · {curso.nivel}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="fecha">Fecha</label>

              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="asignatura">Asignatura</label>

              <select
                id="asignatura"
                value={asignatura}
                onChange={(evento) => setAsignatura(evento.target.value)}
              >
                {materias.map((materia) => (
                  <option key={materia.id} value={materia.nombre}>
                    {materia.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Resumen */}
        <section className="resumen-asistencia">
          <Card as="article" className="resumen-card">
            <div className="resumen-icono resumen-icono-total">👥</div>

            <div>
              <span>Total estudiantes</span>
              <strong>{estudiantes.length}</strong>
            </div>
          </Card>

          <Card as="article" className="resumen-card">
            <div className="resumen-icono resumen-icono-presente">✓</div>

            <div>
              <span>Presentes</span>
              <strong>{totalPresentes}</strong>
            </div>
          </Card>

          <Card as="article" className="resumen-card">
            <div className="resumen-icono resumen-icono-ausente">✕</div>

            <div>
              <span>Faltas</span>
              <strong>{totalAusentes}</strong>
            </div>
          </Card>
        </section>

        {/* Lista de estudiantes */}
        <Card as="section" className="tarjeta tarjeta-estudiantes">
          <div className="titulo-tarjeta">
            <div className="icono-tarjeta">▣</div>

            <div>
              <h2>Lista de estudiantes</h2>
              <p>
                {cursoSeleccionado ? `${cursoSeleccionado.grado} "${cursoSeleccionado.paralelo}"` : "Sin curso"} · {asignatura} · {fecha}
              </p>
            </div>
          </div>

          <div className="barra-herramientas">
            <div className="buscador-estudiantes">
              <span>⌕</span>

              <input
                type="search"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por nombre o cédula"
              />
            </div>

            <div className="acciones-lista">
              <button
                type="button"
                className="boton-secundario"
                onClick={() => marcarTodos("Presente")}
              >
                ✓ Todos presentes
              </button>

              <button
                type="button"
                className="boton-secundario"
                onClick={() => marcarTodos("Falta Injustificada")}
              >
                ✕ Todos con falta
              </button>
            </div>
          </div>

          <div className="contenedor-tabla">
            <table className="tabla-asistencia">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Estudiante</th>
                  <th>Estado</th>
                  <th>Asistencia</th>
                </tr>
              </thead>

              <tbody>
                {estudiantesFiltrados.map((estudiante) => (
                  <tr key={estudiante.id}>
                    <td>{estudiante.id}</td>

                    <td>
                      <div className="informacion-estudiante">
                        <div className="avatar-estudiante">
                          {estudiante.nombre.charAt(0)}
                        </div>

                        <div>
                          <strong>{estudiante.nombre}</strong>
                          <span>C.I. {estudiante.identificacion}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={`estado ${claseEstado(estudiante.estado)}`}>
                        ● {estudiante.estado}
                      </span>
                    </td>

                    <td>
                      <select
                        className="selector-estado"
                        value={estudiante.estado}
                        onChange={(evento) =>
                          cambiarAsistencia(estudiante.id, evento.target.value as EstadoAsistencia)
                        }
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {estudiantesFiltrados.length === 0 && (
              <div className="sin-resultados">
                No se encontraron estudiantes.
              </div>
            )}
          </div>

          {mensaje && <div className="mensaje-exito">✓ {mensaje}</div>}

          <div className="pie-lista">
            <p>
              ⓘ Selecciona el estado de cada estudiante antes de guardar.
            </p>

            <button
              type="button"
              className="boton-guardar"
              onClick={guardarAsistencia}
              disabled={guardando}
            >
              {guardando ? "Guardando..." : "▣ Guardar asistencia"}
            </button>
          </div>
        </Card>
      </main>

      </div>
    </MainLayout>
  );
}

export default Asistencia;
