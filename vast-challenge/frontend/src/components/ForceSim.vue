<template>
  <div>
    <div class="controls">
      <label>Active Dataset:</label>
      <select v-model="activeDataset" @change="updateForces">
        <option v-for="ds in datasets" :key="ds" :value="ds">{{ ds }}</option>
      </select>

      <label class="control-item">
        <input type="checkbox" v-model="excludeOrganizations" @change="onFilterToggle" />
        Exclude ENTITY_ORGANIZATION
      </label>

      <label class="control-item">
        Left Industry:
        <select v-model="leftIndustry" @change="onFilterToggle">
          <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
        </select>
      </label>

      <label class="control-item">
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

    <div class="details-panel">
    <div v-if="selectedEntity">
    <div class="sticky-header">
        <button @click="clearSelection" class="clear-btn">Clear Selection</button>
        <h3>Details for {{ selectedEntity.entity_id }}</h3>
        <p><strong>Type:</strong> {{ selectedEntity.entity_type }}</p>
        <p><strong>Industry:</strong> {{ selectedEntity.industry }}</p>
        <p><strong>Aggregated Sentiment:</strong> {{ selectedEntity.agg_sentiment.toFixed(2) }}</p>
        <hr />
        <h4>Contributing Sentiments</h4>
    </div>

    <ul class="sentiments-list">
        <li v-for="(cs, i) in selectedEntity.contributing_sentiments" :key="i">
        <p><strong>Topic:</strong> {{ cs.topic_id }}</p>
        <p><strong>Sentiment:</strong>
            <span :class="getSentimentColor(cs.sentiment)">
            {{ cs.sentiment }}
            </span>
        </p>
        <p><strong>Reason:</strong> {{ cs.reason }}</p>
        <p><strong>Industries:</strong> {{ cs.topic_industry.join(', ') }}</p>
        <p><strong>Datasets:</strong> {{ cs.sentiment_recorded_in.join(', ') }}</p>
        </li>
    </ul>
    </div>
      <div v-else>
        <p class="placeholder-text">Click on a sentiment bubble for detailed inspection</p>
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
.controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  font-family: Arial, sans-serif;
}
.control-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
select {
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 0.9rem;
}
.scale-container {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  position: relative;
  margin-top: 2rem;
  overflow: visible;
  padding-bottom: 1rem;
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
  bottom: -8px;
  left: 50%;
  width: 700px;
  height: 16px;
  background: #333;
  border-radius: 8px;
  transform-origin: center bottom;
  transition: transform 0.6s ease;
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
}
.pivot-dot {
  position: absolute;
  bottom: -12px;
  left: 50%;
  width: 24px;
  height: 24px;
  background: #555;
  border: 2px solid #222;
  border-radius: 50%;
  transform: translateX(-50%);
}
.details-panel {
  position: absolute;
  top: 2rem;
  right: 1rem;
  width: 320px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 1rem;
  background: #fefefe;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-family: Arial, sans-serif;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
.sentiments-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.sentiments-list li {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #ddd;
}
.placeholder-text {
  font-style: italic;
  color: #777;
}
.positive {
  color: green;
}
.negative {
  color: red;
}
.neutral {
  color: #555;
}
.clear-btn {
  margin-bottom: 1rem;
  background: #eee;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.clear-btn:hover {
  background: #ddd;
}
.sticky-header {
  position: sticky;
  top: 0;
  background: #fefefe;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #ccc;
  z-index: 2;
}

</style>
