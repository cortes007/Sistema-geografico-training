export function validateCoordinates(latitud: number, longitud: number): void {
  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
    throw new Error('La latitud debe estar entre -90 y 90.');
  }
  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
    throw new Error('La longitud debe estar entre -180 y 180.');
  }
}

export function validateRadius(radioMetros: number): void {
  if (!Number.isFinite(radioMetros) || radioMetros <= 0) {
    throw new Error('El radio debe ser un número mayor que 0.');
  }
}

export function assertNonEmpty(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} es obligatorio.`);
  }
  return normalized;
}

export function throwSupabaseError(operation: string, error: { message: string; code?: string }): never {
  const code = error.code ? ` [${error.code}]` : '';
  throw new Error(`${operation}${code}: ${error.message}`);
}