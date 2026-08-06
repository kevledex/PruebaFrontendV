import { useCallback, useEffect, useRef, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import "./Notas.css";
import { api, getApiErrorMessage } from "../../api/client";

type Nivel = "INICIAL" | "PREPARATORIA" | "ELEMENTAL" | "MEDIA";

type Curso = {
  id: number;
  nivel: Nivel;
  grado: string;
  paralelo: string;
};

type MateriaCurso = {
  id: number;
  materia: { id: number; nombre: string };
  docente?: { id: number; nombres: string; apellidos: string } | null;
};

type PeriodoAcademico = {
  id: number;
  numero: number;
  cerrado: boolean;
};

type CategoriaInsumoMedia = "TAREA" | "INDIVIDUAL" | "LECCION" | "GRUPAL" | "PROYECTO" | "EXAMEN";

type Actividad = {
  id: number;
  nombre: string;
  tipoEvaluacion: "DIAGNOSTICA" | "FORMATIVA" | "SUMATIVA";
  categoriaInsumoMedia: CategoriaInsumoMedia | null;
  periodoAcademico: { id: number };
  materiaCurso: { id: number };
};

type Nota = {
  id: number;
  calificacion: number | null;
  observacion?: string;
  alumno: { id: number };
  actividad: { id: number };
};

type AlumnoApi = {
  id: number;
  nombres: string;
  apellidos: string;
  curso: { id: number };
};

type EvaluacionDestreza = {
  id: number;
  ambitoAprendizaje: string;
  destreza: string;
  escala: "ALCANZADA" | "EN_PROCESO" | "INICIADA" | "NO_EVALUADA";
  alumno: { id: number };
};

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function truncar2(valor: number): number {
  return Math.trunc(valor * 100) / 100;
}

function valoresNumericos(celdas: string[]): number[] {
  return celdas.filter((v) => v.trim() !== "").map(Number).filter((v) => Number.isFinite(v));
}

function promedioTruncado(valores: number[]): number {
  if (!valores.length) return 0;
  return truncar2(valores.reduce((a, b) => a + b, 0) / valores.length);
}

function equivalenciaDesdeNumero(valor: number, hayNotas: boolean): string {
  if (!hayNotas) return "—";
  const redondeado = Math.round(valor);
  const tabla: Record<number, string> = {
    10: "A+", 9: "A-", 8: "B+", 7: "B-", 6: "C+", 5: "C-", 4: "D+", 3: "D-", 2: "E+",
  };
  return tabla[redondeado] ?? "E-";
}

function claseNota(hayValor: boolean, aprobado: boolean): string {
  if (!hayValor) return "badge-nota badge-nota-vacio";
  return aprobado ? "badge-nota badge-nota-aprobado" : "badge-nota badge-nota-reprobado";
}

const NOMBRE_NIVEL: Record<Nivel, string> = {
  INICIAL: "Inicial",
  PREPARATORIA: "Preparatoria",
  ELEMENTAL: "Elemental",
  MEDIA: "Media",
};

const ESCALAS_DESTREZA: Array<{ valor: EvaluacionDestreza["escala"]; codigo: string }> = [
  { valor: "ALCANZADA", codigo: "A" },
  { valor: "EN_PROCESO", codigo: "EP" },
  { valor: "INICIADA", codigo: "I" },
  { valor: "NO_EVALUADA", codigo: "NE" },
];

const ORDEN_ESCALA: EvaluacionDestreza["escala"][] = ["ALCANZADA", "EN_PROCESO", "INICIADA", "NO_EVALUADA"];

const ETIQUETA_ESCALA: Record<EvaluacionDestreza["escala"], string> = {
  ALCANZADA: "Alcanzada",
  EN_PROCESO: "En proceso",
  INICIADA: "Iniciada",
  NO_EVALUADA: "No evaluada",
};

function resumenDestrezas(escalas: string[]) {
  const conteo: Record<EvaluacionDestreza["escala"], number> = {
    ALCANZADA: 0,
    EN_PROCESO: 0,
    INICIADA: 0,
    NO_EVALUADA: 0,
  };
  let evaluadas = 0;
  escalas.forEach((valor) => {
    if (valor && valor in conteo) {
      conteo[valor as EvaluacionDestreza["escala"]]++;
      evaluadas++;
    }
  });
  if (!evaluadas) return null;
  let predominante = ORDEN_ESCALA[0];
  ORDEN_ESCALA.forEach((escala) => {
    if (conteo[escala] > conteo[predominante]) predominante = escala;
  });
  return { predominante, evaluadas, total: escalas.length };
}

const AMBITOS_SUGERIDOS = [
  "Identidad y Autonomía",
  "Convivencia",
  "Descubrimiento del Medio Natural y Cultural",
  "Relaciones Lógico-Matemáticas",
  "Comprensión y Expresión del Lenguaje",
  "Expresión Artística",
  "Expresión Corporal",
];

type CategoriaMedia = "tareas" | "individuales" | "lecciones" | "grupales";

const CATEGORIAS_MEDIA: CategoriaMedia[] = ["tareas", "individuales", "lecciones", "grupales"];

const ETIQUETA_CATEGORIA: Record<CategoriaMedia, string> = {
  tareas: "Tareas",
  individuales: "Individuales",
  lecciones: "Lecciones",
  grupales: "Grupales",
};

const ENUM_CATEGORIA: Record<CategoriaMedia, CategoriaInsumoMedia> = {
  tareas: "TAREA",
  individuales: "INDIVIDUAL",
  lecciones: "LECCION",
  grupales: "GRUPAL",
};

type CategoriaInsumo = "insumo1" | "insumo2";

const CATEGORIAS_POR_INSUMO: Record<CategoriaInsumo, CategoriaMedia[]> = {
  insumo1: ["tareas", "individuales", "lecciones"],
  insumo2: ["grupales"],
};

const ETIQUETA_INSUMO: Record<CategoriaInsumo, string> = {
  insumo1: "Insumo 1",
  insumo2: "Insumo 2",
};

type EstudianteMedia = {
  id: number;
  nombre: string;
  tareas: string[];
  individuales: string[];
  lecciones: string[];
  grupales: string[];
  proyecto: string;
  examen: string;
};

type EstudianteSimple = {
  id: number;
  nombre: string;
  notas: string[];
};

type EstudianteDestreza = {
  id: number;
  nombre: string;
  escalas: string[];
};

function idCelda(prefijo: string, columna: number, fila: number) {
  return `celda-${prefijo}-${columna}-${fila}`;
}

function manejarEnter(
  event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
  siguienteId: string,
) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const siguiente = document.getElementById(siguienteId);
  if (siguiente) siguiente.focus();
}

const columnasMediaVacias: Record<CategoriaMedia, string[]> = { tareas: [], individuales: [], lecciones: [], grupales: [] };
const idsColumnasMediaVacias: Record<CategoriaMedia, Array<number | null>> = { tareas: [], individuales: [], lecciones: [], grupales: [] };

export default function Notas() {
  const fecha = hoyIso();

  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState<number | null>(null);
  const [materiasCurso, setMateriasCurso] = useState<MateriaCurso[]>([]);
  const [materiaCursoId, setMateriaCursoId] = useState<number | null>(null);
  const [periodos, setPeriodos] = useState<PeriodoAcademico[]>([]);
  const [periodoId, setPeriodoId] = useState<number | null>(null);

  const [alumnosTodos, setAlumnosTodos] = useState<AlumnoApi[]>([]);

  // --- EGB Media ---
  const [columnasMedia, setColumnasMedia] = useState(columnasMediaVacias);
  const [idsColumnasMedia, setIdsColumnasMedia] = useState(idsColumnasMediaVacias);
  const [proyectoId, setProyectoId] = useState<number | null>(null);
  const [examenId, setExamenId] = useState<number | null>(null);
  const [estudiantesMedia, setEstudiantesMedia] = useState<EstudianteMedia[]>([]);
  const [modalMediaAbierto, setModalMediaAbierto] = useState<CategoriaInsumo | null>(null);
  const respaldoMedia = useRef<{
    columnas: typeof columnasMediaVacias;
    ids: typeof idsColumnasMediaVacias;
    estudiantes: EstudianteMedia[];
  } | null>(null);

  // --- EGB Elemental ---
  const [columnasElemental, setColumnasElemental] = useState<string[]>([]);
  const [idsColumnasElemental, setIdsColumnasElemental] = useState<Array<number | null>>([]);
  const [estudiantesElemental, setEstudiantesElemental] = useState<EstudianteSimple[]>([]);
  const [modalElementalAbierto, setModalElementalAbierto] = useState(false);
  const respaldoElemental = useRef<{
    columnas: string[];
    ids: Array<number | null>;
    estudiantes: EstudianteSimple[];
  } | null>(null);

  // --- Inicial / Preparatoria ---
  const [columnasDestreza, setColumnasDestreza] = useState<Array<{ ambito: string; destreza: string }>>([]);
  const [idsColumnasDestreza, setIdsColumnasDestreza] = useState<Array<Record<number, number>>>([]);
  const [estudiantesDestreza, setEstudiantesDestreza] = useState<EstudianteDestreza[]>([]);

  const [notaIdPorCelda, setNotaIdPorCelda] = useState<Map<string, number>>(new Map());
  const [mensaje, setMensajeTexto] = useState("");
  const [mensajeTipo, setMensajeTipo] = useState<"error" | "exito">("error");
  const [guardando, setGuardando] = useState(false);

  function setMensaje(texto: string, tipo: "error" | "exito" = "error") {
    setMensajeTipo(tipo);
    setMensajeTexto(texto);
  }

  const cursoSeleccionado = cursos.find((c) => c.id === cursoId);
  const nivelActual = cursoSeleccionado?.nivel;
  const esDestrezas = nivelActual === "INICIAL" || nivelActual === "PREPARATORIA";
  const esElemental = nivelActual === "ELEMENTAL";
  const esMedia = nivelActual === "MEDIA";

  useEffect(() => {
    Promise.all([api.get<Curso[]>("/cursos"), api.get<AlumnoApi[]>("/alumnos")])
      .then(([cursosData, alumnosData]) => {
        setCursos(cursosData);
        setAlumnosTodos(alumnosData);
        if (cursosData.length) setCursoId(cursosData[0].id);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  useEffect(() => {
    setMensaje("");
  }, [cursoId, materiaCursoId, periodoId]);

  useEffect(() => {
    if (!cursoId) return;
    api
      .get<PeriodoAcademico[]>(`/cursos/${cursoId}/periodos`)
      .then((periodosData) => {
        if (periodosData.length) {
          setPeriodos(periodosData);
          setPeriodoId(periodosData[0]?.id ?? null);
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

    if (esDestrezas) {
      setMateriasCurso([]);
      setMateriaCursoId(null);
      return;
    }

    api
      .get<MateriaCurso[]>(`/cursos/${cursoId}/materias`)
      .then((materiasData) => {
        setMateriasCurso(materiasData);
        setMateriaCursoId(materiasData[0]?.id ?? null);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, [cursoId, esDestrezas]);

  const estudiantesDelCurso = alumnosTodos
    .filter((al) => al.curso?.id === cursoId)
    .slice()
    .sort((a, b) => {
      const apellidos = a.apellidos.trim().localeCompare(b.apellidos.trim(), "es", { sensitivity: "base" });
      if (apellidos !== 0) return apellidos;
      return a.nombres.trim().localeCompare(b.nombres.trim(), "es", { sensitivity: "base" });
    })
    .map((al) => ({ id: al.id, nombre: `${al.nombres} ${al.apellidos}` }));

  // --- Carga: EGB Media / Elemental (actividades + notas) ---
  const cargarActividadesYNotas = useCallback(() => {
    if (esDestrezas || !cursoId || !materiaCursoId || !periodoId) return;

    Promise.all([api.get<Actividad[]>("/actividades"), api.get<Nota[]>("/notas")])
      .then(([actividades, notas]) => {
        const delContexto = actividades.filter(
          (a) => a.materiaCurso?.id === materiaCursoId && a.periodoAcademico?.id === periodoId,
        );

        const mapaNotas = new Map<string, Nota>();
        const mapaIdsNotas = new Map<string, number>();
        notas.forEach((n) => {
          const clave = `${n.alumno?.id}:${n.actividad?.id}`;
          mapaNotas.set(clave, n);
          mapaIdsNotas.set(clave, n.id);
        });
        setNotaIdPorCelda(mapaIdsNotas);

        const valor = (alumnoId: number, actividadId: number | null) => {
          if (!actividadId) return "";
          const nota = mapaNotas.get(`${alumnoId}:${actividadId}`);
          return nota?.calificacion != null ? String(nota.calificacion) : "";
        };

        if (esMedia) {
          const porCategoria: Record<CategoriaMedia, Actividad[]> = { tareas: [], individuales: [], lecciones: [], grupales: [] };
          CATEGORIAS_MEDIA.forEach((cat) => {
            porCategoria[cat] = delContexto.filter((a) => a.categoriaInsumoMedia === ENUM_CATEGORIA[cat]);
          });
          const proyectoAct = delContexto.find((a) => a.categoriaInsumoMedia === "PROYECTO") ?? null;
          const examenAct = delContexto.find((a) => a.categoriaInsumoMedia === "EXAMEN") ?? null;

          setColumnasMedia({
            tareas: porCategoria.tareas.map((a) => a.nombre),
            individuales: porCategoria.individuales.map((a) => a.nombre),
            lecciones: porCategoria.lecciones.map((a) => a.nombre),
            grupales: porCategoria.grupales.map((a) => a.nombre),
          });
          setIdsColumnasMedia({
            tareas: porCategoria.tareas.map((a) => a.id),
            individuales: porCategoria.individuales.map((a) => a.id),
            lecciones: porCategoria.lecciones.map((a) => a.id),
            grupales: porCategoria.grupales.map((a) => a.id),
          });
          setProyectoId(proyectoAct?.id ?? null);
          setExamenId(examenAct?.id ?? null);

          setEstudiantesMedia(
            estudiantesDelCurso.map((est) => ({
              id: est.id,
              nombre: est.nombre,
              tareas: porCategoria.tareas.map((a) => valor(est.id, a.id)),
              individuales: porCategoria.individuales.map((a) => valor(est.id, a.id)),
              lecciones: porCategoria.lecciones.map((a) => valor(est.id, a.id)),
              grupales: porCategoria.grupales.map((a) => valor(est.id, a.id)),
              proyecto: valor(est.id, proyectoAct?.id ?? null),
              examen: valor(est.id, examenAct?.id ?? null),
            })),
          );
        } else if (esElemental) {
          setColumnasElemental(delContexto.map((a) => a.nombre));
          setIdsColumnasElemental(delContexto.map((a) => a.id));
          setEstudiantesElemental(
            estudiantesDelCurso.map((est) => ({
              id: est.id,
              nombre: est.nombre,
              notas: delContexto.map((a) => valor(est.id, a.id)),
            })),
          );
        }
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esDestrezas, esMedia, esElemental, cursoId, materiaCursoId, periodoId, alumnosTodos]);

  // --- Carga: Inicial / Preparatoria (destrezas) ---
  const cargarDestrezas = useCallback(() => {
    if (!esDestrezas || !periodoId || !estudiantesDelCurso.length) {
      setColumnasDestreza([]);
      setIdsColumnasDestreza([]);
      setEstudiantesDestreza([]);
      return;
    }

    Promise.all(
      estudiantesDelCurso.map((est) =>
        api
          .get<EvaluacionDestreza[]>(`/evaluaciones-destreza/alumno/${est.id}/periodo/${periodoId}`)
          .then((lista) => ({ alumnoId: est.id, lista }))
          .catch(() => ({ alumnoId: est.id, lista: [] as EvaluacionDestreza[] })),
      ),
    ).then((resultados) => {
      const columnasMap = new Map<string, { ambito: string; destreza: string }>();
      resultados.forEach(({ lista }) => {
        lista.forEach((ev) => {
          const clave = `${ev.ambitoAprendizaje}::${ev.destreza}`;
          if (!columnasMap.has(clave)) columnasMap.set(clave, { ambito: ev.ambitoAprendizaje, destreza: ev.destreza });
        });
      });
      const columnas = Array.from(columnasMap.values());
      setColumnasDestreza(columnas);

      const idsPorAlumno: Record<number, Record<number, number>> = {};
      resultados.forEach(({ alumnoId, lista }) => {
        const mapa: Record<number, number> = {};
        columnas.forEach((col, indice) => {
          const encontrada = lista.find((ev) => ev.ambitoAprendizaje === col.ambito && ev.destreza === col.destreza);
          if (encontrada) mapa[indice] = encontrada.id;
        });
        idsPorAlumno[alumnoId] = mapa;
      });

      setEstudiantesDestreza(
        estudiantesDelCurso.map((est) => {
          const lista = resultados.find((r) => r.alumnoId === est.id)?.lista ?? [];
          return {
            id: est.id,
            nombre: est.nombre,
            escalas: columnas.map((col) => {
              const encontrada = lista.find((ev) => ev.ambitoAprendizaje === col.ambito && ev.destreza === col.destreza);
              return encontrada?.escala ?? "";
            }),
          };
        }),
      );
      setIdsColumnasDestreza(estudiantesDelCurso.map((est) => idsPorAlumno[est.id] ?? {}));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esDestrezas, periodoId, alumnosTodos, cursoId]);

  useEffect(() => {
    cargarActividadesYNotas();
  }, [cargarActividadesYNotas]);

  useEffect(() => {
    cargarDestrezas();
  }, [cargarDestrezas]);

  // ---------- Modal EGB Media ----------
  function abrirModalMedia(insumo: CategoriaInsumo) {
    respaldoMedia.current = {
      columnas: { ...columnasMedia },
      ids: { ...idsColumnasMedia },
      estudiantes: structuredClone(estudiantesMedia),
    };
    setMensaje("");
    setModalMediaAbierto(insumo);
  }

  function cerrarModalMedia() {
    if (respaldoMedia.current) {
      setColumnasMedia(respaldoMedia.current.columnas);
      setIdsColumnasMedia(respaldoMedia.current.ids);
      setEstudiantesMedia(respaldoMedia.current.estudiantes);
      respaldoMedia.current = null;
    }
    setMensaje("");
    setModalMediaAbierto(null);
  }

  function agregarColumnaMedia(categoria: CategoriaMedia) {
    setIdsColumnasMedia((prev) => ({ ...prev, [categoria]: [...prev[categoria], null] }));
    setColumnasMedia((prev) => ({
      ...prev,
      [categoria]: [...prev[categoria], `${ETIQUETA_CATEGORIA[categoria]} ${prev[categoria].length + 1}`],
    }));
    setEstudiantesMedia((prev) => prev.map((est) => ({ ...est, [categoria]: [...est[categoria], ""] })));
  }

  function eliminarColumnaMedia(categoria: CategoriaMedia, indice: number) {
    setIdsColumnasMedia((prev) => ({ ...prev, [categoria]: prev[categoria].filter((_, i) => i !== indice) }));
    setColumnasMedia((prev) => ({ ...prev, [categoria]: prev[categoria].filter((_, i) => i !== indice) }));
    setEstudiantesMedia((prev) =>
      prev.map((est) => ({ ...est, [categoria]: est[categoria].filter((_, i) => i !== indice) })),
    );
  }

  function renombrarColumnaMedia(categoria: CategoriaMedia, indice: number, nombre: string) {
    setColumnasMedia((prev) => ({
      ...prev,
      [categoria]: prev[categoria].map((n, i) => (i === indice ? nombre : n)),
    }));
  }

  function cambiarCeldaMedia(categoria: CategoriaMedia, filaId: number, indice: number, valor: string) {
    setEstudiantesMedia((prev) =>
      prev.map((est) =>
        est.id === filaId ? { ...est, [categoria]: est[categoria].map((v, i) => (i === indice ? valor : v)) } : est,
      ),
    );
  }

  function cambiarProyectoExamen(campo: "proyecto" | "examen", filaId: number, valor: string) {
    setEstudiantesMedia((prev) => prev.map((est) => (est.id === filaId ? { ...est, [campo]: valor } : est)));
  }

  function calcularDesglose(est: EstudianteMedia) {
    const promTareas = promedioTruncado(valoresNumericos(est.tareas));
    const promIndividuales = promedioTruncado(valoresNumericos(est.individuales));
    const promLecciones = promedioTruncado(valoresNumericos(est.lecciones));
    const promGrupales = promedioTruncado(valoresNumericos(est.grupales));
    const insumo1 = truncar2((promTareas + promIndividuales + promLecciones) / 3);
    const insumo2 = promGrupales;
    const formativaTotal = truncar2((insumo1 + insumo2) / 2);
    const proyecto = est.proyecto.trim() !== "" ? Number(est.proyecto) : 0;
    const examen = est.examen.trim() !== "" ? Number(est.examen) : 0;
    const p1 = truncar2(formativaTotal * 0.7);
    const p2 = truncar2(proyecto * 0.15);
    const p3 = truncar2(examen * 0.15);
    const notaFinal = truncar2(p1 + p2 + p3);
    const hayDatos =
      valoresNumericos(est.tareas).length > 0 ||
      valoresNumericos(est.individuales).length > 0 ||
      valoresNumericos(est.lecciones).length > 0 ||
      valoresNumericos(est.grupales).length > 0 ||
      est.proyecto.trim() !== "" ||
      est.examen.trim() !== "";
    return { insumo1, insumo2, formativaTotal, p1, p2, p3, notaFinal, hayDatos };
  }

  async function guardarMedia(): Promise<boolean> {
    if (!materiaCursoId || !periodoId) {
      setMensaje("Selecciona materia y trimestre.");
      return false;
    }
    setGuardando(true);
    setMensaje("");
    try {
      const nuevosIds = { ...idsColumnasMedia };

      for (const categoria of CATEGORIAS_MEDIA) {
        const nombres = columnasMedia[categoria];
        const ids = [...idsColumnasMedia[categoria]];
        for (let i = 0; i < nombres.length; i++) {
          if (!nombres[i].trim()) continue;
          const payloadActividad = {
            nombre: nombres[i],
            tipoEvaluacion: "FORMATIVA",
            categoriaInsumoMedia: ENUM_CATEGORIA[categoria],
            periodoAcademico: { id: periodoId },
            fecha,
            materiaCurso: { id: materiaCursoId },
          };
          const actividad = ids[i]
            ? await api.put<Actividad>(`/actividades/${ids[i]}`, payloadActividad)
            : await api.post<Actividad>("/actividades", payloadActividad);
          ids[i] = actividad.id;

          for (const est of estudiantesMedia) {
            const valorCelda = est[categoria][i];
            if (!valorCelda || valorCelda.trim() === "") continue;
            await guardarNota(est.id, actividad.id, Number(valorCelda));
          }
        }
        nuevosIds[categoria] = ids;
      }
      setIdsColumnasMedia(nuevosIds);

      const hayProyecto = estudiantesMedia.some((e) => e.proyecto.trim() !== "");
      let idProyecto = proyectoId;
      if (hayProyecto) {
        const payload = {
          nombre: "Proyecto Interdisciplinar",
          tipoEvaluacion: "SUMATIVA",
          categoriaInsumoMedia: "PROYECTO",
          periodoAcademico: { id: periodoId },
          fecha,
          materiaCurso: { id: materiaCursoId },
        };
        const actividad = idProyecto
          ? await api.put<Actividad>(`/actividades/${idProyecto}`, payload)
          : await api.post<Actividad>("/actividades", payload);
        idProyecto = actividad.id;
        for (const est of estudiantesMedia) {
          if (!est.proyecto.trim()) continue;
          await guardarNota(est.id, actividad.id, Number(est.proyecto));
        }
        setProyectoId(idProyecto);
      }

      const hayExamen = estudiantesMedia.some((e) => e.examen.trim() !== "");
      let idExamen = examenId;
      if (hayExamen) {
        const payload = {
          nombre: "Examen Trimestral",
          tipoEvaluacion: "SUMATIVA",
          categoriaInsumoMedia: "EXAMEN",
          periodoAcademico: { id: periodoId },
          fecha,
          materiaCurso: { id: materiaCursoId },
        };
        const actividad = idExamen
          ? await api.put<Actividad>(`/actividades/${idExamen}`, payload)
          : await api.post<Actividad>("/actividades", payload);
        idExamen = actividad.id;
        for (const est of estudiantesMedia) {
          if (!est.examen.trim()) continue;
          await guardarNota(est.id, actividad.id, Number(est.examen));
        }
        setExamenId(idExamen);
      }

      setMensaje("Notas guardadas correctamente.", "exito");
      cargarActividadesYNotas();
      return true;
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function guardarYcerrarModalMedia() {
    const ok = await guardarMedia();
    if (ok) {
      respaldoMedia.current = null;
      setModalMediaAbierto(null);
    }
  }

  async function guardarNota(alumnoId: number, actividadId: number, calificacion: number) {
    const existente = notaIdPorCelda.get(`${alumnoId}:${actividadId}`);
    const payload = {
      calificacion,
      fecha,
      alumno: { id: alumnoId },
      actividad: { id: actividadId },
    };
    if (existente) {
      await api.put(`/notas/${existente}`, payload);
    } else {
      await api.post("/notas", payload);
    }
  }

  // ---------- Modal EGB Elemental ----------
  function abrirModalElemental() {
    respaldoElemental.current = {
      columnas: [...columnasElemental],
      ids: [...idsColumnasElemental],
      estudiantes: structuredClone(estudiantesElemental),
    };
    setMensaje("");
    setModalElementalAbierto(true);
  }

  function cerrarModalElemental() {
    if (respaldoElemental.current) {
      setColumnasElemental(respaldoElemental.current.columnas);
      setIdsColumnasElemental(respaldoElemental.current.ids);
      setEstudiantesElemental(respaldoElemental.current.estudiantes);
      respaldoElemental.current = null;
    }
    setMensaje("");
    setModalElementalAbierto(false);
  }

  function agregarColumnaElemental() {
    setIdsColumnasElemental((prev) => [...prev, null]);
    setColumnasElemental((prev) => [...prev, `Actividad ${prev.length + 1}`]);
    setEstudiantesElemental((prev) => prev.map((est) => ({ ...est, notas: [...est.notas, ""] })));
  }

  function eliminarColumnaElemental(indice: number) {
    setIdsColumnasElemental((prev) => prev.filter((_, i) => i !== indice));
    setColumnasElemental((prev) => prev.filter((_, i) => i !== indice));
    setEstudiantesElemental((prev) => prev.map((est) => ({ ...est, notas: est.notas.filter((_, i) => i !== indice) })));
  }

  function renombrarColumnaElemental(indice: number, nombre: string) {
    setColumnasElemental((prev) => prev.map((n, i) => (i === indice ? nombre : n)));
  }

  function cambiarCeldaElemental(filaId: number, indice: number, valor: string) {
    setEstudiantesElemental((prev) =>
      prev.map((est) => (est.id === filaId ? { ...est, notas: est.notas.map((v, i) => (i === indice ? valor : v)) } : est)),
    );
  }

  async function guardarElemental(): Promise<boolean> {
    if (!materiaCursoId || !periodoId) {
      setMensaje("Selecciona materia y trimestre.");
      return false;
    }
    setGuardando(true);
    setMensaje("");
    try {
      const nuevosIds = [...idsColumnasElemental];
      for (let i = 0; i < columnasElemental.length; i++) {
        if (!columnasElemental[i].trim()) continue;
        const payloadActividad = {
          nombre: columnasElemental[i],
          tipoEvaluacion: "FORMATIVA",
          periodoAcademico: { id: periodoId },
          fecha,
          materiaCurso: { id: materiaCursoId },
        };
        const actividad = nuevosIds[i]
          ? await api.put<Actividad>(`/actividades/${nuevosIds[i]}`, payloadActividad)
          : await api.post<Actividad>("/actividades", payloadActividad);
        nuevosIds[i] = actividad.id;

        for (const est of estudiantesElemental) {
          const valorCelda = est.notas[i];
          if (!valorCelda || valorCelda.trim() === "") continue;
          await guardarNota(est.id, actividad.id, Number(valorCelda));
        }
      }
      setIdsColumnasElemental(nuevosIds);
      setMensaje("Notas guardadas correctamente.", "exito");
      cargarActividadesYNotas();
      return true;
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function guardarYcerrarModalElemental() {
    const ok = await guardarElemental();
    if (ok) {
      respaldoElemental.current = null;
      setModalElementalAbierto(false);
    }
  }

  // ---------- Handlers: Inicial / Preparatoria ----------
  function agregarColumnaDestreza() {
    setColumnasDestreza((prev) => [...prev, { ambito: "", destreza: `Destreza ${prev.length + 1}` }]);
    setEstudiantesDestreza((prev) => prev.map((est) => ({ ...est, escalas: [...est.escalas, ""] })));
  }

  function eliminarColumnaDestreza(indice: number) {
    setColumnasDestreza((prev) => prev.filter((_, i) => i !== indice));
    setEstudiantesDestreza((prev) => prev.map((est) => ({ ...est, escalas: est.escalas.filter((_, i) => i !== indice) })));
    setIdsColumnasDestreza((prev) =>
      prev.map((mapaFila) => {
        const nuevoMapa: Record<number, number> = {};
        Object.entries(mapaFila).forEach(([clave, id]) => {
          const columna = Number(clave);
          if (columna === indice) return;
          nuevoMapa[columna > indice ? columna - 1 : columna] = id;
        });
        return nuevoMapa;
      }),
    );
  }

  function cambiarColumnaDestreza(indice: number, campo: "ambito" | "destreza", valor: string) {
    setColumnasDestreza((prev) => prev.map((col, i) => (i === indice ? { ...col, [campo]: valor } : col)));
  }

  function cambiarEscala(filaId: number, indice: number, valor: string) {
    setEstudiantesDestreza((prev) =>
      prev.map((est) => (est.id === filaId ? { ...est, escalas: est.escalas.map((v, i) => (i === indice ? valor : v)) } : est)),
    );
  }

  async function guardarDestrezas() {
    if (!periodoId) {
      setMensaje("Selecciona el trimestre.");
      return;
    }
    if (columnasDestreza.some((col) => !col.ambito.trim() || !col.destreza.trim())) {
      setMensaje("Cada destreza debe tener ámbito y descripción.");
      return;
    }
    setGuardando(true);
    setMensaje("");
    try {
      for (let colIndice = 0; colIndice < columnasDestreza.length; colIndice++) {
        const columna = columnasDestreza[colIndice];
        for (let filaIndice = 0; filaIndice < estudiantesDestreza.length; filaIndice++) {
          const est = estudiantesDestreza[filaIndice];
          const valor = est.escalas[colIndice];
          if (!valor) continue;
          const payload = {
            alumno: { id: est.id },
            periodoAcademico: { id: periodoId },
            ambitoAprendizaje: columna.ambito.trim(),
            destreza: columna.destreza.trim(),
            escala: valor,
          };
          const existenteId = idsColumnasDestreza[filaIndice]?.[colIndice];
          if (existenteId) {
            await api.put(`/evaluaciones-destreza/${existenteId}`, payload);
          } else {
            await api.post("/evaluaciones-destreza", payload);
          }
        }
      }
      setMensaje("Destrezas guardadas correctamente.", "exito");
      cargarDestrezas();
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <MainLayout>
      <div className="contenedor-notas">
        <section className="notas-header">
          <div>
            <p>Gestión académica</p>
            <h1>Ingreso de Notas</h1>
            {cursoSeleccionado && nivelActual && (
              <span className="chip-nivel">
                {cursoSeleccionado.grado} "{cursoSeleccionado.paralelo}" · {NOMBRE_NIVEL[nivelActual]}
              </span>
            )}
          </div>
          <BackHomeButton />
        </section>

        <Card as="section" className="filtros-section">
          <p className="filtros-titulo">Filtros</p>
          <div className="filtros">
            <div className="grupo">
              <label htmlFor="filtro-curso">Curso</label>
              <select id="filtro-curso" value={cursoId ?? ""} onChange={(e) => setCursoId(Number(e.target.value))}>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.grado} "{curso.paralelo}" · {curso.nivel}
                  </option>
                ))}
              </select>
            </div>

            {!esDestrezas && (
              <div className="grupo">
                <label htmlFor="filtro-materia">Materia</label>
                <select id="filtro-materia" value={materiaCursoId ?? ""} onChange={(e) => setMateriaCursoId(Number(e.target.value))}>
                  {materiasCurso.map((mc) => (
                    <option key={mc.id} value={mc.id}>
                      {mc.materia.nombre}
                      {mc.docente ? ` — ${mc.docente.nombres} ${mc.docente.apellidos}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grupo">
              <label htmlFor="filtro-periodo">Trimestre</label>
              <select id="filtro-periodo" value={periodoId ?? ""} onChange={(e) => setPeriodoId(Number(e.target.value))}>
                {periodos.map((periodo) => (
                  <option key={periodo.id} value={periodo.id}>
                    Trimestre {periodo.numero}
                    {periodo.cerrado ? " (cerrado)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {mensaje && !modalMediaAbierto && !modalElementalAbierto && (
          <div className={mensajeTipo === "exito" ? "mensaje-exito" : "mensaje-error"}>{mensaje}</div>
        )}

        {esDestrezas && (
          <Card as="section" className="tabla-section">
            <div className="tabla-section-header">
              <div className="tabla-section-titulo">
                <span className="icono-nivel">
                  <i className="bi bi-clipboard2-check"></i>
                </span>
                <div>
                  <h2>Evaluación por destrezas</h2>
                  <p>Ámbitos de aprendizaje — Inicial y Preparatoria</p>
                </div>
              </div>
              <span className="chip-info">100% cualitativo</span>
            </div>

            <p className="leyenda-escalas">
              <strong>A</strong> Alcanzada · <strong>EP</strong> En proceso · <strong>I</strong> Iniciada ·{" "}
              <strong>NE</strong> No evaluada
            </p>

            <div className="acciones-header" style={{ marginBottom: 16 }}>
              <button className="btn-agregar-columna" onClick={agregarColumnaDestreza}>
                <i className="bi bi-plus-lg"></i> Añadir destreza
              </button>
            </div>

            <div className="tabla-container">
              <table className="tabla-notas">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Estudiante</th>
                    {columnasDestreza.map((columna, indice) => (
                      <th key={indice} className="columna-actividad columna-destreza">
                        <button
                          type="button"
                          className="btn-quitar-columna"
                          onClick={() => eliminarColumnaDestreza(indice)}
                          aria-label="Eliminar destreza"
                        >
                          ✕
                        </button>
                        <input
                          className="input-ambito"
                          type="text"
                          list="ambitos-sugeridos"
                          placeholder="Ámbito de aprendizaje"
                          value={columna.ambito}
                          onChange={(e) => cambiarColumnaDestreza(indice, "ambito", e.target.value)}
                        />
                        <input
                          className="input-nombre-actividad"
                          type="text"
                          placeholder="Nombre de la destreza"
                          value={columna.destreza}
                          onChange={(e) => cambiarColumnaDestreza(indice, "destreza", e.target.value)}
                        />
                      </th>
                    ))}
                    <th>Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantesDestreza.map((est, fila) => {
                    const resumen = resumenDestrezas(est.escalas);
                    return (
                      <tr key={est.id}>
                        <td>{fila + 1}</td>
                        <td>{est.nombre}</td>
                        {columnasDestreza.map((_, columna) => (
                          <td key={columna}>
                            <select
                              id={idCelda("destreza", columna, fila)}
                              className="select-escala"
                              value={est.escalas[columna]}
                              onChange={(e) => cambiarEscala(est.id, columna, e.target.value)}
                              onKeyDown={(e) => manejarEnter(e, idCelda("destreza", columna, fila + 1))}
                            >
                              <option value="">—</option>
                              {ESCALAS_DESTREZA.map((escala) => (
                                <option key={escala.valor} value={escala.valor}>
                                  {escala.codigo}
                                </option>
                              ))}
                            </select>
                          </td>
                        ))}
                        <td>
                          {resumen ? (
                            <div className="celda-resumen">
                              <span className={`badge-escala badge-escala-${resumen.predominante.toLowerCase().replace("_", "-")}`}>
                                {ETIQUETA_ESCALA[resumen.predominante]}
                              </span>
                              <small>
                                {resumen.evaluadas}/{resumen.total} evaluadas
                              </small>
                            </div>
                          ) : (
                            <span className="badge-escala badge-escala-vacio">Sin evaluar</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!estudiantesDestreza.length && (
                    <tr>
                      <td colSpan={3 + columnasDestreza.length}>
                        <div className="estado-vacio">
                          <i className="bi bi-people"></i>
                          <p>No hay estudiantes matriculados en este curso todavía.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <datalist id="ambitos-sugeridos">
                {AMBITOS_SUGERIDOS.map((ambito) => (
                  <option key={ambito} value={ambito} />
                ))}
              </datalist>
            </div>

            <div className="acciones" style={{ marginTop: 20 }}>
              <button className="btn-guardar" onClick={guardarDestrezas} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar destrezas"}
              </button>
            </div>
          </Card>
        )}

        {esElemental && (
          <>
            <Card as="section" className="tabla-section">
              <div className="tabla-section-header">
                <div className="tabla-section-titulo">
                  <span className="icono-nivel">
                    <i className="bi bi-journal-bookmark-fill"></i>
                  </span>
                  <div>
                    <h2>Actividades y promedio</h2>
                    <p>Educación General Básica — Elemental</p>
                  </div>
                </div>
                <button className="btn-columna" onClick={abrirModalElemental} disabled={!materiaCursoId || !periodoId}>
                  <i className="bi bi-pencil-square"></i> Actividades
                </button>
              </div>

              <div className="tabla-container">
                <table className="tabla-notas">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Estudiante</th>
                      <th>Promedio</th>
                      <th>Equivalencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesElemental.map((est, fila) => {
                      const numeros = valoresNumericos(est.notas);
                      const promedio = promedioTruncado(numeros);
                      const hayNotas = numeros.length > 0;
                      return (
                        <tr key={est.id}>
                          <td>{fila + 1}</td>
                          <td>{est.nombre}</td>
                          <td>
                            <span className={claseNota(hayNotas, promedio >= 7)}>{promedio.toFixed(2)}</span>
                          </td>
                          <td>{equivalenciaDesdeNumero(promedio, hayNotas)}</td>
                        </tr>
                      );
                    })}
                    {!estudiantesElemental.length && (
                      <tr>
                        <td colSpan={4}>
                          <div className="estado-vacio">
                            <i className="bi bi-people"></i>
                            <p>No hay estudiantes matriculados en este curso todavía.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {modalElementalAbierto && (
              <div className="modal-overlay" onMouseDown={cerrarModalElemental}>
                <div
                  className="modal-grande"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Registro de actividades"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>
                      <i className="bi bi-journal-bookmark-fill"></i> Actividades
                    </h2>
                    <div className="acciones-header">
                      <button className="btn-agregar-columna" onClick={agregarColumnaElemental}>
                        <i className="bi bi-plus-lg"></i> Añadir actividad
                      </button>
                      <button className="btn-cerrar" onClick={cerrarModalElemental}>
                        ✕
                      </button>
                    </div>
                  </div>

                  <table className="tabla-modal">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Estudiante</th>
                        {columnasElemental.map((nombre, indice) => (
                          <th key={indice} className="columna-actividad">
                            <button
                              type="button"
                              className="btn-quitar-columna"
                              onClick={() => eliminarColumnaElemental(indice)}
                              aria-label="Eliminar actividad"
                            >
                              ✕
                            </button>
                            <input
                              className="input-nombre-actividad"
                              type="text"
                              value={nombre}
                              onChange={(e) => renombrarColumnaElemental(indice, e.target.value)}
                            />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantesElemental.map((est, fila) => (
                        <tr key={est.id}>
                          <td>{fila + 1}</td>
                          <td>{est.nombre}</td>
                          {est.notas.map((valor, columna) => (
                            <td key={columna}>
                              <input
                                id={idCelda("elemental", columna, fila)}
                                type="number"
                                min="0"
                                max="10"
                                step="0.01"
                                className="input-nota"
                                value={valor}
                                onChange={(e) => cambiarCeldaElemental(est.id, columna, e.target.value)}
                                onKeyDown={(e) => manejarEnter(e, idCelda("elemental", columna, fila + 1))}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {mensaje && (
                    <div className={mensajeTipo === "exito" ? "mensaje-exito" : "mensaje-error"}>{mensaje}</div>
                  )}

                  <div className="modal-footer">
                    <button className="btn-cancelar" onClick={cerrarModalElemental}>
                      Cancelar
                    </button>
                    <button className="btn-guardar" onClick={guardarYcerrarModalElemental} disabled={guardando}>
                      {guardando ? "Guardando..." : "Guardar Actividades"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {esMedia && (
          <>
            <Card as="section" className="tabla-section">
              <div className="tabla-section-header">
                <div className="tabla-section-titulo">
                  <span className="icono-nivel">
                    <i className="bi bi-bar-chart-fill"></i>
                  </span>
                  <div>
                    <h2>Insumos y nota final</h2>
                    <p>Educación General Básica Media / Bachillerato</p>
                  </div>
                </div>
              </div>

              <div className="tabla-container">
                <table className="tabla-notas">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Estudiante</th>
                      <th>
                        <button
                          type="button"
                          className="btn-insumo-header"
                          onClick={() => abrirModalMedia("insumo1")}
                          disabled={!materiaCursoId || !periodoId}
                        >
                          Insumo 1
                        </button>
                      </th>
                      <th>
                        <button
                          type="button"
                          className="btn-insumo-header"
                          onClick={() => abrirModalMedia("insumo2")}
                          disabled={!materiaCursoId || !periodoId}
                        >
                          Insumo 2
                        </button>
                      </th>
                      <th>Proyecto</th>
                      <th>Examen</th>
                      <th>Formativa (70%)</th>
                      <th>Proyecto (15%)</th>
                      <th>Examen (15%)</th>
                      <th>Nota Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesMedia.map((est, fila) => {
                      const d = calcularDesglose(est);
                      return (
                        <tr key={est.id}>
                          <td>{fila + 1}</td>
                          <td>{est.nombre}</td>
                          <td className="celda-insumo">{d.insumo1.toFixed(2)}</td>
                          <td className="celda-insumo">{d.insumo2.toFixed(2)}</td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.01"
                              className="input-nota"
                              value={est.proyecto}
                              onChange={(e) => cambiarProyectoExamen("proyecto", est.id, e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.01"
                              className="input-nota"
                              value={est.examen}
                              onChange={(e) => cambiarProyectoExamen("examen", est.id, e.target.value)}
                            />
                          </td>
                          <td>{d.p1.toFixed(2)}</td>
                          <td>{d.p2.toFixed(2)}</td>
                          <td>{d.p3.toFixed(2)}</td>
                          <td>
                            <span className={claseNota(d.hayDatos, d.notaFinal >= 7)}>{d.notaFinal.toFixed(2)}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {!estudiantesMedia.length && (
                      <tr>
                        <td colSpan={10}>
                          <div className="estado-vacio">
                            <i className="bi bi-people"></i>
                            <p>No hay estudiantes matriculados en este curso todavía.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="acciones" style={{ marginTop: 20 }}>
                <button className="btn-guardar" onClick={guardarMedia} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar Proyecto y Examen"}
                </button>
              </div>
            </Card>

            {modalMediaAbierto && (
              <div className="modal-overlay" onMouseDown={cerrarModalMedia}>
                <div
                  className="modal-grande"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Registro de ${ETIQUETA_INSUMO[modalMediaAbierto]}`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="modal-header">
                    <h2>{ETIQUETA_INSUMO[modalMediaAbierto]}</h2>
                    <div className="acciones-header">
                      <button className="btn-cerrar" onClick={cerrarModalMedia}>
                        ✕
                      </button>
                    </div>
                  </div>

                  {CATEGORIAS_POR_INSUMO[modalMediaAbierto].map((categoria) => (
                    <div key={categoria} className="subseccion-insumo">
                      <div className="subseccion-insumo-titulo">
                        <h3>{ETIQUETA_CATEGORIA[categoria]}</h3>
                        <button className="btn-agregar-columna" onClick={() => agregarColumnaMedia(categoria)}>
                          <i className="bi bi-plus-lg"></i> Añadir {ETIQUETA_CATEGORIA[categoria].toLowerCase()}
                        </button>
                      </div>

                      <div className="tabla-container">
                        <table className="tabla-modal">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Estudiante</th>
                              {columnasMedia[categoria].map((nombre, indice) => (
                                <th key={indice} className="columna-actividad">
                                  <button
                                    type="button"
                                    className="btn-quitar-columna"
                                    onClick={() => eliminarColumnaMedia(categoria, indice)}
                                    aria-label="Eliminar actividad"
                                  >
                                    ✕
                                  </button>
                                  <input
                                    className="input-nombre-actividad"
                                    type="text"
                                    value={nombre}
                                    onChange={(e) => renombrarColumnaMedia(categoria, indice, e.target.value)}
                                  />
                                </th>
                              ))}
                            </tr>
                          </thead>
                        <tbody>
                          {estudiantesMedia.map((est, fila) => (
                            <tr key={est.id}>
                              <td>{fila + 1}</td>
                              <td>{est.nombre}</td>
                              {est[categoria].map((valor, columna) => (
                                <td key={columna}>
                                  <input
                                    id={idCelda(categoria, columna, fila)}
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.01"
                                    className="input-nota"
                                    value={valor}
                                    onChange={(e) => cambiarCeldaMedia(categoria, est.id, columna, e.target.value)}
                                    onKeyDown={(e) => manejarEnter(e, idCelda(categoria, columna, fila + 1))}
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                        </table>
                      </div>
                    </div>
                  ))}

                  {mensaje && (
                    <div className={mensajeTipo === "exito" ? "mensaje-exito" : "mensaje-error"}>{mensaje}</div>
                  )}

                  <div className="modal-footer">
                    <button className="btn-cancelar" onClick={cerrarModalMedia}>
                      Cancelar
                    </button>
                    <button className="btn-guardar" onClick={guardarYcerrarModalMedia} disabled={guardando}>
                      {guardando ? "Guardando..." : `Guardar ${ETIQUETA_INSUMO[modalMediaAbierto]}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {!esDestrezas && !esElemental && !esMedia && cursoSeleccionado && (
          <Card as="section" className="tabla-section">
            <div className="estado-vacio">
              <i className="bi bi-mortarboard"></i>
              <p>Selecciona un curso, materia y trimestre para comenzar.</p>
            </div>
          </Card>
        )}

        {!esDestrezas && (esElemental || esMedia) && materiasCurso.length === 0 && (
          <div className="mensaje-error">
            Este curso todavía no tiene materias asignadas. Ve a Materias para asignarle una.
          </div>
        )}
      </div>
    </MainLayout>
  );
}
