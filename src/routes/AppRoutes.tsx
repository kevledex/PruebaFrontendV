import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Login from "../pages/Login/Login";
import Home from "../pages/Home/Home";
import Notas from "../pages/Notas/Notas";
import Padres from "../pages/Padres/Padres";
import Asistencia from "../pages/Asistencia/Asistencia";
import Roles from "../pages/Roles/Roles";
import Mensajes from "../pages/Mensajes/Mensajes";
import Estudiantes from "../pages/Estudiantes/Estudiantes";
import IngresoPadres from "../pages/IngresoPadres/IngresoPadres";
import Docentes from "../pages/Docente/Docentes";
import Usuarios from "../pages/Usuarios/Usuarios";
import Cursos from "../pages/Cursos/Cursos";
import Materias from "../pages/Materias/Materias";

function RutaProtegida({ children }: { children: ReactNode }) {
  const autenticado =
    localStorage.getItem("usuarioAutenticado") === "true";

  return autenticado ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />

      <Route path="/home" element={<RutaProtegida><Home /></RutaProtegida>} />
      <Route path="/roles" element={<RutaProtegida><Roles /></RutaProtegida>} />
      <Route path="/usuarios" element={<RutaProtegida><Usuarios /></RutaProtegida>} />
      <Route path="/notas" element={<RutaProtegida><Notas /></RutaProtegida>} />
      <Route path="/asistencia" element={<RutaProtegida><Asistencia /></RutaProtegida>} />
      <Route path="/padres" element={<RutaProtegida><Padres /></RutaProtegida>} />
      <Route path="/ingreso-padres" element={<RutaProtegida><IngresoPadres /></RutaProtegida>} />
      <Route path="/mensajes" element={<RutaProtegida><Mensajes /></RutaProtegida>} />
      <Route path="/estudiantes" element={<RutaProtegida><Estudiantes /></RutaProtegida>} />
      <Route path="/docentes" element={<RutaProtegida><Docentes /></RutaProtegida>} />
      <Route path="/cursos" element={<RutaProtegida><Cursos /></RutaProtegida>} />
      <Route path="/materias" element={<RutaProtegida><Materias /></RutaProtegida>} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default AppRoutes;
