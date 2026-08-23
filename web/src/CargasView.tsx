import { useState } from 'react';
import { RegistroCarga } from './RegistroCarga';
import type { AppConfig } from './config';
import { NUM_SEMANAS, tendencia, ultimoRegistro, type DiaCargas } from './cargas';

interface Props {
  cfg: AppConfig;
  editable: boolean;
  dias: DiaCargas[];
  semana: number;
  diaInicial: string;
}

export function CargasView({ cfg, editable, dias, semana, diaInicial }: Props) {
  const [diaSel, setDiaSel] = useState(() =>
    dias.some((d) => d.dia === diaInicial) ? diaInicial : (dias[0]?.dia ?? '')
  );
  // Se incrementa al guardar para repintar la grilla de semanas al instante.
  const [, setTick] = useState(0);
  const dia = dias.find((d) => d.dia === diaSel);

  return (
    <section>
      <div className="chips">
        {dias.map((d) => (
          <button
            key={d.dia}
            className={`chip ${d.dia === diaSel ? 'activo' : ''}`}
            onClick={() => setDiaSel(d.dia)}
          >
            {d.dia.slice(0, 3)}
          </button>
        ))}
      </div>

      {dia && (
        <>
          <h2 className="titulo-dia">
            {dia.dia}
            {dia.titulo && <span className="subtitulo"> — {dia.titulo}</span>}
            {dia.intensidad && (
              <span className={`intensidad ${dia.intensidad}`}>{dia.intensidad}</span>
            )}
          </h2>
          {dia.nota && <p className="nota-dia">{dia.nota}</p>}

          {dia.ejercicios.length === 0 && <p className="estado">Sin ejercicios este día.</p>}

          {dia.ejercicios.map((ej) => {
            const t = tendencia(ej, semana);
            const ultimo = ultimoRegistro(ej, semana);
            const p = ej.plan;
            return (
              <article className={`card ${ej.historico ? 'historico' : ''}`} key={ej.nombre}>
                <div className="card-head">
                  <h3>
                    {ej.nombre}
                    {p?.pesoCorporal && <span className="tag">peso corporal</span>}
                    {ej.historico && <span className="tag gris">histórico</span>}
                  </h3>
                  <span className="objetivo mono">{ej.objetivo}</span>
                </div>
                {p && (
                  <div className="meta-plan">
                    {p.alternativas?.length ? (
                      <span className="mono alt">↔ {p.alternativas.join(' / ')}</span>
                    ) : null}
                    {p.finisher && <span className="mono alt">+ {p.finisher}</span>}
                    <span className="mono desc">{p.descansoSeg / 60}′ desc.</span>
                  </div>
                )}
                {p?.objetivoProximo && <p className="proximo">▲ {p.objetivoProximo}</p>}
                <div className="ultimo">
                  {ultimo ? (
                    <>
                      <span className="mono valor">{ultimo.valor}</span>
                      <span className="detalle">Sem {ultimo.semana}</span>
                      {t === 'sube' && <span className="trend sube">▲</span>}
                      {t === 'baja' && <span className="trend baja">▼</span>}
                      {t === 'igual' && <span className="trend igual">＝</span>}
                    </>
                  ) : (
                    <span className="detalle">Sin registros</span>
                  )}
                </div>
                {editable && p && !ej.historico && (
                  <RegistroCarga
                    key={`${dia.dia}-${ej.nombre}-${semana}`}
                    cfg={cfg}
                    dia={dia.dia}
                    ejercicio={ej.nombre}
                    objetivo={ej.objetivo || p.objetivo}
                    unidad={p.unidad}
                    semana={semana}
                    actual={ej.sems[semana - 1] ?? null}
                    ultimo={ultimo?.valor ?? null}
                    onGuardado={(v) => {
                      ej.sems[semana - 1] = v;
                      setTick((t) => t + 1);
                    }}
                  />
                )}

                <div className="semanas">
                  {Array.from({ length: NUM_SEMANAS }, (_, i) => (
                    <div key={i} className={`sem ${i + 1 === semana ? 'actual' : ''}`}>
                      <span className="sem-num">S{i + 1}</span>
                      <span className="mono sem-valor">{ej.sems[i] ?? '·'}</span>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </>
      )}
    </section>
  );
}
