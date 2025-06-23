<template>
  <div ref="chartContainer"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, nextTick } from 'vue';
import * as d3 from 'd3';

interface BarChartProps {
  data: any[];
  xKey: string;
  yKey: string;
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  colorScale?: d3.ScaleOrdinal<string, string> | d3.ScaleLinear<string, number> | string;
  tooltipFormatter?: (d: any) => string;
  xAxisLabelFormatter?: (d: any) => string;
  yAxisLabelFormatter?: (d: any) => string;
  xLabelRotation?: number; // Degrees for x-axis label rotation
  showGridLines?: boolean;
  showTicks?: boolean;
}

export default defineComponent({
  name: 'BarChart',
  props: {
      data: {
        type: Array,
        required: true,
      },
      xKey: {
        type: String,
        required: true,
      },
      yKey: {
        type: String,
        required: true,
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
      colorScale: {
        type: [Function, String],
        required: true,
      },
      tooltipFormatter: {
        type: Function,
        default: (d: any) => `Value: ${d.value}`,
      },
      xAxisLabelFormatter: {
        type: Function,
        default: (d: any) => d.toString(),
      },
      yAxisLabelFormatter: {
        type: Function,
        default: (d: any) => d.toString(),
      },
      xLabelRotation: {
        type: Number,
        default: 0, // No rotation by default
      },
      showGridLines: {
        type: Boolean,
        default: false,
      },
    showTicks: {
       type: Boolean,
       default: false
      }
  },
  setup(props: BarChartProps) {
    const chartContainer = ref<HTMLElement | null>(null);
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;

      const { data, xKey, yKey, width, height, margin, colorScale, tooltipFormatter, xAxisLabelFormatter, yAxisLabelFormatter, xLabelRotation, showGridLines, showTicks } = props;
    function drawChart() {
      if (!chartContainer.value || data.length === 0) {
        if (chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        if (tooltip) tooltip.remove();
        return;
      }

      // Clear previous drawing
      d3.select(chartContainer.value).selectAll("*").remove();
      if (tooltip) tooltip.remove();


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

      const x = d3.scaleBand()
        .domain(data.map(d => d[xKey]))
        .range([0, innerWidth])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, Math.max(d3.max(data, d => d[yKey]) || 0, 1)])
        .range([innerHeight, 0]);

      // X axis
      svgGroup.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(xAxisLabelFormatter))
        .selectAll("text")
        .attr("transform", `translate(-10,0)rotate(-${xLabelRotation})`)
        .style("text-anchor", xLabelRotation > 0 ? "end" : "middle")
        .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels

      // Y axis
      if (showTicks) {
        svgGroup.append("g")
          .call(d3.axisLeft(y).tickFormat(yAxisLabelFormatter))
          .selectAll("text")
          .attr("class", "text-gray-600 text-xs");
      }

      // Y-axis grid lines
      if (showGridLines) {
        svgGroup.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(y)
            .ticks(5) // Adjust number of ticks as needed
            .tickSize(-innerWidth)
            .tickFormat(null) // Use null to suppress tick labels for grid lines
          )
          .selectAll("line")
          .attr("stroke", "#e5e7eb") // Tailwind gray-200
          .attr("stroke-dasharray", "2,2");
      }

      // Bars
      svgGroup.selectAll(".bar")
        .data(data)
        .join("rect")
        .attr("class", "bar")
        .attr("x", d => x(d[xKey])!)
        .attr("y", d => y(d[yKey]))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d[yKey]))
        .attr("fill", d => {
          if (typeof colorScale === 'string') {
            return colorScale;
          } else if (typeof colorScale === 'function') {
            return colorScale(d[xKey]);
          }
          // This fallback should ideally not be reached if colorScale is required
          return '#6366f1';
        })
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
