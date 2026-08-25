import { Upload, Eye, EyeOff, Trash2, Download, Loader2 } from 'lucide-react';
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
        <div className="flex flex-col gap-2">
          {Object.values(EQUIPMENT_TYPES).map((type) => (
            <label key={type} className="flex items-center gap-2 text-sm text-gray-700">
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
          <div key={layer.id} className="rounded-md border border-gray-200 p-2 text-sm">
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
              CRS detectado: <span className="font-medium text-gray-700">{layer.sourceCRS}</span>
            </p>

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
          </div>
        ))}
      </div>
    </div>
  );
}
