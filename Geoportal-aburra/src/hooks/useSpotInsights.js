import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  guardarEnlacesSpot,
  listarResumenComponentesSpot,
  obtenerEnlacesSpot,
} from '../services/spotInsightsService';
import {
  getComponentCriteriaForPlace,
  mergeComponentSummaryWithCriteria,
} from '../utils/componentQuality';
import { resolveSpotLinks } from '../utils/spotLinks';

export async function loadSpotInsightsBundle({
  trainingSpotId,
  osmLinks = null,
  fetchLinks = obtenerEnlacesSpot,
  fetchComponents = listarResumenComponentesSpot,
} = {}) {
  const normalizedId = trainingSpotId ? String(trainingSpotId).trim() : '';
  if (!normalizedId) {
    return {
      links: resolveSpotLinks({ osmLinks, dbRecord: null }),
      componentRows: [],
      warnings: [],
    };
  }

  const [linksResult, componentsResult] = await Promise.allSettled([
    fetchLinks(normalizedId),
    fetchComponents(normalizedId),
  ]);

  const warnings = [];
  if (linksResult.status === 'rejected') {
    warnings.push(linksResult.reason?.message || 'No se pudieron cargar los enlaces.');
  }
  if (componentsResult.status === 'rejected') {
    warnings.push(componentsResult.reason?.message || 'No se pudo cargar la calidad de componentes.');
  }

  const dbRecord = linksResult.status === 'fulfilled' ? linksResult.value : null;

  return {
    links: resolveSpotLinks({ osmLinks, dbRecord }),
    componentRows: componentsResult.status === 'fulfilled' ? componentsResult.value : [],
    warnings,
  };
}

export function useSpotInsights(place) {
  const trainingSpotId = place?.trainingSpotId ? String(place.trainingSpotId) : '';
  const osmWebsite = place?.website || '';
  const osmInstagram = place?.instagram || '';
  const equipmentType = place?.equipmentType || null;
  const placeType = place?.type || '';

  const requestIdRef = useRef(0);
  const [bundle, setBundle] = useState(() => ({
    links: resolveSpotLinks({
      osmLinks: { website: osmWebsite, instagram: osmInstagram },
      dbRecord: null,
    }),
    componentRows: [],
    warnings: [],
  }));
  const [loading, setLoading] = useState(false);

  const reloadInsights = useCallback(async () => {
    const currentRequest = ++requestIdRef.current;
    setLoading(true);
    try {
      const nextBundle = await loadSpotInsightsBundle({
        trainingSpotId,
        osmLinks: { website: osmWebsite, instagram: osmInstagram },
      });
      if (requestIdRef.current !== currentRequest) return;
      setBundle(nextBundle);
    } finally {
      if (requestIdRef.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [osmInstagram, osmWebsite, trainingSpotId]);

  useEffect(() => {
    const timer = Promise.resolve().then(() => {
      reloadInsights();
    });
    return () => {
      void timer;
      requestIdRef.current += 1;
    };
  }, [reloadInsights]);

  const componentScores = useMemo(() => {
    const criteria = getComponentCriteriaForPlace({
      equipmentType,
      type: placeType,
    });
    return mergeComponentSummaryWithCriteria(criteria, bundle.componentRows);
  }, [bundle.componentRows, equipmentType, placeType]);

  const saveLinks = useCallback(
    async ({ websiteUrl, instagramUrl }) => {
      if (!trainingSpotId) {
        throw new Error('Este lugar aún no está vinculado al catálogo.');
      }
      await guardarEnlacesSpot({
        trainingSpotId,
        websiteUrl,
        instagramUrl,
      });
      await reloadInsights();
    },
    [reloadInsights, trainingSpotId]
  );

  return {
    links: bundle.links,
    componentScores,
    loading,
    warnings: bundle.warnings,
    saveLinks,
    reloadInsights,
  };
}
