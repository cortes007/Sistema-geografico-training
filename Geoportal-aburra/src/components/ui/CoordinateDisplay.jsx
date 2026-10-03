import { transform, get as getProjection } from 'ol/proj';
import { CRS_OPTIONS, getCrsLabel } from '../../config/crsDefinitions';

export default function CoordinateDisplay({ coordinate3857, targetCRS }) {
  if (!coordinate3857) {
    return <p className="text-xs text-[var(--color-text-secondary)]">Sin coordenada capturada.</p>;
  }

  const [x, y] = transform(coordinate3857, 'EPSG:3857', targetCRS);
  const projection = getProjection(targetCRS);
  const isGeographic = projection?.getUnits() === 'degrees';
  const decimals = isGeographic ? 6 : 2;
  const unit = isGeographic ? '°' : 'm';
  const opt = CRS_OPTIONS.find((c) => c.code === targetCRS);

  return (
    <div className="rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-2 text-xs">
      <p className="font-medium text-[var(--color-text-primary)]">{opt?.label || getCrsLabel(targetCRS)}</p>
      <p className="mt-1 font-mono text-[var(--color-text-secondary)]">
        X: {x.toFixed(decimals)} {unit}
      </p>
      <p className="font-mono text-[var(--color-text-secondary)]">
        Y: {y.toFixed(decimals)} {unit}
      </p>
    </div>
  );
}
