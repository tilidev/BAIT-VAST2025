<template>
  <div id="svg"></div>
</template>

<script>
import * as d3 from 'd3'

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
    }
  },
  computed: {
    matrixData() {
      const persons = []
      const topicsSet = new Set()
      const sentiments = []

      this.entities.forEach(({ entity_id, topic_sentiments }) => {
        persons.push(entity_id)

        topic_sentiments.forEach(({ topic_id, sentiment }) => {
          topicsSet.add(topic_id)
          sentiments.push({ person: entity_id, topic: topic_id, value: sentiment })
        })
      })

      return {
        persons,
        topics: Array.from(topicsSet),
        sentiments
      }
    }
  },
  mounted() {
    const container = d3.select("body")
      .append('div')
      .attr('class', 'matrix-container max-w-5xl mx-auto mt-10 p-6 bg-white shadow-2xl rounded-2xl')

    this.svg = container.append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'rounded-lg shadow-md border')

    this.draw()
  },
  methods: {
    draw() {
      const { persons, topics, sentiments } = this.matrixData
      const margin = { top: 80, right: 0, bottom: 10, left: 80 }
      const innerWidth = this.width - margin.left - margin.right
      const innerHeight = this.height - margin.top - margin.bottom

      const x = d3.scaleBand().range([0, innerWidth]).domain(topics)
      const y = d3.scaleBand().range([0, innerHeight]).domain(persons)
      const color = d3.scaleSequential()
        .domain([-1, 1])
        .interpolator(d3.interpolateRdYlGn)

      const svgGroup = this.svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      svgGroup.append("rect")
        .attr("class", "background")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "#fff")

      // change devs by looking here:
      // https://iros.github.io/patternfills/sample_d3.html
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
