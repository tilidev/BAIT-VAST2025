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
  width: number;
  height: number;
  margin: { top: number; right: number; bottom: number; left: number };
  colorScale: d3.ScaleOrdinal<string, string> | d3.ScaleLinear<string, number> | string;
  tooltipFormatter: (d: any) => string;
  xAxisLabelFormatter: (d: any, index: number) => string;
  yAxisLabelFormatter: (d: any, index: number) => string;
  xLabelRotation: number;
  showGridLines: boolean;
  showTicks: boolean;
}

export default defineComponent({
  name: 'BarChart',
  emits: ['bar-click'],
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
        default: (d: any) => `Value: ${d[Object.keys(d)[1]]}`,
      },
      xAxisLabelFormatter: {
        type: Function,
        default: (d: any, i: number) => d.toString(),
      },
      yAxisLabelFormatter: {
        type: Function,
        default: (d: any, i: number) => d.toString(),
      },
      xLabelRotation: {
        type: Number,
        default: 0, 
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
  setup(props: BarChartProps, { emit }) {
    const chartContainer = ref<HTMLElement | null>(null);
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any> | null = null;

    function drawChart() {
      if (!chartContainer.value || !props.data || props.data.length === 0 || !props.width || !props.height) {
        if (chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        if (tooltip) tooltip.remove();
        return;
      }

      d3.select(chartContainer.value).selectAll("*").remove();
      if (tooltip) tooltip.remove();


      const innerWidth = props.width - props.margin.left - props.margin.right;
      const innerHeight = props.height - props.margin.top - props.margin.bottom;

      const svg = d3.select(chartContainer.value)
        .append("svg")
        .attr("width", props.width)
        .attr("height", props.height);

      const svgGroup = svg.append("g")
        .attr("transform", `translate(${props.margin.left},${props.margin.top})`);

      tooltip = d3.select("body").append("div")
        .attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm")
        .style("pointer-events", "none")
        .style("z-index", "50");

      const x = d3.scaleBand()
        .domain(props.data.map(d => d[props.xKey]))
        .range([0, innerWidth])
        .padding(0.2);

      const y = d3.scaleLinear()
        .domain([0, Math.max(d3.max(props.data, d => d[props.yKey]) || 0, 1)])
        .range([innerHeight, 0]);

      // X axis
      svgGroup.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickFormat(props.xAxisLabelFormatter))
        .selectAll("text")
        .attr("transform", `translate(-10,0)rotate(-${props.xLabelRotation})`)
        .style("text-anchor", props.xLabelRotation > 0 ? "end" : "middle")
        .attr("class", "text-gray-600 text-xs"); // Tailwind classes for axis labels

      // Y axis
      if (props.showTicks) {
        svgGroup.append("g")
          .call(d3.axisLeft(y).tickFormat(props.yAxisLabelFormatter))
          .selectAll("text")
          .attr("class", "text-gray-600 text-xs");
      }

      // Y-axis grid lines
      if (props.showGridLines) {
        svgGroup.append("g")
          .attr("class", "grid")
          .call(d3.axisLeft(y)
            .ticks(5) 
            .tickSize(-innerWidth)
            .tickFormat(null) // to suppress tick labels for grid lines
          )
          .selectAll("line")
          .attr("stroke", "#e5e7eb") // Tailwind gray-200
          .attr("stroke-dasharray", "2,2");
      }

      // Bars
      svgGroup.selectAll(".bar")
        .data(props.data)
        .join("rect")
        .attr("class", "bar cursor-pointer")
        .attr("x", d => x(d[props.xKey])!)
        .attr("y", d => y(d[props.yKey]))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d[props.yKey]))
        .attr("fill", d => {
          if (typeof props.colorScale === 'string') {
            return props.colorScale;
          } else if (typeof props.colorScale === 'function') {
            return props.colorScale(d[props.xKey]);
          }
          // TODO: fix
          // This fallback should ideally not be reached if colorScale is required
          return '#6366f1';
        })
        .on("mouseover", (event, d) => {
          if (tooltip) {
            tooltip
              .classed("hidden", false)
              .html(props.tooltipFormatter(d));
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
        })
        .on("click", (event, d) => {
            emit('bar-click', d);
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
