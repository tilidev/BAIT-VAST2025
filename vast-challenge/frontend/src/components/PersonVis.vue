<template>
  <div class="p-4 h-screen flex flex-col">
    <!-- Overview 50% -->
    <div class="flex-none h-1/2 flex flex-col bg-white shadow rounded-lg p-4">
      <h2 class="text-xl font-semibold mb-2 text-center text-gray-800">Overview Person Activity</h2>
      <div class="flex-grow">
        <PCPChart
          v-if="persons.length"
          :metrics="metrics"
          :metricLabels="metricLabels"
          :domains="overviewDomains"
          :lines="overviewLines"
          class="w-full h-full"
          @hover="onHover"
          @leave="onLeave"
          @select="selectPerson"
        />
        <div v-else class="flex items-center justify-center h-full text-gray-500 text-sm">
          Loading data...
        </div>
      </div>
    </div>

    <!-- Details 50% -->
    <div class="flex-none h-1/2 flex flex-col bg-white shadow rounded-lg p-4 mt-4">
      <h2 class="text-xl font-semibold mb-2 text-center text-gray-800">Dataset Details for {{ selectedPerson || '…' }}</h2>
      <div class="flex-grow">
        <PCPChart
          v-if="selectedPerson"
          :metrics="metrics"
          :metricLabels="metricLabels"
          :domains="overviewDomains"
          :lines="detailLines"
          class="w-full h-full"
        />
        <div v-else class="flex items-center justify-center h-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-gray-500 text-sm">
          Click a line above to view details
        </div>
      </div>
      <div v-if="selectedPerson" class="mt-3 flex justify-center space-x-4 text-sm">
        <div v-for="ds in datasets" :key="ds" class="flex items-center">
          <span class="w-4 h-2 inline-block mr-1 rounded" :style="{ backgroundColor: detailColors[ds] }"></span>
          <span class="capitalize text-gray-700">{{ ds }}</span>
        </div>
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
      detailColors: { jo: 'black', fi: 'red', tr: 'blue' }
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
            const [activityData, tripData] = await Promise.all([
              fetch(`/api/person-activity-plans?person_id=${encodeURIComponent(person.id)}`).then(r => r.json()),
              fetch(`/api/num-trips-by-person?person_id=${encodeURIComponent(person.id)}`).then(r => r.json())
            ]);
            acts[person.id] = ['jo','fi','tr'].reduce((acc, ds) => {
              acc[ds] = { ...(activityData[ds] || {}), num_trips: tripData[ds] || 0 };
              return acc;
            }, {});
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
  }
};
</script>

<style scoped>
/* No extra styles needed; sizing via Tailwind */
</style>
