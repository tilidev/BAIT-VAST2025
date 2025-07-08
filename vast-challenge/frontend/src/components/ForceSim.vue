<template>
  <div class="flex space-x-6 p-4">
    <!-- LEFT: Heatmap -->
    <div class="p-4">
      <h1 class="text-left text-lg font-bold mb-4 ">Cosine Similarity</h1>
      <IndustrySimilarityHeatmap
        :useWeightedMean="true"
        :width="200"
        :height="200"
        @cell-click="onSimilarityCellClick"
      />
      <p class="mt-2 text-sm text-gray-600 italic">
        To see the industries with the strongest conflicting interests, click the cell with the most negative similarity value. This will tip the bias scale furthest and make the metaphor most informative.
      </p>
    </div>

    <!-- RIGHT: Scale + Detail -->
    <div class="flex-1 flex flex-col space-y-6">
      <!-- Scale + Detail Panel -->
      <div class="flex">
        <!-- Scale Column -->
        <div class="flex-1">
          <!-- Column Headers -->
          <div class="flex justify-center items-center mt-8">
            <div class="w-[300px] text-center text-lg font-semibold">
              {{ leftIndustry.charAt(0).toUpperCase() + leftIndustry.slice(1) }} (pro)
            </div>
            <div class="w-[300px] text-center text-lg font-semibold">
              {{ rightIndustry.charAt(0).toUpperCase() + rightIndustry.slice(1) }} (pro)
            </div>
          </div>

          <!-- Scale Visualization -->
          <div
            class="flex justify-center items-end relative mt-8 pb-8"
            @click="clearSelection"
          >
            <div class="w-[300px] h-[500px] overflow-visible">
              <svg
                ref="svgLeft"
                :width="svgWidth"
                :height="svgHeight"
                class="overflow-visible"
              ></svg>
            </div>

            <div class="self-stretch border-l-2 border-dotted border-gray-400 opacity-50 mx-4 pointer-events-none"></div>

            <div
              class="absolute bottom-[-8px] left-1/2 w-[700px] h-4 bg-gray-800 rounded origin-bottom transition-transform duration-500 shadow-md"
              :style="{ transform: `translateX(-50%) rotate(${tippingAngle}deg)` }"
            ></div>
            <div
              class="absolute bottom-[-12px] left-1/2 w-6 h-6 bg-gray-600 border-2 border-gray-900 rounded-full -translate-x-1/2"
            ></div>

            <div class="w-[300px] h-[500px] overflow-visible">
              <svg
                ref="svgRight"
                :width="svgWidth"
                :height="svgHeight"
                class="overflow-visible"
              ></svg>
            </div>
          </div>
        </div>

        <!-- Detail Panel -->
        <div class="w-80 h-[85vh] bg-white shadow-lg rounded-lg border border-gray-300 flex flex-col ml-10">
          <div
            v-if="selectedEntityNode"
            class="sticky top-0 bg-white z-10 px-4 py-3 border-b rounded-lg"
          >
            <button
              @click="clearSelection"
              class="mb-2 px-2 py-1 text-sm border border-gray-400 rounded hover:bg-gray-100"
            >
              Clear Selection
            </button>
            <h3 class="text-lg font-semibold">
              {{ selectedEntityNode.data.entity_id }}
            </h3>
            <p class="text-sm text-gray-700">
              Type: {{ selectedEntityNode.data.entity_type }}
            </p>
            <p class="text-sm text-gray-700">
              Industry: {{ selectedEntityNode.data.industry }}
            </p>
            <p class="text-sm text-gray-700 mb-2">
              Aggregated Sentiment:
              {{ selectedEntityNode.data.agg_sentiment.toFixed(2) }}
            </p>
            <h4 class="font-semibold text-sm">Contributing Sentiments</h4>
          </div>

          <div
            v-if="selectedEntityNode"
            class="flex-1 overflow-y-auto px-4 py-2"
          >
            <ul class="space-y-4 text-sm">
              <li
                v-for="(cs, i) in selectedEntityNode.data.contributing_sentiments"
                :key="i"
                class="border-b pb-2"
              >
                <p><strong>Topic:</strong> {{ cs.topic_id }}</p>
                <p><strong>Sentiment:</strong>
                  <span
                    :class="[
                      'px-2 py-0.5 rounded text-white text-xs font-semibold',
                      cs.sentiment > 0
                        ? 'bg-green-500'
                        : cs.sentiment < 0
                        ? 'bg-red-500'
                        : 'bg-gray-400'
                    ]"
                  >
                    {{ cs.sentiment }}
                  </span>
                </p>
                <p><strong>Reason:</strong> {{ cs.reason }}</p>
                <p><strong>Industries:</strong> {{ cs.topic_industry.join(', ') }}</p>
                <p>
                  <strong>Datasets:</strong>
                  {{ cs.sentiment_recorded_in.join(', ') }}
                </p>
              </li>
            </ul>
          </div>

          <div
            v-else
            class="p-4 text-sm italic text-gray-600"
          >
            Click on a sentiment bubble for detailed inspection
          </div>
        </div>
      </div>
    </div>
  </div>
</template>



<script>
import * as d3 from 'd3';
import IndustrySimilarityHeatmap from './IndustrySimilarityHeatmap.vue';
import { useScaleStore } from '../stores/scaleStore';
import { storeToRefs } from 'pinia';

export default {
  name: 'IndustrySentimentBubbles',
  components : {
    IndustrySimilarityHeatmap
  },
  setup() {
    const store = useScaleStore();
    const {
      activeDataset,
      excludeOrganizations,
      leftIndustry,
      rightIndustry,
    } = storeToRefs(store);

    return {
      activeDataset,
      excludeOrganizations,
      leftIndustry,
      rightIndustry,
      store,
    };
  },
  data() {
    return {
      svgWidth: 300,
      svgHeight: 500,
      allData: [],
      leftNodes: [],
      rightNodes: [],
      leftSim: null,
      rightSim: null,
      selectedEntityNode: null
    };
  },
  computed: {
    tippingAngle() {
      const leftSum = this.leftNodes.filter(this.isActive)
        .reduce((sum, n) => sum + Math.abs(n.data.agg_sentiment), 0);
      const rightSum = this.rightNodes.filter(this.isActive)
        .reduce((sum, n) => sum + Math.abs(n.data.agg_sentiment), 0);
      const total = leftSum + rightSum;
      const rel = total === 0 ? 0 : (leftSum - rightSum) / total;
      return d3.scaleLinear().domain([-1, 1]).range([15, -15])(rel);
    }
  },
  watch: {
    activeDataset() {
      this.updateStylesOnly();
    },
    excludeOrganizations() {
      this.onFilterToggle();
      this.updateStylesOnly();
    },
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      const res = await fetch('/api/industry-pro-contra-sentiments');
      const data = await res.json();
      this.allData = data.filter(d => d.agg_sentiment !== 0);
      this.store.setDatasets([...new Set(this.allData.map(d => d.dataset))]);
      this.store.setIndustries([...new Set(this.allData.map(d => d.industry))]);
      this.splitNodesBySupportedSide();
      // initial render & simulation start
      this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    onSimilarityCellClick({ left, right }) {
      // update the two industries and re-run the sim
      console.log("Doing a click")
      this.store.setLeftIndustry(left);
      this.store.setRightIndustry(right);
      this.onFilterToggle();
      this.updateStylesOnly();
    },

    onFilterToggle() {
      // restart sims when filters change
      this.splitNodesBySupportedSide();
      if (this.leftSim) this.leftSim.stop();
      if (this.rightSim) this.rightSim.stop();
      this.selectedEntityNode = null;
      this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    splitNodesBySupportedSide() {
      // makes sure area of bubble is proportional to the agg sentiment value
      const scale = d3.scaleSqrt().domain([0, 4]).range([15, 70]); //TODO currently hardcoded values
      this.leftNodes = [];
      this.rightNodes = [];
      this.allData.forEach(d => {
        if (d.agg_sentiment === 0) return;
        if (this.excludeOrganizations && d.entity_type === 'ENTITY_ORGANIZATION') return;
        if (![this.leftIndustry, this.rightIndustry].includes(d.industry)) return;
        const node = { radius: scale(Math.abs(d.agg_sentiment)), data: d };
        const leftSide =
          (d.industry === this.leftIndustry && d.agg_sentiment > 0) ||
          (d.industry === this.rightIndustry && d.agg_sentiment < 0);
        (leftSide ? this.leftNodes : this.rightNodes).push(node);
      });
    },

    isActive(node) {
      return this.activeDataset === 'all' ||
             node.data.dataset === this.activeDataset ||
             node.data.dataset === 'all';
    },

    updateStylesOnly() {
      // 1) update fills & opacities
      [this.$refs.svgLeft, this.$refs.svgRight].forEach(svgEl => {
        d3.select(svgEl).selectAll('circle')
          .attr('fill', d => this.getBubbleColor(d))
          .style('opacity', d => this.isActive(d) ? 1 : 0.4);
      });
      // 2) re-target Y-force so actives fall, inactive float
      const retarget = sim => {
        if (!sim) return;
        sim.force('y',
            d3.forceY()
              .y(d => this.isActive(d)
                     ? this.getGravityTargetY(d)
                     : d.radius)
              .strength(0.1)
          )
          .alpha(0.7)
          .restart();
      };
      retarget(this.leftSim);
      retarget(this.rightSim);
    //   this.clearSelection();
    },

    clearSelection() {
      this.selectedEntityNode = null;
      [this.$refs.svgLeft, this.$refs.svgRight].forEach(svgEl => {
        d3.select(svgEl).selectAll('circle')
          .attr('stroke-width', 1)
          .attr('stroke', '#fff');
      });
    },

    highlightSelectedBubble(node) {
      [this.$refs.svgLeft, this.$refs.svgRight].forEach(svgEl => {
        d3.select(svgEl).selectAll('circle')
          .attr('stroke-width', d => d === node ? 3 : 1)
          .attr('stroke',       d => d === node ? '#000' : '#fff');
      });
    },

    renderChart(nodes, svgEl, simulation, side) {
      d3.select(svgEl).selectAll('*').remove();
      const svg = d3.select(svgEl);
      const group = svg.selectAll('g').data(nodes).enter().append('g');

      group.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => this.getBubbleColor(d))
        .style('opacity', d => this.isActive(d) ? 1 : 0.4)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .on('click', (evt, d) => {
          evt.stopPropagation();
          this.selectedEntityNode = d;
          this.highlightSelectedBubble(d);
        });

      group.append('text')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('font', '10px Arial')
        .style('fill', '#333')
        .selectAll('tspan')
        .data(d => {
          const words = d.data.entity_id.trim().split(/\s+/);
          const sentiment = d.data.agg_sentiment.toFixed(2);
          const lines = [];

          if (words.length >= 2) {
            lines.push({ text: words[0], dy: '-0.6em', weight: '600' });
            lines.push({ text: words.slice(1).join(' '), dy: '1.1em', weight: '600' });
            lines.push({ text: sentiment, dy: '1.1em', weight: '800' }); // bold
          } else {
            lines.push({ text: words[0], dy: '-0.3em', weight: '600' });
            lines.push({ text: sentiment, dy: '1.1em', weight: '800' }); // bold
          }

          return lines;
        })
        .enter()
        .append('tspan')
        .attr('x', 0)
        .attr('dy', d => d.dy)
        .text(d => d.text)
        .style('font-weight', d => d.weight);


      simulation.nodes(nodes)
        .force('x', d3.forceX(this.svgWidth / 2).strength(0.05))
        .force('y',
          d3.forceY()
            .y(d => this.isActive(d)
                   ? this.getGravityTargetY(d)
                   : d.radius)
            .strength(0.1))
        .force('collision', d3.forceCollide(d => d.radius + 2).strength(0.95))
        .force('charge', d3.forceManyBody().strength(-1))
        .alpha(0.7)
        .alphaDecay(0.015)
        .on('tick', () => {
          group.attr('transform', d => {
            d.x = Math.max(d.radius, Math.min(this.svgWidth - d.radius, d.x));
            if (this.isActive(d)) {
              const fy = this.getGravityTargetY(d);
              d.y = Math.min(fy - d.radius, Math.max(d.radius, d.y));
            } else {
              // float upward
              d.y = Math.max(d.radius, d.y);
            }
            return `translate(${d.x},${d.y})`;
          });
        });

      if (side === 'left') this.leftSim = simulation;
      else this.rightSim = simulation;
    },

    getEffectiveBottomY(side) {
      const half = this.svgWidth / 2;
      const phi = (this.tippingAngle * Math.PI) / 180;
      const shift = Math.tan(phi) * half;
      return side === 'left'
        ? this.svgHeight - shift
        : this.svgHeight + shift;
    },

    getGravityTargetY(node) {
      const side = this.leftNodes.includes(node) ? 'left' : 'right';
      const intercept = this.getEffectiveBottomY(side);
      const phi = (this.tippingAngle * Math.PI) / 180;
      const dx = (node.x ?? this.svgWidth / 2) - this.svgWidth / 2;
      return intercept + dx * Math.tan(phi);
    },

    getBubbleColor(node) {
      if (!this.isActive(node)) return '#ccc';
      return node.data.agg_sentiment < 0
        ? '#f87171'
        : '#60a5fa';
    }
  },

  beforeDestroy() {
    if (this.leftSim) this.leftSim.stop();
    if (this.rightSim) this.rightSim.stop();
  }
};
</script>

<style scoped>
/* All styling via Tailwind CSS */
</style>
