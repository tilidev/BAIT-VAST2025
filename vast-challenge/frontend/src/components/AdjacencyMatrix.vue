<template>
  <div id="svg">
  </div>
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
  mounted() {
    const container = d3.select("body")
      .append('div')
      .attr('class', 'matrix-container max-w-5xl mx-auto mt-10 p-6 bg-white shadow-2xl rounded-2xl')

    this.svg = container.append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'rounded-lg shadow-md border')
    console.log(this.matrixData)
    this.draw()
  },
  computed: {
    matrixData() {
      const persons = []
      const topicsSet = new Set()
      const sentiments = []

      this.entities.forEach(entity => {
        const personId = entity.entity_id
        persons.push(personId)

        entity.topic_sentiments.forEach(topicSent => {
          const topicId = topicSent.topic_id
          topicsSet.add(topicId)

          sentiments.push({
            person: personId,
            topic: topicId,
            value: topicSent.sentiment
          })
        })
      })

      return {
        persons,
        topics: Array.from(topicsSet),
        sentiments
      }
    }
  },
  methods: {
    draw() {
      const margin = { top: 80, right: 0, bottom: 10, left: 80 }
      const innerWidth = this.width - margin.left - margin.right
      const innerHeight = this.height - margin.top - margin.bottom

      console.log(this.matrixData.topics)
      const x = d3.scaleBand().range([0, innerWidth]).domain(this.matrixData.topics)
      const y = d3.scaleBand().range([0, innerHeight]).domain(this.matrixData.persons)
      const z = d3.scaleLinear().domain([-1, 1]).clamp(true)
      const c = d3.scaleOrdinal(d3.schemeCategory10)
      const color = d3.scaleSequential()
        .domain([-1, 1])
        .interpolator(d3.interpolateRdYlGn);
      const svg = this.svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

      // Build and populate matrix
      const matrix = this.matrixData.persons.map(person =>
        this.matrixData.topics.map(topic => {
          const sentiment = this.matrixData.sentiments.find(s => s.person === person && s.topic === topic)
          return {
            x: topic,
            y: person,
            z: sentiment?.value, // may be number, null, or undefined
            raw: sentiment
          }
        })
      )

      // Background
      svg.append("rect")
        .attr("class", "background")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "#fff")

      svg.append("defs").append("pattern")
        .attr("id", "diagonalHatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 4)
        .attr("height", 4)
        .append("path")
        .attr("d", "M0,0 l4,4")
        .attr("stroke", "#999")
        .attr("stroke-width", 1)

      // Draw rows
      const rowGroups = svg.selectAll(".row")
        .data(matrix)
        .join("g")
        .attr("class", "row")
        .attr("transform", (_, i) => `translate(0,${y(this.matrixData.persons[i])})`)

      rowGroups.selectAll(".cell")
        .data(d => d.filter(cell => cell))
        .join("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.x))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => {
          if (d.z === null) return "#ccc"        // Explicit null → light gray
          if (typeof d.z === "undefined") return "url(#diagonalHatch)"  // Missing/undefined → pattern
          return color(d.z)                      // Number → interpolate color
        })
        .style("stroke", "#ccc")
        .on("mouseover", mouseover)
        .on("mouseout", mouseout)

      // Row labels (persons)
      rowGroups.append("text")
        .attr("x", -6)
        .attr("y", y.bandwidth() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .text((_, i) => this.matrixData.persons[i])

      // Column labels (topics)
      const columnGroups = svg.selectAll(".column")
        .data(this.matrixData.topics)
        .join("g")
        .attr("class", "column")
        .attr("transform", (d) => {
          const xPos = x(d) + x.bandwidth() / 2; // center of the column
          return `translate(${xPos},0) rotate(-90)`;
        });

      columnGroups.append("text")
        .attr("x", 6)
        .attr("y", 0)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .text(d => d);
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
