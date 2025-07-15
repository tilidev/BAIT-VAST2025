<template>
  <div class="h-full flex flex-col">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Ego Network</h3>
    <div ref="chart" class="flex-1 relative w-full h-full">
      <div v-if="!selectedNode && !currentlyRenderedInDOM" class="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">
        Select a node to view its ego network
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import { useEntityStore } from '../stores/entityStore'
import { useLinkingStore } from '../stores/linkingStore'

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
      nodes: [],
      links: [],
      entityStore: useEntityStore(),
      linkingStore: useLinkingStore(),
      ro: null,
      resizeTimeout: null,
      currentlyRenderedInDOM: false
    }
  },
  computed: {
    selectedNode() {
      return this.linkingStore.selectedPerson || this.linkingStore.selectedTopic
    },
    selectedType() {
      if (this.linkingStore.selectedPerson) return 'ENTITY_PERSON'
      if (this.linkingStore.selectedTopic) return 'TOPIC'
      return ''
    },
    filterValue() {
      // for now we only support one filter value
      return this.linkingStore.selectedInGraphs.length > 0 ? this.linkingStore.selectedInGraphs[0] : 'all'
    }
  },
  watch: {
    selectedNode(val) { if (val && this.selectedType) this.fetchData() },
    filterValue() { if (this.nodes.length) this.renderChart(false) }
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
      if (data.id != null) html += `<p><strong>ID: ${String(data.id).replace(/_/g, '_​')}</strong></div>`
      if (data.type != null) html += `<div>Type: ${data.type}</div><hr class="border-gray-300 my-2"/>`
      for (const [k, v] of Object.entries(data)) {
        if (skip.has(k) || k === 'id' || k === 'type') continue
        // prepare value with word-break helpers
        let display = Array.isArray(v)
          ? v.join(', ')
          : (typeof v === 'number' ? v.toFixed(2) : String(v))
        // insert zero-width spaces after underscores to allow breaking
        display = display.replace(/_/g, '_​')
        html += `<div class="mb-1"><span class="font-semibold">${k}:</span> ${display}</div>`
      }
      return html
    },
    groupNodesByTopic() {
      if (this.selectedType !== 'ENTITY_PERSON') return {}
      
      const topicGroups = {}
      this.nodes.forEach(node => {
        if (node.type === 'TOPIC') {
          if (!topicGroups[node.id]) {
            topicGroups[node.id] = {
              topic: node,
              relatedNodes: []
            }
          }
        }
      })

      // Find nodes connected to each topic through links
      this.links.forEach(link => {
        const sourceNode = this.nodes.find(n => n.id === link.source.id || n.id === link.source)
        const targetNode = this.nodes.find(n => n.id === link.target.id || n.id === link.target)
        
        if (sourceNode?.type === 'TOPIC' && targetNode && targetNode.type !== 'TOPIC' && targetNode.id !== this.selectedNode) {
          if (topicGroups[sourceNode.id]) {
            topicGroups[sourceNode.id].relatedNodes.push(targetNode)
          }
        } else if (targetNode?.type === 'TOPIC' && sourceNode && sourceNode.type !== 'TOPIC' && sourceNode.id !== this.selectedNode) {
          if (topicGroups[targetNode.id]) {
            topicGroups[targetNode.id].relatedNodes.push(sourceNode)
          }
        }
      })

      return topicGroups
    },
    computeConvexHull(points) {
      if (points.length < 3) return points
      
      // Graham scan algorithm for convex hull
      function cross(O, A, B) {
        return (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x)
      }

      points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x)
      
      const lower = []
      for (let i = 0; i < points.length; i++) {
        while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], points[i]) <= 0) {
          lower.pop()
        }
        lower.push(points[i])
      }

      const upper = []
      for (let i = points.length - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], points[i]) <= 0) {
          upper.pop()
        }
        upper.push(points[i])
      }

      upper.pop()
      lower.pop()
      return lower.concat(upper)
    },
    drawTopicGroups(svg, topicGroups) {
      const padding = 30
      
      Object.entries(topicGroups).forEach(([topicId, group]) => {
        if (group.relatedNodes.length === 0) return
        
        const allNodes = [group.topic, ...group.relatedNodes]
        const points = allNodes.map(node => ({ x: node.x, y: node.y }))
        
        if (points.length < 2) return
        
        if (points.length === 2) {
          // Draw line between two points with padding
          const [p1, p2] = points
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const length = Math.sqrt(dx * dx + dy * dy)
          const unitX = dx / length
          const unitY = dy / length
          const perpX = -unitY
          const perpY = unitX
          
          const hull = [
            { x: p1.x + perpX * padding, y: p1.y + perpY * padding },
            { x: p2.x + perpX * padding, y: p2.y + perpY * padding },
            { x: p2.x - perpX * padding, y: p2.y - perpY * padding },
            { x: p1.x - perpX * padding, y: p1.y - perpY * padding }
          ]
          
          this.drawHull(svg, hull, group.topic.id)
        } else {
          // Add padding to points
          const center = {
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length
          }
          
          const paddedPoints = points.map(p => {
            const dx = p.x - center.x
            const dy = p.y - center.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const scale = distance === 0 ? 1 : (distance + padding) / distance
            return {
              x: center.x + dx * scale,
              y: center.y + dy * scale
            }
          })
          
          const hull = this.computeConvexHull(paddedPoints)
          this.drawHull(svg, hull, group.topic.id)
        }
      })
    },
    drawHull(svg, hull, topicId) {
      const types = [...new Set(this.nodes.map(d => d.type))]
      const color = d3.scaleOrdinal(d3.schemeCategory10).domain(types)
      const topicColor = color('TOPIC')
      
      const line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinalClosed.tension(0.3))
      
      svg.append('path')
        .datum(hull)
        .attr('class', 'topic-hull')
        .attr('d', line)
        .attr('fill', topicColor)  
        .attr('fill-opacity', 0.1)
        .attr('stroke', topicColor)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-dasharray', '5,5')
        .style('pointer-events', 'none')
    },
    renderChart(reset_positions=true) {
      const r = 16
      const chartEl = this.$refs.chart
      d3.select(chartEl).selectAll('*').remove()

      // Reset node simulation state for fresh layout
      if (reset_positions) {
        this.nodes.forEach(d => {
          delete d.x; delete d.y; delete d.vx; delete d.vy; delete d.fx; delete d.fy
        })
      }

      const cont = d3.select(chartEl)
      const svg = cont.append('svg').attr('width','100%').attr('height','100%')
      const tooltip = cont.append('div')
        .attr('class','tooltip hidden absolute bg-white p-2 rounded-lg shadow-lg text-sm text-gray-800')
        .style('max-width','600px')
      const w = chartEl.clientWidth, h = chartEl.clientHeight
      const types = [...new Set(this.nodes.map(d => d.type))]
      const color = d3.scaleOrdinal(d3.schemeCategory10).domain(types)

      // Legend with PrimeIcons
      const legend = svg.append('g').attr('class','legend')
      types.forEach((t,i) => {
        const g = legend.append('g').attr('transform', `translate(20, ${20 + i * 24})`)
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
      // spawn nodes with strategic positioning
      if (reset_positions) {
        if (this.selectedType === 'ENTITY_PERSON') {
          // Group-based positioning for person ego networks
          const topicGroups = this.groupNodesByTopic()
          const topics = Object.keys(topicGroups)
          const baseRadius = Math.min(w, h) * 0.25
          
          // Position topic nodes in a circle around the ego
          topics.forEach((topicId, index) => {
            const angle = (index / topics.length) * 2 * Math.PI
            const topic = topicGroups[topicId].topic
            topic.x = w/2 + Math.cos(angle) * baseRadius
            topic.y = h/2 + Math.sin(angle) * baseRadius
            
            // Position related nodes around their topic
            const relatedNodes = topicGroups[topicId].relatedNodes
            relatedNodes.forEach((node, nodeIndex) => {
              node.x = w/2 + (topic.x - w/2)/2
              node.y = h/2 + (topic.y - h/2)/2
            })
          }) 
        }
        }
      const sim = d3.forceSimulation(this.nodes)
        .force('link', d3.forceLink(this.links).id(d => d.id).distance(Math.min(w,h)*0.225).strength(1.1))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('collision', d3.forceCollide().radius(r+3))

      // Add topic grouping forces for person ego networks
      if (this.selectedType === 'ENTITY_PERSON') {
        const topicGroups = this.groupNodesByTopic()
        
        // Create attraction forces within topic groups
        Object.values(topicGroups).forEach(group => {
          if (group.relatedNodes.length === 0) return
          
          const allNodesInGroup = [group.topic, ...group.relatedNodes]
          
          // Use current topic position, not initial position
          const topicNode = group.topic
          
          // Add attraction between nodes in the same group using forceLink instead of forceCenter
          const groupLinks = []
          
          // Connect all nodes in group to the topic node (star pattern)
          group.relatedNodes.forEach(node => {
            groupLinks.push({
              source: topicNode.id,
              target: node.id
            })
          })
          
          if (groupLinks.length > 0) {
            sim.force(`group-link-${group.topic.id}`, 
              d3.forceLink(groupLinks)
                .id(d => d.id)
                .distance(60)
                .strength(0.5))
          }
        })
      }

      const ego = this.nodes.find(n=>n.id===this.selectedNode)
      if (ego) { ego.fx = w/2; ego.fy = h/2 }

      const link = svg.append('g').selectAll('line').data(this.links).enter().append('line')
        .attr('stroke','#999').attr('stroke-opacity',0.6)
        .attr('stroke-width', d => Math.sqrt(d.value||1)*3)
        .attr('opacity', d => (this.filterValue==='all'||d.in_graph.includes(this.filterValue))?1:0.1)
        .on('mouseover', (e,d) => {
          d3.select(e.currentTarget).attr('stroke','#f00').attr('stroke-opacity',1)
          tooltip.html(this.formatTooltip(d)).classed('hidden',false)
        })
        .on('mousemove', event => {
          const [mx, my] = d3.pointer(event, chartEl)
          const tt = tooltip.node()

          const spaceRight = w - mx - 12
          const spaceLeft  = mx - 12
          let useLeft = false
          let allowedW = Math.min(600, spaceRight)
          if (spaceRight < tt.offsetWidth && spaceLeft > spaceRight) {
            useLeft = true
            allowedW = Math.min(600, spaceLeft)
          }
          tooltip.style('max-width', allowedW + 'px')

          const ttW = tt.offsetWidth, ttH = tt.offsetHeight
          let x = useLeft ? mx - ttW - 10 : mx + 10
          let y = my + 10
          if (y + ttH > h) y = my - ttH - 10

          tooltip.style('left', x + 'px').style('top', y + 'px')
        })
        .on('mouseout', e => {
          d3.select(e.currentTarget).attr('stroke','#999').attr('stroke-opacity',0.6)
          tooltip.classed('hidden',true)
        })

      const nodeG = svg.append('g').selectAll('g').data(this.nodes).enter().append('g')
        .call(d3.drag()
          .on('start', (e,d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e,d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e,d) => { if (!e.active) sim.alphaTarget(0); if (d.id !== this.selectedNode) { d.fx = null; d.fy = null } }))

      nodeG.append('circle')
        .attr('r', d => d.id === this.selectedNode ? r*1.5 : r)
        .attr('fill', d => color(d.type))
        .attr('stroke','#fff').attr('stroke-width',1)
        .attr('opacity', d => (this.filterValue==='all'||d.in_graph.includes(this.filterValue))?1:0.1)

      nodeG.append('foreignObject')
        .attr('width', 24).attr('height', 24)
        .attr('x', -8).attr('y', -14)
        .append('xhtml:div')
        .html(d => `<i class=\"${iconClass[d.type]} text-lg\" style=\"color: #fff\"></i>`)

      nodeG.on('mouseover', (e,d) => {
        d3.select(e.currentTarget).select('circle').attr('stroke','#000').attr('stroke-width',2)
        tooltip.html(this.formatTooltip(d)).classed('hidden',false)
      })
      .on('mousemove', event => {
        const [mx, my] = d3.pointer(event, chartEl)
        const tt = tooltip.node()

        const spaceRight = w - mx - 12
        const spaceLeft  = mx - 12
        let useLeft = false
        let allowedW = Math.min(600, spaceRight)
        if (spaceRight < tt.offsetWidth && spaceLeft > spaceRight) {
          useLeft = true
          allowedW = Math.min(600, spaceLeft)
        }
        tooltip.style('max-width', allowedW + 'px')

        const ttW = tt.offsetWidth, ttH = tt.offsetHeight
        let x = useLeft ? mx - ttW - 10 : mx + 10
        let y = my + 10
        if (y + ttH > h) y = my - ttH - 10

        tooltip.style('left', x + 'px').style('top', y + 'px')
      })
      .on('mouseout', e => {
        d3.select(e.currentTarget).select('circle').attr('stroke','#fff').attr('stroke-width',1)
        tooltip.classed('hidden',true)
      })

      sim.on('tick', () => {
        this.nodes.forEach(d => { d.x = Math.max(r, Math.min(w-r, d.x)); d.y = Math.max(r, Math.min(h-r, d.y)) })
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
        
        // Redraw topic group hulls on each tick for person ego networks
        if (this.selectedType === 'ENTITY_PERSON') {
          svg.selectAll('.topic-hull').remove()
          const topicGroups = this.groupNodesByTopic()
          this.drawTopicGroups(svg, topicGroups)
        }
      })

      // Draw initial topic groups for person ego networks
      if (this.selectedType === 'ENTITY_PERSON') {
        setTimeout(() => {
          const topicGroups = this.groupNodesByTopic()
          this.drawTopicGroups(svg, topicGroups)
        }, 100)
      }

      this.currentlyRenderedInDOM = true
    }
  },
  mounted() {
    this.ro = new ResizeObserver(() => {
      if (this.resizeTimeout) clearTimeout(this.resizeTimeout)
      this.resizeTimeout = setTimeout(() => { if (this.nodes.length) this.renderChart() }, 100)
    })
    this.ro.observe(this.$refs.chart)
  },
  beforeUnmount() {
    if (this.ro) this.ro.disconnect()
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout)
  }
}
</script>

<style scoped>
@import "primeicons/primeicons.css";
.tooltip.hidden { display: none; }
.tooltip.absolute { position: absolute; pointer-events: none; }
/* enforce breaks anywhere, including underscores */
.tooltip, .tooltip * {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-all;
  hyphens: auto;
  max-width: 600px;
}
</style>
