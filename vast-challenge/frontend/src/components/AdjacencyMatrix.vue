<template>
  <div id="svg"></div>
</template>

<script>
import * as d3 from 'd3'
import { PopoverStyle } from 'primevue';

export default {
  name: 'AdjacencyMatrix',
  props: {
    entities: Array,
    width: {
      type: Number,
      default: 800
    },
    height: {
      type: Number,
      default: 800
    },
    filter: {
      validator(values, props) {
        // The value must match one of these strings
        values.forEach(value => {
          if (['jo', 'fi', 'tr'].includes(value))
            return false
        });
        return true
      }
    }
  },
  data() {
    return {
      container: null,
      svg: null,
      tooltip: null,
    };
  },
  computed: {
    matrixData() {
      const persons = []
      const topicsSet = new Set()
      const sentiments = []

      this.entities.forEach(({ entity_id, topic_sentiments }) => {
        persons.push(entity_id)

        topic_sentiments.forEach(({ topic_id, sentiment, sentiment_recorded_in }) => {
          const matchesFilter = this.filter.length === 0 || this.filter.some(value =>
            sentiment_recorded_in.includes(value)
          )

          topicsSet.add(topic_id)
          if (!matchesFilter) return

          sentiments.push({ person: entity_id, topic: topic_id, value: sentiment })
        })
      })

      console.log(Array.from(topicsSet).sort())
      return {
        persons,
        topics: Array.from(topicsSet).sort(),
        sentiments
      }
    }

  },
  mounted() {
    this.container = d3.select("body")
      .append('div')
      .attr('class', 'matrix-container max-w-5xl mx-auto mt-10 p-6 bg-white shadow-2xl rounded-2xl');

    this.svg = this.container.append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'rounded-lg shadow-md border');

    // init tooltip
    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
      .style("z-index", "50")
      .classed("hidden", true); // Initially hide the tooltip

    this.draw();
  },
  beforeUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.container) {
      this.container.remove();
    }
  },
  methods: {
    draw() {
      const { persons, topics, sentiments } = this.matrixData;
      const margin = { top: 150, right: 0, bottom: 10, left: 150 };
      const innerWidth = this.width - margin.left - margin.right;
      const innerHeight = this.height - margin.top - margin.bottom;

      const x = d3.scaleBand().range([0, innerWidth]).domain(topics)
      const y = d3.scaleBand().range([0, innerHeight]).domain(persons)
      const color = d3.scaleLinear()
        .domain([-1, 0, 1])
        .range(["#d15f5d", "#FFFFFF", "#6a9f58"])
      // .interpolator(d3.schemeRdBu())

      const svgGroup = this.svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      svgGroup.append("rect")
        .attr("class", "background")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "#fff")

      // change devs by looking here:
      // https://iros.github.io/patternfills/sample_d3.html
      // TODO: refactor this clutter dahin wo der Pfeffer wächst
      svgGroup.append("defs")
        .append("pattern")
        .attr("id", "crosshatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 8)
        .attr("height", 8)
        .append("image")
        .attr("xlink:href", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg==")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 8)
        .attr("height", 8);

      svgGroup.append("defs")
        .append("pattern")
        .attr("id", "diagonalStripe6")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 10)
        .attr("height", 10)
        .append("image")
        .attr("xlink:href", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMCcgaGVpZ2h0PScxMCc+CiAgPHJlY3Qgd2lkdGg9JzEwJyBoZWlnaHQ9JzEwJyBmaWxsPSdibGFjaycvPgogIDxwYXRoIGQ9J00tMSwxIGwyLC0yCiAgICAgICAgICAgTTAsMTAgbDEwLC0xMAogICAgICAgICAgIE05LDExIGwyLC0yJyBzdHJva2U9J3doaXRlJyBzdHJva2Utd2lkdGg9JzEnLz4KPC9zdmc+")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 10)
        .attr("height", 10);


      const matrix = persons.map(person =>
        topics.map(topic => {
          const sentiment = sentiments.find(s => s.person === person && s.topic === topic)
          return {
            x: topic,
            y: person,
            z: sentiment?.value,
            raw: sentiment
          }
        })
      )

      // Draw rows
      const rowGroups = svgGroup.selectAll(".row")
        .data(matrix)
        .join("g")
        .attr("class", "row")
        .attr("transform", (_, i) => `translate(0,${y(persons[i])})`)

      rowGroups.selectAll(".cell")
        .data(d => d)
        .join("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.x))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => {
          if (d.z === null) return "url(#diagonalStripe6)"
          if (typeof d.z === "undefined") return "url(#crosshatch)"
          return color(d.z)
        })
        .style("stroke", "#ccc")
        .on("mouseover", (event, d) => {
          this.tooltip
            .classed("hidden", false)
            .html(`
              <div class="font-semibold text-blue-700">Person: ${d.y}</div>
              <div>Topic: ${d.x}</div>
              <div>Sentiment: ${d.z !== undefined ? d.z : 'N/A'}</div>
            `);

          // Bold row label
          d3.select(event.currentTarget.parentNode).select("text")
            .style("font-weight", "bold");

          // Bold column label
          svgGroup.selectAll(".column")
            .filter(colD => colD === d.x)
            .select("text")
            .style("font-weight", "bold");
        })
        .on("mousemove", (event) => {
          this.tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", (event, d) => {
          this.tooltip.classed("hidden", true);

          // Unbold row label
          d3.select(event.currentTarget.parentNode).select("text")
            .style("font-weight", "normal");

          // Unbold column label
          svgGroup.selectAll(".column")
            .filter(colD => colD === d.x)
            .select("text")
            .style("font-weight", "normal");
        });

      // Row labels
      rowGroups.append("text")
        .attr("x", -6)
        .attr("y", y.bandwidth() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .text((_, i) => persons[i])

      // Column labels
      const columnGroups = svgGroup.selectAll(".column")
        .data(topics)
        .join("g")
        .attr("class", "column")
        .attr("transform", d => `translate(${x(d) + x.bandwidth() / 2},0) rotate(-90)`)

      columnGroups.append("text")
        .attr("x", 6)
        .attr("y", 0)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .text(d => d)
    }
  }
}
</script>

<style scoped></style>
