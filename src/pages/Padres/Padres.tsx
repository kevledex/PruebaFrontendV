import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import "./Padres.css";
import { api, getApiErrorMessage } from "../../api/client";

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
  curso: { id: number };
}

interface LineaMateria {
  materiaCursoId: number;
  nombreMateria: string;
  promedio: number | null;
  equivalenciaCualitativa: string | null;
}

interface LineaDestreza {
  ambitoAprendizaje: string;
  destreza: string;
  escala: string;
}

interface InformeProgreso {
  alumnoId: number;
  nombreCompleto: string;
  periodoAcademicoId: number;
  materias: LineaMateria[];
  destrezas: LineaDestreza[];
  evaluacionComportamental: string | null;
}

interface PeriodoAcademico {
  id: number;
  numero: number;
  cerrado: boolean;
}

function Padres() {
  const autenticado =
    localStorage.getItem("usuarioAutenticado") === "true";

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [alumnosTodos, setAlumnosTodos] = useState<AlumnoApi[]>([]);
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [periodoId, setPeriodoId] = useState<number | null>(null);
  const [informe, setInforme] = useState<InformeProgreso | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    Promise.all([api.get<Curso[]>("/cursos"), api.get<AlumnoApi[]>("/alumnos")])
      .then(([cursosData, alumnosData]) => {
        setCursos(cursosData);
        setAlumnosTodos(alumnosData);
        if (cursosData.length) setCursoId(cursosData[0].id);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  const alumnosDelCurso = useMemo(
    () => alumnosTodos.filter((alumno) => alumno.curso?.id === cursoId),
    [alumnosTodos, cursoId],
  );

  useEffect(() => {
    setAlumnoId(alumnosDelCurso[0]?.id ?? null);
  }, [alumnosDelCurso]);

  useEffect(() => {
    if (!cursoId) {
      setPeriodos([]);
      return;
    }
    api
      .get<PeriodoAcademico[]>(`/cursos/${cursoId}/periodos`)
      .then((data) => {
        if (data.length) {
          setPeriodos(data);
          setPeriodoId(data[0]?.id ?? null);
        } else {
          api
            .post<PeriodoAcademico[]>(`/cursos/${cursoId}/periodos/generar`)
            .then((generados) => {
              setPeriodos(generados);
              setPeriodoId(generados[0]?.id ?? null);
            })
            .catch((error) => setMensaje(getApiErrorMessage(error)));
        }
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, [cursoId]);

  useEffect(() => {
    if (!alumnoId || !periodoId) {
      setInforme(null);
      return;
    }
    setCargando(true);
    setMensaje("");
    api
      .get<InformeProgreso>(`/alumnos/${alumnoId}/informes/progreso?periodo=${periodoId}`)
      .then(setInforme)
      .catch((error) => {
        setInforme(null);
        setMensaje(getApiErrorMessage(error));
      })
      .finally(() => setCargando(false));
  }, [alumnoId, periodoId]);

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  const cursoSeleccionado = cursos.find((curso) => curso.id === cursoId);
  const materiasConPromedio = informe?.materias.filter((m) => m.promedio != null) ?? [];
  const promedioGeneral = materiasConPromedio.length
    ? Number(
        (
          materiasConPromedio.reduce((suma, m) => suma + Number(m.promedio), 0) /
          materiasConPromedio.length
        ).toFixed(2),
      )
    : null;

  return (
    <MainLayout>
      <div className="parents-page">
        <main className="parents-content">
          <section className="parents-header">
            <div>
              <p className="parents-label">Consulta académica</p>
              <h1>Vista de padres de familia</h1>
              <p>Consulte las calificaciones registradas del estudiante.</p>
            </div>

            <BackHomeButton />
          </section>

          <Card as="section" className="grades-section">
            <div className="grades-header">
              <div>
                <p className="section-label">Selección</p>
                <h2>Curso, estudiante y periodo</h2>
              </div>
            </div>

            <div className="period-filter">
              <label htmlFor="curso-padres">Curso</label>
              <select
                id="curso-padres"
                value={cursoId ?? ""}
                onChange={(e) => setCursoId(Number(e.target.value))}
              >
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.grado} "{curso.paralelo}" · {curso.nivel}
                  </option>
                ))}
              </select>
            </div>

            <div className="period-filter" style={{ marginTop: 14 }}>
              <label htmlFor="estudiante-padres">Estudiante</label>
              <select
                id="estudiante-padres"
                value={alumnoId ?? ""}
                onChange={(e) => setAlumnoId(Number(e.target.value))}
              >
                {alumnosDelCurso.map((alumno) => (
                  <option key={alumno.id} value={alumno.id}>
                    {alumno.nombres} {alumno.apellidos}
                  </option>
                ))}
              </select>
            </div>

            <div className="period-filter" style={{ marginTop: 14 }}>
              <label htmlFor="periodo-padres">Periodo académico</label>
              <select
                id="periodo-padres"
                value={periodoId ?? ""}
                onChange={(e) => setPeriodoId(Number(e.target.value))}
              >
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    Periodo {periodo.numero}
                    {periodo.cerrado ? " (cerrado)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {mensaje && <p className="parents-header p">{mensaje}</p>}

          {!alumnosDelCurso.length && (
            <Card as="section" className="grades-section">
              <p>Este curso todavía no tiene estudiantes matriculados.</p>
            </Card>
          )}

          {cargando && (
            <Card as="section" className="grades-section">
              <p>Cargando informe...</p>
            </Card>
          )}

          {!cargando && informe && (
            <>
              <Card as="section" className="student-card">
                <div className="student-avatar">
                  <i className="bi bi-person-fill"></i>
                </div>

                <div className="student-information">
                  <span>Estudiante</span>
                  <h2>{informe.nombreCompleto}</h2>

                  <div className="student-details">
                    <p>
                      <strong>Curso:</strong>{" "}
                      {cursoSeleccionado ? `${cursoSeleccionado.grado} "${cursoSeleccionado.paralelo}"` : ""}
                    </p>
                    {informe.evaluacionComportamental && (
                      <p>
                        <strong>Comportamiento:</strong> {informe.evaluacionComportamental}
                      </p>
                    )}
                  </div>
                </div>

                <div className="student-status">
                  <span>Estado</span>
                  <strong>Matriculado</strong>
                </div>
              </Card>

              <Card as="section" className="grades-section">
                <div className="grades-header">
                  <div>
                    <p className="section-label">Rendimiento académico</p>
                    <h2>Calificaciones del periodo</h2>
                  </div>
                </div>

                {informe.materias.length > 0 && (
                  <div className="table-responsive">
                    <table className="grades-table">
                      <thead>
                        <tr>
                          <th>Asignatura</th>
                          <th>Promedio</th>
                          <th>Equivalencia cualitativa</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {informe.materias.map((materia) => {
                          const aprobado = materia.promedio != null && Number(materia.promedio) >= 7;
                          return (
                            <tr key={materia.materiaCursoId}>
                              <td>
                                <div className="subject-name">
                                  <i className="bi bi-book"></i>
                                  {materia.nombreMateria}
                                </div>
                              </td>
                              <td>
                                <strong className="grade-average">
                                  {materia.promedio != null ? Number(materia.promedio).toFixed(2) : "—"}
                                </strong>
                              </td>
                              <td>{materia.equivalenciaCualitativa ?? "—"}</td>
                              <td>
                                {materia.promedio != null && (
                                  <span className={aprobado ? "status-badge approved" : "status-badge failed"}>
                                    {aprobado ? "Aprobado" : "Reprobado"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {informe.destrezas.length > 0 && (
                  <div className="table-responsive">
                    <table className="grades-table">
                      <thead>
                        <tr>
                          <th>Ámbito de aprendizaje</th>
                          <th>Destreza</th>
                          <th>Escala</th>
                        </tr>
                      </thead>
                      <tbody>
                        {informe.destrezas.map((destreza, indice) => (
                          <tr key={indice}>
                            <td>{destreza.ambitoAprendizaje}</td>
                            <td>{destreza.destreza}</td>
                            <td>{destreza.escala}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!informe.materias.length && !informe.destrezas.length && (
                  <p>Todavía no hay calificaciones registradas para este periodo.</p>
                )}
              </Card>

              {promedioGeneral != null && (
                <section className="academic-summary">
                  <Card as="article" className="summary-card">
                    <div className="summary-icon">
                      <i className="bi bi-bar-chart-fill"></i>
                    </div>
                    <div>
                      <span>Promedio general</span>
                      <strong>{promedioGeneral} / 10</strong>
                    </div>
                  </Card>

                  <Card as="article" className="summary-card">
                    <div className="summary-icon">
                      <i className="bi bi-journal-check"></i>
                    </div>
                    <div>
                      <span>Asignaturas registradas</span>
                      <strong>{materiasConPromedio.length}</strong>
                    </div>
                  </Card>

                  <Card as="article" className="summary-card">
                    <div className="summary-icon">
                      <i className="bi bi-patch-check-fill"></i>
                    </div>
                    <div>
                      <span>Estado académico</span>
                      <strong>{promedioGeneral >= 7 ? "Aprobado" : "Reprobado"}</strong>
                    </div>
                  </Card>
                </section>
              )}
            </>
          )}
        </main>
      </div>

    </MainLayout>
  );
}

export default Padres;
