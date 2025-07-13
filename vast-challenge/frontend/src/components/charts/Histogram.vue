<template>
  <div ref="chartContainer"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, nextTick, type PropType } from 'vue';
import * as d3 from 'd3';
import { neutralBaseColor } from '../../utils/colors';

interface HistogramProps {
  data: number[];
  backgroundData?: number[];
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
  fixedXDomain?: [number, number];
}

export default defineComponent({
  name: 'Histogram',
  props: {
    data: {
      type: Array as PropType<number[]>,
      required: true,
      default: () => [],
    },
    backgroundData: {
      type: Array as PropType<number[]>,
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
    fixedXDomain: {
      type: Object as PropType<[number, number] | null>,
      default: null,
    },
  },
  setup(props: HistogramProps) {
    const chartContainer = ref<HTMLElement | null>(null);
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;

    function drawChart() {
      const hasData = props.data.length > 0 || (props.backgroundData && props.backgroundData.length > 0);
      if (!chartContainer.value || !hasData) {
        if (chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        if (tooltip) tooltip.remove();
        return;
      }

      // Clear previous drawing
      d3.select(chartContainer.value).selectAll("*").remove();
      if (tooltip) tooltip.remove();

      const { data, backgroundData, bins, width, height, margin, color, tooltipFormatter, xAxisLabelFormatter, yAxisLabelFormatter, showGridLines, showTicks, fixedXDomain } = props;

      const w = width || 400;
      const h = height || 300;
      const m = margin || { top: 20, right: 30, bottom: 40, left: 60 };

      const innerWidth = w - m.left - m.right;
      const innerHeight = h - m.top - m.bottom;

      svg = d3.select(chartContainer.value!)
        .append("svg")
        .attr("width", w)
        .attr("height", h) as unknown as d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;

      const svgGroup = svg!.append("g")
        .attr("transform", `translate(${m.left},${m.top})`);

      tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none")
        .style("z-index", "50");

      const allData = [...data, ...(backgroundData || [])];
      const xDomain = fixedXDomain || d3.extent(allData) as [number, number];

      const histogram = d3.histogram<number, number>()
        .value(d => d)
        .domain(xDomain)
        .thresholds(typeof bins === 'number' ? d3.range(xDomain[0], xDomain[1], (xDomain[1] - xDomain[0]) / bins) : bins as number[]);

      const binnedData = histogram(data);
      const binnedBackgroundData = histogram(backgroundData || []);

      const x = d3.scaleLinear()
        .domain(xDomain)
        .range([0, innerWidth]);

      const yMax = d3.max([
        ...binnedData.map(d => d.length),
        ...binnedBackgroundData.map(d => d.length)
      ]) || 0;

      const y = d3.scaleLinear()
        .domain([0, yMax])
        .range([innerHeight, 0]);

      // X axis
      svgGroup.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(xAxisLabelFormatter || (d => d.toString())))
        .selectAll("text")
        .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels

      // Y axis
      if (showTicks) {
        svgGroup.append("g")
          .call(d3.axisLeft(y).tickFormat(yAxisLabelFormatter || (d => d.toString())))
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

      // Background Bars
      if (binnedBackgroundData.length > 0) {
        svgGroup.selectAll(".bg-bar")
          .data(binnedBackgroundData)
          .join("rect")
          .attr("class", "bg-bar")
          .attr("x", d => x(d.x0 || 0))
          .attr("y", d => y(d.length))
          .attr("width", d => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1))
          .attr("height", d => innerHeight - y(d.length))
          .attr("fill", color || neutralBaseColor)
          .attr("opacity", 0.3);
      }

      // Foreground Bars
      if (binnedData.length > 0) {
        svgGroup.selectAll(".bar")
          .data(binnedData)
          .join("rect")
          .attr("class", "bar")
          .attr("x", d => x(d.x0 || 0))
          .attr("y", d => y(d.length))
          .attr("width", d => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1))
          .attr("height", d => innerHeight - y(d.length))
          .attr("fill", color || neutralBaseColor)
          .on("mouseover", (event, d) => {
            if (tooltip && tooltipFormatter) {
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
