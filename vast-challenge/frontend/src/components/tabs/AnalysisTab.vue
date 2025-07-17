<template>
  <div class="h-full relative">
    <CustomGridLayout :initial-layout="processedLayout" @layout-updated="updateLayout" />
    <SentimentDetailSidebar
      :visible="isSidebarVisible"
      :data="selectedBarData"
      @close="isSidebarVisible = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { storeToRefs } from 'pinia';
import CustomGridLayout from '../CustomGridLayout.vue';
import SentimentDetailSidebar from '../SentimentDetailSidebar.vue';
import { useLinkingStore } from '../../stores/linkingStore';
import type { Bin } from 'd3-array';

interface DataObject {
  sentiment: number;
  [key: string]: any;
}

interface Person {
  id: string;
  name: string;
  role: string;
}

interface Activity {
  [key: string]: {
    num_trips: number;
    num_plans: number;
    num_discussions: number;
    num_meetings: number;
    num_topics: number;
  };
}

interface Tooltip {
  visible: boolean;
  x: number;
  y: number;
  data: object;
}

export default defineComponent({
  name: 'AnalysisTab',
  components: {
    CustomGridLayout,
    SentimentDetailSidebar,
  },
  setup() {
    const linkingStore = useLinkingStore();
    const { selectedPerson } = storeToRefs(linkingStore);
    return {
      selectedPerson,
    };
  },
  data() {
    return {
      isSidebarVisible: false,
      selectedBarData: null as Bin<DataObject, number> | null,
      persons: [] as Person[],
      activities: {} as { [key: string]: Activity },
      metrics: ['num_trips', 'num_plans', 'num_discussions', 'num_meetings', 'num_topics'],
      metricLabels: {
        num_trips: 'Trips',
        num_plans: 'Plans',
        num_discussions: 'Discussions',
        num_meetings: 'Meetings',
        num_topics: 'Topics',
      } as { [key: string]: string },
      hoverId: null as string | null,
      tooltip: { visible: false, x: 0, y: 0, data: {} } as Tooltip,
      datasets: ['jo', 'fi', 'tr'],
      detailColors: { jo: 'black', fi: 'red', tr: 'blue' } as { [key: string]: string },
      layout: [
        { x: 0, y: 0, w: 9, h: 14, i: 'sentiment-diff-matrix', component: 'SentimentDiffMatrix' },
        { x: 9, y: 0, w: 3, h: 11, i: '11', component: 'EntitySentimentConsistencyMatrix' },
        // OverviewTab layout
        { x: 0, y: 10, w: 5, h: 19, i: '5', component: 'EgoNetwork' },
        { x: 5, y: 10, w: 7, h: 9, i: 'overview', component: 'PersonOverview' },
        { x: 5, y: 10, w: 7, h: 10, i: 'details', component: 'PersonDetailView' },
        
        // { x: 4, y: 0, w: 4, h: 8, i: '1', component: 'DatasetNodeComparison' },
        { x: 0, y: 30, w: 5, h: 12, i: '2', component: 'TopicSentimentOverview' },
        // { x: 0, y: 26, w: 4, h: 15, i: '9', component: 'IndustrySentimentBreakdown', props: { industry: 'tourism' } },
        { x: 5, y: 30, w: 4, h: 12, i: '10', component: 'PersonSentimentAcrossDatasets' },
        { x: 9, y: 30, w: 3, h: 12, i: '3', component: 'TopicSentimentDistribution' },
        

      ]
    };
  },
  computed: {
    processedLayout(): any[] {
      return this.layout.map(item => {
        if (item.component === 'TopicSentimentDistribution') {
          return {
            ...item,
            listeners: {
              'bar-click': this.handleBarClick,
            },
          };
        }
        if (item.component === 'PersonOverview') {
          return {
            ...item,
            props: {
              metrics: this.metrics,
              metricLabels: this.metricLabels,
              domains: this.overviewDomains,
              lines: this.overviewLines,
            },
            listeners: {
              'reorder-axes': this.reorderAxes,
            },
          };
        }
        if (item.component === 'PersonDetailView') {
          return {
            ...item,
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
          };
        }
        return item;
      });
    },
    overviewDomains(): { [key: string]: { min: number; max: number } } {
      const dom: { [key: string]: { min: number; max: number } } = {};
      this.metrics.forEach((metric: string) => {
        const vals = this.persons.map((p: Person) => (this.activities[p.id]?.jo as any)?.[metric] || 0);
        dom[metric] = { min: 0, max: vals.length > 0 ? Math.max(...vals) : 1 };
      });
      return dom;
    },
    overviewLines(): any[] {
      return this.persons.map((person: Person) => ({
        id: person.id,
        name: person.name || person.id,
        role: person.role || '',
        values: this.activities[person.id]?.jo || {},
        color: this.detailColors.jo,
        opacity: this.hoverId && this.hoverId !== person.id ? 0.2 : 1,
      }));
    },
    detailLines(): any[] {
      if (!this.selectedPerson) return [];
      return this.datasets.map((ds: string) => ({
        id: ds,
        values: this.activities[this.selectedPerson as string]?.[ds] || {},
        color: this.detailColors[ds],
        opacity: 1,
        strokeWidth: 2,
      }));
    },
  },
  methods: {
    handleBarClick(data: Bin<DataObject, number>) {
      this.selectedBarData = data;
      this.isSidebarVisible = true;
    },
    updateLayout(newLayout: any) {
      this.layout = newLayout;
    },
    reorderAxes(fromIndex: number, toIndex: number) {
      const newMetrics = [...this.metrics];
      const [movedItem] = newMetrics.splice(fromIndex, 1);
      newMetrics.splice(toIndex, 0, movedItem);
      this.metrics = newMetrics;
    },
    getPersonName(personId: string | null): string {
      if (!personId) return '';
      const person = this.persons.find((p: Person) => p.id === personId);
      return person ? (person.name || person.id) : personId;
    },
    getPersonRole(personId: string | null): string {
      if (!personId) return '';
      const person = this.persons.find((p: Person) => p.id === personId);
      return person ? person.role : '';
    },
    async fetchData() {
      try {
        const res = await fetch('/api/entities?entity=ENTITY_PERSON');
        this.persons = await res.json();
        const acts: { [key: string]: Activity } = {};
        await Promise.all(
          this.persons.map(async (person: Person) => {
            const [activityData, tripData] = await Promise.all([
              fetch(`/api/person-activity-plans?person_id=${encodeURIComponent(person.id)}`).then(r => r.json()),
              fetch(`/api/num-trips-by-person?person_id=${encodeURIComponent(person.id)}`).then(r => r.json())
            ]);
            acts[person.id] = ['jo','fi','tr'].reduce((acc: Activity, ds: string) => {
              acc[ds] = { ...(activityData[ds] || {}), num_trips: tripData[ds] || 0 };
              return acc;
            }, {});
          })
        );
        this.activities = acts;
      } catch (err) {
        console.error('Error loading data:', err);
      }
    },
  },
  mounted() {
    this.fetchData();
  }
});
</script>

<style scoped></style>
