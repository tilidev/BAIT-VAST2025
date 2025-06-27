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
      <div class="column-wrapper left" :style="getColumnStyle('left')">
        <svg ref="svgLeft" :width="svgWidth" :height="svgHeight"></svg>
      </div>

      <div
        class="scale-base"
        :style="{ transform: `translateX(-50%) rotate(${tippingAngle}deg)` }"
      ></div>
      <div class="pivot-dot"></div>

      <div class="column-wrapper right" :style="getColumnStyle('right')">
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
      industries: [],
      leftIndustry: 'large vessel',
      rightIndustry: 'tourism',
      excludeOrganizations: false
    };
  },
  computed: {
    tippingAngle() {
      const leftSum = this.leftNodes
        .filter(this.isActive)
        .reduce((sum, n) => sum + n.data.agg_sentiment, 0);
      const rightSum = this.rightNodes
        .filter(this.isActive)
        .reduce((sum, n) => sum + n.data.agg_sentiment, 0);
      const total = leftSum + rightSum;
      const relative = total === 0 ? 0 : (leftSum - rightSum) / total;
      const scale = d3.scaleLinear().domain([-1, 1]).range([15, -15]);
      return scale(relative);
    }
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
        const uniqueIndustries = new Set(data.map(d => d.industry));

        this.datasets = ['all', ...uniqueDatasets];
        this.industries = [...uniqueIndustries];

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
        if (d.agg_sentiment === 0) return;
        if (this.excludeOrganizations && d.entity_type === 'ENTITY_ORGANIZATION') return;
        if (d.industry !== this.leftIndustry && d.industry !== this.rightIndustry) return;

        const isPositive = d.agg_sentiment > 0;
        const node = {
          radius: areaScale(Math.abs(d.agg_sentiment)),
          data: d
        };

        const supportsLeft =
          (d.industry === this.leftIndustry && isPositive) ||
          (d.industry === this.rightIndustry && !isPositive);

        if (supportsLeft) this.leftNodes.push(node);
        else this.rightNodes.push(node);
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

      const group = svg
        .selectAll('g')
        .data(nodes)
        .enter()
        .append('g');

      group
        .append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => this.getBubbleColor(d));

      const text = group
        .append('text')
        .attr('text-anchor', 'middle')
        .style('pointer-events', 'none')
        .style('font-size', '9px')
        .style('fill', 'white');

      text
        .append('tspan')
        .attr('x', 0)
        .attr('dy', '-0.3em')
        .text(d => d.data.entity_id);

      text
        .append('tspan')
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

        d3
          .select(svgRef)
          .selectAll('circle')
          .attr('fill', d => this.getBubbleColor(d));
      };

      if (this.leftSim) updateSimulation(this.leftSim, this.leftNodes, this.$refs.svgLeft);
      if (this.rightSim) updateSimulation(this.rightSim, this.rightNodes, this.$refs.svgRight);
    },

    getColumnStyle(side) {
    const tilt = this.tippingAngle;
    const maxShift = 50; // max shift in px at full tilt (adjust as needed)
    const shift = (tilt / 15) * maxShift; // normalize tilt to [-1, 1] range

    if (side === 'left') {
        return {
        transform: `translateY(${-shift}px) rotate(${tilt / 2}deg)`,
        transformOrigin: 'top center'
        };
    } else {
        return {
        transform: `translateY(${shift}px) rotate(${tilt / 2}deg)`,
        transformOrigin: 'top center'
        };
    }
    }
  },
  beforeDestroy() {
    if (this.leftSim) this.leftSim.stop();
    if (this.rightSim) this.rightSim.stop();
  }
};
</script>

<style scoped>
.controls {
  text-align: center;
  margin-bottom: 10px;
}

.scale-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;
  margin-top: 40px;
}

.column-wrapper {
  width: 300px;
  height: 500px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: transform 0.6s ease;
  transform-origin: top center;
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
  z-index: 0;
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
  z-index: 1;
}

select {
  padding: 4px 8px;
}
</style>