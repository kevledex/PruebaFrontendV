import { useEffect, useState } from "react";
import MainLayout from "../../layouts/MainLayout";
import BackHomeButton from "../../components/common/BackHomeButton";
import "./Mensajes.css";
import { api, getApiErrorMessage } from "../../api/client";


interface CursoApi {
  id: number;
  nivel: string;
  grado: string;
  paralelo: string;
}

interface Curso {
  id: number;
  nombre: string;
}

//Estructura de cada mensaje enviado.
interface MensajeEnviado {
  id: number;
  fecha: string;
  cursoId: number;
  cursoNombre: string;
  contenido: string;
}

function Mensajes() {

  const [cursos, setCursos] = useState<Curso[]>([]);

  //Para obtener fechas actuales y futuras, y no enviar mensajes en fechas antiguas
  const fechaActual = new Date().toLocaleDateString("en-CA");

  //Estados para manejar los datos del formulario y la lista de mensajes enviados
  const [fecha, setFecha] = useState("");
  const [cursoSeleccionado, setCursoSeleccionado] = useState("");
  const [mensaje, setMensaje] = useState("");

  //Estado para almacenar los mensajes enviados
  const [mensajesEnviados, setMensajesEnviados] = useState<MensajeEnviado[]>([]);

  useEffect(() => {
    Promise.all([
      api.get<any[]>("/mensajes"),
      api.get<CursoApi[]>("/cursos"),
    ])
      .then(([lista, listaCursos]) => {
        setMensajesEnviados(lista.map((item) => ({ id: item.id, fecha: item.fecha, cursoId: 0, cursoNombre: item.curso, contenido: item.contenido })));
        setCursos(listaCursos.map((curso) => ({ id: curso.id, nombre: `${curso.grado} "${curso.paralelo}"` })));
      })
      .catch((error) => alert(getApiErrorMessage(error)));
  }, []);

  //funcion para enviar mensaje, valida que los campos no esten vacios y 
  // que la fecha no sea anterior a la actual
  async function enviarMensaje() {

//Validar que los campos no estén vacíos
    if (
      fecha === "" ||
      cursoSeleccionado === "" ||
      mensaje.trim() === ""
    ) {
      alert("Complete todos los campos.");
      return;
    }

    //Validar que la fecha no sea anterior a la fecha actual

    if (fecha < fechaActual) {
      alert("No puede seleccionar una fecha anterior a hoy.");
      return;
    }


//Buscar el curso seleccionado en la lista de cursos
    const cursoEncontrado = cursos.find(
      (curso) => curso.id === Number(cursoSeleccionado)
    );

    if (!cursoEncontrado) {
      alert("El curso seleccionado no existe.");
      return;
    }

//Crear un nuevo mensaje con los datos ingresados

    try {
      const guardado = await api.post<any>("/mensajes", { fecha, curso: cursoEncontrado.nombre, contenido: mensaje.trim(), estado: "Enviado" });
      const nuevoMensaje: MensajeEnviado = { id: guardado.id, fecha: guardado.fecha, cursoId: cursoEncontrado.id, cursoNombre: guardado.curso, contenido: guardado.contenido };
      setMensajesEnviados((anteriores) => [nuevoMensaje, ...anteriores]);
      alert("Mensaje enviado correctamente.");
      limpiarFormulario();
    } catch (error) { alert(getApiErrorMessage(error)); }
  }

  //funcion para limpiar el formulario
  function limpiarFormulario() {
    setFecha("");
    setCursoSeleccionado("");
    setMensaje("");
  }

  //funcion para eliminar el mensaje almacenado en el estado de mensajes enviados.
  async function eliminarMensaje(id: number) {
    const confirmarEliminacion = window.confirm(
      "¿Está seguro de eliminar este mensaje?"
    );

    if (!confirmarEliminacion) {
      return;
    }

    try {
      await api.delete(`/mensajes/${id}`);
      setMensajesEnviados((anteriores) => anteriores.filter((item) => item.id !== id));
    } catch (error) { alert(getApiErrorMessage(error)); }
  }

  return (
    <MainLayout>
      <div className="mensajes-content">
        <header className="mensajes-header">
          <div>
            <p>Comunicación académica</p>
            <h1>Mensajes</h1>
          </div>

          <BackHomeButton />
        </header>

        <div className="mensaje-formulario">
          <label htmlFor="fecha">Ingrese la fecha:</label>

          <input
            id="fecha"
            type="date"
            min={fechaActual}
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
          />

          <label htmlFor="curso">Seleccione el curso a enviar:</label>

          <select
            id="curso"
            name="curso"
            value={cursoSeleccionado}
            onChange={(event) =>
              setCursoSeleccionado(event.target.value)
            }
          >
            <option value="">Seleccione un curso</option>

            {cursos.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
          </select>

          <label htmlFor="mensaje">Escriba su mensaje:</label>

          <textarea
            id="mensaje"
            name="mensaje"
            rows={4}
            value={mensaje}
            onChange={(event) => setMensaje(event.target.value)}
            placeholder="Escriba aquí el contenido del mensaje..."
          />

          <div className="mensaje-acciones">
            <button type="button" onClick={enviarMensaje}>
              Enviar mensaje
            </button>

            <button type="button" onClick={limpiarFormulario}>
              Limpiar
            </button>
          </div>
        </div>

        <div className="lista-mensajes">
          <h2>Mensajes enviados</h2>

          {mensajesEnviados.length === 0 ? (
            <p>No existen mensajes enviados.</p>
          ) : (
            mensajesEnviados.map((mensajeEnviado) => (
              <div
                className="mensaje-enviado"
                key={mensajeEnviado.id}
              >
                <div className="mensaje-informacion">
                  <p>
                    <strong>Fecha:</strong> {mensajeEnviado.fecha}
                  </p>

                  <p>
                    <strong>Curso:</strong>{" "}
                    {mensajeEnviado.cursoNombre}
                  </p>

                  <p>
                    <strong>Mensaje:</strong>{" "}
                    {mensajeEnviado.contenido}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() =>
                    eliminarMensaje(mensajeEnviado.id)
                  }
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </MainLayout>
  );
}

export default Mensajes;
