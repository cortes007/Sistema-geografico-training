import { useId } from 'react';
import { THEME_COLORS } from '../../constants/themeColors';
import { usePeakHours } from '../../hooks/usePeakHours';

const SVG_WIDTH = 360;
const SVG_HEIGHT = 116;
const PLOT_LEFT = 14;
const PLOT_RIGHT = 346;
const PLOT_TOP = 18;
const PLOT_BOTTOM = 94;
const BAR_WIDTH = 2;
const BAR_RADIUS = 1;

/**
 * Gráfica SVG de horas de mayor afluencia (estilo pulso de luz con barras finas y brillo suave).
 * Autocontenida (`w-full min-w-0`), sin dependencias externas ni animaciones.
 */
export default function PeakHoursChart({
  equipmentType = null,
  type = '',
  referenceDate = null,
}) {
  const glowFilterId = useId();
  const {
    canonicalType,
    curve,
    summary,
    currentLevel,
    activeBarIndex,
    axisTicks,
  } = usePeakHours({ equipmentType, type }, referenceDate);

  if (!canonicalType || curve.length === 0) {
    return null;
  }

  const plotWidth = PLOT_RIGHT - PLOT_LEFT;
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;
  const stepX = curve.length > 1 ? plotWidth / (curve.length - 1) : 0;

  const gridLinesY = [
    PLOT_TOP + plotHeight * 0.25,
    PLOT_TOP + plotHeight * 0.5,
    PLOT_TOP + plotHeight * 0.75,
  ];

  const bars = curve.map((value, index) => {
    const barHeight = Math.max(4, Math.round(value * plotHeight * 10) / 10);
    const centerX = PLOT_LEFT + index * stepX;
    const x = Number((centerX - BAR_WIDTH / 2).toFixed(2));
    const y = Number((PLOT_BOTTOM - barHeight).toFixed(2));
    const isCurrentHour = activeBarIndex === index;

    return {
      index,
      x,
      y,
      centerX: Number(centerX.toFixed(2)),
      height: barHeight,
      isCurrentHour,
      fill: isCurrentHour ? THEME_COLORS.accent : THEME_COLORS.brandLight,
    };
  });

  const activeBar = activeBarIndex !== null ? bars[activeBarIndex] : null;
  const activeLabelX = activeBar
    ? Math.min(PLOT_RIGHT - 14, Math.max(PLOT_LEFT + 14, activeBar.centerX))
    : null;
  const activeLabelY = activeBar ? Math.max(11, activeBar.y - 4) : null;

  const ariaLabel = currentLevel
    ? `Horas de mayor afluencia. ${summary}. Nivel actual: ${currentLevel}.`
    : `Horas de mayor afluencia. ${summary}. Fuera del horario de referencia.`;

  return (
    <section
      aria-label="Horas de mayor afluencia"
      className="w-full min-w-0 overflow-hidden rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)]/80 p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-[var(--color-text-primary)]">
            Horas de mayor afluencia
          </h3>
          <p className="mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
            {summary}
          </p>
        </div>
        {currentLevel && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-text-primary)]">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: THEME_COLORS.accent }}
            />
            Nivel actual: {currentLevel}
          </span>
        )}
      </div>

      <div className="mt-2 w-full min-w-0">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          role="img"
          aria-label={ariaLabel}
          className="block h-auto w-full select-none"
        >
          <defs>
            <filter
              id={glowFilterId}
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>

          <g aria-hidden="true">
            {gridLinesY.map((lineY) => (
              <line
                key={lineY}
                x1={PLOT_LEFT}
                y1={lineY}
                x2={PLOT_RIGHT}
                y2={lineY}
                stroke={THEME_COLORS.brandLight}
                strokeOpacity="0.14"
                strokeWidth="0.75"
              />
            ))}
          </g>

          <g
            aria-hidden="true"
            filter={`url(#${glowFilterId})`}
            opacity="0.55"
          >
            {bars.map((bar) => (
              <rect
                key={`glow-${bar.index}`}
                x={bar.x}
                y={bar.y}
                width={BAR_WIDTH}
                height={bar.height}
                rx={BAR_RADIUS}
                fill={bar.fill}
              />
            ))}
          </g>

          <g aria-hidden="true">
            {bars.map((bar) => (
              <rect
                key={`bar-${bar.index}`}
                x={bar.x}
                y={bar.y}
                width={BAR_WIDTH}
                height={bar.height}
                rx={BAR_RADIUS}
                fill={bar.fill}
                opacity={bar.isCurrentHour ? '1' : '0.9'}
              />
            ))}
          </g>

          {activeBar && activeLabelX !== null && activeLabelY !== null && (
            <text
              x={activeLabelX}
              y={activeLabelY}
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="700"
              fill={THEME_COLORS.accent}
            >
              Ahora
            </text>
          )}

          <g aria-hidden="true">
            {axisTicks.map((tick) => {
              const tickX = Number((PLOT_LEFT + tick.barIndex * stepX).toFixed(2));
              return (
                <text
                  key={tick.hour}
                  x={tickX}
                  y={SVG_HEIGHT - 6}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill={THEME_COLORS.muted}
                >
                  {tick.label}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]/80">
        Estimación general, no es una medición de este lugar
      </p>
    </section>
  );
}
