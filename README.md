# Registro de entrenamiento

Registro de series, pesos y repeticiones para un plan semanal fijo.
Pensado para usarse **con una mano** entre serie y serie.

## Cómo funciona

- **La fecha sale del reloj del dispositivo.** Al abrirla ya muestra el día que
  corresponde con sus ejercicios; el viernes muestra descanso.
- **Kilos o barras, por ejercicio.** Las poleas vienen configuradas en *barras*
  (las placas numeradas del stack) y las máquinas en *kilos*. Se cambia con el
  selector y queda recordado para ese ejercicio.
  El paso del `+`/`−` se ajusta solo: **2,5 en kilos, 1 en barras**.
- **Se prellena con la última sesión.** En la mayoría de las series basta tocar
  *Guardar*. La unidad queda grabada en cada serie, así que cambiarla no altera
  lo ya registrado.
- **▲ / ▼** comparan cada serie con la misma serie de la sesión anterior
  (peso × reps), solo cuando ambas están en la misma unidad.
- **‹ ›** permiten volver a días anteriores para corregir o completar.

## Corregir una serie mal registrada

- **Toca la serie** en la lista → queda resaltada, los valores se cargan en los
  controles y el botón cambia a *Corregir serie N*.
- Ajusta con `+` / `−` y confirma. También puedes **Cancelar**, o volver a tocar
  la misma serie para salir sin cambiar nada.
- Si la serie estaba en otra unidad, el selector cambia solo a esa unidad.
- La **×** de la derecha borra la serie completa.

## Privacidad

Todo se guarda en el navegador (`localStorage`). No hay servidor ni cuenta.
Este repositorio contiene solo el código.

⚠️ Exporta un respaldo cada tanto desde *Ajustes → Exportar JSON*.
Si borras los datos del navegador o cambias de teléfono, se pierden.

## Instalar en iPhone

1. Abre la URL en **Safari**.
2. **Compartir** → **Agregar a inicio** → *Agregar*.
3. Ábrela siempre desde el ícono, no desde Safari.

Instalada, iOS conserva los datos y funciona **sin internet** — útil en gimnasios
con mala señal.

## Estructura del respaldo

```json
{
  "sesiones": {
    "2026-07-25": {
      "hip-thrust": { "u": "kg", "series": [ { "p": 60, "r": 10, "u": "kg" } ] }
    }
  },
  "unidades": { "jalon-pecho": "barras" }
}
```

`p` = peso · `r` = repeticiones · `u` = unidad

## Cambiar el plan

Los ejercicios están en la constante `PLAN` al inicio del `<script>`,
indexada por día de la semana (0 = domingo … 6 = sábado):

```js
{ id:'hip-thrust', n:'Hip thrust', s:4, r:'8-12', u:'kg' }
```

`s` = series objetivo · `r` = rango de reps · `u` = unidad por defecto

> Si un ejercicio se repite en dos días, **usa el mismo `id`**: así el historial
> y la comparación con la sesión anterior se mantienen unidos.

## Actualizar

Al editar `index.html`, sube la versión en `sw.js` (`entreno-v1` → `entreno-v2`),
si no los dispositivos que ya la instalaron seguirán viendo la versión vieja.
