export interface ComponentCriterion {
  key: string;
  label: string;
}

export interface MergedComponentScore {
  key: string;
  label: string;
  averageRating: number | null;
  ratingCount: number;
}

export function getComponentCriteriaForPlace(params?: {
  equipmentType?: string | null;
  type?: string | null;
}): ComponentCriterion[];

export function mergeComponentSummaryWithCriteria(
  criteria: ComponentCriterion[],
  summaryRows: Array<{ componente: string; promedio: number; cantidad: number }>
): MergedComponentScore[];
