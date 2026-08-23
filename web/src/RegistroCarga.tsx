import { useState } from 'react';
import { api } from './api';
import type { AppConfig } from './config';
import { pasoDe, type Unidad } from './plan';

interface Props {
  cfg: AppConfig;
  dia: string;
  ejercicio: string;
  objetivo: string;
  unidad: Unidad;
  semana: number;
  /** Valor ya registrado esta semana, para prellenar (ej. "50x13" o "17b x12"). */
  actual: string | null;
  /** Último valor conocido, para prellenar si la semana está vacía. */
  ultimo: string | null;
  onGuardado: (valor: string) => void;
}

/** Extrae peso y reps de un valor guardado: "52.5x13", "17b x12", "PC x7". */
function parsear(valor: string | null, unidad: Unidad): { peso: number; reps: number } {
  const base = unidad === 'kg' ? 40 : unidad === 'barras' ? 8 : 0;
  if (!valor) return { peso: base, reps: 10 };
  const m = valor.replace(',', '.').match(/^\s*(?:PC|(-?\d+(?:\.\d+)?)\s*b?)\s*x\s*(\d+)/i);
  if (!m) return { peso: base, reps: 10 };
  return { peso: m[1] ? parseFloat(m[1]) : 0, reps: parseInt(m[2], 10) };
}

/** Formato que se escribe en la planilla, coherente con lo ya reconciliado. */
function formatear(peso: number, reps: number, unidad: Unidad): string {
  if (unidad === 'pc') return `PC x${reps}`;
  if (unidad === 'barras') return `${peso}b x${reps}`;
  return `${peso}x${reps}`;
}

export function RegistroCarga({
  cfg, dia, ejercicio, objetivo, unidad, semana, actual, ultimo, onGuardado,
}: Props) {
  const inicial = parsear(actual ?? ultimo, unidad);
  const [peso, setPeso] = useState(inicial.peso);
  const [reps, setReps] = useState(inicial.reps);
  const [estado, setEstado] = useState<'listo' | 'guardando' | 'ok' | 'error'>('listo');
  const [mensaje, setMensaje] = useState<string | null>(null);

  const paso = pasoDe(unidad);
  const esPC = unidad === 'pc';

  async function guardar() {
    setEstado('guardando');
    setMensaje(null);
    const valor = formatear(peso, reps, unidad);
    try {
      await api.saveCarga(cfg, { dia, ejercicio, objetivo, semana, valor });
      setEstado('ok');
      onGuardado(valor);
      setTimeout(() => setEstado('listo'), 2000);
    } catch (err) {
      setEstado('error');
      setMensaje(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="registro">
      {!esPC && (
        <div className="stepper">
          <button aria-label="menos peso" onClick={() => setPeso((p) => Math.max(0, p - paso))}>
            −
          </button>
          <span className="mono campo">
            {peso}
            <small>{unidad === 'barras' ? 'b' : 'kg'}</small>
          </span>
          <button aria-label="más peso" onClick={() => setPeso((p) => p + paso)}>
            +
          </button>
        </div>
      )}
      <div className="stepper">
        <button aria-label="menos reps" onClick={() => setReps((r) => Math.max(1, r - 1))}>
          −
        </button>
        <span className="mono campo">
          {reps}
          <small>reps</small>
        </span>
        <button aria-label="más reps" onClick={() => setReps((r) => r + 1)}>
          +
        </button>
      </div>
      <button
        className={`guardar ${estado}`}
        onClick={() => void guardar()}
        disabled={estado === 'guardando'}
      >
        {estado === 'guardando' ? '…' : estado === 'ok' ? '✓' : `Sem ${semana}`}
      </button>
      {mensaje && <p className="err-registro">{mensaje}</p>}
    </div>
  );
}
