<template>
  <div ref="chartContainer"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, nextTick } from 'vue';
import * as d3 from 'd3';
import { neutralBaseColor } from '../../utils/colors';

interface HistogramProps {
  data: number[];
  bins?: number | number[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  color?: string;
  tooltipFormatter?: (d: d3.Bin<number, number>) => string;
  xAxisLabelFormatter?: (d: any) => string;
  yAxisLabelFormatter?: (d: any) => string;
  showGridLines?: boolean;
  showTicks?: boolean;
}

export default defineComponent({
  name: 'Histogram',
  props: {
    data: {
      type: Array,
      required: true,
      default: () => [],
    },
    bins: {
      type: [Number, Array],
      default: 10,
    },
    width: {
      type: Number,
      default: 400,
    },
    height: {
      type: Number,
      default: 300,
    },
    margin: {
      type: Object,
      default: () => ({ top: 20, right: 30, bottom: 40, left: 60 }),
    },
    color: {
      type: String,
      default: neutralBaseColor,
    },
    tooltipFormatter: {
      type: Function,
      default: (d: d3.Bin<number, number>) => `Range: [${d.x0}, ${d.x1})<br>Count: ${d.length}`,
    },
    xAxisLabelFormatter: {
      type: Function,
      default: (d: any) => d.toString(),
    },
    yAxisLabelFormatter: {
      type: Function,
      default: (d: any) => d.toString(),
    },
    showGridLines: {
      type: Boolean,
      default: false,
    },
    showTicks: {
      type: Boolean,
      default: false,
    },
  },
  setup(props: HistogramProps) {
    const chartContainer = ref<HTMLElement | null>(null);
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;

    function drawChart() {
      if (!chartContainer.value || props.data.length === 0) {
        if (chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        if (tooltip) tooltip.remove();
        return;
      }

      // Clear previous drawing
      d3.select(chartContainer.value).selectAll("*").remove();
      if (tooltip) tooltip.remove();

      const { data, bins, width, height, margin, color, tooltipFormatter, xAxisLabelFormatter, yAxisLabelFormatter, showGridLines, showTicks } = props;

      const innerWidth = width - margin.left - margin.right;
      const innerHeight = height - margin.top - margin.bottom;

      svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

      const svgGroup = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none")
        .style("z-index", "50");

      // Define the histogram layout
      const histogram = d3.histogram<number, number>()
        .value(d => d)
        .domain(d3.extent(data) as [number, number])
        .thresholds(typeof bins === 'number' ? d3.range(d3.min(data) || 0, (d3.max(data) || 0) + (d3.max(data) || 0 - d3.min(data) || 0) / bins, (d3.max(data) || 0 - d3.min(data) || 0) / bins) : bins);

      const binnedData = histogram(data);

      // X scale for continuous values (bins)
      const x = d3.scaleLinear()
        .domain([d3.min(binnedData, d => d.x0) || 0, d3.max(binnedData, d => d.x1) || 0])
        .range([0, innerWidth]);

      // Y scale for frequency/count
      const y = d3.scaleLinear()
        .domain([0, d3.max(binnedData, d => d.length) || 0])
        .range([innerHeight, 0]);

      // X axis
      svgGroup.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(xAxisLabelFormatter))
        .selectAll("text")
        .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels

      // Y axis
      if (showTicks) {
        svgGroup.append("g")
          .call(d3.axisLeft(y).tickFormat(yAxisLabelFormatter))
          .selectAll("text")
          .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels
      }

      // Y-axis grid lines
      if (showGridLines) {
        svgGroup.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(y)
            .ticks(5)
            .tickSize(-innerWidth)
            .tickFormat(null) // Use null to suppress tick labels for grid lines
          )
          .selectAll("line")
          .attr("stroke", "#e5e7eb")
          .attr("stroke-dasharray", "2,2");
      }

      // Bars
      svgGroup.selectAll(".bar")
        .data(binnedData)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.x0 || 0))
        .attr("y", d => y(d.length))
        .attr("width", d => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1)) // -1 for a small gap between bars
        .attr("height", d => innerHeight - y(d.length))
        .attr("fill", color)
        .on("mouseover", (event, d) => {
          if (tooltip) {
            tooltip
              .classed("hidden", false)
              .html(tooltipFormatter(d));
          }
        })
        .on("mousemove", (event) => {
          if (tooltip) {
            tooltip.style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 20) + "px");
          }
        })
        .on("mouseout", () => {
          if (tooltip) {
            tooltip.classed("hidden", true);
          }
        });
    }

    onMounted(() => {
      nextTick(drawChart);
    });

    watch(
      () => props,
      () => {
        nextTick(drawChart);
      },
      { deep: true }
    );

    return {
      chartContainer,
    };
  },
});
</script>

<style scoped>
/* No specific styles needed here as Tailwind classes are applied directly or via props */
</style>
