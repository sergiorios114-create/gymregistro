import planJson from './plan.json';

// Plan vigente (v2.0, 2026-08-23) — resultado de la revisión día a día del 5.º mes.
// Fuente única de verdad: src/plan.json (copia de data/plan-vigente.json).
// Para cambiar el plan se edita el JSON, no este archivo.

/** Grupos musculares con su peso de implicación (1 = primario, <1 = secundario). */
export type Musculos = Record<string, number>;

/** kg = kilos (paso 2,5) · barras = placas del stack (paso 1) · pc = peso corporal (solo reps). */
export type Unidad = 'kg' | 'barras' | 'pc';

/** Incremento del +/− según la unidad, igual que en la app anterior. */
export function pasoDe(u: Unidad): number {
  return u === 'kg' ? 2.5 : 1;
}

export const SUFIJO: Record<Unidad, string> = { kg: '', barras: 'b', pc: 'PC' };

export interface EjercicioPlan {
  nombre: string;
  objetivo: string;
  unidad: Unidad;
  unidadAlternativas?: Record<string, Unidad>;
  /** Descanso sugerido entre series, en segundos. */
  descansoSeg: number;
  musculos: Musculos;
  /** Variantes intercambiables: el mismo hueco del día puede hacerse con cualquiera. */
  alternativas?: string[];
  /** Series extra que cierran el ejercicio (ej. "2 series de dominadas"). */
  finisher?: string;
  /** Sin carga externa: progresa por reps, no por kg. */
  pesoCorporal?: boolean;
  progresaPor?: 'reps' | 'kg';
  nuevo?: boolean;
  nota?: string;
  objetivoProximo?: string;
}

export interface DiaPlan {
  dia: string;
  titulo: string;
  ejercicios: EjercicioPlan[];
  intensidad?: 'liviano' | 'pesado';
  nota?: string;
}

export interface Plan {
  version: string;
  actualizado: string;
  notas: string;
  unidades: Record<string, string>;
  dias: DiaPlan[];
  archivados: { nombre: string; motivo: string }[];
}

export const PLAN_COMPLETO = planJson as Plan;
export const PLAN: DiaPlan[] = PLAN_COMPLETO.dias;

/** Orden canónico de los días para agrupar/ordenar lo que venga de la planilla. */
export const ORDEN_DIAS = PLAN.map((d) => d.dia);

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Día del plan que corresponde a una fecha (getDay(): 0=Domingo). */
export function diaDeFecha(fecha: Date): DiaPlan {
  const nombre = NOMBRES_DIA[fecha.getDay()];
  return PLAN.find((d) => d.dia === nombre) ?? PLAN[0];
}

/** Todos los nombres bajo los que puede registrarse un ejercicio (titular + alternativas). */
export function variantesDe(ej: EjercicioPlan): string[] {
  return [ej.nombre, ...(ej.alternativas ?? [])];
}

/** Busca un ejercicio del plan por nombre, incluyendo sus alternativas. */
export function buscarEjercicio(nombre: string): { dia: DiaPlan; ejercicio: EjercicioPlan } | null {
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const dia of PLAN) {
    for (const ejercicio of dia.ejercicios) {
      if (variantesDe(ejercicio).some((v) => norm(v) === norm(nombre))) return { dia, ejercicio };
    }
  }
  return null;
}

/** Ejercicios archivados: conservan historial en la planilla pero salen del plan activo. */
export const ARCHIVADOS = PLAN_COMPLETO.archivados;
