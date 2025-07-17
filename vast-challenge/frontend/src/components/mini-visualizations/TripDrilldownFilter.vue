<template>
  <div>
    <div v-if="isLoading" class="text-center text-gray-500">Loading data...</div>
    <div v-else class="space-y-4">
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
        @item-excluded="handleIslandExcluded"
        @item-hover="handleIslandHover"
        @item-unhover="handleIslandUnhover"
      />
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
        @item-excluded="handleZoneExcluded"
        @item-hover="handleZoneHover"
        @item-unhover="handleZoneUnhover"
      />
      <HorizontalBarFilter
        :data="tripsPerInGraphWithAllCounts"
        labelKey="in_graph"
        totalValueKey="totalCount"
        activeValueKey="activeCount"
        previewValueKey="previewCount"
        title="Trips per In-Graph"
        :maxBarValue="maxTripCount"
        :activeColor="neutralBaseColor"
        @item-selected="handleInGraphSelected"
        @item-excluded="handleInGraphExcluded"
        @item-hover="handleInGraphHover"
        @item-unhover="handleInGraphUnhover"
      />
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
      hoveredInGraph: null,
      neutralBaseColor: neutralBaseColor,
    };
  },
  computed: {
    isLoading() {
      return this.entityStore.trips.length === 0 || this.mapStore.features.length === 0;
    },
    allActivities() {
      const activities = [];
      for (const personId in this.entityStore.personTripActivities) {
        const personActivities = this.entityStore.personTripActivities[personId];
        personActivities.forEach(activity => {
          activities.push({ ...activity, personId: personId });
        });
      }
      return activities;
    },
    tripsPerIslandWithAllCounts() {
      return this.generateBarData('island');
    },
    tripsPerZoneWithAllCounts() {
      return this.generateBarData('zone');
    },
    tripsPerInGraphWithAllCounts() {
      return this.generateBarData('in_graph');
    },
    maxTripCount() {
      const allCounts = [
        ...this.tripsPerIslandWithAllCounts.map(d => d.totalCount),
        ...this.tripsPerZoneWithAllCounts.map(d => d.totalCount),
        ...this.tripsPerInGraphWithAllCounts.map(d => d.totalCount),
      ];
      return Math.max(...allCounts, 1);
    },
  },
  watch: {
    'linkingStore.activeFilters': {
      handler() {
        // This will trigger re-computation
      },
      deep: true,
    },
    'linkingStore.excludedFilters': {
      handler() {
        // This will trigger re-computation
      },
      deep: true,
    },
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
    hoveredInGraph(newVal, oldVal) {
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
      if (this.hoveredInGraph) {
        filters.push({ type: 'in_graph', value: this.hoveredInGraph });
      }
      this.linkingStore.setHoveredFilters(filters);
    },
    getFilteredActivities(activities, filters) {
      let filtered = activities;

      // Filter by sidebar selections (inclusive)
      if (filters && filters.length > 0) {
        const personFilterValues = filters.filter(f => f.type === 'person').map(f => f.value);
        const placeFilterValues = filters.filter(f => f.type === 'place').flatMap(f => f.value);
        const otherFilters = filters.filter(f => f.type !== 'place' && f.type !== 'person');

        filtered = filtered.filter((activity) => {
          const passesPersonFilter = personFilterValues.length === 0 || personFilterValues.includes(activity.personId);

          const passesPlaceFilter = placeFilterValues.length === 0 || activity.visited_places.some(visitedPlace => {
            return visitedPlace.place && placeFilterValues.includes(visitedPlace.place.id);
          });

          const passesOtherFilters = otherFilters.length === 0 || otherFilters.every(filter => {
            return activity.visited_places.some((visitedPlace) => {
              const place = visitedPlace.place;
              if (!place || !place.id) return false;
              switch (filter.type) {
                case 'island':
                  const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
                  return parentFeatureName === filter.value;
                case 'zone':
                  return place.zone === filter.value;
                case 'in_graph':
                  return place.in_graph && Array.isArray(place.in_graph) && place.in_graph.includes(filter.value);
                default:
                  return false;
              }
            });
          });

          return passesPersonFilter && passesPlaceFilter && passesOtherFilters;
        });
      }

      // Filter by sidebar selections (exclusive)
      if (this.linkingStore.excludedFilters.length > 0) {
        const excludedFilters = this.linkingStore.excludedFilters.filter(f => f.type !== 'person');
        filtered = filtered.filter((activity) => {
          return !excludedFilters.some((filter) => {
            return activity.visited_places.some((visitedPlace) => {
              const place = visitedPlace.place;
              if (!place || !place.id) return false;
              if (filter.type === 'island') {
                const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(place.id);
                return parentFeatureName === filter.value;
              } else if (filter.type === 'zone') {
                return place.zone === filter.value;
              } else if (filter.type === 'in_graph') {
                return place.in_graph && Array.isArray(place.in_graph) && place.in_graph.includes(filter.value);
              }
              return false;
            });
          });
        });
      }

      return filtered;
    },
    generateBarData(filterType) {
      const allCountsMap = this.processTripData(this.allActivities, filterType);
      const activeCountsMap = this.processTripData(
        this.getFilteredActivities(this.allActivities, this.linkingStore.activeFilters),
        filterType
      );

      let previewCountsMap = new Map();
      const hoveredFilters = this.linkingStore.hoveredFilters;

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
      } else if (filterType === 'in_graph') {
        const allInGraphs = new Set(['jo', 'fi', 'tr']);
        allInGraphs.forEach(inGraph => {
          if (!uniqueLabels.includes(inGraph)) {
            uniqueLabels.push(inGraph);
          }
        });
      }

      const activeFilterValues = new Set(
        this.linkingStore.activeFilters
          .filter(f => f.type === filterType)
          .map(f => f.value)
      );

      const excludedFilterValues = new Set(
        this.linkingStore.excludedFilters
          .filter(f => f.type === filterType)
          .map(f => f.value)
      );

      const results = uniqueLabels.map(label => {
        const totalCount = allCountsMap.get(label) || 0;
        const activeCount = activeCountsMap.get(label) || 0;
        const previewCount = previewCountsMap.get(label) || 0;

        return {
          [filterType]: label,
          totalCount: totalCount,
          activeCount: activeCount,
          previewCount: hoveredFilters.length > 0 ? previewCount : 0,
          isActive: activeFilterValues.has(label),
          isExcluded: excludedFilterValues.has(label),
        };
      });

      return results.filter(item => item.totalCount > 0 || item.isActive || item.isExcluded);
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

          if (filterType === 'island') {
            const label = this.mapStore.getParentFeatureByPlaceId(place.id);
            if (label) {
              labels.add(label);
            }
          } else if (filterType === 'zone') {
            if (place.zone) {
              labels.add(place.zone);
            }
          } else if (filterType === 'in_graph') {
            if (place.in_graph && Array.isArray(place.in_graph)) {
              place.in_graph.forEach(ig => labels.add(ig));
            }
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
    handleIslandExcluded(island) {
      this.linkingStore.toggleExcludeFilter({ type: 'island', value: island });
    },
    handleZoneSelected(zone) {
      this.linkingStore.toggleFilter({ type: 'zone', value: zone });
    },
    handleZoneExcluded(zone) {
      this.linkingStore.toggleExcludeFilter({ type: 'zone', value: zone });
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
    handleInGraphSelected(inGraph) {
      this.linkingStore.toggleFilter({ type: 'in_graph', value: inGraph });
    },
    handleInGraphExcluded(inGraph) {
      this.linkingStore.toggleExcludeFilter({ type: 'in_graph', value: inGraph });
    },
    handleInGraphHover(inGraph) {
      this.hoveredInGraph = inGraph;
    },
    handleInGraphUnhover() {
      this.hoveredInGraph = null;
    },
  },
};
</script>

<style scoped>
</style>
