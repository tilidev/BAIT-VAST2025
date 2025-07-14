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
  color?: string | ((value: number) => string);
  tooltipFormatter?: (d: d3.Bin<number, number>) => string;
  xAxisLabelFormatter?: (d: any) => string;
  yAxisLabelFormatter?: (d: any) => string;
  showGridLines?: boolean;
  showTicks?: boolean;
  fixedXDomain?: [number, number];
  showDensity?: boolean;
  densityColor?: string;
  backgroundDensityColor?: string;
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
      type: [String, Function] as PropType<string | ((value: number) => string)>,
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
    showDensity: {
      type: Boolean,
      default: false,
    },
    densityColor: {
      type: String,
      default: '#000',
    },
    backgroundDensityColor: {
      type: String,
      default: '#ccc',
    },
  },
  setup(props: HistogramProps) {
    const chartContainer = ref<HTMLElement | null>(null);
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;

    function drawChart() {
      const hasData = props.data.length > 0 || (props.backgroundData && props.backgroundData.length > 0);
      if (!chartContainer.value || !hasData) {
        if (chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        return;
      }

      d3.select(chartContainer.value).selectAll("*").remove();

      const { data, backgroundData, bins, width, height, margin, color, tooltipFormatter, xAxisLabelFormatter, yAxisLabelFormatter, showGridLines, showTicks, fixedXDomain, showDensity, densityColor, backgroundDensityColor } = props;

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

      const allData = [...data, ...(backgroundData || [])];
      const xDomain = fixedXDomain || d3.extent(allData) as [number, number];

      const x = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
      const y = d3.scaleLinear().range([innerHeight, 0]);

      const histogram = d3.histogram<number, number>()
        .value(d => d)
        .domain(xDomain)
        .thresholds(typeof bins === 'number' ? d3.range(xDomain[0], xDomain[1], (xDomain[1] - xDomain[0]) / bins) : bins as number[]);

      const binnedData = histogram(data);
      const binnedBackgroundData = histogram(backgroundData || []);
      
      const n = data.length || 1;
      const n_bg = backgroundData?.length || 1;
      const binCount = typeof bins === 'number' ? bins : (bins as number[]).length - 1;
      const binWidth = (xDomain[1] - xDomain[0]) / binCount;

      if (showDensity) {
        const optimalBandwidth = silverman(data);
        const optimalBandwidthBg = silverman(backgroundData || []);
        const kde = kernelDensityEstimator(kernelEpanechnikov(optimalBandwidth), x.ticks(100));
        const kdeBg = kernelDensityEstimator(kernelEpanechnikov(optimalBandwidthBg), x.ticks(100));
        const density = kde(data) as [number, number][];
        const backgroundDensity = kdeBg(backgroundData || []) as [number, number][];

        const maxHistDensity = d3.max(binnedData, d => d.length / (n * binWidth)) || 0;
        const maxBgHistDensity = d3.max(binnedBackgroundData, d => d.length / (n_bg * binWidth)) || 0;
        const maxKdeDensity = d3.max(density, d => d[1]) || 0;
        const maxBgKdeDensity = d3.max(backgroundDensity, d => d[1]) || 0;
        
        const yMax = Math.max(maxHistDensity, maxBgHistDensity, maxKdeDensity, maxBgKdeDensity);
        y.domain([0, yMax * 1.1]);

        drawDensityPlots(density, backgroundDensity);
      } else {
        const yMaxHist = d3.max([...binnedData, ...binnedBackgroundData], d => d.length) || 0;
        y.domain([0, yMaxHist * 1.1]);
      }

      drawAxesAndGrid();
      drawBars();

      function drawDensityPlots(density: [number, number][], backgroundDensity: [number, number][]) {
        const line = d3.line()
          .curve(d3.curveBasis)
          .x(d => x((d as [number, number])[0]))
          .y(d => y((d as [number, number])[1]));

        const area = d3.area()
          .curve(d3.curveBasis)
          .x(d => x((d as [number, number])[0]))
          .y0(innerHeight)
          .y1(d => y((d as [number, number])[1]));

        const defs = svgGroup.append("defs");
        const gradient = defs.append("linearGradient").attr("id", "density-gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
        gradient.append("stop").attr("offset", "0%").attr("stop-color", densityColor || '#000').attr("stop-opacity", 0.8);
        gradient.append("stop").attr("offset", "100%").attr("stop-color", densityColor || '#000').attr("stop-opacity", 0);
        const bgGradient = defs.append("linearGradient").attr("id", "bg-density-gradient").attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
        bgGradient.append("stop").attr("offset", "0%").attr("stop-color", backgroundDensityColor || '#ccc').attr("stop-opacity", 0.5);
        bgGradient.append("stop").attr("offset", "100%").attr("stop-color", backgroundDensityColor || '#ccc').attr("stop-opacity", 0);

        if (backgroundData && backgroundData.length > 0) {
          svgGroup.append("path").datum(backgroundDensity).attr("fill", `url(#bg-density-gradient)`).attr("stroke", "none").attr("d", area as any);
        }
        if (data.length > 0) {
          svgGroup.append("path").datum(density).attr("fill", `url(#density-gradient)`).attr("d", area as any);
          svgGroup.append("path").datum(density).attr("fill", "none").attr("stroke", densityColor || '#000').attr("stroke-width", 1.5).attr("stroke-linejoin", "round").attr("d", line as any);
        }
      }

      function drawAxesAndGrid() {
        svgGroup.append("g").attr("transform", `translate(0,${innerHeight})`).call(d3.axisBottom(x).tickFormat(xAxisLabelFormatter || (d => d.toString()))).selectAll("text").attr("class", "text-gray-600 text-xs");
        if (showTicks) {
          svgGroup.append("g").call(d3.axisLeft(y).tickFormat(yAxisLabelFormatter || (d => d.toString()))).selectAll("text").attr("class", "text-gray-600 text-xs");
        }
        if (showGridLines) {
          svgGroup.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(null)).selectAll("line").attr("stroke", "#e5e7eb").attr("stroke-dasharray", "2,2");
        }
      }

      function drawBars() {
        const tooltip = d3.select("body").append("div").attr("class", "tooltip absolute hidden p-2 bg-white border rounded shadow-lg text-sm").style("pointer-events", "none").style("z-index", "50");
        
        if (binnedBackgroundData.length > 0) {
          svgGroup.selectAll(".bg-bar").data(binnedBackgroundData).join("rect")
            .attr("class", "bg-bar")
            .attr("x", d => x(d.x0 || 0))
            .attr("y", d => showDensity ? y(d.length / (n_bg * binWidth)) : y(d.length))
            .attr("width", d => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1))
            .attr("height", d => showDensity ? innerHeight - y(d.length / (n_bg * binWidth)) : innerHeight - y(d.length))
            .attr("fill", d => typeof color === 'function' ? color((d.x0! + d.x1!) / 2) : color || neutralBaseColor)
            .attr("opacity", 0.3);
        }
        if (binnedData.length > 0) {
          svgGroup.selectAll(".bar").data(binnedData).join("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.x0 || 0))
            .attr("y", d => showDensity ? y(d.length / (n * binWidth)) : y(d.length))
            .attr("width", d => Math.max(0, x(d.x1 || 0) - x(d.x0 || 0) - 1))
            .attr("height", d => showDensity ? innerHeight - y(d.length / (n * binWidth)) : innerHeight - y(d.length))
            .attr("fill", d => typeof color === 'function' ? color((d.x0! + d.x1!) / 2) : color || neutralBaseColor)
            .on("mouseover", (event, d) => {
              tooltip.classed("hidden", false).html(tooltipFormatter!(d));
            })
            .on("mousemove", (event) => {
              tooltip.style("left", (event.pageX + 10) + "px").style("top", (event.pageY - 20) + "px");
            })
            .on("mouseout", () => {
              tooltip.classed("hidden", true);
            });
        }
      }

      function kernelDensityEstimator(kernel: (v: number) => number, X: number[]) {
        return function (V: number[]) {
          return X.map(x => [x, d3.mean(V, v => kernel(x - v))]);
        };
      }

      function kernelEpanechnikov(k: number) {
        return function (v: number) {
          return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
        };
      }

      function silverman(data: number[]) {
        if (data.length === 0) return 0.1;
        const stdDev = d3.deviation(data) || 0;
        const n = data.length;
        // Using Scott's rule for bandwidth selection, which is often more robust for multimodal distributions.
        return 1.06 * stdDev * Math.pow(n, -0.2);
      }
    }

    onMounted(() => {
      nextTick(drawChart);
    });

    watch(() => props, () => {
      nextTick(drawChart);
    }, { deep: true });

    return {
      chartContainer,
    };
  },
});
</script>

<style scoped>
/* No specific styles needed here as Tailwind classes are applied directly or via props */
</style>
