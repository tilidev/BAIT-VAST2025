<template>
  <div class="w-full h-full relative">
    <div ref="geoJsonMapContainer" class="w-full h-full"></div>
    <div class="absolute top-2 right-2 z-10">
      <button @mouseover="showHelp = true" @mouseleave="showHelp = false" class="p-1.5 bg-white/80 rounded-full shadow-md hover:bg-white focus:outline-none transition-colors duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
      <transition name="fade">
        <div v-if="showHelp" class="absolute right-0 mt-2 w-72 p-4 bg-white rounded-xl shadow-2xl border border-gray-200 text-sm text-gray-800">
          <p class="font-bold text-lg mb-3 text-gray-900">Map Interactions</p>
          <ul class="space-y-3">
            <li class="flex items-center">
              <svg class="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L8 9l11 4-5 2zm0 0l5 5M7.5 8.5A2.5 2.5 0 0110 6v0a2.5 2.5 0 012.5 2.5v0" /></svg>
              <div><span class="font-semibold">Hover</span> to see details of regions and data points.</div>
            </li>
            <li class="flex items-center">
              <svg class="h-5 w-5 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              <div><span class="font-semibold">Right-click & Drag</span> to select and filter data points.</div>
            </li>
            <li class="flex items-center">
              <svg class="h-5 w-5 text-purple-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10l-2 2m2-2l2 2" /></svg>
              <div><span class="font-semibold">Scroll/Pan</span> to zoom and navigate the map.</div>
            </li>
          </ul>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useEntityStore } from '../stores/entityStore';
import { useLinkingStore, FilterType } from '../stores/linkingStore';
import { useMapStore } from '../stores/mapStore';
import { mapState } from 'pinia';
import { toRaw } from 'vue';
import { zoneColors } from '../utils/colors';

export default {
  data() {
    return {
      FilterType,
      showHelp: false,
      width: 0,
      height: 0,
      projection: null,
      path: null,
      resizeObserver: null,
      svg: null,
      g: null,
      zoom: null,
      brush: null,
      isBrushing: false,
      regionColors: {
        Island: '#2cae66',
        'Ecological Preserve': '#a1d99b',
        'Fishing Ground': '#9ecae1',
        default: '#e5e7eb',
      },
      zoneColors,
    };
  },

  watch: {
    'linkingStore.hoverHighlights': {
      handler() { this.drawPlaces(); },
      deep: true,
    },
    activeFilters: {
      handler() { this.drawPlaces(); },
      deep: true,
    },
    excludedFilters: {
      handler() { this.drawPlaces(); },
      deep: true,
    },
    width() { this.draw(); },
    height() { this.draw(); },
    'mapStore.features': {
      handler() { this.draw(); },
      deep: true,
    },
  },

  computed: {
    ...mapState(useEntityStore, ['places']),
    ...mapState(useLinkingStore, ['activeFilters', 'excludedFilters']),
    mapStore() { return useMapStore(); },
    linkingStore() { return useLinkingStore(); },
    highlightedPlaceIds() {
      return this.linkingStore.hoverHighlights.filter(h => h.type === 'place').map(h => h.value);
    },
    highlightedTrips() {
      return this.linkingStore.hoverHighlights.filter(h => h.type === 'trip').map(h => h.value);
    },
  },

  mounted() {
    this.resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        this.width = width;
        this.height = height;
      }
    });
    this.resizeObserver.observe(this.$refs.geoJsonMapContainer);

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition')
      .style('z-index', '50');

    this.draw();
  },

  beforeUnmount() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.tooltip) this.tooltip.remove();
    if (this.svg) this.svg.remove();
  },

  methods: {
    draw() {
      if (!this.width || !this.height || !this.mapStore.features.length) return;
      if (this.svg) this.svg.remove();

      this.svg = d3.select(this.$refs.geoJsonMapContainer)
        .append('svg')
        .attr('width', this.width)
        .attr('height', this.height)
        .attr('class', 'rounded-lg shadow-md border')
        .on('contextmenu', event => event.preventDefault());

      this.projection = d3.geoIdentity().reflectY(true).fitSize([this.width, this.height], {
        type: 'FeatureCollection',
        features: this.mapStore.features,
      });
      this.path = d3.geoPath().projection(this.projection);

      this.setupBrush();
      this.g = this.svg.append('g');

      this.renderMapFeatures();
      this.setupZoom();
    },

    renderMapFeatures() {
      const regionColors = this.regionColors;
      const tooltip = this.tooltip;

      // Polygons
      this.g.append('g')
        .selectAll('path')
        .data(this.mapStore.features.filter(d => d.geometry.type === 'Polygon'))
        .enter().append('path')
        .attr('d', this.path)
        .attr('fill', d => regionColors[d.properties.Kind] || regionColors.default)
        .attr('fill-opacity', d =>
          ['Fishing Ground', 'Ecological Preserve'].includes(d.properties.Kind) ? 0.2 : 0.7
        )
        .attr('stroke', '#1f2937')
        .attr('stroke-opacity', d =>
          ['Fishing Ground', 'Ecological Preserve'].includes(d.properties.Kind) ? 0.2 : 0.7
        )
        .attr('stroke-width', 1.2)
        .on('mouseover', (e, d) => {
          if (this.isBrushing) return;
          d3.select(e.currentTarget).attr('fill', '#fde68a');
          tooltip.classed('hidden', false)
            .html(`<div class="font-semibold text-blue-700">${d.properties.Name}</div>
                   <div>Kind: ${d.properties.Kind}</div>
                   <div>Activities: ${d.properties.Activities?.join(', ') || 'None'}</div>
                   ${d.properties.fish_species_present ? `<div>Fish: ${d.properties.fish_species_present.join(', ')}</div>` : ''}`);
        })
        .on('mousemove', e => tooltip.style('left', `${e.pageX+10}px`).style('top', `${e.pageY-28}px`))
        .on('mouseout', (e, d) => {
          if (this.isBrushing) return;
          d3.select(e.currentTarget).attr('fill', regionColors[d.properties.Kind] || regionColors.default);
          tooltip.classed('hidden', true);
        })
        .on('mousedown', this.forwardEventToBrush);

      // Point icons
      this.g.append('g')
        .selectAll('text')
        .data(this.mapStore.features.filter(d => d.geometry.type === 'Point'))
        .enter().append('text')
        .attr('x', d => this.projection(d.geometry.coordinates)[0])
        .attr('y', d => this.projection(d.geometry.coordinates)[1])
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'central')
        .text(d => d.properties.Kind === 'city' ? '📍' : '🛟')
        .attr('font-size', '16px')
        .attr('pointer-events', 'none');

      // Invisible circles for tooltip
      this.g.append('g')
        .selectAll('circle')
        .data(this.mapStore.features.filter(d => d.geometry.type === 'Point'))
        .enter().append('circle')
        .attr('cx', d => this.projection(d.geometry.coordinates)[0])
        .attr('cy', d => this.projection(d.geometry.coordinates)[1])
        .attr('r', d => 6) // unchanged behavior
        .attr('opacity', 0)
        .on('mouseover', (e, d) => {
          if (this.isBrushing) return;
          tooltip.classed('hidden', false)
            .html(`<div class="font-semibold text-blue-700">${d.properties.Name}</div>
                   <div>Type: ${d.properties.Kind}</div>
                   <div>Activities: ${d.properties.Activities?.join(', ') || 'None'}</div>`);
        })
        .on('mousemove', e => tooltip.style('left', `${e.pageX+10}px`).style('top', `${e.pageY-28}px`))
        .on('mouseout', () => { if (!this.isBrushing) tooltip.classed('hidden', true); })
        .on('mousedown', this.forwardEventToBrush);

      // Draw dynamic places
      this.drawPlaces();
    },

    setupZoom() {
      this.zoom = d3.zoom()
        .scaleExtent([1, 8])
        .filter(e => !e.ctrlKey && e.button === 0)
        .on('zoom', (event) => {
          const { transform } = event;
          const k = transform.k;

          this.g.attr('transform', transform);

          // Counter-scale circles
          this.g.selectAll('circle')
            .attr('r', 6 / k)
            .attr('stroke-width', d => {
              const isHighlighted = this.linkingStore.highlightedPlaceIds.includes(d.id)
                || (this.linkingStore.highlightedTrips.length > 0
                    && d.trip_ids?.some(id => this.linkingStore.highlightedTrips.includes(id)));
              return (isHighlighted ? 2 : 0) / k;
            });

          // Counter-scale point icons
          this.g.selectAll('text')
            .attr('font-size', `${16 / k}px`);
        });

      this.svg.call(this.zoom);
    },

    setupBrush() {
      this.brush = d3.brush()
        .extent([[0, 0], [this.width, this.height]])
        .filter(e => e.button === 2 || (e.ctrlKey && e.button === 0))
        .on('start', () => {
          this.isBrushing = true;
          this.tooltip.classed('hidden', true);
        })
        .on('end', ({ selection }) => {
          this.isBrushing = false;
          if (selection) this.handleBrushSelection(selection);
          else this.linkingStore.setFilters(this.FilterType.PLACE, []);
        });

      this.svg.append('g')
        .attr('class', 'brush')
        .call(this.brush);
    },

    handleBrushSelection(selection) {
      const [[x0, y0], [x1, y1]] = selection;
      const allPlaces = toRaw(this.places).filter(p => p.lon!=null&&p.lat!=null);
      const currentTransform = d3.zoomTransform(this.g.node());
      const selectedPlaces = [];
      allPlaces.forEach(place => {
        const [px,py] = this.projection([place.lat,place.lon]);
        const [tx,ty] = currentTransform.apply([px,py]);
        if (tx>=x0&&tx<=x1&&ty>=y0&&ty<=y1) selectedPlaces.push(place.name);
      });
      this.linkingStore.setFilters(this.FilterType.PLACE, selectedPlaces);
    },

    forwardEventToBrush(e) {
      const brushEl = this.svg.select('.brush').node();
      if (!brushEl) return;
      const m = e;
      const newE = new MouseEvent('mousedown', {
        bubbles: true, cancelable: true, view: window,
        clientX: m.clientX, clientY: m.clientY,
        pageX: m.pageX, pageY: m.pageY,
        ctrlKey: m.ctrlKey, button: m.button, buttons: m.buttons,
        screenX: m.screenX, screenY: m.screenY
      });
      brushEl.dispatchEvent(newE);
    },

    drawPlaces() {
      if (!this.g||!this.projection||!this.places) return;
      // keep marker sizing consistent with zoom
      const { k = 1 } = d3.zoomTransform(this.g.node());
      const { highlightedPlaceIds, highlightedTrips } = this;
      const tooltip = this.tooltip;
      let allPlaces = toRaw(this.places).filter(p=>p.lon!=null&&p.lat!=null);
      const activeFilters = this.activeFilters;
      const excludedFilters = this.excludedFilters;
      const hasFilters = activeFilters.length > 0 || excludedFilters.length > 0;
      if (hasFilters) allPlaces = allPlaces.filter(d => {
        const passesActive = activeFilters.length === 0 || activeFilters.every(f => {
          if (!d.id) return false;
          if (f.type === 'island') return this.mapStore.getParentFeatureByPlaceId(d.id) === f.value;
          if (f.type === 'zone') return d.zone === f.value;
          if (f.type === 'in_graph') return Array.isArray(d.in_graph) && d.in_graph.includes(f.value);
          if (f.type === 'place') return d.name === f.value;
          return true; // Ignore other filter types for now
        });
        const passesExcl = excludedFilters.length === 0 || !excludedFilters.some(f => {
          if (!d.id) return false;
          if (f.type==='island') return this.mapStore.getParentFeatureByPlaceId(d.id)===f.value;
          if (f.type==='zone') return d.zone===f.value;
          if (f.type === 'in_graph') return Array.isArray(d.in_graph) && d.in_graph.includes(f.value);
          return false;
        });
        return passesActive && passesExcl;
      });

      if (this.placesLayer) this.placesLayer.remove();
      this.placesLayer = this.g.append('g').attr('class','places-layer');

      const circles = this.placesLayer.selectAll('circle').data(allPlaces, d=>d.id);
      circles.exit().remove();
      circles.enter().append('circle').merge(circles)
        .attr('cx', d=>this.projection([d.lat,d.lon])[0])
        .attr('cy', d=>this.projection([d.lat,d.lon])[1])
        // base radius 6px, stroke 2px if highlighted
        .attr('r', 6 / k)
        .attr('r',  d=>{
          const highlighted = this.highlightedPlaceIds.includes(d.id)
            || (this.highlightedTrips.length>0&&d.trip_ids?.some(id=>this.highlightedTrips.includes(id)));
          return (highlighted?10:6) / k;
        })
        .attr('fill', d=>this.zoneColors[d.zone]||this.zoneColors.default)
        .attr('stroke', '#ef4444')
        .attr('stroke-width', d=>{
          const highlighted = this.highlightedPlaceIds.includes(d.id)
            || (this.highlightedTrips.length>0&&d.trip_ids?.some(id=>this.highlightedTrips.includes(id)));
          return (highlighted?4:0) / k;
        })
        .style('opacity', d => {
          const highlighted = this.highlightedPlaceIds.includes(d.id)
            || (this.highlightedTrips.length>0&&d.trip_ids?.some(id=>this.highlightedTrips.includes(id)));
          const hasHighlight = this.highlightedPlaceIds.length>0||this.highlightedTrips.length>0;
          return hasHighlight ? (highlighted?1:0.1) : 1;
        })
        .on('mouseover', (e,d)=>{ if (!this.isBrushing) {
          this.linkingStore.setHoverHighlights([{ type: 'place', value: d.id }]);
          tooltip.classed('hidden',false)
            .html(`<div class="font-semibold text-blue-700">${d.name||'Unknown Place'}</div>
                   <div>Zone: ${d.zone||'N/A'}</div>
                   <div>Detail: ${d.zone_detail||'N/A'}</div>
                   ${d.in_graph?.length?`<div>Graph Links: ${d.in_graph.join(', ')}</div>`:''}`);
        }})
        .on('mousemove', e=>{ if (!this.isBrushing) tooltip.style('left',`${e.pageX+10}px`).style('top',`${e.pageY-28}px`); })
        .on('mouseout', ()=>{ if (!this.isBrushing) {
          this.linkingStore.setHoverHighlights([]);
          tooltip.classed('hidden',true);
        }})
        .on('mousedown', this.forwardEventToBrush);
    },
  }
};
</script>

<style scoped>
.brush .selection {
  fill: rgba(100, 100, 100, 0.3);
  stroke: #fff;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
