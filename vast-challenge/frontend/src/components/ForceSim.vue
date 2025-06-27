<template>
  <div>
    <div class="controls">
      <label>Active Dataset:</label>
      <select v-model="activeDataset" @change="updateForces">
        <option v-for="ds in datasets" :key="ds" :value="ds">{{ ds }}</option>
      </select>

      <label style="margin-left: 20px;">
        <input type="checkbox" v-model="excludeOrganizations" @change="onFilterToggle" />
        Exclude ENTITY_ORGANIZATION
      </label>

      <label style="margin-left: 20px;">
        Left Industry:
        <select v-model="leftIndustry" @change="onFilterToggle">
          <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
        </select>
      </label>

      <label style="margin-left: 10px;">
        Right Industry:
        <select v-model="rightIndustry" @change="onFilterToggle">
          <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
        </select>
      </label>
    </div>

    <div class="scale-container">
      <div class="column-wrapper left">
        <svg ref="svgLeft" :width="svgWidth" :height="svgHeight" class="bubble-svg"></svg>
      </div>

      <div
        class="scale-base"
        :style="{ transform: `translateX(-50%) rotate(${tippingAngle}deg)` }"
      ></div>
      <div class="pivot-dot"></div>

      <div class="column-wrapper right">
        <svg ref="svgRight" :width="svgWidth" :height="svgHeight" class="bubble-svg"></svg>
      </div>
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
      excludeOrganizations: false
    };
  },
  computed: {
    tippingAngle() {
      const leftSum = this.leftNodes.filter(this.isActive).reduce((sum, n) => sum + n.data.agg_sentiment, 0);
      const rightSum = this.rightNodes.filter(this.isActive).reduce((sum, n) => sum + n.data.agg_sentiment, 0);
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
      this.allData = await res.json();
      this.datasets = ['all', ...new Set(this.allData.map(d => d.dataset))];
      this.industries = [...new Set(this.allData.map(d => d.industry))];
      this.splitNodesBySupportedSide();
      this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    // FULL reset + rebuild on org/industry filters
    onFilterToggle() {
      this.splitNodesBySupportedSide();
      if (this.leftSim)  this.leftSim.stop();
      if (this.rightSim) this.rightSim.stop();
      this.renderChart(this.leftNodes,  this.$refs.svgLeft,  d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    splitNodesBySupportedSide() {
      const areaScale = d3.scaleSqrt().domain([0, 1]).range([5, 30]);
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

    // Only update forces + colours on dataset change
    updateForces() {
      const apply = (sim, svgElem) => {
        sim
          .force('y',
            d3.forceY()
              .y(d => this.isActive(d) ? this.getGravityTargetY(d) : d.radius)
              .strength(0.1)
          )
          .alpha(0.7)
          .alphaDecay(0.015)
          .restart();

        d3.select(svgElem)
          .selectAll('circle')
          .attr('fill', d => this.getBubbleColor(d));
      };
      if (this.leftSim)  apply(this.leftSim,  this.$refs.svgLeft);
      if (this.rightSim) apply(this.rightSim, this.$refs.svgRight);
    },

    getEffectiveBottomY(side) {
      const shift = (this.tippingAngle / 15) * 50;
      return side === 'left' ? this.svgHeight - shift : this.svgHeight + shift;
    },

    getGravityTargetY(node) {
      const side = this.leftNodes.includes(node) ? 'left' : 'right';
      const phi = (this.tippingAngle / 2) * (Math.PI / 180);
      const interceptY = this.getEffectiveBottomY(side);
      const slope = Math.tan(phi);
      const x = node.x != null ? node.x : this.svgWidth / 2;
      return interceptY + (x - this.svgWidth / 2) * slope;
    },

    getBubbleColor(node) {
      if (!this.isActive(node)) return 'grey';
      return node.data.agg_sentiment < 0 ? 'orange' : 'steelblue';
    },

    renderChart(nodes, svgElem, simulation, side) {
      d3.select(svgElem).selectAll('*').remove();
      const svg = d3.select(svgElem);
      const group = svg.selectAll('g').data(nodes).enter().append('g');

      group.append('circle').attr('r', d => d.radius).attr('fill', d => this.getBubbleColor(d));
      group.append('text')
           .attr('text-anchor', 'middle')
           .style('pointer-events', 'none')
           .style('font-size', '9px')
           .style('fill', 'white')
           .append('tspan')
             .attr('x', 0)
             .attr('dy', '-0.3em')
             .text(d => d.data.entity_id)
           .append('tspan')
             .attr('x', 0)
             .attr('dy', '1.1em')
             .text(d => `${d.data.agg_sentiment.toFixed(0)} | ${d.data.dataset}`);

      simulation.nodes(nodes)
        .force('x', d3.forceX(this.svgWidth / 2).strength(0.05))
        .force('y', d3.forceY().y(d => this.getGravityTargetY(d)).strength(0.1))
        .force('collision', d3.forceCollide(d => d.radius + 2))
        .alpha(0.7)
        .alphaDecay(0.015)
        .on('tick', () => {
          group.attr('transform', d => {
            const floorY = this.isActive(d) ? this.getGravityTargetY(d) : d.radius;
            d.x = Math.max(d.radius, Math.min(this.svgWidth - d.radius, d.x));
            d.y = Math.min(floorY, Math.max(d.radius, d.y));
            return `translate(${d.x},${d.y})`;
          });
        });

      if (side === 'left') this.leftSim = simulation;
      else this.rightSim = simulation;
    }
  },
  beforeDestroy() {
    if (this.leftSim)  this.leftSim.stop();
    if (this.rightSim) this.rightSim.stop();
  }
};
</script>

<style scoped>
.controls { text-align: center; margin-bottom: 10px; }
.scale-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;
  margin-top: 40px;
  overflow: visible;
  padding-bottom: 60px;
}
.column-wrapper {
  width: 300px;
  height: 500px;
  overflow: visible;
}
.bubble-svg {
  overflow: visible;
}
.scale-base {
  position: absolute;
  bottom: -5px;
  left: 50%;
  width: 700px;
  height: 16px;
  background: black;
  border-radius: 6px;
  transform-origin: center bottom;
  transition: transform 0.6s ease;
}
.pivot-dot {
  position: absolute;
  bottom: -10px;
  left: 50%;
  width: 20px;
  height: 20px;
  background: #222;
  border-radius: 50%;
  transform: translateX(-50%);
}
select { padding: 4px 8px; }
</style>
