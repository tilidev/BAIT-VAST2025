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
const iconPaths = {
  DISCUSSION: 'M2,2 L22,2 L22,16 L12,16 L8,20 L8,16 L2,16 Z',
  TOPIC: 'M12,2 A5,5 0 1,1 11.999,2 Z M9,8 L9,12 L15,12 L15,8 Z M11,14 L11,18 M13,14 L13,18',
  ENTITY_PERSON: 'M12,2 A6,6 0 1,1 11.999,2 Z M2,22 C2,16 8,14 12,14 C16,14 22,16 22,22 Z',
  ENTITY_ORGANIZATION: 'M4,22 L4,8 L8,8 L8,4 L16,4 L16,8 L20,8 L20,22 Z M8,22 L8,14 L12,14 L12,22 Z',
  PLACE: 'M12,2 C8,2 5,5 5,9 C5,14 12,22 12,22 C12,22 19,14 19,9 C19,5 16,2 12,2 Z M12,11.5 A2.5,2.5 0 1,1 11.999,11.5 Z',
  PLAN: 'M4,4 L20,4 L20,22 L4,22 Z M4,8 L20,8 M8,4 L8,22'
}
export default {
  name: 'EgoNetwork',
  data() { return { selectedType: '', selectedNode: '', nodes: [], links: [], entityStore: null, ro: null } },
  computed: {
    options() {
      if (this.selectedType === 'TOPIC') return this.entityStore.topics
      if (this.selectedType === 'ENTITY_PERSON') return this.entityStore.persons
      return []
    }
  },
  watch: {
    selectedType() { this.selectedNode = '' },
    selectedNode(val) { if (val && this.selectedType) this.fetchData() }
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
      if (data.id != null) html += `<div>ID: ${data.id}</div><hr class=\"border-gray-300 my-2\"/>`
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
      const tooltip = cont.append('div').attr('class','tooltip hidden absolute bg-white p-2 rounded-lg shadow-lg text-sm text-gray-800')
      const w = this.$refs.chart.clientWidth, h = this.$refs.chart.clientHeight
      const types = [...new Set(this.nodes.map(d => d.type))]
      const color = d3.scaleOrdinal(d3.schemeCategory10).domain(types)
      // Legend with icons
      const legend = svg.append('g').attr('class','legend')
      types.forEach((t,i) => {
        const g = legend.append('g').attr('transform', `translate(20, ${20 + i * 24})`)
        g.append('path')
          .attr('d', iconPaths[t] || '')
          .attr('fill', color(t))
          .attr('transform', 'translate(0,0) scale(0.7)')
        g.append('text')
          .attr('x', 20)
          .attr('y', 8)
          .attr('font-size','12px')
          .attr('fill','#333')
          .text(t)
      })
      const sim = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(200).strength(1))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('collision', d3.forceCollide().radius(r+2))
      const ego = this.nodes.find(n => n.id === this.selectedNode)
      if (ego) { ego.fx = w/2; ego.fy = h/2 }
      const link = svg.append('g')
        .selectAll('line').data(this.links).enter().append('line')
        .attr('stroke','#999').attr('stroke-opacity',0.6)
        .attr('stroke-width', d=>Math.sqrt(d.value||1)*3)
        .on('mouseover',(e,d)=>{d3.select(e.currentTarget).attr('stroke','#f00').attr('stroke-opacity',1);tooltip.html(this.formatTooltip(d)).classed('hidden',false)})
        .on('mousemove', e=>tooltip.style('left',e.pageX+10+'px').style('top',e.pageY+10+'px'))
        .on('mouseout',e=>{d3.select(e.currentTarget).attr('stroke','#999').attr('stroke-opacity',0.6);tooltip.classed('hidden',true)})
      const nodeG = svg.append('g').selectAll('g').data(this.nodes).enter().append('g')
        .call(d3.drag()
          .on('start',(e,d)=>{if(!e.active)sim.alphaTarget(0.3).restart();d.fx=d.x;d.fy=d.y})
          .on('drag',(e,d)=>{d.fx=e.x;d.fy=e.y})
          .on('end',(e,d)=>{if(!e.active)sim.alphaTarget(0);if(d.id!==this.selectedNode){d.fx=null;d.fy=null}}))
      nodeG.append('circle')
        .attr('r',d=>d.id===this.selectedNode?r*1.5:r)
        .attr('fill',d=>color(d.type))
        .attr('stroke','#fff').attr('stroke-width',1)
      nodeG.append('path')
        .attr('d',d=>iconPaths[d.type]||'')
        .attr('fill','#fff')
        .attr('transform','translate(-8,-8) scale(0.7)')
      nodeG.on('mouseover',(e,d)=>{d3.select(e.currentTarget).select('circle').attr('stroke','#000').attr('stroke-width',2);tooltip.html(this.formatTooltip(d)).classed('hidden',false)})
             .on('mousemove',e=>tooltip.style('left',e.pageX+10+'px').style('top',e.pageY+10+'px'))
             .on('mouseout',e=>{d3.select(e.currentTarget).select('circle').attr('stroke','#fff').attr('stroke-width',1);tooltip.classed('hidden',true)})
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
.tooltip.hidden { display: none; }
.tooltip.absolute { position: absolute; pointer-events: none; }
</style>
