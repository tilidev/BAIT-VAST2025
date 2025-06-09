<template>
  <div ref="chart" class="heatmap"></div>
</template>

<script>
import * as d3 from 'd3'

export default {
  name: 'IndustryAlignmentHeatmap',
  data() {
    return {
      matrix: {}
    }
  },
  mounted() {
    this.fetchMatrix()
    // redraw on resize so it stays responsive
    window.addEventListener('resize', this.drawHeatmap)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.drawHeatmap)
  },
  watch: {
    matrix: {
      handler(newMatrix) {
        if (newMatrix && Object.keys(newMatrix).length) {
          this.drawHeatmap()
        }
      },
      deep: true
    }
  },
  methods: {
    async fetchMatrix() {
      try {
        const response = await fetch('/api/industry-interest-alignment')
        if (!response.ok) throw new Error('Network response was not ok')
        this.matrix = await response.json()
      } catch (error) {
        console.error('Failed to fetch matrix:', error)
      }
    },

    drawHeatmap() {
      const data = this.matrix
      const industries = Object.keys(data)
      const n = industries.length

      // measure container size
      const container = this.$refs.chart
      const bbox = container.getBoundingClientRect()
      const margin = { top: 100, right: 60, bottom: 10, left: 100 }
      const innerWidth = bbox.width  - margin.left - margin.right
      const innerHeight = bbox.height - margin.top  - margin.bottom

      // clear old svg
      d3.select(container).select('svg').remove()

      // base svg + group
      const svg = d3.select(container)
        .append('svg')
          .attr('width',  bbox.width)
          .attr('height', bbox.height)
        .append('g')
          .attr('transform', `translate(${margin.left},${margin.top})`)

      // scales: band scales will compute bandwidth = innerWidth/n
      const x = d3.scaleBand()
        .domain(industries)
        .range([0, innerWidth])
        .padding(0.01)
      const y = d3.scaleBand()
        .domain(industries)
        .range([0, innerHeight])
        .padding(0.01)

      // diverging color
      const colorScale = d3.scaleSequential()
        .domain([-1,1])
        .interpolator(d3.interpolateRgb('lightcoral','lightsteelblue'))

      // flatten matrix
      const flat = []
      industries.forEach(i =>
        industries.forEach(j =>
          flat.push({ row: i, col: j, value: data[i][j] })
        )
      )

      // draw cells
      const cell = svg.selectAll('.cell-group')
        .data(flat)
        .enter().append('g').attr('class','cell-group')

      cell.append('rect')
        .attr('x',      d => x(d.col))
        .attr('y',      d => y(d.row))
        .attr('width',  x.bandwidth())
        .attr('height', y.bandwidth())
        .style('fill', d => d.value == null ? '#eee' : colorScale(d.value))
        .style('fill-opacity', 0.8)
        .attr('class','cell')

      cell.append('text')
        .attr('x', d => x(d.col) + x.bandwidth()/2)
        .attr('y', d => y(d.row) + y.bandwidth()/2)
        .attr('dy','0.35em')
        .attr('text-anchor','middle')
        .style('font-size','10px')
        .style('pointer-events','none')
        .text(d => d.value == null ? '' : d.value.toFixed(2))

      // axes
      svg.append('g')
        .attr('transform',`translate(0, -5)`)
        .call(d3.axisTop(x).tickSize(0))
        .selectAll('text')
          .attr('transform','rotate(-45)')
          .style('text-anchor','start')

      svg.append('g')
        .call(d3.axisLeft(y).tickSize(0))

      // legend
      const legendWidth  = 15
      const legendScale  = d3.scaleLinear()
        .domain([-1,1])
        .range([innerHeight,0])

      const legend = svg.append('g')
        .attr('transform',`translate(${innerWidth + 20}, 0)`)

      const legendData = d3.range(-1, 1 + 0.01, 0.01)
      legend.selectAll('rect')
        .data(legendData)
        .enter().append('rect')
          .attr('x', 0)
          .attr('y', d => legendScale(d))
          .attr('width', legendWidth)
          .attr('height', innerHeight / legendData.length)
          .style('fill', d => colorScale(d))
          .style('opacity',0.8)

      legend.append('g')
        .attr('transform',`translate(${legendWidth}, 0)`)
        .call(d3.axisRight(legendScale).ticks(5))

    }
  }
}
</script>

<style scoped>
.heatmap {
  /* make sure this has a height (e.g. via parent or a fixed value) */
  width: 100%;
  height: 100%;
  overflow: auto;
}
.cell {
  stroke: #fff;
}
</style>