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

      svgGroup.append("defs").append("pattern")
        .attr("id", "diagonalHatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 4)
        .attr("height", 4)
        .append("path")
        .attr("d", "M0,0 l4,4")
        .attr("stroke", "#999")
        .attr("stroke-width", 1)

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
          if (d.z === null) return "#ccc"
          if (typeof d.z === "undefined") return "url(#diagonalHatch)"
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

<style scoped>
.cell:hover {
  stroke: black;
  stroke-width: 1.5px;
}

text.active {
  font-weight: bold;
  font-size: 1;
  fill: red;
}
</style>
