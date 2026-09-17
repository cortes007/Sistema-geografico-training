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
          className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </div>

      <div className="border-y border-gray-200 py-3">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">
          Filtrar equipamiento
        </h2>
        <div className="flex flex-wrap gap-2">
          {Object.values(EQUIPMENT_TYPES).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition ${
                activeEquipmentTypes[type]
                  ? 'border-blue-200 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              <input
                type="checkbox"
                checked={activeEquipmentTypes[type]}
                onChange={() => toggleEquipmentType(type)}
                className="h-4 w-4 rounded border-gray-300"
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
          <p className="text-xs text-gray-500">Aún no hay capas cargadas.</p>
        )}

        {layers.map((layer) => (
          <div key={layer.id} className="rounded-xl bg-white p-2 text-sm shadow-sm">
            {(() => {
              const targetCode = targetCrsByLayer[layer.id] || 'EPSG:4326';
              const source = getCrsDetails(layer.sourceCode);
              const target = getCrsDetails(targetCode);
              const isReprojected = layer.sourceCode !== targetCode;

              return (
                <>
            <div className="flex items-center justify-between">
              <span className="truncate font-medium" title={layer.name}>{layer.name}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleLayerVisibility(layer.id)} className="text-gray-500 hover:text-gray-800">
                  {layer.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button onClick={() => removeLayer(layer.id)} className="text-gray-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              CRS original: <span className="font-medium text-gray-700">{layer.sourceCRS}</span>
            </p>

            <div className="mt-2 rounded border border-gray-200 bg-gray-50 p-2">
              <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Transformación aplicada
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 text-xs">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Origen</p>
                  <p className="font-semibold text-gray-700">{source.code}</p>
                  <p className="truncate text-[10px] text-gray-500" title={source.label}>{source.label}</p>
                  <p className="text-[10px] text-gray-400">Unidad: {source.unit}</p>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                <div className="text-right">
                  <p className="text-[10px] uppercase text-gray-400">Destino</p>
                  <p className="font-semibold text-blue-700">{target.code}</p>
                  <p className="truncate text-[10px] text-gray-500" title={target.label}>{target.label}</p>
                  <p className="text-[10px] text-gray-400">Unidad: {target.unit}</p>
                </div>
              </div>
              <p className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${isReprojected ? 'text-emerald-700' : 'text-gray-500'}`}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isReprojected ? 'Capa reproyectada al CRS destino' : 'Capa en su CRS original'}
              </p>
              <p className="mt-1 text-[10px] text-gray-400">
                Vista del mapa: EPSG:3857. La posición geográfica se conserva.
              </p>
            </div>

            <div className="mt-2 flex items-center gap-1">
              <select
                aria-label={`CRS de visualización para ${layer.name}`}
                className="flex-1 rounded border border-gray-300 bg-white px-1 py-1 text-xs"
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
                className="rounded bg-gray-100 p-1.5 text-gray-600 hover:bg-gray-200"
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
