<template>
  <div class="relative flex">
    <!-- Main Content Column -->
    <div class="flex-1">
      <!-- Controls -->
      <div class="flex flex-wrap justify-center gap-4 mb-4 font-sans">
        <label class="flex items-center gap-2">
          Active Dataset:
          <select v-model="activeDataset" @change="updateForces" class="px-2 py-1 border rounded">
            <option v-for="ds in datasets" :key="ds" :value="ds">{{ ds }}</option>
          </select>
        </label>

        <label class="flex items-center gap-2">
          <input type="checkbox" v-model="excludeOrganizations" @change="onFilterToggle" />
          Exclude ENTITY_ORGANIZATION
        </label>

        <label class="flex items-center gap-2">
          Left Industry:
          <select v-model="leftIndustry" @change="onFilterToggle" class="px-2 py-1 border rounded">
            <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
          </select>
        </label>

        <label class="flex items-center gap-2">
          Right Industry:
          <select v-model="rightIndustry" @change="onFilterToggle" class="px-2 py-1 border rounded">
            <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
          </select>
        </label>
      </div>

      <!-- Scale Visualization -->
      <div class="flex justify-center items-end relative mt-8 pb-8">
        <div class="w-[300px] h-[500px] overflow-visible">
          <svg ref="svgLeft" :width="svgWidth" :height="svgHeight" class="overflow-visible"></svg>
        </div>

        <div class="absolute bottom-[-8px] left-1/2 w-[700px] h-4 bg-gray-800 rounded transform origin-bottom transition-transform duration-500 shadow-md" :style="{ transform: `translateX(-50%) rotate(${tippingAngle}deg)` }"></div>
        <div class="absolute bottom-[-12px] left-1/2 w-6 h-6 bg-gray-600 border-2 border-gray-900 rounded-full transform -translate-x-1/2"></div>

        <div class="w-[300px] h-[500px] overflow-visible">
          <svg ref="svgRight" :width="svgWidth" :height="svgHeight" class="overflow-visible"></svg>
        </div>
      </div>
    </div>

    <!-- Detail Panel -->
    <div class="w-80 h-[85vh] bg-white shadow-lg rounded-lg border border-gray-300 flex flex-col ml-4">
      <div v-if="selectedEntity" class="sticky top-0 bg-white z-10 px-4 py-3 border-b">
        <button @click="clearSelection" class="mb-2 px-2 py-1 text-sm border border-gray-400 rounded hover:bg-gray-100">Clear Selection</button>
        <h3 class="text-lg font-semibold">{{ selectedEntity.entity_id }}</h3>
        <p class="text-sm text-gray-700">Type: {{ selectedEntity.entity_type }}</p>
        <p class="text-sm text-gray-700">Industry: {{ selectedEntity.industry }}</p>
        <p class="text-sm text-gray-700 mb-2">Aggregated Sentiment: {{ selectedEntity.agg_sentiment.toFixed(2) }}</p>
        <h4 class="font-semibold text-sm">Contributing Sentiments</h4>
      </div>

      <div v-if="selectedEntity" class="flex-1 overflow-y-auto px-4 py-2">
        <ul class="space-y-4 text-sm">
          <li v-for="(cs, i) in selectedEntity.contributing_sentiments" :key="i" class="border-b pb-2">
            <p><strong>Topic:</strong> {{ cs.topic_id }}</p>
            <p><strong>Sentiment:</strong>
              <span
                :class="[
                    'px-2 py-0.5 rounded text-white text-xs font-semibold',
                    cs.sentiment > 0 ? 'bg-green-500' :
                    cs.sentiment < 0 ? 'bg-red-500' : 'bg-gray-400'
                ]">
                {{ cs.sentiment }}
              </span>
            </p>
            <p><strong>Reason:</strong> {{ cs.reason }}</p>
            <p><strong>Industries:</strong> {{ cs.topic_industry.join(', ') }}</p>
            <p><strong>Datasets:</strong> {{ cs.sentiment_recorded_in.join(', ') }}</p>
          </li>
        </ul>
      </div>

      <div v-else class="p-4 text-sm italic text-gray-600">Click on a sentiment bubble for detailed inspection</div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'IndustrySentimentBubbles',
  data() {
    return {
      svgWidth: 300,
      svgHeight: 500,
      allData: [],
      leftNodes: [],
      rightNodes: [],
      leftSim: null,
      rightSim: null,
      activeDataset: 'all',
      datasets: ['all'],
      industries: [],
      leftIndustry: 'large vessel',
      rightIndustry: 'tourism',
      excludeOrganizations: false,
      selectedEntity: null
    };
  },
  computed: {
    tippingAngle() {
      const leftSum = this.leftNodes.filter(this.isActive).reduce((sum, n) => sum + Math.abs(n.data.agg_sentiment), 0);
      const rightSum = this.rightNodes.filter(this.isActive).reduce((sum, n) => sum + Math.abs(n.data.agg_sentiment), 0);
      const total = leftSum + rightSum;
      const relative = total === 0 ? 0 : (leftSum - rightSum) / total;
      return d3.scaleLinear().domain([-1, 1]).range([15, -15])(relative);
    }
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      const res = await fetch('/api/industry-pro-contra-sentiments');
      const data = await res.json();
      this.allData = data.filter(d => d.agg_sentiment !== 0);
      this.datasets = ['all', ...new Set(this.allData.map(d => d.dataset))];
      this.industries = [...new Set(this.allData.map(d => d.industry))];
      this.splitNodesBySupportedSide();
      this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    onFilterToggle() {
      this.splitNodesBySupportedSide();
      if (this.leftSim) this.leftSim.stop();
      if (this.rightSim) this.rightSim.stop();
      this.selectedEntity = null;
      this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    splitNodesBySupportedSide() {
      const areaScale = d3.scaleSqrt().domain([0, 1]).range([8, 35]);
      this.leftNodes = [];
      this.rightNodes = [];
      this.allData.forEach(d => {
        if (d.agg_sentiment === 0) return;
        if (this.excludeOrganizations && d.entity_type === 'ENTITY_ORGANIZATION') return;
        if (![this.leftIndustry, this.rightIndustry].includes(d.industry)) return;
        const node = { radius: areaScale(Math.abs(d.agg_sentiment)), data: d };
        const supportsLeft = (d.industry === this.leftIndustry && d.agg_sentiment > 0) ||
                             (d.industry === this.rightIndustry && d.agg_sentiment < 0);
        if (supportsLeft) this.leftNodes.push(node);
        else this.rightNodes.push(node);
      });
    },

    isActive(node) {
      return this.activeDataset === 'all' || node.data.dataset === this.activeDataset;
    },

    updateForces() {
      const apply = (sim, svgElem) => {
        sim.force('y', d3.forceY().y(d => this.isActive(d) ? this.getGravityTargetY(d) : d.radius).strength(0.1))
           .alpha(0.7)
           .alphaDecay(0.015)
           .restart();
        d3.select(svgElem).selectAll('circle')
          .attr('fill', d => this.getBubbleColor(d))
          .style('opacity', d => this.isActive(d) ? 1 : 0.4);
      };
      if (this.leftSim) apply(this.leftSim, this.$refs.svgLeft);
      if (this.rightSim) apply(this.rightSim, this.$refs.svgRight);
    },

    getEffectiveBottomY(side) {
      const halfSpan = this.svgWidth / 2;
      const phi = this.tippingAngle * Math.PI / 180;
      const shift = Math.tan(phi) * halfSpan;
      const pivotY = this.svgHeight;
      return side === 'left' ? pivotY - shift : pivotY + shift;
    },

    getGravityTargetY(node) {
      const interceptY = this.getEffectiveBottomY(
        this.leftNodes.includes(node) ? 'left' : 'right'
      );
      const phi = this.tippingAngle * (Math.PI / 180);
      const x = node.x != null ? node.x : this.svgWidth / 2;
      const dx = x - (this.svgWidth / 2);
      return interceptY + dx * Math.tan(phi);
    },

    getBubbleColor(node) {
      if (!this.isActive(node)) return '#ccc';
      return node.data.agg_sentiment < 0 ? '#ff7f0e' : '#1f77b4';
    },

    getSentimentColor(value) {
      if (value > 0) return 'positive';
      if (value < 0) return 'negative';
      return 'neutral';
    },

    clearSelection() {
      this.selectedEntity = null;
      this.highlightSelectedBubble(null);
    },

    highlightSelectedBubble(entityId) {
      const updateStroke = svg => {
        d3.select(svg)
          .selectAll('circle')
          .attr('stroke-width', d => d.data.entity_id === entityId ? 3 : 1)
          .attr('stroke', d => d.data.entity_id === entityId ? '#000' : '#fff');
      };
      updateStroke(this.$refs.svgLeft);
      updateStroke(this.$refs.svgRight);
    },

    renderChart(nodes, svgElem, simulation, side) {
      d3.select(svgElem).selectAll('*').remove();
      const svg = d3.select(svgElem);
      const group = svg.selectAll('g').data(nodes).enter().append('g');

      group.append('circle')
           .attr('r', d => d.radius)
           .attr('fill', d => this.getBubbleColor(d))
           .attr('stroke', '#fff')
           .attr('stroke-width', 1)
           .on('click', (event, d) => {
             this.selectedEntity = d.data;
             this.highlightSelectedBubble(d.data.entity_id);
           });

      group.append('text')
           .attr('text-anchor', 'middle')
           .style('pointer-events', 'none')
           .style('font-family', 'Arial, sans-serif')
           .style('font-size', '10px')
           .style('fill', '#333')
           .append('tspan')
             .attr('x', 0)
             .attr('dy', '-0.3em')
             .text(d => d.data.entity_id)
           .append('tspan')
             .attr('x', 0)
             .attr('dy', '1.1em')
             .text(d => d.data.agg_sentiment.toFixed(2));

      simulation.nodes(nodes)
        .force('x', d3.forceX(this.svgWidth / 2).strength(0.05))
        .force('y', d3.forceY().y(d => this.isActive(d) ? this.getGravityTargetY(d) : d.radius).strength(0.1))
        .force('collision', d3.forceCollide(d => d.radius + 2))
        .alpha(0.7)
        .alphaDecay(0.015)
        .on('tick', () => {
          group.attr('transform', d => {
            d.x = Math.max(d.radius, Math.min(this.svgWidth - d.radius, d.x));
            if (this.isActive(d)) {
              const floorCenterY = this.getGravityTargetY(d);
              const maxCenterY = floorCenterY - d.radius;
              d.y = Math.min(maxCenterY, Math.max(d.radius, d.y));
            } else {
              d.y = Math.max(d.radius, d.y);
            }
            return `translate(${d.x},${d.y})`;
          });
        });

      if (side === 'left') this.leftSim = simulation;
      else this.rightSim = simulation;
    }
  },
  beforeDestroy() {
    if (this.leftSim) this.leftSim.stop();
    if (this.rightSim) this.rightSim.stop();
  }
};
</script>

<style scoped>
</style>