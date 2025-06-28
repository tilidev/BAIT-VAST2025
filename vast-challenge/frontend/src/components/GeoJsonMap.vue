<template>
  <div ref="geoJsonMapContainer" class="w-full h-full">
    <div id="svg"></div>
  </div>
</template>

<script>
import * as d3 from 'd3';
import { useEntityStore } from '../stores/entityStore';
import { useLinkingStore } from '../stores/linkingStore';
import { useMapStore } from '../stores/mapStore'; 
import { mapState } from 'pinia';
import { toRaw } from 'vue';

export default {
  data() {
    return {
      width: 0,
      height: 0,
      projection: null,
      path: null,
      resizeObserver: null,
      regionColors: {
        "Island": "#8dd3c7",
        "Ecological Preserve": "#a1d99b",
        "Fishing Ground": "#9ecae1",
        "default": "#e5e7eb"
      },
      zoneColors: {
        "government": "#6366f1",
        "commercial": "#f59e0b",
        "residential": "#10b981",
        "industrial": "#ef4444",
        "default": "grey"
      }
    };
  },

  watch: {
    places() {
    },
    highlightedPlaces(newVal) {
      this.drawPlaces(newVal); 
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
    ...mapState(useLinkingStore, ['highlightedPlaces']),
    mapStore() {
      return useMapStore();
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

    this.svg = d3.select(this.$refs.geoJsonMapContainer).select("#svg")
      .append("svg")
      .attr("class", "rounded-lg shadow-md border");

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

      const svg = this.svg;
      const tooltip = this.tooltip;
      const regionColors = this.regionColors;

      svg.attr("width", this.width)
        .attr("height", this.height);

      this.projection = d3.geoIdentity().reflectY(true).fitSize([this.width, this.height], {
        type: "FeatureCollection",
        features: this.mapStore.features
      });
      this.path = d3.geoPath().projection(this.projection);

      svg.selectAll("*").remove(); 
      
      svg.append("g")
        .selectAll("path")
        .data(this.mapStore.features.filter(d =>
          d.geometry.type === "Polygon"))
        .enter()
        .append("path")
        .attr("d", this.path)
        .attr("fill", d => regionColors[d.properties.Kind] || regionColors["default"])
        .attr("stroke", "#1f2937")
        .attr("stroke-width", 1.2)
        .on("mouseover", function (event, d) {
          d3.select(this).attr("fill", "#fde68a");
          tooltip
            .classed("hidden", false)
            .html(`
              <div class="font-semibold text-blue-700">${d.properties.Name}</div>
              <div>Kind: ${d.properties.Kind}</div>
              <div>Activities: ${d.properties.Activities?.join(", ") || "None"}</div>
              ${d.properties.fish_species_present
                ? `<div>Fish: ${d.properties.fish_species_present.join(", ")}</div>`
                : ""}
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (event, d) => {
          d3.select(event.currentTarget).attr("fill", regionColors[d.properties.Kind] || regionColors["default"]);
          tooltip.classed("hidden", true);
        });
      
      svg.append("g")
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
        .attr("pointer-events", "none")
        .on("mouseover", function (event, d) {
          tooltip
            .classed("hidden", false)
            .html(`
              <div class="font-semibold text-blue-700">${d.properties.Name}</div>
              <div>Type: ${d.properties.Kind}</div>
              <div>Activities: ${d.properties.Activities?.join(", ") || "None"}</div>
            `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
          tooltip.classed("hidden", true);
        });
      
      svg.append("g")
        .selectAll("circle")
        .data(this.mapStore.features.filter(d => d.geometry.type === "Point"))
        .enter()
        .append("circle")
        .attr("cx", d => this.projection(d.geometry.coordinates)[0])
        .attr("cy", d => this.projection(d.geometry.coordinates)[1])
        .attr("r", 6)
        .attr("opacity", 0)
        .attr("stroke", "#000")
        .text(d => d.properties.Kind === "city" ? "📍" : "🛟") 
        .on("mouseover", function (event, d) {
          tooltip
            .classed("hidden", false)
            .html(`
          <div class="font-semibold text-blue-700">${d.properties.Name}</div>
          <div>Type: ${d.properties.Kind}</div>
          <div>Activities: ${d.properties.Activities?.join(", ") || "None"}</div>
        `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
          tooltip.classed("hidden", true);
        });

      this.drawPlaces(this.highlightedPlaces); 
    },
    drawPlaces(highlightedPlaceNames = []) {
      if (!this.svg || !this.projection || !this.places) return;

      const svg = this.svg;
      const tooltip = this.tooltip;
      const allPlaces = toRaw(this.places).filter(p => p.lon != null && p.lat != null);

      
      const filteredPlaces = allPlaces.filter(p => highlightedPlaceNames.includes(p.name));

      
      if (this.placesLayer) {
        this.placesLayer.remove();
      }

      this.placesLayer = svg.append("g")
        .attr("class", "places-layer"); 

      this.placesLayer.selectAll("circle")
        .data(filteredPlaces)
        .enter()
        .append("circle")
        .attr("cx", d => this.projection([d.lat, d.lon])[0])
        .attr("cy", d => this.projection([d.lat, d.lon])[1])
        .attr("r", 6) 
        .attr("fill", d => {
          return this.zoneColors[d.zone] || this.zoneColors.default;
        })
        .attr("stroke", "#ef4444") 
        .attr("stroke-width", 2) 
        .on("mouseover", function (event, d) {
          tooltip
            .classed("hidden", false)
            .html(`
        <div class="font-semibold text-blue-700">${d.name || "Unknown Place"}</div>
        <div>Zone: ${d.zone || "N/A"}</div>
        <div>Detail: ${d.zone_detail || "N/A"}</div>
        ${d.in_graph?.length
                ? `<div>Graph Links: ${d.in_graph.join(", ")}</div>`
                : ""}
      `);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
          tooltip.classed("hidden", true);
        });
    },
  }
}
</script>
<style scoped></style>
