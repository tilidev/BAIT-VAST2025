<template>
  <div>
    <div id="svg"></div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import * as d3 from 'd3'
import { useEntityStore } from '../stores/entityStore';
import { mapState } from 'pinia';
import { toRaw } from 'vue';

export default defineComponent({
  data() {
    return {
      width: 900,
      height: 900,
      geojson: null,
      projection: null,
      path: null,
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
    places(newVal, oldVal) {
      if (newVal.length > 0) {
        this.draw()
      }
    }
  },

  computed: {
    ...mapState(useEntityStore, ['places']),
  },

  mounted() {
    const container = d3.select("body")
      .append("div")
      .attr("class", "max-w-5xl mx-auto mt-10 p-6 bg-white shadow-2xl rounded-2xl");

    this.svg = container.append("svg")
      .attr("width", this.width)
      .attr("height", this.height)
      .attr("class", "rounded-lg shadow-md border");

    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
      .style("z-index", "50");

    d3.json("../../public/oceanus_map.geojson")
      .then(data => {
        this.geojson = data;
        this.projection = d3.geoIdentity().reflectY(true).fitSize([this.width, this.height], this.geojson);
        this.path = d3.geoPath().projection(this.projection);

        this.draw();
      })
      .catch(err => console.error("Failed to load geojson:", err));
  },
  methods: {
    draw() {
      const svg = this.svg;
      const tooltip = this.tooltip;
      const projection = this.projection;
      const path = this.path;
      const regionColors = this.regionColors;

      svg.selectAll("*").remove();

      // Regions
      svg.append("g")
        .selectAll("path")
        .data(this.geojson.features.filter(d =>
          d.geometry.type === "Polygon"))
        .enter()
        .append("path")
        .attr("d", path)
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
        .on("mouseout", function (event, d) {
          console.log(d)
          d3.select(this).attr("fill", regionColors[d.properties.Kind] || regionColors["default"]);
          tooltip.classed("hidden", true);
        });

      // Cities and Buoys
      svg.append("g")
        .selectAll("text")
        .data(this.geojson.features.filter(d => d.geometry.type === "Point"))
        .enter()
        .append("text")
        .attr("x", d => projection(d.geometry.coordinates)[0])
        .attr("y", d => projection(d.geometry.coordinates)[1])
        .attr("text-anchor", "middle")
        .attr("alignment-baseline", "central")
        .text(d => d.properties.Kind === "city" ? "📍" : "🛟") // City as 📍, Buoy as 🛟
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

      // Event layer 
      svg.append("g")
        .selectAll("circle")
        .data(this.geojson.features.filter(d => d.geometry.type === "Point"))
        .enter()
        .append("circle")
        .attr("cx", d => projection(d.geometry.coordinates)[0])
        .attr("cy", d => projection(d.geometry.coordinates)[1])
        .attr("r", 6)
        .attr("opacity", 0)
        .attr("stroke", "#000")
        .text(d => d.properties.Kind === "city" ? "📍" : "🛟") // City as 📍, Buoy as 🛟
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

      // Places
      svg.append("g")
        .selectAll("circle")
        .data(toRaw(this.places))
        .enter()
        .append("circle")
        .attr("cx", d => projection([d.lat, d.lon])[0])
        .attr("cy", d => projection([d.lat, d.lon])[1])
        .attr("r", 3)
        .attr("fill", d => {
          return this.zoneColors[d.zone] || this.zoneColors.default;
        })
        .attr("stroke", "#000")
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

    }
  }
})
</script>
