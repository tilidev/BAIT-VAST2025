import { defineStore } from 'pinia';
import * as turf from "@turf/turf";
import type { Place } from '../types/nodeTypes.ts';

export const useMapStore = defineStore('map', {
  state: () => ({
    features: [],
    zonePropertiesMap: new Map(),
    featurePropertiesMap: new Map<string, any>(),
    featurePlacesMap: new Map<string, Place[]>(), 
    placeIdToParentFeatureMap: new Map<string, string>(),
  }),
  actions: {
    async loadGeoJsonData() {
      try {
        const response = await fetch('/oceanus_map.geojson');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        this.features = data.features;

        this.zonePropertiesMap.clear();
        this.featurePropertiesMap.clear();
        this.features.forEach(feature => {
          const name = feature.properties.Name;
          if (name) {
            this.zonePropertiesMap.set(name, {
              kind: feature.properties.Kind,
              activities: feature.properties.Activities || [],
              type: feature.properties.type,
            });
            this.featurePropertiesMap.set(name, feature.properties); 
          }
        });

      } catch (error) {
        console.error('Failed to load GeoJSON data:', error);
      }
    },
    addPlaceToFeatureMap(featureName: string, place: Place) {
      if (!this.featurePlacesMap.has(featureName)) {
        this.featurePlacesMap.set(featureName, []);
      }
      this.featurePlacesMap.get(featureName)?.push(place);
    },
    setPlaceIdToParentFeatureMap(placeId: string, parentFeatureName: string) {
      this.placeIdToParentFeatureMap.set(placeId, parentFeatureName);
    },
  },
  getters: {
    getFeaturesByKind: (state) => (kind) => {
      return state.features.filter(feature => feature.properties.Kind === kind);
    },
    getFeatureByName: (state) => (name) => {
      return state.features.find(feature => feature.properties.Name === name);
    },
    getFeaturesByActivity: (state) => (activity) => {
      return state.features.filter(feature =>
        feature.properties.Activities && feature.properties.Activities.includes(activity)
      );
    },
    getFeaturesByType: (state) => (type) => {
      return state.features.filter(feature => feature.properties.type === type);
    },
    getFeaturesByCoordinates: (state) => (lat, lon) => {
      const searchPoint = turf.point([lon, lat]);
      return state.features.filter(feature => {
         if (feature.geometry.type === 'Polygon') {
          const polygon = turf.polygon(feature.geometry.coordinates);
          if (turf.booleanPointInPolygon(searchPoint, polygon)) {
          }
          return turf.booleanPointInPolygon(searchPoint, polygon);
        }
        return false;
      });
    },
    getAllKinds: (state) => {
      const kinds = new Set();
      state.features.forEach(feature => {
        if (feature.properties.Kind) {
          kinds.add(feature.properties.Kind);
        }
      });
      return Array.from(kinds);
    },
    getAllActivities: (state) => {
      const activities = new Set();
      state.features.forEach(feature => {
        if (feature.properties.Activities) {
          feature.properties.Activities.forEach(act => activities.add(act));
        }
      });
      return Array.from(activities);
    },
    getZoneProperties: (state) => (zoneName) => {
      return state.zonePropertiesMap.get(zoneName);
    },
    getFeatureProperties: (state) => (featureName: string) => {
      return state.featurePropertiesMap.get(featureName);
    },
    getPlacesByFeatureName: (state) => (featureName: string) => {
      return state.featurePlacesMap.get(featureName) || [];
    },
    getParentFeatureByPlaceId: (state) => (placeId: string) => {
      return state.placeIdToParentFeatureMap.get(placeId);
    },
  },
});
