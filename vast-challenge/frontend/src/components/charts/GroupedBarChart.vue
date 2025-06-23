<template>
  <div ref="chartContainer"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, nextTick } from 'vue';
import * as d3 from 'd3';
import type { GraphMembership } from '../../types/entity';
import { sentimentColorScale } from '../../utils/colors';

interface GroupedBarChartProps {
  data: any[];
  groupKey: string;
  subGroupKeys: string[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  subGroupColorScale?: d3.ScaleOrdinal<string, string>;
  tooltipFormatter?: (d: any) => string;
  xAxisLabelFormatter?: (d: any) => string;
  yAxisLabelFormatter?: (d: any) => string;
  showGridLines?: boolean;
  yDomain?: [number, number]; // Optional custom y-axis domain
}

export default defineComponent({
  name: 'GroupedBarChart',
  props: {
    data: {
      type: Array,
      required: true,
    },
    groupKey: {
      type: String,
      required: true,
    },
    subGroupKeys: {
      type: Array,
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
    subGroupColorScale: {
      type: Function,
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
    showGridLines: {
      type: Boolean,
      default: false,
    },
    yDomain: {
      type: Array,
      default: null,
    },
  },
  setup(props: GroupedBarChartProps) {
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

      const { data, groupKey, subGroupKeys, width, height, margin, subGroupColorScale, tooltipFormatter, xAxisLabelFormatter, yAxisLabelFormatter, showGridLines, yDomain } = props;

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

      const x0 = d3.scaleBand()
        .domain(data.map(d => d[groupKey]))
        .range([0, innerWidth])
        .padding(0.2);

      const x1 = d3.scaleBand()
        .domain(subGroupKeys)
        .range([0, x0.bandwidth()])
        .padding(0.05);

      const calculatedYMax = d3.max(data, d => d3.max(subGroupKeys.map(key => d[key]))) || 10;
      const y = d3.scaleLinear()
        .domain(yDomain || [0, calculatedYMax])
        .range([innerHeight, 0]);

      const color = subGroupColorScale;

      // X axis
      svgGroup.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x0).tickFormat(xAxisLabelFormatter))
        .selectAll("text")
        .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels

      // Y axis
      svgGroup.append("g")
        .call(d3.axisLeft(y).tickFormat(yAxisLabelFormatter))
        .selectAll("text")
        .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels

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
      const group = svgGroup.selectAll(".group")
        .data(data)
        .join("g")
        .attr("class", "group")
        .attr("transform", d => `translate(${x0(d[groupKey])},0)`);

      group.selectAll("rect")
        .data(d => subGroupKeys.map(key => ({ key, value: (d as any)[key], group: d[groupKey] })))
        .join("rect")
        .attr("x", d => x1(d.key)!)
        .attr("y", d => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", d => Math.abs(y(d.value) - y(yDomain ? yDomain[0] : 0))) // Handle negative values
        .attr("fill", d => color(d.key));

      // Tooltip
      group.selectAll("rect")
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
