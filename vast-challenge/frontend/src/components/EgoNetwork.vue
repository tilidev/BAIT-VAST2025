<template>
  <div class="h-full flex flex-col">
    <h3 class="text-lg font-semibold mb-3 text-gray-700">Ego Network</h3>
    <div ref="chart" class="flex-1 relative w-full h-full">
      <div v-if="!selectedNode && !currentlyRenderedInDOM" class="absolute inset-0 m-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-slate-50 p-4 text-center text-gray-400">
        <i class="pi pi-share-alt text-4xl mb-4"></i>
        <p class="text-xl font-semibold">Select a node to view its ego network</p>
        <p class="text-sm mt-2">Click on a person or topic in other views to see their connections here.</p>
      </div>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3'
import { useEntityStore } from '../stores/entityStore'
import { useLinkingStore, HighlightType } from '../stores/linkingStore'

const nodeTypeToHighlightType = {
  'ENTITY_PERSON': HighlightType.PERSON,
  'TOPIC': HighlightType.TOPIC,
  'ENTITY_ORGANIZATION': HighlightType.INDUSTRY,
  'PLACE': HighlightType.PLACE,
  'PLAN': HighlightType.PLAN,
};

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
    hoveredIds() {
      return this.linkingStore.hoverHighlights.map(h => {
        if (typeof h.value === 'string') return h.value;
        return null;
      }).filter(Boolean);
    },
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
    selectedNode(val) {
      if (val && this.selectedType) {
        this.fetchData()
      } else {
        this.nodes = []
        this.links = []
        this.currentlyRenderedInDOM = false
        const chartEl = this.$refs.chart
        if (chartEl) {
          d3.select(chartEl).selectAll('svg, .tooltip').remove()
        }
      }
    },
    filterValue() { if (this.nodes.length) this.renderChart(false) },
    hoveredIds: {
      handler() { this.updateHighlights() },
      deep: true
    }
  },
  methods: {
    updateHighlights() {
      if (!this.$refs.chart) return;
      const svg = d3.select(this.$refs.chart).select('svg');
      if (svg.empty()) return;

      const self = this;

      // Highlight nodes
      svg.selectAll('.nodes-group g').select('circle')
        .transition().duration(100)
        .attr('stroke', d => self.hoveredIds.includes(d.id) ? '#000' : '#fff')
        .attr('stroke-width', d => self.hoveredIds.includes(d.id) ? 3 : 1);

      // Highlight topic hulls
      svg.selectAll('.topic-hull')
        .transition().duration(100)
        .attr('fill-opacity', function() {
            const topicId = d3.select(this).attr('data-topic-id');
            return self.hoveredIds.includes(topicId) ? 0.2 : 0.1;
        })
        .attr('stroke-opacity', function() {
            const topicId = d3.select(this).attr('data-topic-id');
            return self.hoveredIds.includes(topicId) ? 0.8 : 0.4;
        });
    },
    async fetchData() {
      const res = await fetch(`/api/ego-network?node_id=${this.selectedNode}&node_type=${this.selectedType}`)
      const data = await res.json()
      this.nodes = data.nodes
      this.links = data.edges.map(e => ({ source: e.source, target: e.target, ...e.properties }))
      this.renderChart()
    },
    formatTooltip(data) {
      const skip = new Set(['index','x','y','vx','vy','fx','fy','source','target','isCollapsed','originalCount'])
      let html = ''
      if (data.id != null) html += `<p class="font-bold text-blue-600">ID: ${String(data.id).replace(/_/g, '_​')}</div>`
      if (data.type != null) html += `<div>Type: ${data.type}</div><hr class="border-gray-300 my-2"/>`
      
      // Add collapsed edge info
      if (data.isCollapsed) {
        html += `<div class="mb-1"><span class="font-semibold text-blue-600">Collapsed Edge:</span> Represents ${data.originalCount} connections to this topic group</div><hr class="border-gray-300 my-2"/>`
      }
      
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
    collapseTopicEdges() {
      if (this.selectedType !== 'ENTITY_PERSON') return this.links
      
      const topicGroups = this.groupNodesByTopic()
      const collapsedLinks = []
      const processedTopics = new Set()
      const edgesToSkip = new Set()
      
      // First pass: identify all edges that should be collapsed and mark them for skipping
      this.links.forEach((link, index) => {
        const sourceNode = this.nodes.find(n => n.id === link.source.id || n.id === link.source)
        const targetNode = this.nodes.find(n => n.id === link.target.id || n.id === link.target)
        
        // Skip any edges involving topic nodes only for person ego networks (they won't be rendered)
        if (this.selectedType === 'ENTITY_PERSON' && (sourceNode?.type === 'TOPIC' || targetNode?.type === 'TOPIC')) {
          edgesToSkip.add(index)
          return
        }
        
        // Check if this is an edge from ego to any node in a topic group
        let topicId = null
        
        if (sourceNode?.id === this.selectedNode && targetNode) {
          // Edge from ego to any node - check if target belongs to a topic group
          topicId = Object.keys(topicGroups).find(tid => topicGroups[tid].relatedNodes.includes(targetNode))
        } else if (targetNode?.id === this.selectedNode && sourceNode) {
          // Edge from any node to ego - check if source belongs to a topic group
          topicId = Object.keys(topicGroups).find(tid => topicGroups[tid].relatedNodes.includes(sourceNode))
        }
        
        if (topicId) {
          edgesToSkip.add(index) // Mark this edge to be skipped
        }
      })
      
      // Second pass: create collapsed edges and keep non-collapsed edges
      this.links.forEach((link, index) => {
        const sourceNode = this.nodes.find(n => n.id === link.source.id || n.id === link.source)
        const targetNode = this.nodes.find(n => n.id === link.target.id || n.id === link.target)
        
        if (edgesToSkip.has(index)) {
          // This edge should be part of a collapsed edge (for non-topic nodes in person networks)
          if (this.selectedType === 'ENTITY_PERSON' && sourceNode?.type !== 'TOPIC' && targetNode?.type !== 'TOPIC') {
            let topicId = null
            
            if (sourceNode?.id === this.selectedNode && targetNode) {
              topicId = Object.keys(topicGroups).find(tid => topicGroups[tid].relatedNodes.includes(targetNode))
            } else if (targetNode?.id === this.selectedNode && sourceNode) {
              topicId = Object.keys(topicGroups).find(tid => topicGroups[tid].relatedNodes.includes(sourceNode))
            }
            
            if (topicId && !processedTopics.has(topicId)) {
              // Create a representative collapsed edge to the first node in the group
              const relatedNodes = topicGroups[topicId].relatedNodes
              if (relatedNodes.length > 0) {
                const representativeNode = relatedNodes[0] // Use first node as representative
                
                collapsedLinks.push({
                  source: this.selectedNode,
                  target: representativeNode.id,
                  ...link, // Copy all original link properties
                  isCollapsed: true,
                  originalCount: relatedNodes.length
                })
                processedTopics.add(topicId)
              }
            }
          }
          // Skip the original edge (don't add it to collapsedLinks)
        } else {
          // Keep edges that are not being collapsed (and don't involve topic nodes for person networks)
          if (this.selectedType === 'ENTITY_PERSON') {
            if (sourceNode?.type !== 'TOPIC' && targetNode?.type !== 'TOPIC') {
              collapsedLinks.push(link)
            }
          } else {
            // For non-person ego networks, keep all non-collapsed edges
            collapsedLinks.push(link)
          }
        }
      })
      
      return collapsedLinks
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
    drawTopicGroups(svg, topicGroups, tooltip, chartEl, w, h) {
      const padding = 40 // Increased padding for better visual separation
      
      Object.entries(topicGroups).forEach(([topicId, group]) => {
        if (group.relatedNodes.length === 0) return
        
        // Only use related nodes for hull calculation when topic nodes are hidden (person ego networks)
        const points = this.selectedType === 'ENTITY_PERSON' 
          ? group.relatedNodes.map(node => ({ x: node.x, y: node.y }))
          : [group.topic, ...group.relatedNodes].map(node => ({ x: node.x, y: node.y }))
        
        if (points.length < 1) return
        
        if (points.length === 1) {
          // Draw circle around single point
          const p = points[0]
          const radius = padding
          const hull = []
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * 2 * Math.PI
            hull.push({
              x: p.x + Math.cos(angle) * radius,
              y: p.y + Math.sin(angle) * radius
            })
          }
          this.drawHull(svg, hull, topicId, tooltip, chartEl, w, h)
        } else if (points.length === 2) {
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
          
          this.drawHull(svg, hull, topicId, tooltip, chartEl, w, h)
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
          this.drawHull(svg, hull, topicId, tooltip, chartEl, w, h)
        }
      })
    },
    drawHull(svg, hull, topicId, tooltip, chartEl, w, h) {
      const types = [...new Set(this.nodes.map(d => d.type))]
      const color = d3.scaleOrdinal(d3.schemeCategory10).domain(types)
      const topicColor = color('TOPIC')
      
      const line = d3.line()
        .x(d => d.x)
        .y(d => d.y)
        .curve(d3.curveCardinalClosed.tension(0.3))
      
      // Find the topic node data for tooltip
      const topicNode = this.nodes.find(n => n.id === topicId)
      
      svg.append('path')
        .datum(hull)
        .attr('class', 'topic-hull')
        .attr('data-topic-id', topicId)
        .attr('d', line)
        .attr('fill', topicColor)
        .attr('fill-opacity', 0.1)
        .attr('stroke', topicColor)
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.4)
        .attr('stroke-dasharray', '5,5')
        .style('pointer-events', 'all')
        .style('cursor', 'pointer')
        .on('mouseover', (e) => {
          d3.select(e.currentTarget)
            .attr('fill-opacity', 0.2)
            .attr('stroke-opacity', 0.8)
          if (topicNode) {
            tooltip.html(this.formatTooltip(topicNode)).classed('hidden', false)
            this.linkingStore.addHoverHighlight({ type: HighlightType.TOPIC, value: topicId })
          }
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
        .on('mouseout', (e) => {
          d3.select(e.currentTarget)
            .attr('fill-opacity', 0.1)
            .attr('stroke-opacity', 0.4)
          tooltip.classed('hidden', true)
          if (topicNode) {
            this.linkingStore.removeHoverHighlight({ type: HighlightType.TOPIC, value: topicId })
          }
        })
    },
    renderChart(reset_positions=true) {
      const r = 16
      const chartEl = this.$refs.chart
      d3.select(chartEl).selectAll('*').remove()

      // Reset node simulation state for fresh layout (only for non-topic nodes when person ego network)
      if (reset_positions) {
        const nodesToReset = this.selectedType === 'ENTITY_PERSON' 
          ? this.nodes.filter(n => n.type !== 'TOPIC')
          : this.nodes
        nodesToReset.forEach(d => {
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
          const baseRadius = Math.min(w, h) * 0.3
          
          // Position related nodes in groups around the ego (skip topic nodes)
          topics.forEach((topicId, index) => {
            const angle = (index / Math.max(topics.length - 1, 1)) * 2 * Math.PI
            const groupCenterX = w/2 + Math.cos(angle) * baseRadius
            const groupCenterY = h/2 + Math.sin(angle) * baseRadius
            
            // Position related nodes around their group center
            const relatedNodes = topicGroups[topicId].relatedNodes
            relatedNodes.forEach((node, nodeIndex) => {
              const nodeAngle = (nodeIndex / Math.max(relatedNodes.length - 1, 1)) * Math.PI / 2 // Spread within quarter circle
              const nodeRadius = 40
              node.x = groupCenterX + Math.cos(nodeAngle) * nodeRadius
              node.y = groupCenterY + Math.sin(nodeAngle) * nodeRadius
            })
          }) 
        }
      }
      const sim = d3.forceSimulation(this.selectedType === 'ENTITY_PERSON' ? this.nodes.filter(n => n.type !== 'TOPIC') : this.nodes)
      
      // Filter out links involving topic nodes for the simulation only for person ego networks
      const simulationLinks = this.selectedType === 'ENTITY_PERSON' 
        ? this.links.filter(link => {
            const sourceNode = this.nodes.find(n => n.id === link.source.id || n.id === link.source)
            const targetNode = this.nodes.find(n => n.id === link.target.id || n.id === link.target)
            return sourceNode?.type !== 'TOPIC' && targetNode?.type !== 'TOPIC'
          })
        : this.links
      
      sim.force('link', d3.forceLink(simulationLinks).id(d => d.id).distance(Math.min(w,h)*0.225).strength(1.1))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('collision', d3.forceCollide().radius(r+3))

      // Add topic grouping forces for person ego networks
      if (this.selectedType === 'ENTITY_PERSON') {
        const topicGroups = this.groupNodesByTopic()
        
        // Create attraction forces within topic groups (only for related nodes)
        Object.values(topicGroups).forEach(group => {
          if (group.relatedNodes.length <= 1) return
          
          // Add links between nodes in the same group for cohesion
          const groupLinks = []
          for (let i = 0; i < group.relatedNodes.length; i++) {
            for (let j = i + 1; j < group.relatedNodes.length; j++) {
              groupLinks.push({
                source: group.relatedNodes[i].id,
                target: group.relatedNodes[j].id
              })
            }
          }
          
          if (groupLinks.length > 0) {
            sim.force(`group-link-${group.topic.id}`, 
              d3.forceLink(groupLinks)
                .id(d => d.id)
                .distance(20)
                .strength(0.4))
          }
        })
      }

      const ego = this.nodes.find(n=>n.id===this.selectedNode)
      if (ego) { ego.fx = w/2; ego.fy = h/2 }

      // Use collapsed links for rendering but original links for simulation
      const linksToRender = this.selectedType === 'ENTITY_PERSON' ? this.collapseTopicEdges() : this.links

      const link = svg.append('g').selectAll('line').data(linksToRender).enter().append('line')
        .attr('stroke', d => d.isCollapsed ? '#2563eb' : '#999') // Blue for collapsed edges
        .attr('stroke-opacity',0.6)
        .attr('stroke-width', d => d.isCollapsed ? Math.sqrt(d.originalCount || 1) * 4 : Math.sqrt(d.value||1)*3)
        .attr('stroke-dasharray', d => d.isCollapsed ? '8,2' : 'none') // Dashed for collapsed edges
        .attr('opacity', d => (this.filterValue==='all'||d.in_graph.includes(this.filterValue))?1:0.1)
        .on('mouseover', (e,d) => {
          const originalStroke = d.isCollapsed ? '#2563eb' : '#999'
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
        .on('mouseout', (e,d) => {
          const originalStroke = d.isCollapsed ? '#2563eb' : '#999'
          d3.select(e.currentTarget).attr('stroke', originalStroke).attr('stroke-opacity',0.6)
          tooltip.classed('hidden',true)
        })

      // Draw initial topic groups for person ego networks (before nodes so hulls are behind)
      let hullsGroup = null
      if (this.selectedType === 'ENTITY_PERSON') {
        hullsGroup = svg.append('g').attr('class', 'hulls-group')
        setTimeout(() => {
          const topicGroups = this.groupNodesByTopic()
          this.drawTopicGroups(hullsGroup, topicGroups, tooltip, chartEl, w, h)
        }, 100)
      }

      const nodeG = svg.append('g').attr('class', 'nodes-group').selectAll('g').data(this.selectedType === 'ENTITY_PERSON' ? this.nodes.filter(n => n.type !== 'TOPIC') : this.nodes).enter().append('g')
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
        const highlightType = nodeTypeToHighlightType[d.type]
        if (highlightType) {
          this.linkingStore.addHoverHighlight({ type: highlightType, value: d.id })
        }
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
      .on('mouseout', (e, d) => {
        d3.select(e.currentTarget).select('circle').attr('stroke','#fff').attr('stroke-width',1)
        tooltip.classed('hidden',true)
        const highlightType = nodeTypeToHighlightType[d.type]
        if (highlightType) {
          this.linkingStore.removeHoverHighlight({ type: highlightType, value: d.id })
        }
      })

      sim.on('tick', () => {
        // Only update positions for nodes in simulation
        const nodesToUpdate = this.selectedType === 'ENTITY_PERSON' 
          ? this.nodes.filter(n => n.type !== 'TOPIC')
          : this.nodes
        nodesToUpdate.forEach(d => { 
          d.x = Math.max(r, Math.min(w-r, d.x)); 
          d.y = Math.max(r, Math.min(h-r, d.y)) 
        })
        link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
        nodeG.attr('transform', d => `translate(${d.x},${d.y})`)
        
        // Redraw topic group hulls on each tick for person ego networks
        if (this.selectedType === 'ENTITY_PERSON' && hullsGroup) {
          hullsGroup.selectAll('.topic-hull').remove()
          const topicGroups = this.groupNodesByTopic()
          this.drawTopicGroups(hullsGroup, topicGroups, tooltip, chartEl, w, h)
        }
      })

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
