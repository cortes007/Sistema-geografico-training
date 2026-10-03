import {
  Upload,
  Eye,
  EyeOff,
  Trash2,
  Download,
  Loader2,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react';
import { useLayerManager } from '../../hooks/useLayerManager';
import { EQUIPMENT_TYPES, EQUIPMENT_TYPE_STYLES } from '../../constants/equipmentTypes';

export default function LayerPanel() {
  const {
    inputRef,
    layers,
    loading,
    error,
    targetCrsByLayer,
    handleFileChange,
    handleDownload,
    handleTargetCrsChange,
    openFilePicker,
    toggleLayerVisibility,
    removeLayer,
    activeEquipmentTypes,
    toggleEquipmentType,
    crsOptions,
    getCrsDetails,
  } = useLayerManager();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          onClick={openFilePicker}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-accent-primary)] px-3 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-[var(--color-accent-secondary)] hover:shadow-xl"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Cargar capa (.geojson / .zip)
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".geojson,.json,.zip"
          className="hidden"
          onChange={handleFileChange}
        />
        {error && <p className="mt-2 text-xs text-[var(--color-accent-danger)]">{error}</p>}
      </div>

      <div className="border-y border-[var(--color-bg-elevated)] py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
          Filtrar equipamiento
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(EQUIPMENT_TYPES).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-all duration-200 ${
                activeEquipmentTypes[type]
                  ? 'border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]/20 text-[var(--color-text-primary)]'
                  : 'border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
              }`}
            >
              <input
                type="checkbox"
                checked={activeEquipmentTypes[type]}
                onChange={() => toggleEquipmentType(type)}
                className="h-4 w-4 rounded border-[var(--color-bg-elevated)]"
              />
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: EQUIPMENT_TYPE_STYLES[type].color }}
              />
              {EQUIPMENT_TYPE_STYLES[type].label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {layers.length === 0 && (
          <p className="text-xs text-[var(--color-text-secondary)]">Aún no hay capas cargadas.</p>
        )}

        {layers.map((layer) => (
          <div key={layer.id} className="rounded-xl border border-[var(--color-bg-elevated)] bg-[var(--color-bg-secondary)] p-3 text-sm shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-[var(--color-accent-primary)]/50">
            {(() => {
              const targetCode = targetCrsByLayer[layer.id] || 'EPSG:4326';
              const source = getCrsDetails(layer.sourceCode);
              const target = getCrsDetails(targetCode);
              const isReprojected = layer.sourceCode !== targetCode;

              return (
                <>
            <div className="flex items-center justify-between">
              <span className="truncate font-medium text-[var(--color-text-primary)]" title={layer.name}>{layer.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleLayerVisibility(layer.id)} className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                  {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => removeLayer(layer.id)} className="text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-accent-danger)]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
              CRS original: <span className="font-medium text-[var(--color-text-primary)]">{layer.sourceCRS}</span>
            </p>

            <div className="mt-2 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] p-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transformación aplicada
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-[var(--color-text-secondary)]">Origen</p>
                  <p className="font-semibold text-[var(--color-text-primary)]">{source.code}</p>
                  <p className="truncate text-[10px] text-[var(--color-text-secondary)]" title={source.label}>{source.label}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Unidad: {source.unit}</p>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-[var(--color-accent-primary)]" />
                <div className="text-right">
                  <p className="text-[10px] uppercase text-[var(--color-text-secondary)]">Destino</p>
                  <p className="font-semibold text-[var(--color-accent-primary)]">{target.code}</p>
                  <p className="truncate text-[10px] text-[var(--color-text-secondary)]" title={target.label}>{target.label}</p>
                  <p className="text-[10px] text-[var(--color-text-secondary)]">Unidad: {target.unit}</p>
                </div>
              </div>
              <p className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${isReprojected ? 'text-[var(--color-accent-success)]' : 'text-[var(--color-text-secondary)]'}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isReprojected ? 'Capa reproyectada al CRS destino' : 'Capa en su CRS original'}
              </p>
              <p className="mt-1 text-[10px] text-[var(--color-text-secondary)]">
                Vista del mapa: EPSG:3857. La posición geográfica se conserva.
              </p>
            </div>

            <div className="mt-2 flex items-center gap-1">
              <select
                aria-label={`CRS de visualización para ${layer.name}`}
                className="flex-1 rounded-lg border border-[var(--color-bg-elevated)] bg-[var(--color-bg-primary)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none transition-all duration-200 focus:border-[var(--color-accent-primary)]"
                value={targetCrsByLayer[layer.id] || 'EPSG:4326'}
                onChange={(e) => handleTargetCrsChange(layer.id, e.target.value)}
              >
                {crsOptions.map((opt) => (
                  <option key={opt.code} value={opt.code}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={() => handleDownload(layer)}
                title="Descargar capa reproyectada"
                className="rounded-lg bg-[var(--color-bg-elevated)] p-2 text-[var(--color-text-secondary)] transition-all duration-200 hover:bg-[var(--color-accent-primary)] hover:text-white"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>
    </div>
  );
}
