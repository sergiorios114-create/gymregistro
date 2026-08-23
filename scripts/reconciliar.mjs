#!/usr/bin/env node
// Escribe la planilla de cargas reconciliada en Google Sheets, vía el Web App
// de Apps Script. Respalda la hoja actual antes de sobrescribir.
//
//   node scripts/reconciliar.mjs --url <WEB_APP_URL> --token <API_TOKEN> [--dry]
//
// También lee GYM_API_URL / GYM_API_TOKEN del entorno.
// Los secretos NUNCA se guardan en el repo: se pasan por argumento o entorno.

import fs from 'node:fs';

const arg = (n) => {
  const i = process.argv.indexOf('--' + n);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const url = arg('url') ?? process.env.GYM_API_URL;
const token = arg('token') ?? process.env.GYM_API_TOKEN;
const dry = process.argv.includes('--dry');

const matriz = JSON.parse(fs.readFileSync(new URL('../data/planilla-cargas.json', import.meta.url), 'utf8'));
console.log(`Matriz: ${matriz.length - 1} filas × ${matriz[0].length} columnas`);

if (dry) {
  console.log(matriz.map((r) => r.join('\t')).join('\n'));
  console.log('\n(--dry: no se envió nada)');
  process.exit(0);
}
if (!url || !token) {
  console.error('Falta --url o --token (o GYM_API_URL / GYM_API_TOKEN).');
  console.error('La URL es la del Web App de Apps Script, terminada en /exec.');
  process.exit(1);
}

const res = await fetch(url, {
  method: 'POST',
  redirect: 'follow',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({ token, action: 'reconciliar', payload: { matriz } }),
});
if (!res.ok) {
  console.error(`HTTP ${res.status}`);
  process.exit(1);
}
const body = await res.json();
if (!body.ok) {
  console.error('Error del API:', body.error);
  process.exit(1);
}
console.log(`✓ Planilla reescrita: ${body.data.filas} filas × ${body.data.columnas} columnas`);
console.log(`✓ Respaldo creado en la hoja "${body.data.respaldo}"`);
