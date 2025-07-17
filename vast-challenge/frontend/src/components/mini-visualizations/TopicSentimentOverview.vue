<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Topic Sentiment Overview</h3>
      <div class="absolute top-2 right-2 z-10">
        <button @mouseover="showHelp = true" @mouseleave="showHelp = false"
          class="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none transition-colors duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <transition name="fade">
          <div v-if="showHelp"
            class="absolute right-0 mt-2 w-72 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-sm text-gray-800">
            <p class="font-bold text-lg mb-3 text-gray-900">Chart Interactions</p>
            <ul class="space-y-3">
              <li class="flex items-center">
                <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 15l-2 5L8 9l11 4-5 2zm0 0l5 5M7.5 8.5A2.5 2.5 0 0110 6v0a2.5 2.5 0 012.5 2.5v0" />
                </svg>
                <div><span class="font-semibold">Hover</span> over bars or labels to see details.</div>
              </li>
              <li class="flex items-center">
                <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <div><span class="font-semibold">Click</span> on a topic label to filter by that topic across the
                  application.</div>
              </li>
            </ul>
          </div>
        </transition>
      </div>
    </div>
    <div class="mb-2">
      <label for="sortOrder" class="mr-2 text-sm font-medium text-gray-700">Sort by:</label>
      <select id="sortOrder" v-model="sortOrder" class="py-1 px-2 text-sm border-gray-300 rounded-md">
        <option value="avgSentimentDesc">Avg. Sentiment (High to Low)</option>
        <option value="avgSentimentAsc">Avg. Sentiment (Low to High)</option>
        <option value="peakSentiment">Peak Sentiment per Dataset</option>
        <option value="topicId">Topic ID (A-Z)</option>
        <option value="sentimentCountDesc">No. of Sentiments (High to Low)</option>
      </select>
    </div>
    <div v-if="isLoading" class="flex-grow flex items-center justify-center text-gray-500">Loading data...</div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-500">Error loading data: {{ error
    }}</div>
    <div v-else-if="processedData.length === 0" class="flex-grow flex items-center justify-center text-gray-500">No
      topic sentiment data found.</div>
    <div v-else ref="chartContainer" class="w-full flex-grow min-h-0"></div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useGraphStore } from '../../stores/graphStore';
import { useLinkingStore, FilterType, HighlightType } from '../../stores/linkingStore';
import { sentimentColorScaleLinear } from '../../utils/colors';

export default {
  name: 'TopicSentimentOverview',
  emits: ['bar-click'],
  data() {
    return {
      isLoading: true,
      error: null,
      graphStore: useGraphStore(),
      linkingStore: useLinkingStore(),
      sortOrder: 'avgSentimentDesc',
      resizeObserver: null,
      tooltip: null,
      showHelp: false,
    };
  },
  computed: {
    highlightedTopics() {
      return this.linkingStore.activeFilters
        .filter(f => f.type === FilterType.TOPIC)
        .map(f => f.value);
    },
    hoveredTopics() {
      return this.linkingStore.hoverHighlights
        .filter(h => h.type === HighlightType.TOPIC)
        .map(h => String(h.value));
    },
    selectedInGraphs() {
      return this.linkingStore.selectedInGraphs;
    },
    sentimentData() {
      if (!this.graphStore.sentimentPerTopic || this.graphStore.sentimentPerTopic.length === 0) {
        return [];
      }
      const topicSentimentsMap = {};

      this.graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((ts) => {
          if (ts.sentiment === null || ts.sentiment === undefined) return;

          if (!topicSentimentsMap[ts.topic_id]) {
            topicSentimentsMap[ts.topic_id] = {
              totalSum: 0, totalCount: 0, activeSum: 0, activeCount: 0, sentimentByDataset: {}
            };
          }
          const topic = topicSentimentsMap[ts.topic_id];

          topic.totalSum += ts.sentiment;
          topic.totalCount += 1;

          const sentimentMatchesFilter = this.selectedInGraphs.length === 0 ||
            ts.sentiment_recorded_in.some(d => this.selectedInGraphs.includes(d));

          if (sentimentMatchesFilter) {
            topic.activeSum += ts.sentiment;
            topic.activeCount += 1;
          }

          ts.sentiment_recorded_in.forEach(dataset => {
            if (!topic.sentimentByDataset[dataset]) {
              topic.sentimentByDataset[dataset] = { sum: 0, count: 0 };
            }
            topic.sentimentByDataset[dataset].sum += ts.sentiment;
            topic.sentimentByDataset[dataset].count += 1;
          });
        });
      });

      return Object.entries(topicSentimentsMap).map(([topicId, data]) => {
        const totalAverageSentiment = data.totalCount > 0 ? data.totalSum / data.totalCount : 0;
        const activeAverageSentiment = data.activeCount > 0 ? data.activeSum / data.activeCount : 0;
        const peakSentiment = Object.values(data.sentimentByDataset).reduce((max, current) => {
          const avg = current.count > 0 ? current.sum / current.count : 0;
          return Math.abs(avg) > Math.abs(max) ? avg : max;
        }, 0);

        return {
          topicId,
          totalAverageSentiment,
          totalSentimentCount: data.totalCount,
          activeAverageSentiment,
          activeSentimentCount: data.activeCount,
          peakSentiment: peakSentiment,
          sentimentChange: this.selectedInGraphs.length > 0 ? activeAverageSentiment - totalAverageSentiment : 0,
        };
      });
    },
    processedData() {
      let result = [...this.sentimentData];
      switch (this.sortOrder) {
        case 'avgSentimentDesc':
          result.sort((a, b) => b.activeAverageSentiment - a.activeAverageSentiment);
          break;
        case 'avgSentimentAsc':
          result.sort((a, b) => a.activeAverageSentiment - b.activeAverageSentiment);
          break;
        case 'topicId':
          result.sort((a, b) => a.topicId.localeCompare(b.topicId));
          break;
        case 'sentimentCountDesc':
          result.sort((a, b) => b.activeSentimentCount - a.activeSentimentCount);
          break;
        case 'peakSentiment':
          result.sort((a, b) => Math.abs(b.peakSentiment) - Math.abs(a.peakSentiment));
          break;
      }
      return result.slice(0, 20);
    },
    showChart() {
      return !this.isLoading && !this.error && this.processedData.length > 0;
    }
  },
  methods: {
    formatTopicId(topicId) {
      return topicId
        .replace(/_/g, ' ')
        .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    },
    handleBarClick(topicId) {
      const rawSentimentsForTopic = this.graphStore.sentimentPerTopic.flatMap(entity =>
        entity.topic_sentiments
          .filter(ts => ts.topic_id === topicId)
          .map(ts => ({
            sentiment: ts.sentiment,
            reason: ts.reason,
            topic_id: ts.topic_id,
            topic_industry: ts.topic_industry,
            entity_id: entity.entity_id,
          }))
      );

      if (rawSentimentsForTopic.length === 0) return;

      const sentiments = rawSentimentsForTopic.map(s => s.sentiment);
      const x0 = d3.min(sentiments);
      const x1 = d3.max(sentiments);

      const bin = rawSentimentsForTopic;
      bin.x0 = x0;
      bin.x1 = (x0 === x1) ? x1 + 0.01 : x1;

      this.$emit('bar-click', bin);
    },
    toggleTopicFilter(topicId) {
      this.linkingStore.toggleFilter({ type: FilterType.TOPIC, value: topicId });
    },
    initChart() {
      if (!this.$refs.chartContainer) return;
      const container = d3.select(this.$refs.chartContainer);
      container.selectAll('*').remove();

      const margin = { top: 20, right: 50, bottom: 40, left: 150 };
      const width = this.$refs.chartContainer.offsetWidth - margin.left - margin.right;
      const height = this.$refs.chartContainer.offsetHeight - margin.top - margin.bottom;

      const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      svg.append('g').attr('class', 'x-axis');
      svg.append('g').attr('class', 'y-axis');
      svg.append('g').attr('class', 'grid');
      svg.append('line').attr('class', 'center-line');

      this.drawChart();
    },
    drawChart() {
      if (!this.$refs.chartContainer || this.processedData.length === 0) {
        if (this.$refs.chartContainer) d3.select(this.$refs.chartContainer).selectAll('*').remove();
        return;
      }

      const data = this.processedData;
      const transitionDuration = 750;

      const margin = { top: 20, right: 50, bottom: 40, left: 150 };
      const width = this.$refs.chartContainer.offsetWidth - margin.left - margin.right;
      const height = this.$refs.chartContainer.offsetHeight - margin.top - margin.bottom;

      const svg = d3.select(this.$refs.chartContainer).select('svg g');
      if (svg.empty()) {
        this.initChart();
        return;
      }

      const y = d3.scaleBand()
        .domain(data.map(d => d.topicId))
        .range([0, height])
        .padding(0.2);

      const x = d3.scaleLinear()
        .domain([-1, 1])
        .range([0, width]);

      const colorScale = sentimentColorScaleLinear;

      const t = svg.transition().duration(transitionDuration);

      const yAxis = svg.select('.y-axis');
      yAxis.select('.domain').remove();

      // Data-join for the labels
      const yAxisLabels = yAxis.selectAll('.tick')
        .data(data, d => d.topicId);

      // Remove old labels
      yAxisLabels.exit()
        .transition(t)
        .style('opacity', 0)
        .remove();

      // Add new labels
      const enterGroup = yAxisLabels.enter().append('g')
        .attr('class', 'tick')
        .attr('transform', d => `translate(0, ${y(d.topicId) + y.bandwidth() / 2})`)
        .style('opacity', 0);

      enterGroup.append('text')
        .attr('dy', '0.32em')
        .attr('x', -9)
        .attr('text-anchor', 'end');

      // Update all labels (new and existing)
      const allLabels = enterGroup.merge(yAxisLabels);

      allLabels.transition(t)
        .attr('transform', d => `translate(0, ${y(d.topicId) + y.bandwidth() / 2})`)
        .style('opacity', 1);

      allLabels.select('text')
        .text(d => this.formatTopicId(d.topicId))
        .attr('class', 'cursor-pointer hover:font-bold')
        .style('font-size', '12px')
        .style('font-weight', d => this.highlightedTopics.includes(d.topicId) || this.hoveredTopics.includes(d.topicId) ? 'bold' : 'normal')
        .style('fill', d => this.hoveredTopics.includes(d.topicId) ? '#2563EB' : 'black')
        .on('click', (event, d) => this.toggleTopicFilter(d.topicId))
        .on('mouseover', (event, d) => {
          this.linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: d.topicId });
          this.tooltip.classed('hidden', false)
            .html(`<div class="font-semibold text-blue-700">Topic: ${d.topicId}</div>
                   <div>Avg. Sentiment (Active): ${d.activeAverageSentiment.toFixed(2)} (${d.activeSentimentCount} records)</div>
                   <div>Avg. Sentiment (Total): ${d.totalAverageSentiment.toFixed(2)} (${d.totalSentimentCount} records)</div>`);
        })
        .on('mousemove', (event) => {
          this.tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', (event, d) => {
          this.linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: d.topicId });
          this.tooltip.classed('hidden', true);
        });

      allLabels.each(function (d) {
        const tick = d3.select(this);
        tick.selectAll('.change-indicator').remove();
        if (Math.abs(d.sentimentChange) > 0.01) {
          tick.select('text').append('tspan')
            .attr('class', 'change-indicator')
            .style('font-size', '10px')
            .style('fill', d.sentimentChange > 0 ? '#10B981' : '#EF4444')
            .text(d.sentimentChange > 0 ? ' ▲' : ' ▼');
        }
      });

      svg.select('.x-axis')
        .attr('transform', `translate(0,${height})`)
        .transition(t)
        .call(d3.axisBottom(x).ticks(5));

      svg.select('.grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10).tickSize(-height).tickFormat(''))
        .selectAll('line').attr('stroke-opacity', 0.1);
      svg.select('.grid .domain').remove();

      svg.select('.center-line')
        .attr('x1', x(0)).attr('x2', x(0))
        .attr('y1', 0).attr('y2', height)
        .attr('stroke', 'grey').attr('stroke-dasharray', '2,2');

      const bgBars = svg.selectAll('.bg-bar')
        .data(data, d => d.topicId)
        .join(
          enter => enter.append('rect').attr('class', 'bg-bar')
            .attr('y', d => y(d.topicId))
            .attr('x', x(0)).attr('width', 0),
          update => update,
          exit => exit.transition(t).attr('width', 0).attr('x', x(0)).remove()
        );

      bgBars.transition(t)
        .attr('y', d => y(d.topicId))
        .attr('x', d => d.totalAverageSentiment < 0 ? x(d.totalAverageSentiment) : x(0))
        .attr('width', d => Math.abs(x(d.totalAverageSentiment) - x(0)))
        .attr('height', y.bandwidth())
        .attr('fill', d => colorScale(d.totalAverageSentiment))
        .attr('opacity', 0.3);

      const barHeight = y.bandwidth() * 0.6;
      const barYOffset = (y.bandwidth() - barHeight) / 2;
      const bars = svg.selectAll('.bar')
        .data(data, d => d.topicId)
        .join(
          enter => enter.append('rect').attr('class', 'bar')
            .attr('y', d => y(d.topicId) + barYOffset)
            .attr('x', x(0)).attr('width', 0),
          update => update,
          exit => exit.transition(t).attr('width', 0).attr('x', x(0)).remove()
        );

      bars.transition(t)
        .attr('y', d => y(d.topicId) + barYOffset)
        .attr('x', d => d.activeAverageSentiment < 0 ? x(d.activeAverageSentiment) : x(0))
        .attr('width', d => Math.abs(x(d.activeAverageSentiment) - x(0)))
        .attr('height', barHeight)
        .attr('fill', d => colorScale(d.activeAverageSentiment))
        .attr('stroke', d => this.hoveredTopics.includes(d.topicId) ? 'black' : 'none')
        .attr('stroke-width', 2);

      svg.selectAll('.bar, .bg-bar')
        .on('click', (event, d) => {
          this.handleBarClick(d.topicId);
        })
        .on('mouseover', (event, d) => {
          this.linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: d.topicId });
          this.tooltip.classed('hidden', false)
            .html(`<div class="font-semibold text-blue-700">Topic: ${d.topicId}</div>
                   <div>Avg. Sentiment (Active): ${d.activeAverageSentiment.toFixed(2)} (${d.activeSentimentCount} records)</div>
                   <div>Avg. Sentiment (Total): ${d.totalAverageSentiment.toFixed(2)} (${d.totalSentimentCount} records)</div>`);
        })
        .on('mousemove', (event) => {
          this.tooltip.style('left', `${event.pageX + 15}px`).style('top', `${event.pageY - 10}px`);
        })
        .on('mouseout', (event, d) => {
          this.linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: d.topicId });
          this.tooltip.classed('hidden', true);
        });
    },
  },
  watch: {
    processedData: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
    },
    sortOrder() {
      if (this.showChart) {
        this.$nextTick(() => this.drawChart());
      }
    },
    highlightedTopics: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
    },
    hoveredTopics: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
    },
    selectedInGraphs: {
      handler() {
        if (this.showChart) {
          this.$nextTick(() => this.drawChart());
        }
      },
      deep: true,
    },
    showChart(isShown) {
      if (isShown) {
        this.$nextTick(() => {
          if (this.$refs.chartContainer) {
            this.resizeObserver.observe(this.$refs.chartContainer);
            this.initChart();
          }
        });
      } else {
        if (this.$refs.chartContainer && this.resizeObserver) {
          this.resizeObserver.unobserve(this.$refs.chartContainer);
        }
      }
    }
  },
  async mounted() {
    this.tooltip = d3.select("body").append("div")
      .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
      .style("z-index", "50");

    this.isLoading = true;
    this.error = null;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.showChart) {
        this.initChart();
      }
    });
    try {
      if (this.graphStore.sentimentPerTopic.length === 0) {
        await this.graphStore.init();
      }
    } catch (e) {
      console.error("Error initializing topic sentiment overview:", e);
      this.error = e.message || "An unknown error occurred";
    } finally {
      this.isLoading = false;
      if (this.showChart) {
        this.$nextTick(() => {
          if (this.$refs.chartContainer) {
            this.resizeObserver.observe(this.$refs.chartContainer);
            this.initChart();
          }
        });
      }
    }
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }
  },
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
