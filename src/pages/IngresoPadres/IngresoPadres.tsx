import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import BuscadorSelector from "../../components/common/BuscadorSelector";
import "./IngresoPadres.css";
import { api, getApiErrorMessage } from "../../api/client";

interface Representante {
    id: number;
    nombres: string;
    apellidos: string;
    identificacion: string;
    telefono: string;
    correo: string;
    parentesco: string;
    estudiante: string;
    curso: string;
}

interface Curso {
    id: number;
    nivel: string;
    grado: string;
    paralelo: string;
}

interface AlumnoResumen {
    id: number;
    nombres: string;
    apellidos: string;
    cedula: string;
    curso: Curso | null;
}

type RepresentanteForm = Omit<Representante, "id">;

const formularioVacio: RepresentanteForm = {
    nombres: "",
    apellidos: "",
    identificacion: "",
    telefono: "",
    correo: "",
    parentesco: "",
    estudiante: "",
    curso: "",
};

export default function IngresoPadres() {
    const autenticado = localStorage.getItem("usuarioAutenticado") === "true";
    const [representantes, setRepresentantes] =
        useState<Representante[]>([]);
    const [alumnos, setAlumnos] = useState<AlumnoResumen[]>([]);
    const [alumnoSeleccionadoId, setAlumnoSeleccionadoId] = useState<number | null>(null);
    const [formulario, setFormulario] =
        useState<RepresentanteForm>(formularioVacio);
    const [editandoId, setEditandoId] = useState<number | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        Promise.all([
            api.get<Representante[]>("/representantes"),
            api.get<AlumnoResumen[]>("/alumnos"),
        ])
            .then(([listaRepresentantes, listaAlumnos]) => {
                setRepresentantes(listaRepresentantes);
                setAlumnos(listaAlumnos);
            })
            .catch((error) => setMensaje(getApiErrorMessage(error)));
    }, []);

    const opcionesEstudiantes = useMemo(
        () =>
            alumnos.map((alumno) => ({
                id: alumno.id,
                titulo: `${alumno.nombres} ${alumno.apellidos}`,
                subtitulo: `C.I. ${alumno.cedula}`,
            })),
        [alumnos],
    );

    function seleccionarEstudiante(alumnoId: number | null) {
        const alumno = alumnos.find((item) => item.id === alumnoId) ?? null;
        setAlumnoSeleccionadoId(alumno?.id ?? null);
        setFormulario((actual) => ({
            ...actual,
            estudiante: alumno ? `${alumno.nombres} ${alumno.apellidos}` : "",
            curso: alumno?.curso ? `${alumno.curso.grado} "${alumno.curso.paralelo}"` : "",
        }));
        setMensaje("");
    }

    const representantesFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (!texto) return representantes;

        return representantes.filter((representante) =>
            [
                representante.nombres,
                representante.apellidos,
                representante.identificacion,
                representante.estudiante,
                representante.curso,
            ]
                .join(" ")
                .toLowerCase()
                .includes(texto),
        );
    }, [busqueda, representantes]);

    if (!autenticado) return <Navigate to="/login" replace />;

    function actualizarCampo(
        campo: keyof RepresentanteForm,
        valor: string,
    ) {
        setFormulario((actual) => ({ ...actual, [campo]: valor }));
        setMensaje("");
    }

    async function guardarRepresentante(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const datos = Object.fromEntries(
            Object.entries(formulario).map(([clave, valor]) => [
                clave,
                valor.trim(),
            ]),
        ) as unknown as RepresentanteForm;

        try {
            if (editandoId !== null) {
                const guardado = await api.put<Representante>(`/representantes/${editandoId}`, datos);
                setRepresentantes((lista) => lista.map((item) => item.id === editandoId ? guardado : item));
                setMensaje("Los datos del representante se actualizaron correctamente.");
            } else {
                const guardado = await api.post<Representante>("/representantes", datos);
                setRepresentantes((lista) => [...lista, guardado]);
                setMensaje("El representante fue registrado correctamente.");
            }
        } catch (error) { setMensaje(getApiErrorMessage(error)); return; }

        setFormulario(formularioVacio);
        setAlumnoSeleccionadoId(null);
        setEditandoId(null);
    }

    function editarRepresentante(representante: Representante) {
        const { id, ...datos } = representante;
        setEditandoId(id);
        setFormulario(datos);
        setAlumnoSeleccionadoId(
            alumnos.find((alumno) => `${alumno.nombres} ${alumno.apellidos}` === representante.estudiante)?.id ?? null,
        );
        setMensaje("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(formularioVacio);
        setAlumnoSeleccionadoId(null);
        setMensaje("");
    }

    async function eliminarRepresentante(representante: Representante) {
        if (
            window.confirm(
                `¿Deseas eliminar a ${representante.nombres} ${representante.apellidos}?`,
            )
        ) {
            try {
                await api.delete(`/representantes/${representante.id}`);
                setRepresentantes((lista) => lista.filter((item) => item.id !== representante.id));
            } catch (error) { setMensaje(getApiErrorMessage(error)); }
        }
    }

    return (
        <MainLayout>
            <div className="parent-entry-page">
                <header className="parent-entry-heading">
                    <div>
                        <p className="parent-entry-eyebrow">Gestión estudiantil</p>
                        <h1>Registro de Representantes Legales</h1>
                        <p>
                            Registra los datos del representante y relaciónalo con un
                            estudiante.
                        </p>
                    </div>

                    <Link to="/home" className="parent-entry-back">
                        <i className="bi bi-arrow-left"></i>
                        Volver al inicio
                    </Link>
                </header>

                <section className="parent-entry-form-card">
                    <div className="parent-entry-card-title">
                        <span><i className="bi bi-person-plus-fill"></i></span>
                        <div>
                            <p>{editandoId ? "Actualización de información" : "Nuevo registro"}</p>
                            <h2>{editandoId ? "Editar representante" : "Datos del representante"}</h2>
                        </div>
                    </div>

                    <form onSubmit={guardarRepresentante}>
                        <fieldset>
                            <legend>Información personal</legend>
                            <div className="parent-entry-grid">
                                <label>
                                    <span>Nombres *</span>
                                    <input required value={formulario.nombres} onChange={(e) => 
                                        actualizarCampo("nombres", e.target.value)} placeholder="Ingrese los nombres" />
                                </label>
                                <label>
                                    <span>Apellidos *</span>
                                    <input required value={formulario.apellidos} onChange={(e) => 
                                        actualizarCampo("apellidos", e.target.value)} placeholder="Ingrese los apellidos" />
                                </label>
                                <label>
                                    <span>Cédula de identidad *</span>
                                    <input required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} value={formulario.identificacion} onChange={(e) => 
                                        actualizarCampo("identificacion", e.target.value.replace(/\D/g, ""))} placeholder="10 dígitos" />
                                </label>
                                <label>
                                    <span>Parentesco *</span>
                                    <select required value={formulario.parentesco} onChange={(e) => 
                                        actualizarCampo("parentesco", e.target.value)}>
                                        <option value="">Seleccione</option>
                                        <option>Madre</option>
                                        <option>Padre</option>
                                        <option>Representante legal</option>
                                        <option>Otro familiar</option>
                                    </select>
                                </label>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Datos de contacto</legend>
                            <div className="parent-entry-grid">
                                <label>
                                    <span>Teléfono *</span>
                                    <input required type="tel" value={formulario.telefono} onChange={(e) => 
                                        actualizarCampo("telefono", e.target.value)} placeholder="Ej. 099 123 4567" />
                                </label>
                                <label>
                                    <span>Correo electrónico *</span>
                                    <input required type="email" value={formulario.correo} onChange={(e) => 
                                        actualizarCampo("correo", e.target.value)} placeholder="correo@ejemplo.com" />
                                </label>
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend>Estudiante asociado</legend>
                            <div className="parent-entry-grid">
                                <label>
                                    <span>Estudiante *</span>
                                    <BuscadorSelector
                                        opciones={opcionesEstudiantes}
                                        seleccionId={alumnoSeleccionadoId}
                                        onSeleccionar={seleccionarEstudiante}
                                        placeholder="Buscar por cédula o nombre"
                                        mensajeVacio="No se encontraron estudiantes."
                                        requerido
                                    />
                                    {alumnos.length === 0 && (
                                        <small>
                                            No hay estudiantes registrados. Créalos primero en{" "}
                                            <a href="/estudiantes">Ingreso de estudiantes</a>.
                                        </small>
                                    )}
                                </label>
                                <label>
                                    <span>Curso y paralelo</span>
                                    <input required readOnly value={formulario.curso} placeholder="Se completa al elegir el estudiante" />
                                </label>
                            </div>
                        </fieldset>

                        {mensaje && <div className="parent-entry-message"><i className="bi bi-check-circle-fill"></i>{mensaje}</div>}

                        <div className="parent-entry-form-actions">
                            {editandoId && <button type="button" className="parent-entry-secondary" onClick={cancelarEdicion}>Cancelar</button>}
                            <button type="submit" className="parent-entry-primary">
                                <i className={`bi ${editandoId ? "bi-check-lg" : "bi-floppy-fill"}`}></i>
                                {editandoId ? "Guardar cambios" : "Registrar representante"}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="parent-entry-list-card">
                    <div className="parent-entry-list-header">
                        <div>
                            <p className="parent-entry-eyebrow">Registros</p>
                            <h2>Representantes registrados</h2>
                            <span>{representantesFiltrados.length} resultados</span>
                        </div>
                        <label className="parent-entry-search">
                            <i className="bi bi-search"></i>
                            <span className="parent-entry-sr-only">Buscar representante</span>
                            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar representante o estudiante..." />
                        </label>
                    </div>

                    <div className="parent-entry-table-wrapper">
                        <table className="parent-entry-table">
                            <thead><tr><th>Representante</th><th>Contacto</th><th>Estudiante</th><th>Parentesco</th><th>Acciones</th></tr></thead>
                            <tbody>
                                {representantesFiltrados.map((representante) => (
                                    <tr key={representante.id}>
                                        <td><div className="parent-entry-person">
                                            <span>{representante.nombres.charAt(0)}{representante.apellidos.charAt(0)}</span><div><strong>
                                                {representante.nombres} {representante.apellidos}</strong><small>C.I. {representante.identificacion}</small></div></div></td>
                                        <td><div className="parent-entry-contact">
                                            <span>{representante.telefono}</span><small>{representante.correo}</small></div></td>
                                        <td><strong>{representante.estudiante}</strong>
                                        <small className="parent-entry-course">{representante.curso}</small></td>
                                        <td><span className="parent-entry-relation">{representante.parentesco}</span></td>
                                        <td><div className="parent-entry-actions">
                                            <button onClick={() => editarRepresentante(representante)} aria-label="Editar representante">
                                                <i className="bi bi-pencil-square"></i></button><button onClick={() => 
                                                    eliminarRepresentante(representante)} aria-label="Eliminar representante"><i className="bi bi-trash3"></i></button></div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!representantesFiltrados.length && <div className="parent-entry-empty"><i className="bi bi-people">
                            </i><h3>No hay resultados</h3><p>Intenta buscar con otros datos.</p></div>}
                    </div>
                </section>
            </div>
        </MainLayout>
    );
}
