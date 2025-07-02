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
import { useLinkingStore } from '../stores/linkingStore';
import { useMapStore } from '../stores/mapStore';
import { mapState } from 'pinia';
import { toRaw } from 'vue';
import { zoneColors } from '../utils/colors';


export default {
  data() {
    return {
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
        "Island": "#2cae66",
        "Ecological Preserve": "#a1d99b",
        "Fishing Ground": "#9ecae1",
        "default": "#e5e7eb"
      },
      zoneColors: zoneColors
    };
  },

  watch: {
    'linkingStore.highlightedPlaceIds': {
      handler() {
        this.drawPlaces();
      },
      deep: true,
    },
    'linkingStore.highlightedTrips': {
      handler() {
        this.drawPlaces();
      },
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
    brushedPlaces: {
      handler() { this.drawPlaces(); },
      deep: true,
    },
    width() {
      this.draw();
    },
    height() {
      this.draw();
    },
    'mapStore.features': {
      handler() {
        this.draw();
      },
      deep: true,
    },
  },

  computed: {
    ...mapState(useEntityStore, ['places']),
    ...mapState(useLinkingStore, ['brushedPlaces', 'activeFilters', 'excludedFilters']),
    mapStore() {
      return useMapStore();
    },
    linkingStore() {
      return useLinkingStore();
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

    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
      .style("z-index", "50");

    this.draw();
  },

  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.svg) {
      this.svg.remove();
    }
  },

  methods: {
    draw() {
      if (!this.width || !this.height || !this.mapStore.features.length) return;

      if (this.svg) {
        this.svg.remove();
      }

      this.svg = d3.select(this.$refs.geoJsonMapContainer)
        .append("svg")
        .attr("width", this.width)
        .attr("height", this.height)
        .attr("class", "rounded-lg shadow-md border")
        .on("contextmenu", event => event.preventDefault());

      this.projection = d3.geoIdentity().reflectY(true).fitSize([this.width, this.height], {
        type: "FeatureCollection",
        features: this.mapStore.features
      });
      this.path = d3.geoPath().projection(this.projection);

      this.setupBrush();

      this.g = this.svg.append("g");

      this.renderMapFeatures();
      this.setupZoom();
    },

    renderMapFeatures() {
      const regionColors = this.regionColors;
      const tooltip = this.tooltip;

      // Draw polygons
      this.g.append("g")
        .selectAll("path")
        .data(this.mapStore.features.filter(d => d.geometry.type === "Polygon"))
        .enter()
        .append("path")
        .attr("d", this.path)
        .attr("fill", d => regionColors[d.properties.Kind] || regionColors["default"])
        .attr("fill-opacity", d => (
          d.properties.Kind === "Fishing Ground" || d.properties.Kind === "Ecological Preserve"
            ? 0.1    // more transparent
            : 0.7
        ))
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 1.2)
        .on("mouseover", (event, d) => {
          if (this.isBrushing) return;
          d3.select(event.currentTarget).attr("fill", "#fde68a");
          tooltip.classed("hidden", false)
            .html(`<div class="font-semibold text-blue-700">${d.properties.Name}</div>
                   <div>Kind: ${d.properties.Kind}</div>
                   <div>Activities: ${d.properties.Activities?.join(", ") || "None"}</div>
                   ${d.properties.fish_species_present ? `<div>Fish: ${d.properties.fish_species_present.join(", ")}</div>` : ""}`);
        })
        .on("mousemove", (event) => {
          if (this.isBrushing) return;
          tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (event, d) => {
          if (this.isBrushing) return;
          d3.select(event.currentTarget).attr("fill", regionColors[d.properties.Kind] || regionColors["default"]);
          tooltip.classed("hidden", true);
        })
        .on("mousedown", (event) => {
          this.forwardEventToBrush(event);
        });

      // Draw point icons
      this.g.append("g")
        .selectAll("text")
        .data(this.mapStore.features.filter(d => d.geometry.type === "Point"))
        .enter()
        .append("text")
        .attr("x", d => this.projection(d.geometry.coordinates)[0])
        .attr("y", d => this.projection(d.geometry.coordinates)[1])
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        .text(d => d.properties.Kind === "city" ? "📍" : "🛟")
        .attr("font-size", "16px")
        .attr("pointer-events", "none");

      // Draw invisible circles for tooltip interaction
      this.g.append("g")
        .selectAll("circle")
        .data(this.mapStore.features.filter(d => d.geometry.type === "Point"))
        .enter()
        .append("circle")
        .attr("cx", d => this.projection(d.geometry.coordinates)[0])
        .attr("cy", d => this.projection(d.geometry.coordinates)[1])
        .attr("r", 6)
        .attr("opacity", 0)
        .on("mouseover", (event, d) => {
          if (this.isBrushing) return;
          tooltip.classed("hidden", false)
            .html(`<div class="font-semibold text-blue-700">${d.properties.Name}</div>
                   <div>Type: ${d.properties.Kind}</div>
                   <div>Activities: ${d.properties.Activities?.join(", ") || "None"}</div>`);
        })
        .on("mousemove", (event) => {
          if (this.isBrushing) return;
          tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          if (this.isBrushing) return;
          tooltip.classed("hidden", true);
        })
        .on("mousedown", (event) => {
          this.forwardEventToBrush(event);
        });

      this.drawPlaces(this.highlightedPlaces);
    },

    setupZoom() {
      this.zoom = d3.zoom()
        .scaleExtent([1, 8])
        .filter(event => !event.ctrlKey && event.button === 0)
        .on("zoom", (event) => {
          const { transform } = event;
          const k = transform.k;

          // pan & zoom the map
          this.g.attr("transform", transform);

          // counter‐scale point circles
          this.g.selectAll("circle")
            .attr("r", 6 / k)  //base radius
            .attr("stroke-width", d => {
              const isHighlighted = this.linkingStore.highlightedPlaceIds.includes(d.id)
                || (this.linkingStore.highlightedTrips.length > 0
                    && d.trip_ids?.some(id => this.linkingStore.highlightedTrips.includes(id)));
              const baseWidth = isHighlighted ? 2 : 0;
              return baseWidth / k;
            });

          this.g.selectAll("text")
            .attr("font-size", `${16 / k}px`);
        });

      this.svg.call(this.zoom);
    },

    setupBrush() {
      this.brush = d3.brush()
        .extent([[0, 0], [this.width, this.height]])
        .filter(event => event.button === 2 || (event.ctrlKey && event.button === 0)) // Brush with right-click OR Ctrl+left-click
        .on("start", () => {
          this.isBrushing = true;
          this.tooltip.classed("hidden", true);
        })
        .on("end", (event) => {
          this.isBrushing = false;
          if (event.selection) {
            this.handleBrushSelection(event.selection);
          } else {
            this.linkingStore.setBrushedPlaces([]);
          }
        });

      this.svg.append("g")
        .attr("class", "brush")
        .call(this.brush);
    },

    handleBrushSelection(selection) {
      const [[x0, y0], [x1, y1]] = selection;
      const allPlaces = toRaw(this.places).filter(p => p.lon != null && p.lat != null);
      const selectedPlaces = [];

      const currentTransform = d3.zoomTransform(this.g.node());

      allPlaces.forEach(place => {
        const [px, py] = this.projection([place.lat, place.lon]);
        const [transformedX, transformedY] = currentTransform.apply([px, py]);

        if (transformedX >= x0 && transformedX <= x1 && transformedY >= y0 && transformedY <= y1) {
          selectedPlaces.push(place.name);
        }
      });

      this.linkingStore.setBrushedPlaces(selectedPlaces);
    },

    forwardEventToBrush(event) {
      const brushEl = this.svg.select(".brush").node();
      if (!brushEl) return;

      const sourceEvent = event;
      const newMouseEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: sourceEvent.clientX,
        clientY: sourceEvent.clientY,
        pageX: sourceEvent.pageX,
        pageY: sourceEvent.pageY,
        ctrlKey: sourceEvent.ctrlKey,
        button: sourceEvent.button,
        buttons: sourceEvent.buttons,
        screenX: sourceEvent.screenX,
        screenY: sourceEvent.screenY,
      });
      brushEl.dispatchEvent(newMouseEvent);
    },

    drawPlaces() {
      if (!this.g || !this.projection || !this.places) return;

      const { highlightedPlaceIds, highlightedTrips } = this.linkingStore;
      const tooltip = this.tooltip;
      let allPlaces = toRaw(this.places).filter(p => p.lon != null && p.lat != null);
      const activeFilters = this.activeFilters;
      const excludedFilters = this.excludedFilters;
      const brushedPlaceNames = new Set(this.brushedPlaces);
      const hasFilters = activeFilters.length > 0 || brushedPlaceNames.size > 0 || excludedFilters.length > 0;

      if (hasFilters) {
        allPlaces = allPlaces.filter(d => {
          const passesActive = activeFilters.length === 0 || activeFilters.every(filter => {
            if (!d.id) return false;
            if (filter.type === 'island') {
              const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(d.id);
              return parentFeatureName === filter.value;
            } else if (filter.type === 'zone') {
              return d.zone === filter.value;
            } else if (filter.type === 'in_graph') {
              return d.in_graph && Array.isArray(d.in_graph) && d.in_graph.includes(filter.value);
            }
            return false;
          });

          const passesExclusion = excludedFilters.length === 0 || !excludedFilters.some(filter => {
            if (!d.id) return false;
            if (filter.type === 'island') {
              const parentFeatureName = this.mapStore.getParentFeatureByPlaceId(d.id);
              return parentFeatureName === filter.value;
            } else if (filter.type === 'zone') {
              return d.zone === filter.value;
            } else if (filter.type === 'in_graph') {
              return d.in_graph && Array.isArray(d.in_graph) && d.in_graph.includes(filter.value);
            }
            return false;
          });

          const passesBrush = brushedPlaceNames.size === 0 || brushedPlaceNames.has(d.name);
          return passesActive && passesBrush && passesExclusion;
        });
      }

      if (this.placesLayer) {
        this.placesLayer.remove();
      }

      this.placesLayer = this.g.append("g")
        .attr("class", "places-layer");

      const circles = this.placesLayer.selectAll("circle")
        .data(allPlaces, d => d.id);

      circles.exit().remove();

      circles.enter()
        .append("circle")
        .merge(circles)
        .attr("cx", d => this.projection([d.lat, d.lon])[0])
        .attr("cy", d => this.projection([d.lat, d.lon])[1])
        .attr("r", 6)
        .attr("fill", d => this.zoneColors[d.zone] || this.zoneColors.default)
        .attr("stroke", "#ef4444")
        .attr("stroke-width", d => {
          const isHighlighted = highlightedPlaceIds.includes(d.id) ||
            (highlightedTrips.length > 0 && d.trip_ids?.some(tripId => highlightedTrips.includes(tripId)));
          return isHighlighted ? 2 : 0;
        })
        .style("opacity", d => {
          const isHighlighted = highlightedPlaceIds.includes(d.id) ||
            (highlightedTrips.length > 0 && d.trip_ids?.some(tripId => highlightedTrips.includes(tripId)));

          const hasHighlights = highlightedPlaceIds.length > 0 || highlightedTrips.length > 0;

          if (hasHighlights) {
            return isHighlighted ? 1.0 : 0.1;
          }

          return 1.0;
        })
        .on("mouseover", (event, d) => {
          if (this.isBrushing) return;
          this.linkingStore.setHoveredPlaceId(d.id);
          tooltip.classed("hidden", false)
            .html(`<div class="font-semibold text-blue-700">${d.name || "Unknown Place"}</div>
                   <div>Zone: ${d.zone || "N/A"}</div>
                   <div>Detail: ${d.zone_detail || "N/A"}</div>
                   ${d.in_graph?.length ? `<div>Graph Links: ${d.in_graph.join(", ")}</div>` : ""}`);
        })
        .on("mousemove", (event) => {
          if (this.isBrushing) return;
          tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
          if (this.isBrushing) return;
          this.linkingStore.setHoveredPlaceId(null);
          tooltip.classed("hidden", true);
        })
        .on("mousedown", (event) => {
          this.forwardEventToBrush(event);
        });
    },
  }
}
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
