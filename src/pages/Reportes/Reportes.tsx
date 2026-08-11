import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import BuscadorSelector from "../../components/common/BuscadorSelector";
import { api, getApiErrorMessage } from "../../api/client";
import "./Reportes.css";

interface AnioLectivo {
  id: number;
}

interface Curso {
  id: number;
  nivel: string;
  grado: string;
  paralelo: string;
  anioLectivo: AnioLectivo;
}

interface AlumnoResumen {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
}

interface PeriodoAcademico {
  id: number;
  numero: number;
  cerrado: boolean;
}

export default function Reportes() {
  const autenticado = localStorage.getItem("usuarioAutenticado") === "true";
  const rolUsuario = localStorage.getItem("rolUsuario");

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([]);
  const [alumnoId, setAlumnoId] = useState<number | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [seleccion, setSeleccion] = useState<string>("");
  const [mensaje, setMensaje] = useState("");
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    api
      .get<Curso[]>("/mis-cursos")
      .then((data) => {
        setCursos(data);
        if (data.length === 1) setCursoId(data[0].id);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  useEffect(() => {
    setAlumnoId(null);
    setSeleccion("");
    if (!cursoId) {
      setAlumnos([]);
      setPeriodos([]);
      return;
    }
    api
      .get<AlumnoResumen[]>(`/alumnos?cursoId=${cursoId}`)
      .then(setAlumnos)
      .catch((error) => setMensaje(getApiErrorMessage(error)));
    api
      .get<PeriodoAcademico[]>(`/cursos/${cursoId}/periodos`)
      .then(setPeriodos)
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, [cursoId]);

  const opcionesEstudiantes = useMemo(
    () =>
      alumnos.map((alumno) => ({
        id: alumno.id,
        titulo: `${alumno.nombres} ${alumno.apellidos}`,
        subtitulo: `C.I. ${alumno.cedula}`,
      })),
    [alumnos],
  );

  const cursoSeleccionado = cursos.find((curso) => curso.id === cursoId) ?? null;

  if (!autenticado) return <Navigate to="/login" replace />;

  async function generarReporte() {
    if (!alumnoId || !seleccion) {
      setMensaje("Selecciona un estudiante y un trimestre.");
      return;
    }
    setMensaje("");
    setGenerando(true);
    try {
      const query =
        seleccion === "general"
          ? `anioLectivo=${cursoSeleccionado?.anioLectivo.id}`
          : `periodo=${seleccion}`;
      const blob = await api.getBlob(`/alumnos/${alumnoId}/reportes/pdf?${query}`);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    } finally {
      setGenerando(false);
    }
  }

  return (
    <MainLayout>
      <div className="reportes-page">
        <header className="reportes-header">
          <div>
            <p className="reportes-label">Reportes académicos</p>
            <h1>Generar reporte</h1>
            <p>
              {rolUsuario === "Docente"
                ? "Genera el reporte de calificaciones de los estudiantes de tu curso."
                : "Genera el reporte de calificaciones de cualquier estudiante."}
            </p>
          </div>
          <BackHomeButton />
        </header>

        <Card as="section" className="reportes-card">
          <h2>Curso, estudiante y trimestre</h2>

          {cursos.length === 0 && (
            <p>
              {rolUsuario === "Docente"
                ? "Todavía no tienes un curso asignado."
                : "Todavía no hay cursos registrados."}
            </p>
          )}

          {cursos.length > 1 && (
            <label className="reportes-field">
              <span>Curso</span>
              <select
                value={cursoId ?? ""}
                onChange={(e) => setCursoId(Number(e.target.value))}
              >
                <option value="">Seleccione un curso</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.grado} "{curso.paralelo}" · {curso.nivel}
                  </option>
                ))}
              </select>
            </label>
          )}

          {cursoId && (
            <label className="reportes-field">
              <span>Estudiante</span>
              <BuscadorSelector
                opciones={opcionesEstudiantes}
                seleccionId={alumnoId}
                onSeleccionar={setAlumnoId}
                placeholder="Buscar por cédula o nombre"
                mensajeVacio="No se encontraron estudiantes en este curso."
              />
            </label>
          )}

          {alumnoId && (
            <label className="reportes-field">
              <span>Trimestre</span>
              <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)}>
                <option value="">Seleccione</option>
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    Trimestre {periodo.numero}
                    {periodo.cerrado ? " (cerrado)" : ""}
                  </option>
                ))}
                <option value="general">General (los 3 trimestres)</option>
              </select>
            </label>
          )}

          {mensaje && <p className="reportes-message">{mensaje}</p>}

          <button
            type="button"
            className="reportes-generate-button"
            disabled={!alumnoId || !seleccion || generando}
            onClick={generarReporte}
          >
            <i className="bi bi-file-earmark-pdf-fill"></i>
            {generando ? "Generando..." : "Generar PDF"}
          </button>
        </Card>
      </div>
    </MainLayout>
  );
}
