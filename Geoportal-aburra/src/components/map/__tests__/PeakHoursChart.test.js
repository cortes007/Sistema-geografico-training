import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PeakHoursChart from '../PeakHoursChart';

describe('PeakHoursChart', () => {
  it('renderiza título, resumen, nivel actual, etiqueta "Ahora", filtro feGaussianBlur y nota al pie dentro de 04:00-22:00', () => {
    // 19:00 en America/Bogota (00:00Z)
    const bogota1900 = new Date('2026-11-18T00:00:00Z');
    const html = renderToStaticMarkup(
      createElement(PeakHoursChart, {
        equipmentType: 'gimnasio',
        type: 'fitness_centre',
        referenceDate: bogota1900,
      })
    );

    expect(html).toContain('Horas de mayor afluencia');
    expect(html).toContain('Horas pico: 5:00-6:00 am y 6:00-8:00 pm');
    expect(html).toContain('Nivel actual: Alto');
    expect(html).toContain('Ahora');
    expect(html).toContain('feGaussianBlur');
    expect(html).toContain('4:00');
    expect(html).toContain('22:00');
    expect(html).toContain('Estimación general, no es una medición de este lugar');
  });

  it('omite el resaltado "Ahora" y el nivel actual cuando la hora en Bogotá está fuera de 04:00-22:00', () => {
    // 23:00 en America/Bogota (04:00Z)
    const bogota2300 = new Date('2026-11-18T04:00:00Z');
    const html = renderToStaticMarkup(
      createElement(PeakHoursChart, {
        equipmentType: 'gimnasio al aire libre',
        type: 'fitness_station',
        referenceDate: bogota2300,
      })
    );

    expect(html).toContain('Horas de mayor afluencia');
    expect(html).toContain('Horas pico: 4:00-10:00 pm');
    expect(html).not.toContain('Nivel actual:');
    expect(html).not.toContain('>Ahora<');
  });

  it('no renderiza nada si el lugar no corresponde a ninguno de los 3 tipos configurados', () => {
    const html = renderToStaticMarkup(
      createElement(PeakHoursChart, {
        equipmentType: null,
        type: 'Lugar desconocido',
      })
    );

    expect(html).toBe('');
  });
});
