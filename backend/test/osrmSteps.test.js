import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeOsrmSteps } from '../src/application/routing/osrmSteps.js';

test('normalizes OSRM maneuver steps into readable Spanish instructions', () => {
  const route = {
    legs: [
      {
        steps: [
          {
            distance: 140,
            duration: 95,
            name: 'Carrera 70',
            maneuver: {
              type: 'depart',
              modifier: 'north',
              location: [-75.59, 6.245],
            },
          },
          {
            distance: 320,
            duration: 180,
            name: 'Circular 4',
            maneuver: {
              type: 'turn',
              modifier: 'right',
              location: [-75.588, 6.246],
            },
          },
          {
            distance: 210,
            duration: 60,
            name: 'Avenida Nutibara',
            maneuver: {
              type: 'roundabout',
              exit: 2,
              location: [-75.587, 6.244],
            },
          },
          {
            distance: 90,
            duration: 45,
            name: '',
            ref: 'Ciclorruta Sur',
            maneuver: {
              type: 'fork',
              modifier: 'slight left',
              location: [-75.586, 6.243],
            },
          },
          {
            distance: 0,
            duration: 0,
            name: 'Unidad Deportiva Atanasio Girardot',
            maneuver: {
              type: 'arrive',
              location: [-75.585, 6.242],
            },
          },
        ],
      },
    ],
  };

  const steps = normalizeOsrmSteps(route);

  assert.equal(steps.length, 5);
  assert.deepEqual(steps[0], {
    instruction: 'Inicia el recorrido por Carrera 70',
    streetName: 'Carrera 70',
    distanceMeters: 140,
    durationSeconds: 95,
    maneuverType: 'depart',
    modifier: 'north',
    location: [-75.59, 6.245],
  });
  assert.equal(steps[1].instruction, 'Gira a la derecha por Circular 4');
  assert.equal(
    steps[2].instruction,
    'En la glorieta, toma la salida 2 hacia Avenida Nutibara'
  );
  assert.equal(
    steps[3].instruction,
    'En la bifurcación, mantente levemente a la izquierda por Ciclorruta Sur'
  );
  assert.equal(
    steps[4].instruction,
    'Has llegado a tu destino (Unidad Deportiva Atanasio Girardot)'
  );
});

test('returns empty array when legs are missing and omits invalid step locations', () => {
  assert.deepEqual(normalizeOsrmSteps({}), []);
  assert.deepEqual(normalizeOsrmSteps({ legs: [] }), []);

  const steps = normalizeOsrmSteps({
    legs: [
      {
        steps: [
          {
            distance: 50,
            duration: 20,
            name: '',
            maneuver: {
              type: 'continue',
              modifier: 'straight',
              location: [999, 6.2],
            },
          },
          {
            distance: -10,
            duration: 5,
            name: 'Inválido',
            maneuver: { type: 'turn', modifier: 'left', location: [-75.5, 6.2] },
          },
        ],
      },
    ],
  });

  assert.deepEqual(steps, [
    {
      instruction: 'Continúa recto',
      streetName: '',
      distanceMeters: 50,
      durationSeconds: 20,
      maneuverType: 'continue',
      modifier: 'straight',
      location: null,
    },
  ]);
});
