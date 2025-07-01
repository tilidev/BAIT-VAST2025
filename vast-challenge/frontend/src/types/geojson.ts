export interface GeoJsonProperties {
  Name: string;
  Description: string | null;
  Activities: string[] | null;
  type: string;
  Kind: string;
  fish_species_present: string[] | null;
}

export interface GeoJsonGeometry {
  type: "Point" | "Polygon";
  coordinates: number[] | number[][][];
}

export interface GeoJsonFeature {
  type: "Feature";
  properties: GeoJsonProperties;
  geometry: GeoJsonGeometry;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}
