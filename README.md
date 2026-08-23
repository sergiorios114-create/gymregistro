# Gym — Registro de entrenamiento (PWA + Google Sheets)

PWA de registro de cargas y bitácora diaria. **Google Sheets es la fuente de verdad**;
el backend es un Web App de Google Apps Script y el frontend (React + Vite) se
despliega en GitHub Pages.

```
gym/
├── web/           # Frontend PWA (React + Vite + TypeScript)
├── apps-script/   # Backend Apps Script (versionado con clasp)
└── .github/       # CI (lint+build) y deploy a GitHub Pages
```

## Arquitectura

- **Backend**: Apps Script publicado como Web App (`doGet`/`doPost`), corre con la
  cuenta de Google del dueño → accede a las planillas sin OAuth ni service accounts.
  - `GET ?action=cargas|bitacora|ping&token=…` → lee las planillas.
  - `POST` (body `text/plain` JSON `{token, action, payload}`) → `saveCarga` escribe
    en la columna `Sem N`; `saveBitacora` agrega fila. El `text/plain` evita el
    preflight CORS que Apps Script no soporta.
- **Auth**: token compartido en la Script Property `API_TOKEN`; el frontend lo guarda
  en `localStorage` (pestaña Ajustes). **Ningún secreto vive en el repo.**
- **Planillas** (creadas por `setupNuevasPlanillas()` en la **misma cuenta que ejecuta el script**,
  para no depender de compartir entre cuentas):
  - Cargas `1vrFg1hnOWlc6qP0DHB3zcXVB2iZieVKuaC2jgUGwPE8` — `Día | Ejercicio | Objetivo | Sem 1…Sem 8`
  - Bitácora `1CMnyW-DAg2IhMg4CTSa7yUBGqUkoIMS45nNs3T9SpIo` — `Fecha | Día | Sesión | Energía | Sueño | Hombro | Peso | Fase dieta | Notas`

## Desarrollo local

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de producción
```

Sin API configurado la app entra en **modo demo** (muestra el plan sin cargas).

## Pasos manuales (una sola vez)

### 1. Crear y publicar el backend de Apps Script

1. Abre <https://script.google.com> → **Nuevo proyecto**. Nómbralo `gym-api`.
2. Pega el contenido de [apps-script/Code.js](apps-script/Code.js) en `Código.gs`.
3. **Configuración del proyecto** (engranaje) → *Propiedades del script* → agrega
   `API_TOKEN` con un valor largo y aleatorio (ej.: genera uno con
   `openssl rand -hex 24` o cualquier generador). Guárdalo: es el mismo token
   que pondrás en la app.
4. **Implementar → Nueva implementación → Aplicación web**:
   - Ejecutar como: **Yo**.
   - Acceso: **Cualquier persona** (el token protege el API).
5. Autoriza los permisos cuando lo pida y **copia la URL** `https://script.google.com/macros/s/…/exec`.
   > Google mostrará *"no ha verificado esta aplicación"*: es normal para un script personal.
   > *Configuración avanzada → Ir a gym-api (no seguro) → Permitir*.
5b. Ejecuta **una vez** la función `setupNuevasPlanillas` desde el editor (selector de función →
   *Ejecutar*). Crea ambas planillas en tu cuenta y deja sus IDs en el registro de ejecución;
   pégalos en `CARGAS_ID` / `BITACORA_ID` al inicio de `Code.js` y vuelve a implementar.
   **Importante**: las planillas deben pertenecer a la misma cuenta que ejecuta el script, o
   `openById` responderá *"No cuentas con el permiso necesario"*.
6. Verifica en el navegador: `URL?action=ping&token=TU_TOKEN` → debe responder
   `{"ok":true,"data":"pong"}`.

> Cada vez que cambie `Code.js` hay que crear una **nueva implementación** (o
> actualizar la existente con *Administrar implementaciones → editar → nueva versión*).
> La URL se mantiene si actualizas la implementación existente.

**Opcional — versionar con clasp** (para no pegar código a mano):

```bash
npm i -g @google/clasp
clasp login                                  # crea ~/.clasprc.json (nunca al repo)
cd apps-script
cp .clasp.json.example .clasp.json           # pega el scriptId del proyecto
clasp push                                   # sube Code.js + appsscript.json
```

El `scriptId` está en *Configuración del proyecto* de Apps Script. `.clasp.json`
y `.clasprc.json` están en `.gitignore`.

### 2. Crear el repo en GitHub y activar Pages

```bash
git remote add origin https://github.com/<usuario>/gym.git
git push -u origin main
```

En GitHub: **Settings → Pages → Source: GitHub Actions**. El workflow
[deploy.yml](.github/workflows/deploy.yml) construye `web/` y publica en
`https://<usuario>.github.io/gym/` en cada push a `main`. No requiere secrets:
el `BASE_PATH` se calcula solo con el nombre del repo.

### 3. Configurar la app en el teléfono

1. Abre `https://<usuario>.github.io/gym/` en el navegador del teléfono.
2. **Instalar**: iOS Safari → Compartir → *Añadir a pantalla de inicio*;
   Android Chrome → menú ⋮ → *Instalar app*.
3. En **Ajustes** dentro de la app: pega la URL del Web App, el token y la fecha
   de inicio del programa (día 1 de la Semana 1) → *Probar conexión* → *Guardar*.

### 4. Escribir la planilla reconciliada (una sola vez)

La revisión del 5.º mes detectó 4 registros anotados en la fila del ejercicio anterior
(ver [data/plan-vigente.md](data/plan-vigente.md)). La planilla corregida ya está generada
en [data/planilla-cargas.json](data/planilla-cargas.json) — 38 filas × 11 columnas.

Requiere el Web App publicado (paso 1). Con la URL y el token a mano:

```bash
node scripts/reconciliar.mjs --url "https://script.google.com/macros/s/…/exec" --token "TU_TOKEN"
```

Para ver qué se enviaría sin escribir nada: `node scripts/reconciliar.mjs --dry`.

> El endpoint **duplica la hoja actual como respaldo** (`Backup YYYY-MM-DD HHmm`) antes de
> sobrescribir. Nada se pierde.

**Alternativa sin backend**: abrir [data/planilla-cargas.tsv](data/planilla-cargas.tsv),
copiar todo y pegarlo en la celda A1 de la planilla de cargas (Sheets separa por tabuladores
automáticamente). Conviene duplicar la hoja a mano antes.

## Verificación

- [x] `URL?action=ping&token=…` responde `pong`; con token inválido responde `Token inválido`.
- [x] `action=cargas` y `action=bitacora` devuelven JSON con los encabezados correctos.
- [x] Planilla reconciliada escrita: **38 filas × 11 columnas**, con respaldo automático.
- [x] La pestaña **Cargas** muestra los datos reales leídos de Sheets (Sem 7, tendencias ▲▼).
- [ ] La app se instala en el teléfono y abre en pantalla completa.
- [ ] Registrar una carga desde el teléfono la escribe en la columna de la semana en curso.

## Roadmap

1. ✅ Walking skeleton: leer y mostrar la planilla de cargas (+ modo demo).
2. ✅ Reconciliación del 5.º mes + plan vigente v2 sembrado en la app.
3. ⬜ Registro de cargas: inputs kg×reps → escribe en la columna `Sem N`.
4. ⬜ Ejercicios alternativos: elegir la variante hecha (Jalón ↔ Dominadas, etc.).
5. ⬜ Bitácora diaria de 30 s: energía, sueño, hombro, peso, fase de dieta, notas.
   Incluye marcar día no entrenado (motivo) y sesión libre.
6. ⬜ Carga y recuperación por grupo muscular: avisar sobrecargas antes de que lesionen.
7. ⏱️ Timer de descanso entre series, persistente, con el tiempo sugerido de cada ejercicio.
8. ⬜ Offline-first: cola en IndexedDB + sincronización al volver la conexión.

El plan vigente vive en [data/plan-vigente.json](data/plan-vigente.json) (copiado a
`web/src/plan.json`): objetivos, descansos sugeridos, grupos musculares por ejercicio y
pares alternables. Para cambiar la rutina se edita ese JSON, no el código.
