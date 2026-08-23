import type { AppConfig } from './config';

// Contrato con el Web App de Apps Script (ver apps-script/Code.js).
// GET  ?action=cargas|bitacora|ping&token=...
// POST body text/plain JSON { token, action, payload } — text/plain evita el
// preflight CORS, que Apps Script no soporta.

export interface SheetData {
  headers: string[];
  rows: string[][];
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body: ApiResponse<T> = await res.json();
  if (!body.ok || body.data === undefined) throw new Error(body.error ?? 'Error desconocido del API');
  return body.data;
}

async function apiGet<T>(cfg: AppConfig, action: string): Promise<T> {
  const url = `${cfg.apiUrl}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(cfg.token)}`;
  const res = await fetch(url, { redirect: 'follow' });
  return parseResponse<T>(res);
}

async function apiPost<T>(cfg: AppConfig, action: string, payload: unknown): Promise<T> {
  const res = await fetch(cfg.apiUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: cfg.token, action, payload }),
  });
  return parseResponse<T>(res);
}

export const api = {
  ping: (cfg: AppConfig) => apiGet<string>(cfg, 'ping'),
  cargas: (cfg: AppConfig) => apiGet<SheetData>(cfg, 'cargas'),
  bitacora: (cfg: AppConfig) => apiGet<SheetData>(cfg, 'bitacora'),
  saveCarga: (
    cfg: AppConfig,
    payload: { dia: string; ejercicio: string; objetivo?: string; semana: number; valor: string }
  ) => apiPost<{ created: boolean }>(cfg, 'saveCarga', payload),
  saveBitacora: (
    cfg: AppConfig,
    payload: {
      fecha: string;
      dia: string;
      sesion: string;
      energia: number;
      sueno: number;
      hombro: string;
      peso: number | null;
      notas: string;
    }
  ) => apiPost<{ appended: boolean }>(cfg, 'saveBitacora', payload),
};
