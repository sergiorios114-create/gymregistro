import { useState } from 'react';
import { api } from './api';
import type { AppConfig } from './config';

interface Props {
  cfg: AppConfig;
  onSave: (cfg: AppConfig) => void;
}

export function SettingsView({ cfg, onSave }: Props) {
  const [apiUrl, setApiUrl] = useState(cfg.apiUrl);
  const [token, setToken] = useState(cfg.token);
  const [startDate, setStartDate] = useState(cfg.startDate);
  const [prueba, setPrueba] = useState<string | null>(null);

  async function probar() {
    setPrueba('Probando…');
    try {
      await api.ping({ apiUrl: apiUrl.trim(), token: token.trim(), startDate });
      setPrueba('✓ Conexión OK');
    } catch (err) {
      setPrueba(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <section className="ajustes">
      <h2>Ajustes</h2>
      <p className="detalle">
        La URL y el token se guardan solo en este dispositivo (localStorage), nunca en el código.
      </p>

      <label>
        URL del Web App (Apps Script)
        <input
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://script.google.com/macros/s/…/exec"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
      </label>

      <label>
        Token del API
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="el mismo valor de API_TOKEN en Script Properties"
        />
      </label>

      <label>
        Inicio del programa (día 1 · Semana 1)
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>

      <div className="acciones">
        <button onClick={() => void probar()} disabled={!apiUrl || !token}>
          Probar conexión
        </button>
        <button
          className="primario"
          onClick={() => onSave({ apiUrl: apiUrl.trim(), token: token.trim(), startDate })}
        >
          Guardar
        </button>
      </div>
      {prueba && <p className="mono resultado-prueba">{prueba}</p>}
    </section>
  );
}
