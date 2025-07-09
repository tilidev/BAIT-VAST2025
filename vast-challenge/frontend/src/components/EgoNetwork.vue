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
      <div>
        <label class="block text-sm font-medium text-gray-700">Filter</label>
        <select v-model="filterValue" class="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
          <option value="all">All</option>
          <option v-for="opt in filterOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>
    <div ref="chart" class="flex-1 relative w-full h-full"></div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import { useEntityStore } from '../stores/entityStore'
// Mapping node.type to PrimeIcon classes
const iconClass = {
  DISCUSSION: 'pi pi-comments',
  TOPIC: 'pi pi-lightbulb',
  ENTITY_PERSON: 'pi pi-user',
  ENTITY_ORGANIZATION: 'pi pi-building',
  PLACE: 'pi pi-map',
  PLAN: 'pi pi-list-check'
}
export default {
  name: 'EgoNetwork',
  data() {
    return {
      selectedType: '',
      selectedNode: '',
      filterValue: 'all',
      filterOptions: ['fi','tr'],
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
    selectedType() { this.selectedNode = '' },
    selectedNode(val) { if (val && this.selectedType) this.fetchData() },
    filterValue() { if (this.nodes.length) this.renderChart() }
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
      const skip = new Set(['index','x','y','vx','vy','fx','fy','source','target'])
      let html = ''
      if (data.id != null) html += `<div><strong>ID: ${data.id}</strong></div>`
      if (data.type != null) html += `<div>Type: ${data.type}</div><hr class=\"border-gray-300 my-2\"/>`
      for (const [k, v] of Object.entries(data)) {
        if (skip.has(k) || k === 'id' || k === 'type') continue
        const val = Array.isArray(v) ? v.join(', ') : (typeof v === 'number' ? v.toFixed(2) : v)
        html += `<div class=\"mb-1\"><span class=\"font-semibold\">${k}:</span> ${val}</div>`
      }
      return html
    },
    renderChart() {
      const r = 16
      d3.select(this.$refs.chart).selectAll('*').remove()
      const cont = d3.select(this.$refs.chart)
      const svg = cont.append('svg').attr('width','100%').attr('height','100%')
      const tooltip = cont.append('div')
        .attr('class','tooltip hidden absolute bg-white p-2 rounded-lg shadow-lg text-sm text-gray-800')
      const w = this.$refs.chart.clientWidth, h = this.$refs.chart.clientHeight
      const types = [...new Set(this.nodes.map(d => d.type))]
      const color = d3.scaleOrdinal(d3.schemeCategory10).domain(types)
      // Legend with PrimeIcons
      const legend = svg.append('g').attr('class','legend')
      types.forEach((t,i) => {
        const g = legend.append('g').attr('transform', `translate(20, ${20 + i * 24})`)
        // foreignObject for icon
        g.append('foreignObject')
          .attr('width', 24).attr('height', 24)
          .attr('x', 0).attr('y', -12)
          .append('xhtml:div')
          .html(`<i class=\"${iconClass[t]} text-xl\" style=\"color: ${color(t)}\"></i>`)
        g.append('text')
          .attr('x', 30).attr('y', 8)
          .attr('font-size','12px').attr('fill','#333')
          .text(t)
      })
      const sim = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(200).strength(1))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('collision', d3.forceCollide().radius(r+3))
      const ego = this.nodes.find(n=>n.id===this.selectedNode)
      if (ego) { ego.fx = w/2; ego.fy = h/2 }
      const link = svg.append('g').selectAll('line').data(this.links).enter().append('line')
        .attr('stroke','#999').attr('stroke-opacity',0.6)
        .attr('stroke-width', d=>Math.sqrt(d.value||1)*3)
        .attr('opacity', d=>(this.filterValue==='all'||d.in_graph.includes(this.filterValue))?1:0.1)
        .on('mouseover',(e,d)=>{d3.select(e.currentTarget).attr('stroke','#f00').attr('stroke-opacity',1);tooltip.html(this.formatTooltip(d)).classed('hidden',false)})
        .on('mousemove', event => {
          const [mx, my] = d3.pointer(event, this.$refs.chart)
          const tt = tooltip.node(), tw = tt.offsetWidth, th = tt.offsetHeight
          let x = mx + 10, y = my + 10
          if (x + tw > w) x = mx - tw - 10
          if (y + th > h) y = my - th - 10
          tooltip.style('left', x + 'px').style('top', y + 'px')
        })
        .on('mouseout', e=>{d3.select(e.currentTarget).attr('stroke','#999').attr('stroke-opacity',0.6);tooltip.classed('hidden',true)})
      const nodeG = svg.append('g').selectAll('g').data(this.nodes).enter().append('g')
        .call(d3.drag()
          .on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y})
          .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y})
          .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);if(d.id!==this.selectedNode){d.fx=null;d.fy=null}}))
      nodeG.append('circle')
        .attr('r',d=>d.id===this.selectedNode?r*1.5:r)
        .attr('fill',d=>color(d.type))
        .attr('stroke','#fff').attr('stroke-width',1)
        .attr('opacity', d=>(this.filterValue==='all'||d.in_graph.includes(this.filterValue))?1:0.1)
      nodeG.append('foreignObject')
        .attr('width', 24).attr('height', 24)
        .attr('x', -8).attr('y', -14)
        .append('xhtml:div')
        .html(d => `<i class=\"${iconClass[d.type]} text-lg\" style=\"color: #fff\"></i>`) // icon in white
      nodeG.on('mouseover',(e,d)=>{d3.select(e.currentTarget).select('circle').attr('stroke','#000').attr('stroke-width',2);tooltip.html(this.formatTooltip(d)).classed('hidden',false)})
             .on('mousemove', event => {
               const [mx, my] = d3.pointer(event, this.$refs.chart)
               const tt = tooltip.node(), tw = tt.offsetWidth, th = tt.offsetHeight
               let x = mx + 10, y = my + 10
               if (x + tw > w) x = mx - tw - 10
               if (y + th > h) y = my - th - 10
               tooltip.style('left', x + 'px').style('top', y + 'px')
             })
             .on('mouseout', e=>{d3.select(e.currentTarget).select('circle').attr('stroke','#fff').attr('stroke-width',1);tooltip.classed('hidden',true)})
      sim.on('tick',()=>{
        this.nodes.forEach(d=>{d.x=Math.max(r,Math.min(w-r,d.x));d.y=Math.max(r,Math.min(h-r,d.y))})
        link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y)
        nodeG.attr('transform',d=>`translate(${d.x},${d.y})`)
      })
    }
  },
  mounted(){this.entityStore=useEntityStore();this.ro=new ResizeObserver(()=>{if(this.nodes.length)this.renderChart()});this.ro.observe(this.$refs.chart)},
  beforeUnmount(){if(this.ro)this.ro.disconnect()}
}
</script>

<style scoped>
@import "primeicons/primeicons.css";
.tooltip.hidden { display: none; }
.tooltip.absolute { position: absolute; pointer-events: none; }
</style>