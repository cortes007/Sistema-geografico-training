import { useEffect, useMemo, useState } from 'react';
import {
  generatePeakCurve,
  getActivePeakBarIndex,
  getCurrentLevel,
  getPeakHourAxisTicks,
  getPeakSummary,
  resolvePeakPlaceType,
} from '../utils/peakHours';

const ONE_MINUTE_MS = 60_000;

/**
 * Gestiona el ciclo de actualización cada minuto para la gráfica de horas pico
 * mientras el detalle del lugar está abierto y coordina los datos calculados en `utils/peakHours`.
 */
export function usePeakHours(typeInput, initialDate = null) {
  const [now, setNow] = useState(() => (initialDate instanceof Date ? initialDate : new Date()));

  useEffect(() => {
    if (initialDate instanceof Date) return undefined;

    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, ONE_MINUTE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [initialDate]);

  const effectiveNow = initialDate instanceof Date ? initialDate : now;

  return useMemo(() => {
    const canonicalType = resolvePeakPlaceType(typeInput);
    if (!canonicalType) {
      return {
        canonicalType: null,
        curve: [],
        summary: '',
        currentLevel: null,
        activeBarIndex: null,
        axisTicks: [],
      };
    }

    return {
      canonicalType,
      curve: generatePeakCurve(canonicalType),
      summary: getPeakSummary(canonicalType),
      currentLevel: getCurrentLevel(canonicalType, effectiveNow),
      activeBarIndex: getActivePeakBarIndex(effectiveNow),
      axisTicks: getPeakHourAxisTicks(),
    };
  }, [effectiveNow, typeInput]);
}
