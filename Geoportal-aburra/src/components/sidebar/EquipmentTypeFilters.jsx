import { EQUIPMENT_TYPES, EQUIPMENT_TYPE_STYLES } from '../../constants/equipmentTypes';
import { useMapContext } from '../../context/useMapContext';

export default function EquipmentTypeFilters({ className = '' }) {
  const { activeEquipmentTypes, toggleEquipmentType } = useMapContext();

  return (
    <div className={`pointer-events-auto flex w-max max-w-full gap-2 max-md:gap-1 ${className}`}>
      {Object.values(EQUIPMENT_TYPES).map((type) => {
        const active = activeEquipmentTypes[type];
        const color = EQUIPMENT_TYPE_STYLES[type].color;

        return (
          <label
            key={type}
            className={`has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--color-accent)] has-[:focus-visible]:ring-offset-2 flex shrink-0 cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 py-2 text-xs font-medium shadow-sm outline-none transition-all duration-200 [-webkit-tap-highlight-color:transparent] focus:outline-none active:outline-none max-md:min-h-11 max-md:gap-1 max-md:px-1.5 max-md:text-[11px] ${
              active
                ? 'text-gray-900'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
            }`}
            style={{
              borderColor: active ? color : undefined,
              backgroundColor: active ? `color-mix(in srgb, ${color} 12%, white)` : undefined,
            }}
          >
            <input
              type="checkbox"
              checked={active}
              onChange={() => toggleEquipmentType(type)}
              className="sr-only outline-none focus:outline-none focus-visible:outline-none"
              style={{ accentColor: color }}
            />
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color, opacity: active ? 1 : 0.45 }}
            />
            {EQUIPMENT_TYPE_STYLES[type].label}
          </label>
        );
      })}
    </div>
  );
}
