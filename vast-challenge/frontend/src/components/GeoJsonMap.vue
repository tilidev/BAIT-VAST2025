<template>
  <div>
    <div id="svg"></div>
  </div>
</template>

<script>
import { defineComponent } from 'vue';
import * as d3 from 'd3'

export default defineComponent({
  data() {
    return {
      width: 900,
      height: 900,
      geojson: null,
      projection: null,
      path: null,
      colorScale: {
        "Island": "#8dd3c7",
        "Ecological Preserve": "#a1d99b",
        "Fishing Ground": "#9ecae1",
        "default": "#e5e7eb"
      }
    };
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

        this.draw("All");
      })
      .catch(err => console.error("Failed to load geojson:", err));
  },
  methods: {
    draw(kindFilter = "All") {
      const svg = this.svg;
      const tooltip = this.tooltip;
      const projection = this.projection;
      const path = this.path;
      const colorScale = this.colorScale;

      svg.selectAll("*").remove();

      // Regions
      svg.append("g")
        .selectAll("path")
        .data(this.geojson.features.filter(d =>
          d.geometry.type === "Polygon" &&
          (kindFilter === "All" || d.properties.Kind === kindFilter)
        ))
        .enter()
        .append("path")
        .attr("d", path)
        .attr("fill", d => colorScale[d.properties.Kind] || colorScale["default"])
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
          d3.select(this).attr("fill", colorScale[d.properties.Kind] || colorScale["default"]);
          tooltip.classed("hidden", true);
        });

      // Fish Icons
      svg.append("g")
        .selectAll("text")
        .data(this.geojson.features.filter(d => d.properties.Kind === "Fishing Ground"))
        .enter()
        .append("text")
        .attr("x", d => projection(d.geometry.coordinates || d.geometry?.coordinates[0][0])[0])
        .attr("y", d => projection(d.geometry.coordinates || d.geometry?.coordinates[0][0])[1])
        .attr("font-size", "20px")
        .text("🐟");

      // Cities / Buoys
      svg.append("g")
        .selectAll("circle")
        .data(this.geojson.features.filter(d => d.geometry.type === "Point"))
        .enter()
        .append("circle")
        .attr("cx", d => projection(d.geometry.coordinates)[0])
        .attr("cy", d => projection(d.geometry.coordinates)[1])
        .attr("r", 6)
        .attr("fill", d => d.properties.Kind === "city" ? "#ef4444" : "#3b82f6")
        .attr("stroke", "#000")
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
    }
  }
})
</script>
