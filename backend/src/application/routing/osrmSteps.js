const MODIFIER_LABELS = {
  uturn: 'en U',
  'sharp right': 'cerrado a la derecha',
  right: 'a la derecha',
  'slight right': 'levemente a la derecha',
  straight: 'recto',
  'slight left': 'levemente a la izquierda',
  left: 'a la izquierda',
  'sharp left': 'cerrado a la izquierda',
};

function isValidStepLocation(location) {
  return (
    Array.isArray(location)
    && location.length >= 2
    && Number.isFinite(location[0])
    && location[0] >= -180
    && location[0] <= 180
    && Number.isFinite(location[1])
    && location[1] >= -90
    && location[1] <= 90
  );
}

function resolveStreetName(step) {
  const name = typeof step?.name === 'string' ? step.name.trim() : '';
  if (name) return name;
  return typeof step?.ref === 'string' ? step.ref.trim() : '';
}

/**
 * Traduce una maniobra individual de OSRM a una instrucción legible en español.
 */
export function formatOsrmManeuver(step) {
  const type = step?.maneuver?.type || 'continue';
  const modifier = typeof step?.maneuver?.modifier === 'string' ? step.maneuver.modifier : null;
  const modifierText = modifier ? MODIFIER_LABELS[modifier] || '' : '';
  const streetName = resolveStreetName(step);
  const byStreet = streetName ? ` por ${streetName}` : '';
  const towardStreet = streetName ? ` hacia ${streetName}` : '';

  if (type === 'depart') {
    return `Inicia el recorrido${byStreet}`;
  }
  if (type === 'arrive') {
    return streetName ? `Has llegado a tu destino (${streetName})` : 'Has llegado a tu destino';
  }
  if (type === 'roundabout' || type === 'rotary' || type === 'roundabout turn') {
    const exitNumber = Number.isInteger(step?.maneuver?.exit) && step.maneuver.exit > 0
      ? ` ${step.maneuver.exit}`
      : '';
    return `En la glorieta, toma la salida${exitNumber}${towardStreet}`;
  }
  if (type === 'exit roundabout' || type === 'exit rotary') {
    return `Sal de la glorieta${towardStreet}`;
  }
  if (type === 'fork') {
    return modifierText
      ? `En la bifurcación, mantente ${modifierText}${byStreet}`
      : `Sigue la bifurcación${byStreet}`;
  }
  if (type === 'end of road') {
    return modifierText
      ? `Al final de la vía, gira ${modifierText}${byStreet}`
      : `Llegas al final de la vía${byStreet}`;
  }
  if (type === 'merge') {
    return `Incorpórate${towardStreet || byStreet}`;
  }
  if (type === 'on ramp') {
    return `Toma el acceso${towardStreet || byStreet}`;
  }
  if (type === 'off ramp') {
    return `Toma la salida${towardStreet || byStreet}`;
  }
  if (type === 'turn') {
    if (modifier === 'uturn') return `Da vuelta en U${byStreet}`;
    return modifierText ? `Gira ${modifierText}${byStreet}` : `Gira${byStreet}`;
  }
  if (type === 'new name' || type === 'continue' || type === 'use lane') {
    if (modifier === 'straight' || !modifierText) {
      return `Continúa recto${byStreet}`;
    }
    return `Mantente ${modifierText}${byStreet}`;
  }

  return streetName ? `Continúa${byStreet}` : 'Continúa por la ruta';
}

/**
 * Normaliza los pasos de `route.legs[].steps[]` de OSRM con coordenadas en EPSG:4326.
 */
export function normalizeOsrmSteps(route) {
  if (!Array.isArray(route?.legs) || route.legs.length === 0) return [];

  const normalized = [];
  for (const leg of route.legs) {
    if (!Array.isArray(leg?.steps)) continue;
    for (const step of leg.steps) {
      const distanceMeters = step?.distance;
      const durationSeconds = step?.duration;
      if (
        !Number.isFinite(distanceMeters)
        || distanceMeters < 0
        || !Number.isFinite(durationSeconds)
        || durationSeconds < 0
      ) {
        continue;
      }

      const rawLocation = step?.maneuver?.location;
      const location = isValidStepLocation(rawLocation)
        ? [rawLocation[0], rawLocation[1]]
        : null;

      normalized.push({
        instruction: formatOsrmManeuver(step),
        streetName: resolveStreetName(step),
        distanceMeters,
        durationSeconds,
        maneuverType: typeof step?.maneuver?.type === 'string' ? step.maneuver.type : 'continue',
        modifier: typeof step?.maneuver?.modifier === 'string' ? step.maneuver.modifier : null,
        location,
      });
    }
  }

  return normalized;
}
