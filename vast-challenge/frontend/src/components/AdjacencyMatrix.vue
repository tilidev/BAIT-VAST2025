<template>
  <div ref="matrixContainer" class="h-full w-full"></div>
</template>

<script>
import * as d3 from 'd3';
import { useLinkingStore } from '../stores/linkingStore';
import {HighlightType} from '../stores/linkingStore'
export default {
  name: 'AdjacencyMatrix',
  props: {
    width: {
      type: Number,
      required: true,
    },
    height: {
      type: Number,
      required: true,
    },
    data: {
      type: Array,
      required: true,
    },
    rowLabels: {
      type: Array,
      required: true,
    },
    colLabels: {
      type: Array,
      required: true,
    },
    margin: {
      type: Object,
      default: () => ({ top: 150, right: 10, bottom: 10, left: 150 }),
    },
    colorScale: {
      type: Function,
      required: true,
    },
    cellFilter: {
      type: Function,
      default: undefined,
    },
    nullValueFill: {
      type: String,
      default: "url(#diagonalStripe6)",
    },
    undefinedValueFill: {
      type: String,
      default: "url(#crosshatch)",
    },
    tooltipFormatter: {
      type: Function,
      default: undefined,
    },
    rowLabelFormatter: {
      type: Function,
      default: undefined,
    },
    colLabelFormatter: {
      type: Function,
      default: undefined,
    },
    cellRounded: {
      type: Boolean,
      default: false,
    },
    rotateColLabels: {
      type: Boolean,
      default: true,
    },
    highlightedRows: {
      type: Array,
      default: () => [],
    },
    highlightedCols: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      svg: null,
      tooltip: null,
      linkingStore: useLinkingStore(),
      HighlightType,
    };
  },
  mounted() {
    this.draw();
  },
  beforeUnmount() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    if (this.svg) {
      this.svg.remove();
    }
  },
  watch: {
    width: 'draw',
    height: 'draw',
    data: 'draw',
    rowLabels: 'draw',
    colLabels: 'draw',
    margin: {
      handler: 'draw',
      deep: true,
    },
    colorScale: 'draw',
    cellFilter: 'draw',
    nullValueFill: 'draw',
    undefinedValueFill: 'draw',
    tooltipFormatter: 'draw',
    rowLabelFormatter: 'draw',
    colLabelFormatter: 'draw',
    highlightedRows: 'updateHighlight',
    highlightedCols: 'updateHighlight',
    'linkingStore.hoverHighlights': 'updateHighlight',
  },
  methods: {
    draw() {
      if (!this.$refs.matrixContainer || !this.width || !this.height) return;

      const { width, height } = this;

      // Clear previous drawing
      d3.select(this.$refs.matrixContainer).select("svg").remove();
      if (this.tooltip) this.tooltip.remove();

      const { data, rowLabels, colLabels, margin, colorScale, cellFilter, nullValueFill, undefinedValueFill, tooltipFormatter, rowLabelFormatter, colLabelFormatter } = this.$props

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      this.svg = d3.select(this.$refs.matrixContainer)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .on('mouseleave', () => {
          this.linkingStore.setHoverHighlights([]);
        });

      this.tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip pointer-events-none absolute hidden p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition")
        .style("z-index", "50")
        .classed("hidden", true);

      const x = d3.scaleBand().range([0, innerWidth]).domain(colLabels).padding(0.01);
      const y = d3.scaleBand().range([0, innerHeight]).domain(rowLabels).padding(0.01);

      const svgGroup = this.svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      svgGroup.append("rect")
        .attr("class", "background")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "#fff");

      // Define patterns
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

      const dataMap = new Map();
      data.forEach(d => {
        dataMap.set(`${d.rowId}-${d.colId}`, d);
      });

      const matrixCells = [];
      rowLabels.forEach(rLabel => {
        colLabels.forEach(cLabel => {
          const cellData = dataMap.get(`${rLabel}-${cLabel}`);
          matrixCells.push({ row: rLabel, col: cLabel, cellData });
        });
      });

      // Draw cells
      svgGroup.selectAll(".cell")
        .data(matrixCells)
        .join("rect")
        .attr("class", "cell")
        .attr("x", d => x(d.col))
        .attr("y", d => y(d.row))
        .attr("rx", d => this.$props.cellRounded ? 3 : 0)
        .attr("ry", d => this.$props.cellRounded ? 3 : 0)
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .style("fill", d => {
          if (cellFilter && d.cellData && !cellFilter(d.cellData)) {
            return undefinedValueFill; // Filtered out
          }
          if (d.cellData === undefined || d.cellData.value === undefined) return undefinedValueFill;
          if (d.cellData.value === null) return nullValueFill;
          return colorScale(d.cellData.value);
        })
        .style("stroke", "#ccc")
        .on("mouseover", (event, d) => {
          if (this.tooltip && d.cellData && tooltipFormatter) {
            this.tooltip
              .classed("hidden", false)
              .html(tooltipFormatter(d.cellData));
          }
          this.linkingStore.setHoverHighlights([{ type: this.HighlightType.CELL, value: d }]);
        })
        .on("mousemove", event => this.tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 28) + "px"))
        .on("mouseout", () => {
          this.tooltip.classed("hidden", true);
          this.linkingStore.setHoverHighlights([]);
        })
        .on("click", (event, d) => {
          if (d.cellData && d.cellData.value !== null) {
            this.$emit('cell-click', { row: d.row, col: d.col });
          }
        });

      // Row labels
      svgGroup.selectAll(".row-label")
        .data(rowLabels)
        .join("text")
        .attr("class", "row-label")
        .attr("x", -6)
        .attr("y", d => y(d) + y.bandwidth() / 2)
        .attr("dy", ".32em")
        .attr("text-anchor", "end")
        .style("font-size", "10px") // Smaller font size for row labels
        .text(d => rowLabelFormatter ? rowLabelFormatter(d) : d.toString())
        .on("click", (event, d) => {
          this.$emit('row-label-click', d);
        })
        .on("mouseover", (event, d) => {
          this.$emit('row-label-mouseover', d);
        })
        .on("mouseout", (event, d) => {
          this.$emit('row-label-mouseout', d);
        });

      // Column labels
      svgGroup.selectAll(".column-label")
        .data(colLabels)
        .join("g")
        .attr("class", "column-label")
        .attr("transform", d => {
          const xTranslation = x(d) + x.bandwidth() / 2;
          const yTranslation = -8 
          return this.$props.rotateColLabels ? `translate(${xTranslation},${yTranslation}) rotate(-90)` : `translate(${xTranslation},${yTranslation})`;
        })
        .append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", ".32em")
        .attr("text-anchor", "start")
        .style("font-size", "10px") // Smaller font size for column labels
        .text(d => colLabelFormatter ? colLabelFormatter(d) : d.toString())
        .on("click", (event, d) => {
          this.$emit('col-label-click', d);
        })
        .on("mouseover", (event, d) => {
          this.$emit('col-label-mouseover', d);
        })
        .on("mouseout", (event, d) => {
          this.$emit('col-label-mouseout', d);
        });

      this.updateHighlight();
    },
    updateHighlight() {
      if (!this.svg) return;
      const svgGroup = this.svg.select('g');
      const { highlightedRows, highlightedCols } = this.$props;
      const hoveredCellHighlight = this.linkingStore.hoverHighlights.find(h => h.type === this.HighlightType.CELL);
      const hoveredCell = hoveredCellHighlight ? hoveredCellHighlight.value : null;
      const hoveredPeople = this.linkingStore.hoverHighlights.filter(h => h.type === this.HighlightType.PERSON).map(h => h.value);
      const hoveredTopics = this.linkingStore.hoverHighlights.filter(h => h.type === this.HighlightType.TOPIC).map(h => h.value);
      const hoveredIndustries = this.linkingStore.hoverHighlights.filter(h => h.type === this.HighlightType.INDUSTRY).map(h => h.value);

      const allHoveredRows = hoveredPeople;
      const allHoveredCols = [...hoveredTopics, ...hoveredIndustries];

      // Reset all styles first
      svgGroup.selectAll(".cell")
        .style("stroke", "#ccc").style("stroke-width", 1)
        .style("opacity", 1);
      svgGroup.selectAll(".row-label").style("font-weight", "normal");
      svgGroup.selectAll(".column-label text").style("font-weight", "normal");

      // Apply highlighting based on props and hovers
      const hasHighlight = highlightedRows.length > 0 || highlightedCols.length > 0;
      const hasHover = allHoveredRows.length > 0 || allHoveredCols.length > 0;

      if (hasHighlight || hasHover) {
        svgGroup.selectAll(".cell").style("opacity", 0.3);

        svgGroup.selectAll(".cell")
          .filter(d => 
            highlightedRows.includes(d.row) || 
            highlightedCols.includes(d.col) ||
            allHoveredRows.includes(d.row) ||
            allHoveredCols.includes(d.col)
          )
          .style("opacity", 1);
      }

      svgGroup.selectAll(".row-label")
        .filter(d => highlightedRows.includes(d) || allHoveredRows.includes(d))
        .style("font-weight", "bold");

      svgGroup.selectAll(".column-label text")
        .filter(d => highlightedCols.includes(d) || allHoveredCols.includes(d))
        .style("font-weight", "bold");

      if (hoveredCell) {
        svgGroup.selectAll(".cell")
          .filter(d => d.row === hoveredCell.row && d.col === hoveredCell.col)
          .style("stroke", "#fd5825").style("stroke-width", 4)
          .style("opacity", 1) // Ensure hovered cell is fully visible
          .style("stroke-linejoin", "round").style("stroke-linecap", "round").raise();

        svgGroup.selectAll(".row-label")
          .filter(label => label === hoveredCell.row)
          .style("font-weight", "bold");

        svgGroup.selectAll(".column-label text")
          .filter(label => label === hoveredCell.col)
          .style("font-weight", "bold");
      }
    },
  },
};
</script>

<style scoped></style>
