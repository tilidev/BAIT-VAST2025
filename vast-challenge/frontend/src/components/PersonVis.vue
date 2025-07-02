<template>
  <div class="p-4 h-screen flex flex-col">
    <!-- Overview PCP -->
    <div ref="overviewContainer" class="bg-white shadow rounded-lg p-4 mb-4 flex-shrink-0">
      <h2 class="text-xl font-semibold mb-2 text-center text-gray-800">Overview Person Activity</h2>
      <PCPChart
        v-if="persons.length"
        :metrics="metrics"
        :metricLabels="metricLabels"
        :domains="overviewDomains"
        :lines="overviewLines"
        :width="overviewChartWidth"
        :height="overviewChartHeight"
        @hover="onHover"
        @leave="onLeave"
        @select="selectPerson"
      >
        <template #tooltip>
          <div
            v-if="tooltip.visible"
            :style="{ top: tooltip.y + 'px', left: tooltip.x + 'px' }"
            class="absolute bg-white p-2 border rounded shadow-lg text-xs"
          >
            <div><strong class="text-gray-900">{{ tooltip.data.name }}</strong> <span class="text-gray-600">({{ tooltip.data.id }})</span></div>
            <div class="text-gray-700">Role: <span class="font-medium">{{ tooltip.data.role || 'N/A' }}</span></div>
            <div class="text-gray-700">Datasets: <span class="font-medium">{{ tooltip.data.in_graph.join(', ') }}</span></div>
          </div>
        </template>
      </PCPChart>
      <div v-else class="text-gray-500 text-center text-sm">Loading data...</div>
    </div>

    <!-- Detail PCP -->
    <div ref="detailContainer" class="flex-grow flex flex-col">
      <div v-if="selectedPerson" class="flex-grow flex flex-col">
        <h2 class="text-xl font-semibold mb-2 text-center text-gray-800">Dataset Details for {{ selectedPerson }}</h2>
        <div class="flex-grow flex items-center justify-center">
          <PCPChart
            :metrics="metrics"
            :metricLabels="metricLabels"
            :domains="overviewDomains"
            :lines="detailLines"
            :width="detailChartWidth"
            :height="detailChartHeight"
          />
        </div>
        <div class="mt-3 flex justify-center space-x-4 text-sm">
          <div v-for="dataset in datasets" :key="dataset" class="flex items-center">
            <span
              class="w-4 h-2 inline-block mr-1 rounded"
              :style="{ backgroundColor: detailColors[dataset] }"
            ></span>
            <span class="capitalize text-gray-700">{{ dataset }}</span>
          </div>
        </div>
      </div>
      <div v-else class="h-full flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
        <span class="text-gray-500 text-sm">Click a line above to view details</span>
      </div>
    </div>
  </div>
</template>

<script>
import PCPChart from './PCPChart.vue';
export default {
  name: 'PersonVis',
  components: { PCPChart },
  data() {
    return {
      persons: [],
      activities: {},
      metrics: ['num_trips', 'num_plans', 'num_discussions', 'num_meetings', 'num_topics'],
      metricLabels: {
        num_trips: 'Trips',
        num_plans: 'Plans',
        num_discussions: 'Discussions',
        num_meetings: 'Meetings',
        num_topics: 'Topics',
      },
      hoverId: null,
      tooltip: { visible: false, x: 0, y: 0, data: {} },
      selectedPerson: null,
      datasets: ['jo', 'fi', 'tr'],
      detailColors: { jo: 'black', fi: 'red', tr: 'blue' },
      overviewChartWidth: 0,
      overviewChartHeight: 0,
      detailChartWidth: 0,
      detailChartHeight: 0
    };
  },
  computed: {
    overviewDomains() {
      const dom = {};
      this.metrics.forEach(metric => {
        const vals = this.persons.map(p => this.activities[p.id]?.jo?.[metric] || 0);
        dom[metric] = { min: 0, max: vals.length ? Math.max(...vals) : 1 };
      });
      return dom;
    },
    overviewLines() {
      return this.persons.map(person => ({
        id: person.id,
        values: this.activities[person.id]?.jo || {},
        color: this.detailColors.jo,
        opacity: this.hoverId && this.hoverId !== person.id ? 0.2 : 1,
      }));
    },
    detailLines() {
      if (!this.selectedPerson) return [];
      return this.datasets.map(ds => ({
        id: ds,
        values: this.activities[this.selectedPerson]?.[ds] || {},
        color: this.detailColors[ds],
        opacity: 1,
        strokeWidth: 2,
      }));
    }
  },
  methods: {
    updateSizes() {
      this.$nextTick(() => {
        // Overview sizing: account for container padding
        const oCont = this.$refs.overviewContainer;
        let oWidth = oCont?.clientWidth || 600;
        const oStyle = window.getComputedStyle(oCont);
        const oPadL = parseFloat(oStyle.paddingLeft) || 0;
        const oPadR = parseFloat(oStyle.paddingRight) || 0;
        oWidth = oWidth - oPadL - oPadR;
        this.overviewChartWidth = oWidth;
        this.overviewChartHeight = Math.min(oWidth * 0.5, window.innerHeight * 0.4);
        // Detail sizing: account for padding as well
        const dCont = this.$refs.detailContainer;
        let dWidth = dCont?.clientWidth || oWidth;
        const dStyle = window.getComputedStyle(dCont);
        const dPadL = parseFloat(dStyle.paddingLeft) || 0;
        const dPadR = parseFloat(dStyle.paddingRight) || 0;
        dWidth = dWidth - dPadL - dPadR;
        this.detailChartWidth = dWidth;
        this.detailChartHeight = Math.min(dWidth * 0.5, window.innerHeight * 0.4);
      });
    },
    onHover(id, event) {
      this.hoverId = id;
      const person = this.persons.find(p => p.id === id) || {};
      this.tooltip = { visible: true, x: event.offsetX + 10, y: event.offsetY + 10, data: person };
    },
    onLeave() {
      this.hoverId = null;
      this.tooltip.visible = false;
    },
    selectPerson(id) {
      this.selectedPerson = id;
    },
    async fetchData() {
      try {
        const res = await fetch('/api/entities?entity=ENTITY_PERSON');
        this.persons = await res.json();
        const acts = {};
        await Promise.all(
          this.persons.map(async person => {
            const activityRes = await fetch(
              `/api/person-activity-plans?person_id=${encodeURIComponent(person.id)}`
            );
            const activityData = await activityRes.json();
            const tripRes = await fetch(
              `/api/num-trips-by-person?person_id=${encodeURIComponent(person.id)}`
            );
            const tripData = await tripRes.json();
            const merged = {};
            ['jo','fi','tr'].forEach(ds => {
              merged[ds] = { ...(activityData[ds] || {}), num_trips: tripData[ds] || 0 };
            });
            acts[person.id] = merged;
          })
        );
        this.activities = acts;
      } catch (err) {
        console.error('Error loading data:', err);
      }
    }
  },
  mounted() {
    this.fetchData();
    this.updateSizes();
    window.addEventListener('resize', this.updateSizes);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateSizes);
  }
};
</script>

<style scoped>
/* Tailwind handles most styling */
</style>
