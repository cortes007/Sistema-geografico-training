Actualmente el archivo parques_aburra.geojson se extrajo de
"Overpass.md: https://overpass-turbo.eu/" con el siguiente Json:

[out:json];
(
  // 1. Parques de calistenia y gimnasios al aire libre (biosaludables)
  node["leisure"="fitness_station"]({{bbox}});
  way["leisure"="fitness_station"]({{bbox}});
  
  // 2. Gimnasios comerciales e indoor (pesas, crossfit, etc.)
  node["leisure"="fitness_centre"]({{bbox}});
  way["leisure"="fitness_centre"]({{bbox}});
  
  // 3. Centros y unidades deportivas (Polideportivos INDER)
  node["leisure"="sports_centre"]({{bbox}});
  way["leisure"="sports_centre"]({{bbox}});
);
out body;
>;
out skel qt;