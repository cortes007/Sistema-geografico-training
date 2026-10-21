import { useMapContext } from '../../context/useMapContext';
import { CRS_OPTIONS } from '../../config/crsDefinitions';
import CoordinateDisplay from '../ui/CoordinateDisplay';

export default function CRSPanel() {
  const { activeCRS, setActiveCRS, capturedCoord } = useMapContext();

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 p-3 shadow-lg backdrop-blur-sm">
      <label className="text-xs font-medium text-[var(--color-text-secondary)]">Sistema de referencia para coordenadas</label>
      <select
        aria-label="Sistema de referencia para coordenadas"
        className="min-h-11 w-full rounded-lg border border-[var(--color-text-secondary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm text-[var(--color-text-primary)] transition-all duration-200 motion-reduce:transition-none focus:border-[var(--color-accent-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)]"
        value={activeCRS}
        onChange={(e) => setActiveCRS(e.target.value)}
      >
        {CRS_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.label}</option>
        ))}
      </select>

      <CoordinateDisplay coordinate3857={capturedCoord} targetCRS={activeCRS} />

      <p className="text-[11px] text-[var(--color-text-secondary)]">Haz clic en el mapa para capturar una coordenada.</p>
    </div>
  );
}
