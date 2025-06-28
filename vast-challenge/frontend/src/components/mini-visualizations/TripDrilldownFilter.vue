<template>
  <div class="p-4 border rounded-lg shadow-md bg-white">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Trip Analysis</h3>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else>
      <div>
        <HorizontalBarFilter
          :data="tripsPerIslandWithAllCounts"
          labelKey="island"
          totalValueKey="totalCount"
          activeValueKey="activeCount"
          previewValueKey="previewCount"
          title="Trips per Island"
          :maxBarValue="maxTripCount"
          :activeColor="neutralBaseColor"
          @item-selected="handleIslandSelected"
          @item-hover="handleIslandHover"
          @item-unhover="handleIslandUnhover"
        />
      </div>
      <div class="mt-4">
        <HorizontalBarFilter
          :data="tripsPerZoneWithAllCounts"
          labelKey="zone"
          totalValueKey="totalCount"
          activeValueKey="activeCount"
          previewValueKey="previewCount"
          title="Trips per Zone"
          :maxBarValue="maxTripCount"
          :activeColor="neutralBaseColor"
          @item-selected="handleZoneSelected"
          @item-hover="handleZoneHover"
          @item-unhover="handleZoneUnhover"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { useEntityStore } from '../../stores/entityStore';
import { useLinkingStore } from '../../stores/linkingStore';
import { useMapStore } from '../../stores/mapStore';
import HorizontalBarFilter from './HorizontalBarFilter.vue';
import { neutralBaseColor } from '../../utils/colors';

export default {
  name: 'TripDrilldownFilter',
  components: {
    HorizontalBarFilter,
  },
  data() {
    return {
      entityStore: useEntityStore(),
      linkingStore: useLinkingStore(),
      mapStore: useMapStore(),
      hoveredIsland: null,
      hoveredZone: null,
      neutralBaseColor: neutralBaseColor,
    };
  },
  computed: {
    isLoading() {
      return this.entityStore.trips.length === 0 || this.mapStore.features.length === 0;
    },
    allActivities() {
      return Object.values(this.entityStore.personTripActivities).reduce((acc, val) => acc.concat(val), []);
    },
    tripsPerIslandWithAllCounts() {
      return this.generateBarData('island');
    },
    tripsPerZoneWithAllCounts() {
      return this.generateBarData('zone');
    },
    maxTripCount() {
      const allCounts = [
        ...this.tripsPerIslandWithAllCounts.map(d => d.totalCount),
        ...this.tripsPerZoneWithAllCounts.map(d => d.totalCount),
      ];
      return Math.max(...allCounts, 1);
    },
  },
  watch: {
    hoveredIsland(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.updateHoveredFilters();
      }
    },
    hoveredZone(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.updateHoveredFilters();
      }
    },
  },
  methods: {
    updateHoveredFilters() {
      const filters = [];
      if (this.hoveredIsland) {
        filters.push({ type: 'island', value: this.hoveredIsland });
      }
      if (this.hoveredZone) {
        filters.push({ type: 'zone', value: this.hoveredZone });
      }
      this.linkingStore.setHoveredFilters(filters);
    },
    getFilteredActivities(activities, filters) {
      if (!filters || filters.length === 0) {
        return activities;
      }

      return activities.filter(activity => {
        return filters.every(filter => {
          return activity.visited_places.some(visitedPlace => {
            const place = visitedPlace.place;
            if (!place || !place.id) {
              return false;
            }

            if (filter.type === 'island') {
              const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
              return parentFeatureName === filter.value;
            } else if (filter.type === 'zone') {
              return place.zone === filter.value;
            }
            return false;
          });
        });
      });
    },
    generateBarData(filterType) {
      const allCountsMap = this.processTripData(this.allActivities, filterType);
      const activeCountsMap = this.processTripData(
        this.getFilteredActivities(this.allActivities, this.linkingStore.activeFilters),
        filterType
      );

      let previewCountsMap = new Map();
      const hoveredFilters = [];
      if (this.hoveredIsland) {
        hoveredFilters.push({ type: 'island', value: this.hoveredIsland });
      }
      if (this.hoveredZone) {
        hoveredFilters.push({ type: 'zone', value: this.hoveredZone });
      }

      if (hoveredFilters.length > 0) {
        const combinedFilters = [...this.linkingStore.activeFilters, ...hoveredFilters];
        previewCountsMap = this.processTripData(
          this.getFilteredActivities(this.allActivities, combinedFilters),
          filterType
        );
      }

      const uniqueLabels = Array.from(allCountsMap.keys());

      if (filterType === 'island') {
        this.mapStore.features.forEach(feature => {
          const islandName = feature.properties.Name;
          if (islandName && !uniqueLabels.includes(islandName)) {
            uniqueLabels.push(islandName);
          }
        });
      } else if (filterType === 'zone') {
        const allZones = new Set();
        this.allActivities.forEach(activity => {
            activity.visited_places.forEach(visitedPlace => {
                if(visitedPlace.place && visitedPlace.place.zone) {
                    allZones.add(visitedPlace.place.zone);
                }
            });
        });
        allZones.forEach(zone => {
            if (!uniqueLabels.includes(zone)) {
                uniqueLabels.push(zone);
            }
        });
      }

      const results = uniqueLabels.map(label => {
        const totalCount = allCountsMap.get(label) || 0;
        const activeCount = activeCountsMap.get(label) || 0;
        const previewCount = previewCountsMap.get(label) || 0;

        return {
          [filterType]: label,
          totalCount: totalCount,
          activeCount: activeCount,
          previewCount: hoveredFilters.length > 0 ? previewCount : 0,
        };
      });

      return results.filter(item => item.totalCount > 0);
    },
    processTripData(activities, filterType) {
      const counts = new Map();
      activities.forEach(activity => {
        const labels = new Set();
        activity.visited_places.forEach(visitedPlace => {
          const place = visitedPlace.place;
          if (!place || !place.id) {
            return;
          }

          let label = null;
          if (filterType === 'island') {
            label = this.mapStore.getParentFeatureByPlaceId(place.id);
          } else if (filterType === 'zone') {
            label = place.zone;
          }

          if (label) {
            labels.add(label);
          }
        });

        labels.forEach(label => {
            counts.set(label, (counts.get(label) || 0) + 1);
        });
      });
      return counts;
    },
    handleIslandSelected(island) {
      this.linkingStore.toggleFilter({ type: 'island', value: island });
    },
    handleZoneSelected(zone) {
      this.linkingStore.toggleFilter({ type: 'zone', value: zone });
    },
    handleIslandHover(island) {
      this.hoveredIsland = island;
    },
    handleIslandUnhover() {
      this.hoveredIsland = null;
    },
    handleZoneHover(zone) {
      this.hoveredZone = zone;
    },
    handleZoneUnhover() {
      this.hoveredZone = null;
    },
  },
};
</script>

<style scoped>
</style>
