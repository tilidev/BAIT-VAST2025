<template>
  <div>
    <div class="controls">
      <label>Active Dataset:</label>
      <select v-model="activeDataset" @change="updateForces">
        <option v-for="ds in datasets" :key="ds" :value="ds">{{ ds }}</option>
      </select>
    </div>

    <div class="dashboard">
      <div class="column">
        <h3>Large Vessel</h3>
        <svg ref="svgLeft" :width="svgWidth" :height="svgHeight"></svg>
      </div>
      <div class="column">
        <h3>Tourism</h3>
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
      datasets: ['all']
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

        // Collect all unique datasets
        const uniqueDatasets = new Set(data.map(d => d.dataset));
        this.datasets = ['all', ...uniqueDatasets];

        // Prepare per-industry nodes
        this.leftNodes = this.prepareNodes('large vessel');
        this.rightNodes = this.prepareNodes('tourism');

        this.renderChart(this.leftNodes, this.$refs.svgLeft, d3.forceSimulation(), 'left');
        this.renderChart(this.rightNodes, this.$refs.svgRight, d3.forceSimulation(), 'right');
      } catch (err) {
        console.error('Error loading data', err);
      }
    },

    prepareNodes(industry) {
      return this.allData
        .filter(d => d.industry === industry)
        .map(d => ({
          radius: Math.max(5, Math.abs(d.agg_sentiment) * 20),
          data: d
        }));
    },

    isActive(node) {
      return this.activeDataset === 'all' || node.data.dataset === this.activeDataset;
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
        .attr('fill', d => this.isActive(d) ? 'steelblue' : 'tomato');

      group.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .style('pointer-events', 'none')
        .style('font-size', '10px')
        .style('fill', 'white')
        .text(d => `${d.data.agg_sentiment.toFixed(2)} | ${d.data.dataset}`);

      simulation
        .nodes(nodes)
        .force('x', d3.forceX(this.svgWidth / 2).strength(0.05))
        .force('y', d3.forceY().y(d => this.isActive(d) ? this.svgHeight : 0).strength(0.1))
        .force('collision', d3.forceCollide(d => d.radius + 2))
        .alphaDecay(0.015) // slower movement decay
        .alpha(0.7)        // strong initial energy
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
        sim.force('y', d3.forceY()
          .y(d => this.isActive(d) ? this.svgHeight : 0)
          .strength(0.1))
          .alphaDecay(0.015)
          .alpha(0.7)
          .restart();

        d3.select(svgRef)
          .selectAll('circle')
          .attr('fill', d => this.isActive(d) ? 'steelblue' : 'tomato');
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