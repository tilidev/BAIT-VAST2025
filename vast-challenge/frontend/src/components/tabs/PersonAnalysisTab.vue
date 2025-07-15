<template>
  <div class="h-full">
    <CustomGridLayout :initial-layout="layout" />
  </div>
</template>

<script>
import CustomGridLayout from '../CustomGridLayout.vue';

export default {
  name: 'PersonAnalysisTab',
  components: { CustomGridLayout },
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
      layout: [],
    };
  },
  watch: {
    overviewLines: {
      handler(newVal) {
        this.updateLayout('overview', { lines: newVal });
      },
      deep: true,
    },
    detailLines: {
      handler(newVal) {
        this.updateLayout('details', { lines: newVal });
      },
      deep: true,
    },
    selectedPerson(newVal) {
      this.updateLayout('details', {
        personName: this.getPersonName(newVal),
        personRole: this.getPersonRole(newVal),
      });
    },
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
        name: person.name || person.id,
        role: person.role || '',
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
    },
  },
  methods: {
    selectPerson(id) {
      this.selectedPerson = id;
    },
    reorderAxes(fromIndex, toIndex) {
      const newMetrics = [...this.metrics];
      const [movedItem] = newMetrics.splice(fromIndex, 1);
      newMetrics.splice(toIndex, 0, movedItem);
      this.metrics = newMetrics;
    },
    updateLayout(id, props) {
      const index = this.layout.findIndex(item => item.i === id);
      if (index !== -1) {
        this.layout[index].props = { ...this.layout[index].props, ...props };
      }
    },
    getPersonName(personId) {
      const person = this.persons.find(p => p.id === personId);
      return person ? (person.name || person.id) : personId;
    },
    getPersonRole(personId) {
      const person = this.persons.find(p => p.id === personId);
      return person ? person.role : '';
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
        this.initializeLayout();
      } catch (err) {
        console.error('Error loading data:', err);
      }
    },
    initializeLayout() {
      this.layout = [
        {
          x: 0, y: 0, w: 12, h: 8, i: 'overview', component: 'PersonOverview',
          props: {
            metrics: this.metrics,
            metricLabels: this.metricLabels,
            domains: this.overviewDomains,
            lines: this.overviewLines,
          }
        },
        {
          x: 0, y: 8, w: 12, h: 9, i: 'details', component: 'PersonDetailView',
          props: {
            personName: this.getPersonName(this.selectedPerson),
            personRole: this.getPersonRole(this.selectedPerson),
            metrics: this.metrics,
            metricLabels: this.metricLabels,
            domains: this.overviewDomains,
            lines: this.detailLines,
            datasets: this.datasets,
            detailColors: this.detailColors,
          }
        },
      ];
    }
  },
  mounted() {
    this.fetchData();
  }
};
</script>
