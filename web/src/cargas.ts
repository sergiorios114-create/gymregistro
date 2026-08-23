import type { SheetData } from './api';
import { buscarEjercicio, ORDEN_DIAS, PLAN, type EjercicioPlan } from './plan';

// Modelo de la planilla de cargas: Día | Ejercicio | Objetivo | Sem 1..Sem 8

export const NUM_SEMANAS = 8;

export interface EjercicioCargas {
  nombre: string;
  objetivo: string;
  /** Valor registrado por semana (índice 0 = Sem 1); null si vacío. */
  sems: (string | null)[];
  /** Datos del plan vigente (descanso, alternativas, notas); null si es una fila histórica. */
  plan: EjercicioPlan | null;
  /** Fila que conserva historial pero ya no está en el plan activo. */
  historico: boolean;
}

export interface DiaCargas {
  dia: string;
  titulo: string;
  ejercicios: EjercicioCargas[];
  intensidad?: 'liviano' | 'pesado';
  nota?: string;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Convierte la matriz cruda de Sheets en días ordenados según el plan. */
export function buildModel(sheet: SheetData): DiaCargas[] {
  const headers = sheet.headers.map(norm);
  const colSem: number[] = [];
  for (let s = 1; s <= NUM_SEMANAS; s++) colSem.push(headers.indexOf(`sem ${s}`));

  const porDia = new Map<string, EjercicioCargas[]>();
  for (const row of sheet.rows) {
    const dia = (row[0] ?? '').trim();
    const nombre = (row[1] ?? '').trim();
    if (!dia || !nombre) continue;
    const enPlan = buscarEjercicio(nombre);
    const ejercicio: EjercicioCargas = {
      nombre,
      objetivo: (row[2] ?? '').trim(),
      sems: colSem.map((c) => {
        const v = c >= 0 ? (row[c] ?? '').trim() : '';
        return v ? v : null;
      }),
      plan: enPlan?.ejercicio ?? null,
      historico: enPlan === null,
    };
    const key = ORDEN_DIAS.find((d) => norm(d) === norm(dia)) ?? dia;
    if (!porDia.has(key)) porDia.set(key, []);
    porDia.get(key)!.push(ejercicio);
  }

  const dias: DiaCargas[] = [];
  for (const p of PLAN) {
    const ejercicios = porDia.get(p.dia);
    porDia.delete(p.dia);
    if (p.dia === 'Viernes' && !ejercicios) continue;
    // Las filas históricas van al final del día, después de las activas.
    const ordenadas = (ejercicios ?? []).sort(
      (a, b) => Number(a.historico) - Number(b.historico)
    );
    dias.push({
      dia: p.dia,
      titulo: p.titulo,
      ejercicios: ordenadas,
      intensidad: p.intensidad,
      nota: p.nota,
    });
  }
  // Días fuera del plan (por si la planilla trae otros)
  for (const [dia, ejercicios] of porDia) dias.push({ dia, titulo: '', ejercicios });
  return dias;
}

/** Modelo de demostración: el plan completo sin cargas registradas. */
export function demoModel(): DiaCargas[] {
  return PLAN.filter((p) => p.ejercicios.length > 0).map((p) => ({
    dia: p.dia,
    titulo: p.titulo,
    intensidad: p.intensidad,
    nota: p.nota,
    ejercicios: p.ejercicios.map((e) => ({
      nombre: e.nombre,
      objetivo: e.objetivo,
      sems: Array(NUM_SEMANAS).fill(null),
      plan: e,
      historico: false,
    })),
  }));
}

/** Primer número de un valor registrado, p. ej. "62.5x10" → 62.5. */
export function parseKg(valor: string | null): number | null {
  if (!valor) return null;
  const m = valor.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

export type Tendencia = 'sube' | 'baja' | 'igual' | null;

/**
 * Compara el último registro (hasta semanaActual) contra el registro anterior.
 * Devuelve null si no hay al menos dos valores comparables.
 */
export function tendencia(ej: EjercicioCargas, semanaActual: number): Tendencia {
  const kgs: number[] = [];
  for (let i = 0; i < Math.min(semanaActual, NUM_SEMANAS); i++) {
    const kg = parseKg(ej.sems[i]);
    if (kg != null) kgs.push(kg);
  }
  if (kgs.length < 2) return null;
  const [prev, last] = kgs.slice(-2);
  if (last > prev) return 'sube';
  if (last < prev) return 'baja';
  return 'igual';
}

/** Último valor registrado hasta la semana actual, con su número de semana. */
export function ultimoRegistro(
  ej: EjercicioCargas,
  semanaActual: number
): { semana: number; valor: string } | null {
  for (let i = Math.min(semanaActual, NUM_SEMANAS) - 1; i >= 0; i--) {
    const v = ej.sems[i];
    if (v) return { semana: i + 1, valor: v };
  }
  return null;
}
