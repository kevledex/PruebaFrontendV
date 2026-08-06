import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import "../Cursos/Cursos.css";
import { api, getApiErrorMessage } from "../../api/client";

interface Materia {
  id: number;
  nombre: string;
  descripcion: string;
  esOptativaOAdicional: boolean;
  cuentaParaPromocion: boolean;
}

interface Curso {
  id: number;
  nivel: string;
  grado: string;
  paralelo: string;
}

const formularioInicial = {
  nombre: "",
  descripcion: "",
  esOptativaOAdicional: false,
};

const formularioAsignacionInicial = {
  materiaId: "",
  cursoId: "",
};

const PERIODOS_PEDAGOGICOS_POR_DEFECTO = 4;

function Materias() {
  const autenticado = localStorage.getItem("usuarioAutenticado") === "true";

  const [materias, setMaterias] = useState<Materia[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [formulario, setFormulario] = useState(formularioInicial);
  const [formularioAsignacion, setFormularioAsignacion] = useState(formularioAsignacionInicial);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [mensajeAsignacion, setMensajeAsignacion] = useState("");

  useEffect(() => {
    Promise.all([api.get<Materia[]>("/materias"), api.get<Curso[]>("/cursos")])
      .then(([listaMaterias, listaCursos]) => {
        setMaterias(listaMaterias);
        setCursos(listaCursos);
      })
      .catch((error) => setMensaje(getApiErrorMessage(error)));
  }, []);

  async function asignarMateriaACurso(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMensajeAsignacion("");

    if (!formularioAsignacion.materiaId || !formularioAsignacion.cursoId) {
      setMensajeAsignacion("Selecciona la materia y el curso.");
      return;
    }

    try {
      await api.post(`/cursos/${formularioAsignacion.cursoId}/materias`, {
        materia: { id: Number(formularioAsignacion.materiaId) },
        periodosPedagogicosSemana: PERIODOS_PEDAGOGICOS_POR_DEFECTO,
      });
      setMensajeAsignacion("Materia asignada al curso correctamente. Ya puedes usarla en Ingreso de notas.");
      setFormularioAsignacion(formularioAsignacionInicial);
    } catch (error) {
      setMensajeAsignacion(getApiErrorMessage(error));
    }
  }

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  async function guardarMateria(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      nombre: formulario.nombre.trim(),
      descripcion: formulario.descripcion.trim(),
      esOptativaOAdicional: formulario.esOptativaOAdicional,
      cuentaParaPromocion: !formulario.esOptativaOAdicional,
    };

    try {
      if (editandoId !== null) {
        const guardado = await api.put<Materia>(`/materias/${editandoId}`, payload);
        setMaterias((actuales) => actuales.map((item) => (item.id === editandoId ? guardado : item)));
        setMensaje("Materia actualizada correctamente.");
      } else {
        const guardado = await api.post<Materia>("/materias", payload);
        setMaterias((actuales) => [...actuales, guardado]);
        setMensaje("Materia registrada correctamente.");
      }
    } catch (error) {
      setMensaje(getApiErrorMessage(error));
      return;
    }

    setFormulario(formularioInicial);
    setEditandoId(null);
  }

  function editarMateria(materia: Materia) {
    setFormulario({
      nombre: materia.nombre,
      descripcion: materia.descripcion,
      esOptativaOAdicional: materia.esOptativaOAdicional,
    });
    setEditandoId(materia.id);
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelarEdicion() {
    setFormulario(formularioInicial);
    setEditandoId(null);
    setMensaje("");
  }

  async function eliminarMateria(materia: Materia) {
    if (!window.confirm(`¿Deseas eliminar la materia "${materia.nombre}"?`)) return;
    try {
      await api.delete(`/materias/${materia.id}`);
      setMaterias((actuales) => actuales.filter((item) => item.id !== materia.id));
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
            <h1>Materias</h1>
            <p>Registra las materias del plan de estudios.</p>
          </div>
          <BackHomeButton />
        </header>

        {mensaje && <p className="students-message">{mensaje}</p>}

        <Card as="section" className="students-form-card">
          <div className="students-card-title">
            <span><i className="bi bi-journal-bookmark-fill"></i></span>
            <div>
              <p>{editandoId === null ? "Nuevo registro" : "Edición"}</p>
              <h2>{editandoId === null ? "Datos de la materia" : "Actualizar materia"}</h2>
            </div>
          </div>

          <form onSubmit={guardarMateria}>
            <div className="students-form-grid">
              <label>
                <span>Nombre</span>
                <input
                  required
                  maxLength={50}
                  placeholder="Ej. Matemática"
                  value={formulario.nombre}
                  onChange={(event) => setFormulario((actual) => ({ ...actual, nombre: event.target.value }))}
                />
              </label>

              <label>
                <span>Descripción</span>
                <input
                  required
                  maxLength={200}
                  placeholder="Descripción breve de la materia"
                  value={formulario.descripcion}
                  onChange={(event) => setFormulario((actual) => ({ ...actual, descripcion: event.target.value }))}
                />
              </label>

              <label>
                <span>¿Es optativa o adicional?</span>
                <select
                  value={formulario.esOptativaOAdicional ? "si" : "no"}
                  onChange={(event) =>
                    setFormulario((actual) => ({ ...actual, esOptativaOAdicional: event.target.value === "si" }))
                  }
                >
                  <option value="no">No</option>
                  <option value="si">Sí</option>
                </select>
              </label>
            </div>

            {formulario.esOptativaOAdicional && (
              <p className="students-message">
                Las materias optativas o adicionales se evalúan de forma cualitativa y no cuentan para la promoción.
              </p>
            )}

            <div className="students-form-actions">
              {editandoId !== null && (
                <button type="button" className="students-save-button" style={{ background: "#475569" }} onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="students-save-button">
                <i className="bi bi-check-lg"></i>
                {editandoId === null ? "Registrar materia" : "Guardar cambios"}
              </button>
            </div>
          </form>
        </Card>

        <Card as="section" className="students-list-card">
          <div className="students-list-header">
            <div>
              <p className="students-label">Registros</p>
              <h2>Materias registradas</h2>
            </div>
          </div>

          <div className="students-table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Optativa/Adicional</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {materias.map((materia) => (
                  <tr key={materia.id}>
                    <td><strong>{materia.nombre}</strong></td>
                    <td>{materia.descripcion}</td>
                    <td>{materia.esOptativaOAdicional ? "Sí" : "No"}</td>
                    <td>
                      <div className="students-actions">
                        <button
                          type="button"
                          className="students-action-button students-action-button--edit"
                          onClick={() => editarMateria(materia)}
                          title="Editar"
                        >
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button
                          type="button"
                          className="students-action-button students-action-button--delete"
                          onClick={() => eliminarMateria(materia)}
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

            {materias.length === 0 && (
              <div className="students-empty">
                <i className="bi bi-search"></i>
                <p>No existen materias registradas.</p>
              </div>
            )}
          </div>
        </Card>

        <Card as="section" className="students-form-card">
          <div className="students-card-title">
            <span><i className="bi bi-mortarboard-fill"></i></span>
            <div>
              <p>Oferta académica</p>
              <h2>Asignar materia a un curso</h2>
            </div>
          </div>

          <p className="students-message">
            Una materia solo aparece en Ingreso de notas si está asignada a ese curso.
          </p>

          <form onSubmit={asignarMateriaACurso}>
            <div className="students-form-grid">
              <label>
                <span>Materia</span>
                <select
                  required
                  value={formularioAsignacion.materiaId}
                  onChange={(event) =>
                    setFormularioAsignacion((actual) => ({ ...actual, materiaId: event.target.value }))
                  }
                >
                  <option value="">Seleccione una materia</option>
                  {materias.map((materia) => (
                    <option key={materia.id} value={materia.id}>{materia.nombre}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Curso</span>
                <select
                  required
                  value={formularioAsignacion.cursoId}
                  onChange={(event) =>
                    setFormularioAsignacion((actual) => ({ ...actual, cursoId: event.target.value }))
                  }
                >
                  <option value="">Seleccione un curso</option>
                  {cursos.map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.grado} "{curso.paralelo}" · {curso.nivel}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {mensajeAsignacion && <p className="students-message">{mensajeAsignacion}</p>}

            <div className="students-form-actions">
              <button type="submit" className="students-save-button">
                <i className="bi bi-check-lg"></i>
                Asignar al curso
              </button>
            </div>
          </form>
        </Card>
      </div>
    </MainLayout>
  );
}

export default Materias;
