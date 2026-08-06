import { useMemo, useRef, useState } from "react";
import "./BuscadorSelector.css";

export interface OpcionBuscador {
  id: number;
  titulo: string;
  subtitulo?: string;
}

interface BuscadorSelectorProps {
  opciones: OpcionBuscador[];
  seleccionId: number | null;
  onSeleccionar: (id: number | null) => void;
  placeholder?: string;
  mensajeVacio?: string;
  requerido?: boolean;
}

export default function BuscadorSelector({
  opciones,
  seleccionId,
  onSeleccionar,
  placeholder = "Buscar por cédula o nombre",
  mensajeVacio = "No se encontraron resultados.",
  requerido = false,
}: BuscadorSelectorProps) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);

  const seleccionado = useMemo(
    () => opciones.find((opcion) => opcion.id === seleccionId) ?? null,
    [opciones, seleccionId],
  );

  const resultados = useMemo(() => {
    const termino = texto.trim().toLowerCase();
    if (!termino) return opciones;
    return opciones.filter((opcion) =>
      `${opcion.titulo} ${opcion.subtitulo ?? ""}`.toLowerCase().includes(termino),
    );
  }, [texto, opciones]);

  function elegir(opcion: OpcionBuscador) {
    onSeleccionar(opcion.id);
    setTexto("");
    setAbierto(false);
  }

  function cambiar() {
    onSeleccionar(null);
    setTexto("");
    setAbierto(true);
    window.setTimeout(() => contenedorRef.current?.querySelector("input")?.focus(), 0);
  }

  if (seleccionado) {
    return (
      <div className="buscador-selector">
        <div className="buscador-selector-elegido">
          <div>
            <strong>{seleccionado.titulo}</strong>
            {seleccionado.subtitulo && <span>{seleccionado.subtitulo}</span>}
          </div>
          <button type="button" onClick={cambiar}>
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="buscador-selector"
      ref={contenedorRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) {
          window.setTimeout(() => setAbierto(false), 120);
        }
      }}
    >
      <div className="buscador-selector-campo">
        <i className="bi bi-search"></i>
        <input
          type="text"
          required={requerido}
          value={texto}
          placeholder={placeholder}
          onFocus={() => setAbierto(true)}
          onChange={(event) => {
            setTexto(event.target.value);
            setAbierto(true);
          }}
        />
      </div>

      {abierto && (
        <div className="buscador-selector-lista">
          {resultados.length === 0 && (
            <p className="buscador-selector-vacio">{mensajeVacio}</p>
          )}
          {resultados.map((opcion) => (
            <button
              type="button"
              key={opcion.id}
              className="buscador-selector-opcion"
              onClick={() => elegir(opcion)}
            >
              <strong>{opcion.titulo}</strong>
              {opcion.subtitulo && <span>{opcion.subtitulo}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
