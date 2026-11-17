import { describe, expect, it } from 'vitest';
import LineString from 'ol/geom/LineString';
import Point from 'ol/geom/Point';
import WKB from 'ol/format/WKB';
import { fromLonLat } from 'ol/proj';
import { parseLineGeometryToLonLat, parseSpotGeometryToLonLat } from '../spotGeometryParser';

describe('spotGeometryParser (EPSG:4326 / EPSG:3857 -> EPSG:4326)', () => {
  it('parses a GeoJSON Point in EPSG:4326', () => {
    const result = parseSpotGeometryToLonLat({
      type: 'Point',
      coordinates: [-75.5678, 6.2134],
    });

    expect(result).toEqual({
      longitude: -75.5678,
      latitude: 6.2134,
    });
  });

  it('parses a GeoJSON Polygon by computing its interior point in EPSG:4326', () => {
    const result = parseSpotGeometryToLonLat({
      type: 'Polygon',
      coordinates: [[
        [-75.57, 6.21],
        [-75.56, 6.21],
        [-75.56, 6.22],
        [-75.57, 6.22],
        [-75.57, 6.21],
      ]],
    });

    expect(result).not.toBeNull();
    expect(result.longitude).toBeCloseTo(-75.565, 3);
    expect(result.latitude).toBeCloseTo(6.215, 3);
  });

  it('parses an EWKB hex string in EPSG:4326', () => {
    const wkb = new WKB({ hex: true, ewkb: true });
    const hex = wkb.writeGeometry(new Point([-75.5812, 6.2291]));

    const result = parseSpotGeometryToLonLat(hex);

    expect(result).not.toBeNull();
    expect(result.longitude).toBeCloseTo(-75.5812, 6);
    expect(result.latitude).toBeCloseTo(6.2291, 6);
  });

  it('parses an EWKB hex string in EPSG:3857 and reprojects to EPSG:4326', () => {
    const wkb = new WKB({ hex: true, ewkb: true });
    const projected = fromLonLat([-75.5387, 6.1598], 'EPSG:3857');
    const hex = wkb.writeGeometry(new Point(projected));

    const result = parseSpotGeometryToLonLat(hex);

    expect(result).not.toBeNull();
    expect(result.longitude).toBeCloseTo(-75.5387, 4);
    expect(result.latitude).toBeCloseTo(6.1598, 4);
  });

  it('returns null safely for null, empty, or malformed geometry inputs', () => {
    expect(parseSpotGeometryToLonLat(null)).toBeNull();
    expect(parseSpotGeometryToLonLat(undefined)).toBeNull();
    expect(parseSpotGeometryToLonLat('')).toBeNull();
    expect(parseSpotGeometryToLonLat('not-valid-hex')).toBeNull();
    expect(parseSpotGeometryToLonLat({ type: 'Point', coordinates: [] })).toBeNull();
  });

  it('parses GeoJSON and EWKB LineString geometries to EPSG:4326 coordinate arrays', () => {
    const geoJsonLine = parseLineGeometryToLonLat({
      type: 'LineString',
      coordinates: [
        [-75.59, 6.25],
        [-75.58, 6.24],
      ],
    });
    expect(geoJsonLine).toEqual([
      [-75.59, 6.25],
      [-75.58, 6.24],
    ]);

    const wkb = new WKB({ hex: true, ewkb: true });
    const projectedCoords = [
      fromLonLat([-75.5901, 6.2568], 'EPSG:3857'),
      fromLonLat([-75.5745, 6.2248], 'EPSG:3857'),
    ];
    const hexLine = wkb.writeGeometry(new LineString(projectedCoords));
    const parsedHex = parseLineGeometryToLonLat(hexLine);

    expect(parsedHex).not.toBeNull();
    expect(parsedHex).toHaveLength(2);
    expect(parsedHex[0][0]).toBeCloseTo(-75.5901, 4);
    expect(parsedHex[0][1]).toBeCloseTo(6.2568, 4);
    expect(parsedHex[1][0]).toBeCloseTo(-75.5745, 4);
    expect(parsedHex[1][1]).toBeCloseTo(6.2248, 4);
  });

  it('returns null when parseLineGeometryToLonLat receives non-line or single-point geometry', () => {
    expect(parseLineGeometryToLonLat({ type: 'Point', coordinates: [-75.5, 6.2] })).toBeNull();
    expect(parseLineGeometryToLonLat({ type: 'LineString', coordinates: [[-75.5, 6.2]] })).toBeNull();
    expect(parseLineGeometryToLonLat(null)).toBeNull();
  });
});
