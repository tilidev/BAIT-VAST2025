<template>
  <div class="w-full h-full flex flex-col relative">
    <div class="flex justify-between items-center mb-3">
      <h3 class="text-lg font-semibold text-gray-700">Topic Sentiments</h3>
      <div class="flex items-center gap-4">
        <div class="flex items-center bg-gray-200 rounded-lg p-1 text-sm">
          <button @click="viewMode = 'sentiment'"
            :class="['px-3 py-1 rounded-md', viewMode === 'sentiment' ? 'bg-white shadow' : '']">
            Sentiment
          </button>
          <button @click="viewMode = 'diff'"
            :class="['px-3 py-1 rounded-md', viewMode === 'diff' ? 'bg-white shadow' : '']">
            Diff
          </button>
        </div>
        <div class="relative">
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
              class="absolute right-0 mt-2 w-72 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-sm text-gray-800 z-20">
              <p class="font-bold text-lg mb-3 text-gray-900">Chart Interactions</p>
              <ul class="space-y-3">
                <li class="flex items-start">
                  <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 15l-2 5L8 9l11 4-5 2zm0 0l5 5M7.5 8.5A2.5 2.5 0 0110 6v0a2.5 2.5 0 012.5 2.5v0" />
                  </svg>
                  <div><span class="font-semibold">Hover</span> over cells to see sentiment details.</div>
                </li>
                <li class="flex items-start">
                  <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <div><span class="font-semibold">Click</span> on a person or topic label to highlight them.</div>
                </li>
              </ul>
            </div>
          </transition>
        </div>
      </div>
    </div>
    <div class="flex-1 w-full min-h-0 overflow-hidden" ref="matrixContainer"></div>
    <div class="pt-3 mt-3 border-t border-gray-200">
      <div class="flex justify-between items-center mb-2 px-1">
        <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filter by Industry</h3>
        <div class="flex items-center gap-4">
          <button @click="selectAllIndustries"
            class="text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-150">Select
            All</button>
          <button @click="deselectAllIndustries"
            class="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors duration-150">Deselect
            All</button>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <label v-for="industry in allIndustries" :key="industry" :class="[
          'inline-block px-2 py-1 text-xs font-medium rounded-full border cursor-pointer transition-colors duration-150',
          { 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200': selectedIndustries.includes(industry) },
          { 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200': !selectedIndustries.includes(industry) }
        ]">
          <input type="checkbox" :value="industry" v-model="selectedIndustries" class="sr-only" />
          {{ industry }}
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import * as d3 from 'd3';
import { useGraphStore } from '../stores/graphStore';
import { useLinkingStore, HighlightType } from '../stores/linkingStore';
import { sentimentColorScaleLinear } from '../utils/colors';

type ViewMode = 'sentiment' | 'diff';

interface DiffMatrixCell {
  rowId: string;
  colId: string;
  values: {
    jo?: number | null;
    fi?: number | null;
    tr?: number | null;
  };
  coverage: ('jo' | 'fi' | 'tr')[];
  sentiment: number | null;
}

export default defineComponent({
  name: 'SentimentDiffMatrix',
  setup() {
    const graphStore = useGraphStore();
    const linkingStore = useLinkingStore();
    const matrixContainer = ref<HTMLElement | null>(null);
    const showHelp = ref(false);
    const viewMode = ref<ViewMode>('sentiment');
    const selectedIndustries = ref<string[]>([]);

    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimeout: number | null = null;
    let containerWidth = ref(0);
    let containerHeight = ref(0);

    const highlightedPeople = computed(() => linkingStore.highlightedPeople);
    const highlightedTopics = computed(() => linkingStore.highlightedTopics);

    const UNCLASSIFIED_INDUSTRY = 'Unclassified';

    function selectAllIndustries() {
      selectedIndustries.value = [...allIndustries.value];
    }

    function deselectAllIndustries() {
      selectedIndustries.value = [];
    }

    const allIndustries = computed(() => {
      const industries = new Set<string>();
      graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((topic) => {
          if (topic.topic_industry && topic.topic_industry.length > 0) {
            topic.topic_industry.forEach(industry => {
              if (industry) industries.add(industry);
            });
          } else {
            industries.add(UNCLASSIFIED_INDUSTRY);
          }
        });
      });
      return Array.from(industries).sort();
    });

    watch(allIndustries, (newIndustries) => {
      selectedIndustries.value = [...newIndustries];
    }, { immediate: true });

    const topicToIndustries = computed(() => {
      const mapping = new Map<string, string[]>();
      graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((topic) => {
          if (!mapping.has(topic.topic_id)) {
            if (topic.topic_industry && topic.topic_industry.length > 0) {
              mapping.set(topic.topic_id, topic.topic_industry);
            } else {
              mapping.set(topic.topic_id, [UNCLASSIFIED_INDUSTRY]);
            }
          }
        });
      });
      return mapping;
    });

    const personLabels = computed(() => graphStore.sentimentPerTopic.map((entity) => entity.entity_id));
    const topicLabels = computed(() => {
      const topics = new Set<string>();
      if (selectedIndustries.value.length === 0) return [];

      graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((topic) => {
          const industriesOfTopic = topicToIndustries.value.get(topic.topic_id);
          if (industriesOfTopic && industriesOfTopic.some(ind => selectedIndustries.value.includes(ind))) {
            topics.add(topic.topic_id);
          }
        });
      });
      return Array.from(topics).sort();
    });

    const sentimentMatrixData = computed((): DiffMatrixCell[] => {
      const dataMap = new Map<string, DiffMatrixCell>();
      personLabels.value.forEach(personId => {
        topicLabels.value.forEach(topicId => {
          const key = `${personId}-${topicId}`;
          dataMap.set(key, {
            rowId: personId,
            colId: topicId,
            values: {},
            coverage: [],
            sentiment: null,
          });
        });
      });

      graphStore.sentimentPerTopic.forEach((entity) => {
        entity.topic_sentiments.forEach((topic) => {
          const key = `${entity.entity_id}-${topic.topic_id}`;
          const cell = dataMap.get(key);
          if (cell) {
            topic.sentiment_recorded_in.forEach(source => {
              if (source === 'jo' || source === 'fi' || source === 'tr') {
                cell.values[source] = topic.sentiment;
              }
            });
          }
        });
      });

      dataMap.forEach(cell => {
        const presentSources = (['jo', 'fi', 'tr'] as const).filter(s => cell.values[s] !== undefined);
        cell.coverage = presentSources;

        const firstPresentValue = presentSources.length > 0 ? cell.values[presentSources[0]] : undefined;
        cell.sentiment = (firstPresentValue !== undefined && firstPresentValue !== null) ? firstPresentValue : null;
      });
      return Array.from(dataMap.values());
    });

    function togglePersonHighlight(personId: string) {
      linkingStore.toggleFilter({ type: 'person', value: personId });
    }

    function toggleTopicHighlight(topicId: string) {
      linkingStore.toggleFilter({ type: 'topic', value: topicId });
    }

    function addPersonHover(personId: string) {
      linkingStore.addHoverHighlight({ type: HighlightType.PERSON, value: personId });
    }

    function removePersonHover(personId: string) {
      linkingStore.removeHoverHighlight({ type: HighlightType.PERSON, value: personId });
    }

    function addTopicHover(topicId: string) {
      linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: topicId });
    }

    function removeTopicHover(topicId: string) {
      linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: topicId });
    }

    function getTooltipContent(d: DiffMatrixCell): string {
      const sentimentBox = (value: number | null | undefined) => {
        if (value === undefined) {
          return `<div class="w-3 h-5" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg==');"></div>`;
        }
        if (value === null) {
          return `<div class="w-3 h-5" style="background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSdibGFjaycvPgogIDxwYXRoIGQ9J00tMSwxIGwyLC0yCiAgICAgICAgICAgTTAsMTAgbDEwLC0xMAogICAgICAgICAgIE05LDExIGwyLC0yJyBzdHJva2U9J3doaXRlJyBzdHJva2Utd2lkdGg9JzEnLz4KPC9zdmc+');"></div>`;
        }
        return `<div class="w-3 h-5" style="background-color: ${sentimentColorScaleLinear(value)}"></div>`;
      };

      return `
        <div class="font-semibold text-blue-700">Person: ${d.rowId}</div>
        <div>Topic: ${d.colId}</div>
        <div class="mt-2 flex items-center space-x-2">
          ${sentimentBox(d.values.jo)} <div>JO: ${d.values.jo?.toFixed(2) ?? 'N/A'}</div>
        </div>
        <div class="flex items-center space-x-2">
          ${sentimentBox(d.values.fi)} <div>FI: ${d.values.fi?.toFixed(2) ?? 'N/A'}</div>
        </div>
        <div class="flex items-center space-x-2">
          ${sentimentBox(d.values.tr)} <div>TR: ${d.values.tr?.toFixed(2) ?? 'N/A'}</div>
        </div>
      `;
    }

    function debouncedResize() {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = window.setTimeout(() => {
        if (matrixContainer.value) {
          const rect = matrixContainer.value.getBoundingClientRect();
          const newWidth = rect.width;
          const newHeight = rect.height;
          
          if (newWidth !== containerWidth.value || newHeight !== containerHeight.value) {
            containerWidth.value = newWidth;
            containerHeight.value = newHeight;
            draw();
          }
        }
      }, 100);
    }

    function draw() {
      if (!matrixContainer.value || containerWidth.value === 0 || containerHeight.value === 0) return;

      d3.select(matrixContainer.value).select('svg').remove();
      d3.select('.tooltip-diff-matrix').remove();

      const margin = { top: 150, right: 10, bottom: 10, left: 150 };
      const innerWidth = Math.max(0, containerWidth.value - margin.left - margin.right);
      const innerHeight = Math.max(0, containerHeight.value - margin.top - margin.bottom);

      if (innerWidth <= 0 || innerHeight <= 0) return;

      svg = d3.select(matrixContainer.value)
        .append('svg')
        .attr('width', containerWidth.value)
        .attr('height', containerHeight.value)
        .on('mouseleave', () => {
          linkingStore.setHoverHighlights([]);
        });

      tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip-diff-matrix pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
        .style("z-index", "50");

      const x = d3.scaleBand().range([0, innerWidth]).domain(topicLabels.value).padding(0.05);
      const y = d3.scaleBand().range([0, innerHeight]).domain(personLabels.value).padding(0.05);

      const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

      // Define patterns
      const defs = g.append("defs");
      defs.append("pattern")
        .attr("id", "crosshatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 8)
        .attr("height", 8)
        .append("image")
        .attr("xlink:href", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg==")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 8)
        .attr("height", 8);
      
      defs.append("pattern")
        .attr("id", "diagonalStripe6")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 10)
        .attr("height", 10)
        .append("image")
        .attr("xlink:href", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSdibGFjaycvPgogIDxwYXRoIGQ9J00tMSwxIGwyLC0yCiAgICAgICAgICAgTTAsMTAgbDEwLC0xMAogICAgICAgICAgIE05LDExIGwyLC0yJyBzdHJva2U9J3doaXRlJyBzdHJva2Utd2lkdGg9JzEnLz4KPC9zdmc+")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10);

      g.selectAll(".row-label")
        .data(personLabels.value)
        .join("text")
        .attr("class", "row-label text-xs cursor-pointer")
        .attr("x", -6)
        .attr("y", d => (y(d) ?? 0) + y.bandwidth() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .text(d => d)
        .on("click", (_, d: string) => togglePersonHighlight(d))
        .on("mouseover", (_, d: string) => addPersonHover(d))
        .on("mouseout", (_, d: string) => removePersonHover(d));

      g.selectAll(".column-label")
        .data(topicLabels.value)
        .join("text")
        .attr("class", "column-label text-xs cursor-pointer")
        .attr("text-anchor", "start")
        .attr("transform", d => `translate(${(x(d) ?? 0) + x.bandwidth() / 2}, -6) rotate(-90)`)
        .text(d => d)
        .on("click", (_, d: string) => toggleTopicHighlight(d))
        .on("mouseover", (_, d: string) => addTopicHover(d))
        .on("mouseout", (_, d: string) => removeTopicHover(d));

      const cells = g.selectAll<SVGGElement, DiffMatrixCell>('.cell')
        .data(sentimentMatrixData.value)
        .join('g')
        .attr('class', 'cell')
        .attr('transform', d => `translate(${x(d.colId) ?? 0}, ${y(d.rowId) ?? 0})`);

      const sentimentFill = (value: number | null | undefined) => {
        if (value === undefined) return 'url(#crosshatch)';
        if (value === null) return 'url(#diagonalStripe6)';
        return sentimentColorScaleLinear(value);
      };

      const barWidth = x.bandwidth() / 3;
      const drawSentimentBars = (selection: d3.Selection<SVGGElement, DiffMatrixCell, SVGGElement, unknown>) => {
        selection.append('rect') // JO
          .attr('width', barWidth)
          .attr('height', y.bandwidth())
          .attr('fill', d => sentimentFill(d.values.jo))
          .attr('x', 0);

        selection.append('rect') // FI
          .attr('width', barWidth)
          .attr('height', y.bandwidth())
          .attr('fill', d => sentimentFill(d.values.fi))
          .attr('x', barWidth);

        selection.append('rect') // TR
          .attr('width', barWidth)
          .attr('height', y.bandwidth())
          .attr('fill', d => sentimentFill(d.values.tr))
          .attr('x', barWidth * 2);

        // Add subtle dividers
        selection.append('line')
          .attr('x1', barWidth)
          .attr('x2', barWidth)
          .attr('y1', 0)
          .attr('y2', y.bandwidth())
          .attr('stroke', '#e2e8f0') // gray-200
          .attr('stroke-width', 0.5);

        selection.append('line')
          .attr('x1', barWidth * 2)
          .attr('x2', barWidth * 2)
          .attr('y1', 0)
          .attr('y2', y.bandwidth())
          .attr('stroke', '#e2e8f0') // gray-200
          .attr('stroke-width', 0.5);
      }

      const drawDiffView = (selection: d3.Selection<SVGGElement, DiffMatrixCell, SVGGElement, unknown>) => {
        selection.each(function (d) {
          const cell = d3.select(this);
          if (d.coverage.length === 3) {
            cell.append('rect')
              .attr('width', x.bandwidth())
              .attr('height', y.bandwidth())
              .attr('fill', '#f1f5f9'); // gray-100
            return;
          }
          const barWidth = x.bandwidth() / 3;

          // JO bar and text
          cell.append('rect')
            .attr('width', barWidth)
            .attr('height', y.bandwidth())
            .attr('fill', sentimentFill(d.values.jo))
            .attr('x', 0);
          if (d.coverage.includes('jo')) {
            cell.append('text')
              .attr('x', barWidth / 2)
              .attr('y', y.bandwidth() / 2)
              .attr('dy', '.35em')
              .attr('text-anchor', 'middle')
              .attr('font-size', '10px')
              .attr('fill', 'white')
              .text('J');
          }

          // FI bar and text
          cell.append('rect')
            .attr('width', barWidth)
            .attr('height', y.bandwidth())
            .attr('fill', sentimentFill(d.values.fi))
            .attr('x', barWidth);
          if (d.coverage.includes('fi')) {
            cell.append('text')
              .attr('x', barWidth + barWidth / 2)
              .attr('y', y.bandwidth() / 2)
              .attr('dy', '.35em')
              .attr('text-anchor', 'middle')
              .attr('font-size', '10px')
              .attr('fill', 'white')
              .text('F');
          }

          // TR bar and text
          cell.append('rect')
            .attr('width', barWidth)
            .attr('height', y.bandwidth())
            .attr('fill', sentimentFill(d.values.tr))
            .attr('x', barWidth * 2);
          if (d.coverage.includes('tr')) {
            cell.append('text')
              .attr('x', barWidth * 2 + barWidth / 2)
              .attr('y', y.bandwidth() / 2)
              .attr('dy', '.35em')
              .attr('text-anchor', 'middle')
              .attr('font-size', '10px')
              .attr('fill', 'white')
              .text('T');
          }
        });
      }

      cells.selectAll('*').remove();

      if (viewMode.value === 'sentiment') {
        drawSentimentBars(cells);
      } else {
        drawDiffView(cells);
      }

      cells
        .on("mouseover", (_, d: DiffMatrixCell) => {
          tooltip.classed("hidden", false).html(getTooltipContent(d));
          linkingStore.addHoverHighlight({ type: HighlightType.PERSON, value: d.rowId });
          linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: d.colId });
        })
        .on("mousemove", (event: MouseEvent) => tooltip.style("left", (event.pageX + 15) + "px").style("top", (event.pageY - 28) + "px"))
        .on("mouseout", (_, d: DiffMatrixCell) => {
          tooltip.classed("hidden", true);
          linkingStore.removeHoverHighlight({ type: HighlightType.PERSON, value: d.rowId });
          linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: d.colId });
        });

      updateHighlight();
    }

    function updateHighlight() {
      if (!svg) return;
      const allHoveredRows = linkingStore.hoverHighlights.filter(h => h.type === HighlightType.PERSON).map(h => h.value);
      const allHoveredCols = linkingStore.hoverHighlights.filter(h => h.type === HighlightType.TOPIC).map(h => h.value);

      const hasHighlight = highlightedPeople.value.length > 0 || highlightedTopics.value.length > 0;
      const hasHover = allHoveredRows.length > 0 || allHoveredCols.length > 0;

      svg.selectAll<SVGTextElement, string>(".row-label")
        .style("font-weight", d => highlightedPeople.value.includes(d) || allHoveredRows.includes(d) ? "bold" : "normal");
      svg.selectAll<SVGTextElement, string>(".column-label")
        .style("font-weight", d => highlightedTopics.value.includes(d) || allHoveredCols.includes(d) ? "bold" : "normal");

      svg.selectAll<SVGGElement, DiffMatrixCell>(".cell")
        .style("opacity", d => {
          if (!hasHighlight && !hasHover) return 1;
          if (highlightedPeople.value.includes(d.rowId) || highlightedTopics.value.includes(d.colId) ||
              allHoveredRows.includes(d.rowId) || allHoveredCols.includes(d.colId)) {
            return 1;
          }
          return 0.3;
        });
    }

    onMounted(() => {
      if (matrixContainer.value) {
        const rect = matrixContainer.value.getBoundingClientRect();
        containerWidth.value = rect.width;
        containerHeight.value = rect.height;
        
        resizeObserver = new ResizeObserver(debouncedResize);
        resizeObserver.observe(matrixContainer.value);
        
        draw();
      }
    });
    
    onBeforeUnmount(() => {
      d3.select('.tooltip-diff-matrix').remove();
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
    });

    watch([sentimentMatrixData, viewMode], draw, { deep: true });
    watch(() => linkingStore.hoverHighlights, updateHighlight, { deep: true });
    watch(highlightedPeople, updateHighlight);
    watch(highlightedTopics, updateHighlight);

    return {
      matrixContainer,
      showHelp,
      viewMode,
      allIndustries,
      selectedIndustries,
      selectAllIndustries,
      deselectAllIndustries,
    };
  },
});
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
