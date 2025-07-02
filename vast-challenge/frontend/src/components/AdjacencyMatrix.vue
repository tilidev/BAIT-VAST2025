<template>
  <div ref="matrixContainer"></div>
</template>

<script>
import * as d3 from 'd3';

export default {
  name: 'AdjacencyMatrix',
  props: {
    data: { type: Array, required: true },
    rowLabels: { type: Array, required: true },
    colLabels: { type: Array, required: true },
    width: { type: Number, default: 400 },
    height: { type: Number, default: 400 },
    margin: { type: Object, default: () => ({ top: 120, right: 0, bottom: 10, left: 120 }) },
    colorScale: { type: Function, required: true },
    cellFilter: { type: Function, default: undefined },
    nullValueFill: { type: String, default: "url(#diagonalStripe6)" },
    undefinedValueFill: { type: String, default: "url(#crosshatch)" },
    tooltipFormatter: { type: Function, default: undefined },
    rowLabelFormatter: { type: Function, default: undefined },
    colLabelFormatter: { type: Function, default: undefined },
    cellRounded: { type: Boolean, default: false },
    rotateColLabels: { type: Boolean, default: true },
  },
  data() {
    return { svg: null, tooltip: null, selectedCell: null };
  },
  mounted() { this.draw(); },
  beforeUnmount() {
    if (this.tooltip) this.tooltip.remove();
    if (this.svg) this.svg.remove();
  },
  watch: {
    data: 'draw', rowLabels: 'draw', colLabels: 'draw',
    width: 'draw', height: 'draw',
    margin: { handler: 'draw', deep: true },
    colorScale: 'draw', cellFilter: 'draw',
    nullValueFill: 'draw', undefinedValueFill: 'draw',
    tooltipFormatter: 'draw', rowLabelFormatter: 'draw', colLabelFormatter: 'draw',
  },
  methods: {
    draw() {
      if (!this.$refs.matrixContainer) return;
      d3.select(this.$refs.matrixContainer).select("svg").remove();
      if (this.tooltip) this.tooltip.remove();
      const { data, rowLabels, colLabels, width, height, margin,
        colorScale, cellFilter, nullValueFill, undefinedValueFill,
        tooltipFormatter, rowLabelFormatter, colLabelFormatter,
        cellRounded, rotateColLabels } = this.$props;
      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;
      this.svg = d3.select(this.$refs.matrixContainer).append('svg')
        .attr('width', width).attr('height', height)
        .attr('class', 'rounded-lg shadow-md border');
      this.tooltip = d3.select("body").append("div")
        .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
        .style("z-index", "50").classed("hidden", true);
      const x = d3.scaleBand().range([0, innerWidth]).domain(colLabels).padding(0.01);
      const y = d3.scaleBand().range([0, innerHeight]).domain(rowLabels).padding(0.01);
      const svgGroup = this.svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
      svgGroup.append("rect").attr("class", "background")
        .attr("width", innerWidth).attr("height", innerHeight).attr("fill", "#fff");
      const defs = svgGroup.append("defs");
      defs.append("pattern").attr("id", "crosshatch").attr("patternUnits", "userSpaceOnUse").attr("width", 8).attr("height", 8)
        .append("image").attr("xlink:href", "data:image/svg+xml;base64,...").attr("width", 8).attr("height", 8);
      defs.append("pattern").attr("id", "diagonalStripe6").attr("patternUnits", "userSpaceOnUse").attr("width", 10).attr("height", 10)
        .append("image").attr("xlink:href", "data:image/svg+xml;base64,...").attr("width", 10).attr("height", 10);
      const dataMap = new Map(data.map(d => [`${d.rowId}-${d.colId}`, d]));
      const matrixCells = [];
      rowLabels.forEach(r => colLabels.forEach(c =>
        matrixCells.push({ row: r, col: c, cellData: dataMap.get(`${r}-${c}`) })
      ));
      svgGroup.selectAll(".cell").data(matrixCells).join("rect")
        .attr("class", "cell").attr("x", d => x(d.col)).attr("y", d => y(d.row))
        .attr("rx", cellRounded ? 3 : 0).attr("ry", cellRounded ? 3 : 0)
        .attr("width", x.bandwidth()).attr("height", y.bandwidth())
        .style("fill", d => {
          if (cellFilter && d.cellData && !cellFilter(d.cellData)) return undefinedValueFill;
          if (!d.cellData || d.cellData.value === undefined) return undefinedValueFill;
          if (d.cellData.value === null) return nullValueFill;
          return colorScale(d.cellData.value);
        })
        .style("stroke", "#ccc").style("stroke-width", 1)
        .style("stroke-linejoin", cellRounded ? "round" : "miter")
        .on("mouseover", (event, d) => {
          if (d.cellData && tooltipFormatter) this.tooltip.classed("hidden", false).html(tooltipFormatter(d.cellData));
          svgGroup.selectAll(".row-label").filter(l => l === d.row).style("font-weight", "bold");
          svgGroup.selectAll(".column-label text").filter(l => l === d.col).style("font-weight", "bold");
        })
        .on("mousemove", event => this.tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px"))
        .on("mouseout", () => {
          this.tooltip.classed("hidden", true);
          svgGroup.selectAll(".row-label").style("font-weight", "normal");
          svgGroup.selectAll(".column-label text").style("font-weight", "normal");
        })
        .on("click", (event, d) => {
          if (d.cellData && d.cellData.value !== null) {
            this.selectedCell = { row: d.row, col: d.col };
            this.updateHighlight(svgGroup);
            this.$emit('cell-click', { left: d.row, right: d.col });
          }
        });
      // row labels
      svgGroup.selectAll(".row-label").data(rowLabels).join("text")
        .attr("class", "row-label").attr("x", -6)
        .attr("y", d => y(d) + y.bandwidth() / 2)
        .attr("dy", ".32em").attr("text-anchor", "end")
        .style("font-size", "10px")
        .text(d => rowLabelFormatter ? rowLabelFormatter(d) : d.toString());
      // column labels
      svgGroup.selectAll(".column-label").data(colLabels).join("g")
        .attr("class", "column-label")
        .attr("transform", d => {
          const tx = x(d) + x.bandwidth() / 2;
          const ty = -8;
          return rotateColLabels
            ? `translate(${tx},${ty}) rotate(-90)`
            : `translate(${tx},${ty})`;
        })
        .append("text")
        .attr("dy", ".32em").attr("text-anchor", "start")
        .style("font-size", "10px")
        .text(d => colLabelFormatter ? colLabelFormatter(d) : d.toString());
      this.updateHighlight(svgGroup);
    },
    updateHighlight(svgGroup) {
      svgGroup.selectAll(".cell")
        .style("stroke", "#ccc").style("stroke-width", 1)
        .style("stroke-linejoin", "miter");
      if (this.selectedCell) {
        svgGroup.selectAll(".cell").filter(d =>
          d.row === this.selectedCell.row && d.col === this.selectedCell.col
        )
        .style("stroke", "#fd5825").style("stroke-width", 4)
        .style("stroke-linejoin", "round").style("stroke-linecap", "round").raise();
      }
    },
  },
};
</script>

<style scoped></style>
