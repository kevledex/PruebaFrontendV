import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout"; import BackHomeButton from "../../components/common/BackHomeButton";
import Card from "../../components/common/Card";
import { permisosDisponibles, type EstadoRol, type RolSistema } from "../../utils/rolesStorage";
import { api, getApiErrorMessage } from "../../api/client";
import "./Roles.css";

const inicial = { nombre: "", descripcion: "", permisos: [] as string[], estado: "Activo" as EstadoRol };
function Roles() {

    const [roles, setRoles] = useState<RolSistema[]>([]),
        [form, setForm] = useState(inicial),
        [modal, setModal] = useState(false), [buscar, setBuscar] = useState(""),
        [filtro, setFiltro] = useState(""),
        [editando, setEditando] = useState<number | null>(null),
        [mensaje, setMensaje] = useState(""), [error, setError] = useState("");

    useEffect(() => { api.get<RolSistema[]>("/roles").then(setRoles).catch(e => setMensaje(getApiErrorMessage(e))) }, []);
    const filtrados = useMemo(() => {
        const t = buscar.trim().toLowerCase();
        return roles.filter(r => (!t || `${r.nombre} ${r.descripcion} ${r.permisos.join(" ")}`.toLowerCase().includes(t)) && (!filtro || r.estado === filtro))
    },
        [buscar, filtro, roles]);

    const cerrar = () => {
        setModal(false);
        setForm(inicial); setEditando(null);
        setError("")
    };

    const nuevo = () => {
        setForm(inicial);
        setEditando(null); setError("");
        setModal(true)
    };
    const permiso = (p: string) => {
        setForm(a => ({ ...a, permisos: a.permisos.includes(p) ? a.permisos.filter(x => x !== p) : [...a.permisos, p] }));
        setError("")
    };

    async function guardar(e: FormEvent) {
        e.preventDefault(); const nombre = form.nombre.trim(),
            descripcion = form.descripcion.trim();
        if (roles.some(r => r.nombre.toLowerCase() === nombre.toLowerCase() && r.id !== editando))
            return setError("Ya existe un rol con este nombre.");
        if (!form.permisos.length) return setError("Selecciona al menos un acceso para el rol.");
        try {
            const payload = { nombre, descripcion, permisos: form.permisos, estado: form.estado, protegido: false };
            if (editando !== null) {
                const actualizado = await api.put<RolSistema>(`/roles/${editando}`, payload);
                setRoles(a => a.map(r => r.id === editando ? actualizado : r)); setMensaje("Rol actualizado correctamente.")
            }
            else {
                const creado = await api.post<RolSistema>("/roles", payload); setRoles(a => [...a, creado]);
                setMensaje("Rol creado correctamente. Ya puedes asignarlo a un docente.")
            } cerrar()
        }
        catch (e) { setError(getApiErrorMessage(e)) }
    }

    function editar(r: RolSistema) {
        setForm({ nombre: r.nombre, descripcion: r.descripcion, permisos: [...r.permisos], estado: r.estado });
        setEditando(r.id); setModal(true)
    }
    async function estado(r: RolSistema) {
        if (r.protegido) return setMensaje("El rol Administrador no puede desactivarse.");
        try {
            const actualizado = await api.put<RolSistema>(`/roles/${r.id}`, { ...r, estado: r.estado === "Activo" ? "Inactivo" : "Activo" });
            setRoles(a => a.map(x => x.id === r.id ? actualizado : x)); setMensaje("Estado actualizado correctamente.")
        }
        catch (e) { setMensaje(getApiErrorMessage(e)) }
    }
    async function eliminar(r: RolSistema) {
        if (r.protegido) return setMensaje("El rol Administrador no puede eliminarse.");
        if (r.usuarios > 0)
            return setMensaje(`No se puede eliminar "${r.nombre}" porque tiene usuarios asignados.`);
        if (confirm(`\u00bfDeseas eliminar el rol "${r.nombre}"?`)) {
            try {
                await api.delete(`/roles/${r.id}`); setRoles(a => a.filter(x => x.id !== r.id));
                setMensaje("Rol eliminado correctamente.")
            } catch (e) { setMensaje(getApiErrorMessage(e)) }
        }
    }

    return <MainLayout><div className="roles-page">
        <header className="roles-header">
            <div>
                <p className="roles-label">Administraci&oacute;n</p>
                <h1>Gesti&oacute;n de roles</h1>
                <p>Define accesos personalizados y as&iacute;gnalos al personal docente.</p>
            </div>

            <div className="roles-header-actions">
                <button className="roles-create-button" onClick={nuevo}>
                    <i className="bi bi-plus-lg" /> Crear nuevo rol
                </button>
                <BackHomeButton />
            </div>
        </header>
        {mensaje && <p className="roles-notification" role="status">{mensaje}</p>}
        <section className="roles-summary">
            <Card as="article">
                <span>
                    <i className="bi bi-shield-check" />
                </span>
                <div>
                    <strong>
                        {roles.length}
                    </strong>
                    <small>Roles registrados</small>
                </div>
            </Card>

            <Card as="article">
                <span>
                    <i className="bi bi-check-circle-fill" />
                </span>
                <div>
                    <strong>
                        {roles.filter(r => r.estado === "Activo").length}
                    </strong>
                    <small>Roles activos</small>
                </div>
            </Card>
            <Card as="article">
                <span>
                    <i className="bi bi-people-fill" />
                </span>
                <div>
                    <strong>{roles.reduce((n, r) => n + r.usuarios, 0)}
                    </strong>
                    <small>Usuarios asignados</small>
                </div>
            </Card>
        </section>
        <Card as="section" className="roles-list-card">
            <div className="roles-list-header"><div>
                <p className="roles-label">Registros</p>
                <h2>Roles del sistema</h2>
            </div>
                <label className="roles-search">
                    <i className="bi bi-search" />
                    <input type="search" aria-label="Buscar roles"
                        placeholder="Buscar por nombre o acceso" value={buscar}
                        onChange={e => setBuscar(e.target.value)} />
                </label>
            </div>
            <div className="roles-filters">
                <label>
                    <span>Estado</span>
                    <select value={filtro} onChange={e => setFiltro(e.target.value)}>
                        <option value="">Todos los estados</option>
                        <option>Activo</option>
                        <option>Inactivo</option>
                    </select>
                </label>
                <p>Mostrando <strong>{filtrados.length}</strong> de <strong>{roles.length}</strong> roles</p>
            </div>
            <div className="roles-table-wrapper">
                <table className="roles-table">
                    <thead>
                        <tr>
                            <th>Rol</th>
                            <th>Descripci&oacute;n</th>
                            <th>Accesos</th>
                            <th>Usuarios</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>{filtrados.map(r => <tr key={r.id}>
                        <td><div className="roles-name">
                            <span>{r.nombre[0]}</span>
                            <strong>{r.nombre}</strong>
                        </div>
                        </td>
                        <td className="roles-description">{r.descripcion}
                        </td>
                        <td>
                            <div className="roles-access-list">{r.permisos.map(p =>
                                <span className="roles-access" key={p}>{p}</span>)}
                            </div>
                        </td>
                        <td>{r.usuarios}</td>
                        <td>
                            <button className={`roles-status roles-status--${r.estado.toLowerCase()}`} onClick={() => estado(r)}>
                                <span />{r.estado}</button>
                        </td>
                        <td>
                            <div className="roles-actions">
                                <button className="roles-action-button roles-action-button--edit" onClick={() => editar(r)} title="Editar">
                                    <i className="bi bi-pencil-square" />
                                </button>
                                <Link className="roles-action-button roles-action-button--assign" to={`/docentes?rol=${r.id}`} aria-label={`Asignar ${r.nombre} a un docente`} title="Asignar a docente">
                                    <i className="bi bi-person-plus-fill" />
                                </Link>
                                <button className="roles-action-button roles-action-button--delete" onClick={() => eliminar(r)} title={r.protegido ? "Rol protegido" : "Eliminar"}><i className="bi bi-trash3" />
                                </button>
                            </div>
                        </td>
                    </tr>)}</tbody>
                </table>{!filtrados.length &&
                    <div className="roles-empty">
                        <p>No se encontraron roles.</p>
                    </div>}
            </div>
        </Card>
        {modal && <div className="roles-modal-overlay" onMouseDown={cerrar}>
            <div className="roles-modal" role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()}>
                <div className="roles-modal-header"><div><p>{editando === null ? "Nuevo rol" : "Edici\u00f3n"}
                </p><h2>{editando === null ? "Crear nuevo rol" : "Actualizar rol"}</h2>
                </div>
                    <button onClick={cerrar} aria-label="Cerrar">&#10005;</button>
                </div><form onSubmit={guardar}>
                    <div className="roles-form-grid">
                        <label>
                            <span>Nombre del rol</span>
                            <input autoFocus required maxLength={40} placeholder={"Ej. Coordinador acad\u00e9mico"} value={form.nombre} onChange={e => setForm(a => ({ ...a, nombre: e.target.value }))} />
                        </label>
                        <label>
                            <span>Estado</span>
                            <select value={form.estado} onChange={e => setForm(a => ({ ...a, estado: e.target.value as EstadoRol }))}>
                                <option>Activo</option>
                                <option>Inactivo</option>
                            </select>
                        </label>
                        <label className="roles-description-field"><span>Descripci&oacute;n</span>
                            <textarea required maxLength={180} rows={3} value={form.descripcion} onChange={e => setForm(a => ({ ...a, descripcion: e.target.value }))} />
                        </label>
                    </div>
                    <fieldset className="roles-permissions">
                        <legend>Accesos del rol</legend>
                        <p>Selecciona los m&oacute;dulos que podr&aacute; utilizar.</p>
                        <div>{permisosDisponibles.map(p => <label key={p} className={form.permisos.includes(p) ? "roles-permission--selected" : ""}>
                            <input type="checkbox" checked={form.permisos.includes(p)} onChange={() => permiso(p)} /><i className="bi bi-check-circle-fill" />
                            <span>{p}</span>
                        </label>)}
                        </div>
                    </fieldset>{error && <p className="roles-message roles-message--error">{error}</p>}
                    <div className="roles-form-actions"><div>
                        <button type="button" className="roles-cancel-button" onClick={cerrar}>Cancelar

                        </button>
                        <button className="roles-save-button"><i className="bi bi-check-lg" />
                            {editando === null ? "Crear rol" : "Guardar cambios"}
                        </button>
                    </div>
                    </div>
                </form>
            </div>
        </div>}
    </div>
    </MainLayout>
}
export default Roles;
