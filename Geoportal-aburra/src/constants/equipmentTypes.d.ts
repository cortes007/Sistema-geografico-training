export const EQUIPMENT_TYPES: {
  gym: string;
  outdoorGym: string;
  sportsCentre: string;
};

export const EQUIPMENT_TYPE_STYLES: Record<
  string,
  {
    color: string;
    fill: string;
    label: string;
  }
>;

export function getEquipmentTypeFromProperties(
  properties?: Record<string, unknown>,
): string | null;
