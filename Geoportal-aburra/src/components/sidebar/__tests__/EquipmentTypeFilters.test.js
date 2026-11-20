import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import EquipmentTypeFilters from '../EquipmentTypeFilters';

vi.mock('../../../context/useMapContext', async () => {
  const { EQUIPMENT_TYPES } = await import('../../../constants/equipmentTypes');
  const activeEquipmentTypes = Object.fromEntries(
    Object.values(EQUIPMENT_TYPES).map((type) => [type, true]),
  );

  return {
    useMapContext: () => ({
      activeEquipmentTypes,
      toggleEquipmentType: vi.fn(),
    }),
  };
});

describe('EquipmentTypeFilters', () => {
  it('muestra etiquetas completas en escritorio y etiquetas compactas en móvil', () => {
    const html = renderToStaticMarkup(createElement(EquipmentTypeFilters));

    expect(html).toContain('Gimnasio');
    expect(html).toContain('Training al aire libre');
    expect(html).toContain('Centros deportivos');
    expect(html).toContain('Aire libre');
    expect(html).toContain('Centros');
    expect(html).toContain('sm:hidden');
    expect(html).toContain('hidden sm:inline');
    expect(html).toContain('aria-label="Training al aire libre"');
    expect(html).toContain('aria-label="Centros deportivos"');
  });

  it('usa chips compactos en móvil y evita max-w-full en el contenedor interno', () => {
    const html = renderToStaticMarkup(createElement(EquipmentTypeFilters));

    expect(html).not.toContain('max-w-full');
    expect(html).toContain('max-md:min-h-8');
    expect(html).toContain('max-md:border-2');
    expect(html).toContain('max-md:gap-1.5');
  });
});
