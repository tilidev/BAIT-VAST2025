<template>
  <div class="h-screen flex flex-col">
    <div class="p-4 flex space-x-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Node Type</label>
        <select v-model="selectedType" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
          <option disabled value="">Select Type</option>
          <option value="TOPIC">Topic</option>
          <option value="ENTITY_PERSON">Person</option>
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700">Node</label>
        <select v-model="selectedNode" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
          <option disabled value="">Select Node</option>
          <option v-for="item in options" :key="item.id" :value="item.id">{{ item.id }}</option>
        </select>
      </div>
    </div>
    <div ref="chart" class="flex-1 relative w-full h-full"></div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import { useEntityStore } from '../stores/entityStore'
export default {
  name: 'EgoNetwork',
  data() {
    return {
      selectedType: '',
      selectedNode: '',
      nodes: [],
      links: [],
      entityStore: null,
      ro: null
    }
  },
  computed: {
    options() {
      if (this.selectedType === 'TOPIC') return this.entityStore.topics
      if (this.selectedType === 'ENTITY_PERSON') return this.entityStore.persons
      return []
    }
  },
  watch: {
    selectedType() {
      this.selectedNode = ''
    },
    selectedNode(val) {
      if (val && this.selectedType) this.fetchData()
    }
  },
  methods: {
    async fetchData() {
      const res = await fetch(`/api/ego-network?node_id=${this.selectedNode}&node_type=${this.selectedType}`)
      const data = await res.json()
      this.nodes = data.nodes
      this.links = data.edges.map(e => ({ source: e.source, target: e.target, ...e.properties }))
      this.renderChart()
    },
    formatTooltip(data) {
      const skipKeys = new Set(['index','x','y','vx','vy','fx','fy','source','target'])
      let html = ''
      if (data.id !== undefined) {
        html += `<div class=\"font-bold mb-1\">ID: ${data.id}</div>`
        html += `<hr class=\"border-gray-300 my-2\"/>`
      }
      for (const [key, val] of Object.entries(data)) {
        if (skipKeys.has(key) || key === 'id') continue
        const display = Array.isArray(val)
          ? val.join(', ')
          : (typeof val === 'number' ? val.toFixed(2) : val)
        html += `<div class=\"mb-1\"><span class=\"font-semibold\">${key}:</span> ${display}</div>`
      }
      return html
    },
    renderChart() {
      const radius = 14
      d3.select(this.$refs.chart).selectAll('*').remove()
      const container = d3.select(this.$refs.chart)
      const svg = container.append('svg').attr('width', '100%').attr('height', '100%')
      const tooltip = container.append('div')
        .attr('class', 'tooltip hidden absolute bg-white p-2 rounded-lg shadow-lg text-sm text-gray-800')
      const width = this.$refs.chart.clientWidth
      const height = this.$refs.chart.clientHeight

      const types = Array.from(new Set(this.nodes.map(d => d.type)))
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(types)

      const legend = svg.append('g').attr('class', 'legend')
      types.forEach((t, i) => {
        const g = legend.append('g').attr('transform', `translate(20, ${20 + i * 20})`)
        g.append('rect')
          .attr('width', 12)
          .attr('height', 12)
          .attr('fill', colorScale(t))
        g.append('text')
          .attr('x', 18)
          .attr('y', 10)
          .attr('font-size', '12px')
          .attr('fill', '#333')
          .text(t)
      })

      const simulation = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(200).strength(1))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(radius + 1))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('y', d3.forceY(height / 2).strength(0.1))

      const egoNode = this.nodes.find(n => n.id === this.selectedNode)
      if (egoNode) {
        egoNode.fx = width / 2
        egoNode.fy = height / 2
      }

      const link = svg.append('g').attr('stroke', '#999').attr('stroke-opacity', 0.6)
        .selectAll('line').data(this.links).enter().append('line')
        .attr('stroke-width', d => Math.sqrt(d.value || 1) * 2)
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget)
            .attr('stroke', '#f00')
            .attr('stroke-opacity', 1)
          tooltip.html(this.formatTooltip(d)).classed('hidden', false)
        })
        .on('mousemove', event => {
          tooltip.style('left', (event.layerX + 10) + 'px').style('top', (event.layerY + 10) + 'px')
        })
        .on('mouseout', (event) => {
          d3.select(event.currentTarget).attr('stroke', '#999').attr('stroke-opacity', 0.6)
          tooltip.classed('hidden', true)
        })

      const node = svg.append('g')
        .selectAll('circle').data(this.nodes).enter().append('circle')
        .attr('r', d => d.id === this.selectedNode ? radius * 1.5 : radius)
        .attr('fill', d => colorScale(d.type))
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .call(d3.drag()
          .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y })
          .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); if (d.id !== this.selectedNode) { d.fx = null; d.fy = null } }))
        .on('mouseover', (event, d) => {
          d3.select(event.currentTarget).attr('stroke', '#000').attr('stroke-width', 2)
          tooltip.html(this.formatTooltip(d)).classed('hidden', false)
        })
        .on('mousemove', event => {
          tooltip.style('left', (event.layerX + 10) + 'px').style('top', (event.layerY + 10) + 'px')
        })
        .on('mouseout', (event, d) => {
          d3.select(event.currentTarget).attr('stroke', '#fff').attr('stroke-width', 1)
          tooltip.classed('hidden', true)
        })

      simulation.on('tick', () => {
        this.nodes.forEach(d => {
          d.x = Math.max(radius, Math.min(width - radius, d.x))
          d.y = Math.max(radius, Math.min(height - radius, d.y))
        })
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        node.attr('cx', d => d.x).attr('cy', d => d.y)
      })
    }
  },
  mounted() {
    this.entityStore = useEntityStore()
    this.ro = new ResizeObserver(() => {
      if (this.nodes.length) this.renderChart()
    })
    this.ro.observe(this.$refs.chart)
  },
  beforeUnmount() {
    if (this.ro) this.ro.disconnect()
  }
}
</script>

<style scoped>
.tooltip.hidden { display: none; }
.tooltip.absolute { position: absolute; pointer-events: none; }
</style>
