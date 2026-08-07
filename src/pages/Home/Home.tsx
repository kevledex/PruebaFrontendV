import { Link, Navigate } from "react-router-dom";
import MainLayout from "../../layouts/MainLayout";
import Card from "../../components/common/Card";
import "./Home.css";

interface ModuleCard {
  title: string;
  description: string;
  icon: string;
  path: string;
  colorClass: string;
  permission: string;
  roles?: string[];
}

const modules: ModuleCard[] = [
  {
    title: "Gestion de usuarios",
    description: "Crear cuentas y asignar roles a los usuarios.",
    icon: "bi-person-gear",
    path: "/usuarios",
    permission: "Gestión de roles",
    colorClass: "roles-card",
  },
  {
    title: "Gestión de roles",
    description: "Administrar los permisos y roles de los usuarios.",
    icon: "bi-people-fill",
    path: "/roles",
    permission: "Gestión de roles",
    colorClass: "roles-card",
  },
  {
    title: "Ingreso de notas",
    description: "Registrar y actualizar las calificaciones académicas.",
    icon: "bi-journal-check",
    path: "/notas",
    permission: "Notas",
    roles: ["Admin", "Docente"],
    colorClass: "grades-card",
  },
  {
    title: "Asistencia",
    description: "Registrar la asistencia diaria de los estudiantes.",
    icon: "bi-calendar-check-fill",
    path: "/asistencia",
    permission: "Asistencia",
    roles: ["Admin", "Docente"],
    colorClass: "attendance-card",
  },
  {
    title: "Calificaciones de mis hijos",
    description: "Consulta el rendimiento académico de tus hijos por trimestre.",
    icon: "bi-person-hearts",
    path: "/padres",
    permission: "Notas",
    roles: ["Representante"],
    colorClass: "parents-card",
  },
  {
    title: "Generar reporte",
    description: "Genera el reporte PDF de calificaciones de un estudiante.",
    icon: "bi-file-earmark-pdf-fill",
    path: "/reportes",
    permission: "Notas",
    roles: ["Admin", "Docente"],
    colorClass: "grades-card",
  },
  {
    title: "Ingreso de representantes",
    description: "Registrar y administrar los representantes de estudiantes.",
    icon: "bi-person-vcard-fill",
    path: "/ingreso-padres",
    permission: "Representantes",
    colorClass: "parents-card",
  },
    {
    title: "Mensajes",
    description: "Enviar mensajes a los cursos",
    icon: "bi-chat-left-text-fill",
    path: "/mensajes",
    permission: "Mensajes",
    colorClass: "messages-card",
    },
  {
    title: "Ingreso de estudiantes",
    description: "Registrar y consultar la información de los estudiantes.",
    icon: "bi-person-plus-fill",
    path: "/estudiantes",
    permission: "Estudiantes",
    roles: ["Admin"],
    colorClass: "students-card",
  },
  {
  title: "Registro de docentes",
  description: "Registrar, editar y administrar la información de los docentes.",
  icon: "bi-person-badge-fill",
  path: "/docentes",
  permission: "Docentes",
  colorClass: "teachers-card",
},
  {
  title: "Años lectivos y cursos",
  description: "Configurar el año lectivo activo y los cursos disponibles.",
  icon: "bi-calendar-range-fill",
  path: "/cursos",
  permission: "Cursos",
  colorClass: "teachers-card",
},
  {
  title: "Materias",
  description: "Registrar y administrar las materias del plan de estudios.",
  icon: "bi-journal-bookmark-fill",
  path: "/materias",
  permission: "Cursos",
  colorClass: "teachers-card",
},
];

function Home() {
  const autenticado =
    localStorage.getItem("usuarioAutenticado") === "true";

  if (!autenticado) {
    return <Navigate to="/login" replace />;
  }

  const nombreUsuario =
    localStorage.getItem("nombreUsuario") || "Usuario";
  const normalizar = (texto: string) =>
    texto
      .normalize("NFD")
      .replace(new RegExp("[̀-ͯ]", "g"), "")
      .trim()
      .toLowerCase();
  const permisos: string[] = JSON.parse(localStorage.getItem("permisosUsuario") ?? "[]");
  const permisosNormalizados = permisos.map(normalizar);
  const rolUsuario = localStorage.getItem("rolUsuario") ?? "";
  const modulosVisibles = modules.filter((modulo) => {
    const tienePermiso = permisosNormalizados.includes(normalizar(modulo.permission));
    const tieneRol = !modulo.roles || modulo.roles.includes(rolUsuario);
    return tienePermiso && tieneRol;
  });

  return (
    <MainLayout>
      <div className="home-content">
        <section className="welcome-section">
          <div>
            <p className="welcome-label">Panel principal</p>

            <h1>Bienvenido, {nombreUsuario}</h1>

            <p>
              Administra la información académica de la Escuela de
              Educación Básica República de Venezuela.
            </p>
          </div>

          <div className="welcome-icon">
            <i className="bi bi-mortarboard-fill"></i>
          </div>
        </section>

        <section className="institution-section">
          <Card as="article" className="institution-card">
            <div className="institution-icon">
              <i className="bi bi-bullseye"></i>
            </div>

            <div>
              <h2>Misión</h2>

              <p>
                Formar estudiantes con valores, pensamiento crítico,
                responsabilidad y compromiso social mediante una educación
                integral y de calidad.
              </p>
            </div>
          </Card>

          <Card as="article" className="institution-card">
            <div className="institution-icon">
              <i className="bi bi-eye-fill"></i>
            </div>

            <div>
              <h2>Visión</h2>

              <p>
                Ser una institución reconocida por su excelencia académica,
                innovación educativa y formación de ciudadanos íntegros.
              </p>
            </div>
          </Card>
        </section>

        <br />

        <section className="modules-section">
          <div className="section-title">
            <p>Accesos rápidos</p>
            <h2>Módulos del sistema</h2>
          </div>

          <div className="modules-grid">
            {modulosVisibles.map((module) => (
              <Link
                to={module.path}
                className={`module-card ${module.colorClass}`}
                key={module.title}
              >
                <div className="module-icon">
                  <i className={`bi ${module.icon}`}></i>
                </div>

                <div className="module-information">
                  <h3>{module.title}</h3>
                  <p>{module.description}</p>

                  <span>
                    Ingresar
                    <i className="bi bi-arrow-right"></i>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

export default Home;
