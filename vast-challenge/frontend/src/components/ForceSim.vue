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
    </div>

    <div class="dashboard">
      <div class="column">
        <h3>Large Vessel (Pro)</h3>
        <svg ref="svgLeft" :width="svgWidth" :height="svgHeight"></svg>
      </div>
      <div class="column">
        <h3>Tourism (Pro)</h3>
        <svg ref="svgRight" :width="svgWidth" :height="svgHeight"></svg>
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
      excludeOrganizations: false
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    async fetchData() {
      try {
        const res = await fetch('/api/industry-pro-contra-sentiments');
        const data = await res.json();
        this.allData = data;

        const uniqueDatasets = new Set(data.map(d => d.dataset));
        this.datasets = ['all', ...uniqueDatasets];

        this.splitNodesBySupportedSide();
        this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
        this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
      } catch (err) {
        console.error('Error loading data', err);
      }
    },

    onFilterToggle() {
      this.splitNodesBySupportedSide();
      this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
      this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
    },

    splitNodesBySupportedSide() {
      this.leftNodes = [];
      this.rightNodes = [];

      const areaScale = d3.scaleSqrt().domain([0, 1]).range([5, 30]);

      this.allData.forEach(d => {
        if (d.industry !== 'tourism' && d.industry !== 'large vessel') return;
        if (d.agg_sentiment === 0) return;
        if (this.excludeOrganizations && d.entity_type === 'ENTITY_ORGANIZATION') return;

        const isPositive = d.agg_sentiment > 0;
        const node = {
          radius: areaScale(Math.abs(d.agg_sentiment)),
          data: d
        };

        if (
          (d.industry === 'large vessel' && isPositive) ||
          (d.industry === 'tourism' && !isPositive)
        ) {
          this.leftNodes.push(node);
        } else {
          this.rightNodes.push(node);
        }
      });
    },

    isActive(node) {
      return this.activeDataset === 'all' || node.data.dataset === this.activeDataset;
    },

    getGravityTargetY(node) {
      return this.isActive(node) ? this.svgHeight : 0;
    },

    getBubbleColor(node) {
      const isActive = this.isActive(node);
      const isNegative = node.data.agg_sentiment < 0;

      if (!isActive) return 'grey';
      if (isNegative) return 'orange';
      return 'steelblue';
    },

    renderChart(nodes, svgRef, simulation, side) {
      const svg = d3.select(svgRef);
      svg.selectAll('*').remove();

      const group = svg.selectAll('g')
        .data(nodes)
        .enter()
        .append('g');

      group.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => this.getBubbleColor(d));

      const text = group.append('text')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('font-size', '9px')
        .style('fill', 'white');

      text.append('tspan')
        .attr('x', 0)
        .attr('dy', '-0.3em')
        .text(d => d.data.entity_id);

      text.append('tspan')
        .attr('x', 0)
        .attr('dy', '1.1em')
        .text(d => `${d.data.agg_sentiment.toFixed(2)} | ${d.data.dataset}`);

      simulation
        .nodes(nodes)
        .force('x', d3.forceX(this.svgWidth / 2).strength(0.05))
        .force('y', d3.forceY().y(d => this.getGravityTargetY(d)).strength(0.1))
        .force('collision', d3.forceCollide(d => d.radius + 2))
        .alphaDecay(0.015)
        .alpha(0.7)
        .on('tick', () => {
          group.attr('transform', d => {
            d.x = Math.max(d.radius, Math.min(this.svgWidth - d.radius, d.x));
            d.y = Math.max(d.radius, Math.min(this.svgHeight - d.radius, d.y));
            return `translate(${d.x},${d.y})`;
          });
        });

      if (side === 'left') this.leftSim = simulation;
      else this.rightSim = simulation;
    },

    updateForces() {
      const updateSimulation = (sim, nodes, svgRef) => {
        sim
          .force('y', d3.forceY().y(d => this.getGravityTargetY(d)).strength(0.1))
          .alphaDecay(0.015)
          .alpha(0.7)
          .restart();

        d3.select(svgRef)
          .selectAll('circle')
          .attr('fill', d => this.getBubbleColor(d));
      };

      if (this.leftSim) updateSimulation(this.leftSim, this.leftNodes, this.$refs.svgLeft);
      if (this.rightSim) updateSimulation(this.rightSim, this.rightNodes, this.$refs.svgRight);
    }
  },
  beforeDestroy() {
    if (this.leftSim) this.leftSim.stop();
    if (this.rightSim) this.rightSim.stop();
  }
};
</script>

<style scoped>
.dashboard {
  display: flex;
  gap: 20px;
  justify-content: center;
}
.column {
  flex: 1;
  text-align: center;
}
svg {
  background: #f9f9f9;
}
.controls {
  text-align: center;
  margin-bottom: 10px;
}
select {
  padding: 4px 8px;
}
</style>