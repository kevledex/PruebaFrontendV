export type EstadoRol="Activo"|"Inactivo";
export interface RolSistema{id:number;nombre:string;descripcion:string;permisos:string[];usuarios:number;estado:EstadoRol;protegido?:boolean}
export const permisosDisponibles=["Estudiantes","Docentes","Cursos","Notas","Asistencia","Representantes","Mensajes","Reportes","Gesti\u00f3n de roles"] as const;
export const rolesIniciales:RolSistema[]=[
{id:1,nombre:"Administrador",descripcion:"Acceso completo a la configuraci\u00f3n y m\u00f3dulos del sistema.",permisos:[...permisosDisponibles],usuarios:2,estado:"Activo",protegido:true},
{id:2,nombre:"Docente",descripcion:"Gestiona notas, asistencia y datos de sus estudiantes.",permisos:["Estudiantes","Notas","Asistencia","Mensajes"],usuarios:18,estado:"Activo"},
{id:3,nombre:"Representante",descripcion:"Consulta el progreso acad\u00e9mico de sus representados.",permisos:["Notas","Asistencia","Mensajes"],usuarios:146,estado:"Activo"},
{id:4,nombre:"Secretar\u00eda",descripcion:"Administra matr\u00edculas, expedientes y reportes.",permisos:["Estudiantes","Docentes","Representantes","Reportes"],usuarios:3,estado:"Inactivo"}];
const CLAVE="roles-sistema";
export function cargarRoles():RolSistema[]{try{const valor=localStorage.getItem(CLAVE);return valor?JSON.parse(valor) as RolSistema[]:rolesIniciales}catch{return rolesIniciales}}
export function guardarRoles(roles:RolSistema[]){localStorage.setItem(CLAVE,JSON.stringify(roles))}
