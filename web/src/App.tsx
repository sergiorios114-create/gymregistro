import { useEffect, useMemo, useState } from 'react';
import { api, type SheetData } from './api';
import { buildModel, demoModel, type DiaCargas } from './cargas';
import { isConfigured, loadConfig, saveConfig, semanaActual, type AppConfig } from './config';
import { diaDeFecha } from './plan';
import { CargasView } from './CargasView';
import { SettingsView } from './SettingsView';

type Tab = 'cargas' | 'bitacora' | 'ajustes';
type Estado =
  | { fase: 'cargando' }
  | { fase: 'ok'; dias: DiaCargas[]; demo: boolean }
  | { fase: 'error'; mensaje: string };

export default function App() {
  const [cfg, setCfg] = useState<AppConfig>(loadConfig);
  const [tab, setTab] = useState<Tab>(() => (isConfigured(loadConfig()) ? 'cargas' : 'ajustes'));
  const [estado, setEstado] = useState<Estado>({ fase: 'cargando' });

  const semana = useMemo(() => semanaActual(cfg), [cfg]);

  async function recargar(config: AppConfig) {
    if (!isConfigured(config)) {
      setEstado({ fase: 'ok', dias: demoModel(), demo: true });
      return;
    }
    setEstado({ fase: 'cargando' });
    try {
      const sheet: SheetData = await api.cargas(config);
      setEstado({ fase: 'ok', dias: buildModel(sheet), demo: false });
    } catch (err) {
      setEstado({ fase: 'error', mensaje: err instanceof Error ? err.message : String(err) });
    }
  }

  useEffect(() => {
    void recargar(cfg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSaveConfig(nueva: AppConfig) {
    saveConfig(nueva);
    setCfg(nueva);
    setTab('cargas');
    void recargar(nueva);
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Gym</h1>
        <span className="badge-semana mono">Sem {semana}</span>
      </header>

      <main className="contenido">
        {tab === 'cargas' && (
          <>
            {estado.fase === 'cargando' && <p className="estado">Cargando planilla…</p>}
            {estado.fase === 'error' && (
              <div className="estado error">
                <p>No pude leer la planilla: {estado.mensaje}</p>
                <button onClick={() => void recargar(cfg)}>Reintentar</button>
              </div>
            )}
            {estado.fase === 'ok' && (
              <>
                {estado.demo && (
                  <p className="aviso-demo">
                    Modo demo (sin API configurado): mostrando el plan sin cargas. Configura la URL y
                    el token en Ajustes.
                  </p>
                )}
                <CargasView
                  cfg={cfg}
                  editable={!estado.demo}
                  dias={estado.dias}
                  semana={semana}
                  diaInicial={diaDeFecha(new Date()).dia}
                />
              </>
            )}
          </>
        )}

        {tab === 'bitacora' && (
          <p className="estado">La bitácora diaria llega en la siguiente iteración.</p>
        )}

        {tab === 'ajustes' && <SettingsView cfg={cfg} onSave={onSaveConfig} />}
      </main>

      <nav className="tabbar">
        <button className={tab === 'cargas' ? 'activo' : ''} onClick={() => setTab('cargas')}>
          Cargas
        </button>
        <button className={tab === 'bitacora' ? 'activo' : ''} onClick={() => setTab('bitacora')}>
          Bitácora
        </button>
        <button className={tab === 'ajustes' ? 'activo' : ''} onClick={() => setTab('ajustes')}>
          Ajustes
        </button>
      </nav>
    </div>
  );
}
