// Configuración persistida en localStorage (nunca en el repo):
// URL del Web App de Apps Script, token compartido y fecha de inicio del programa.

export interface AppConfig {
  apiUrl: string;
  token: string;
  /** ISO yyyy-mm-dd del día 1 de la Semana 1 */
  startDate: string;
}

const KEY = 'gym-config-v1';

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { apiUrl: '', token: '', startDate: '', ...JSON.parse(raw) };
  } catch {
    // config corrupta → se ignora
  }
  return { apiUrl: '', token: '', startDate: '' };
}

export function saveConfig(cfg: AppConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg));
}

export function isConfigured(cfg: AppConfig): boolean {
  return Boolean(cfg.apiUrl && cfg.token);
}

/**
 * Semana en curso del programa (1..8, acotada) según la fecha de inicio.
 * Sin fecha configurada devuelve 1.
 */
export function semanaActual(cfg: AppConfig, hoy = new Date()): number {
  if (!cfg.startDate) return 1;
  const inicio = new Date(cfg.startDate + 'T00:00:00');
  if (isNaN(inicio.getTime())) return 1;
  const dias = Math.floor((hoy.getTime() - inicio.getTime()) / 86_400_000);
  const semana = Math.floor(dias / 7) + 1;
  return Math.min(8, Math.max(1, semana));
}
