import { useMapContext } from '../../context/MapContext';
import { CRS_OPTIONS } from '../../config/crsDefinitions';
import CoordinateDisplay from '../ui/CoordinateDisplay';

export default function CRSPanel() {
  const { activeCRS, setActiveCRS, capturedCoord } = useMapContext();

  return (
    <div className="flex flex-col gap-2 rounded-md border border-gray-200 p-3">
      <label className="text-xs font-medium text-gray-600">Sistema de referencia para coordenadas</label>
      <select
        className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm"
        value={activeCRS}
        onChange={(e) => setActiveCRS(e.target.value)}
      >
        {CRS_OPTIONS.map((opt) => (
          <option key={opt.code} value={opt.code}>{opt.label}</option>
        ))}
      </select>

      <CoordinateDisplay coordinate3857={capturedCoord} targetCRS={activeCRS} />

      <p className="text-[11px] text-gray-400">Haz clic en el mapa para capturar una coordenada.</p>
    </div>
  );
}
