<template>
  <div ref="chartContainer"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watch, nextTick, type PropType } from 'vue';
import * as d3 from 'd3';
import { neutralBaseColor } from '../../utils/colors';

interface DataObject {
  sentiment: number;
  [key: string]: any;
}

interface HistogramProps {
  data: DataObject[];
  backgroundData?: DataObject[];
  bins?: number | number[];
  width?: number;
  height?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  color?: string | ((value: number) => string);
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
      type: Array as PropType<DataObject[]>,
      required: true,
      default: () => [],
    },
    backgroundData: {
      type: Array as PropType<DataObject[]>,
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
  emits: ['bar-click', 'bar-mouseover', 'bar-mouseout'],
  setup(props: HistogramProps, { emit }) {
    const chartContainer = ref<HTMLElement | null>(null);
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | null = null;
    let svgGroup: d3.Selection<SVGGElement, unknown, HTMLElement, any> | null = null;
    let x: d3.ScaleLinear<number, number> | null = null;
    let y: d3.ScaleLinear<number, number> | null = null;
    let innerHeight: number;
    let innerWidth: number;
    const transitionDuration = 500;

    function initChart() {
      if (!chartContainer.value) return;
      const { width, height, margin } = props;
      const w = width || chartContainer.value.clientWidth || 400;
      const h = height || chartContainer.value.clientHeight || 300;
      const m = margin || { top: 20, right: 30, bottom: 40, left: 60 };
      innerWidth = w - m.left - m.right;
      innerHeight = h - m.top - m.bottom;

      d3.select(chartContainer.value).selectAll('*').remove();

      svg = d3.select(chartContainer.value!)
        .append('svg')
        .attr('width', w)
        .attr('height', h) as unknown as d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;

      svgGroup = svg!.append('g').attr('transform', `translate(${m.left},${m.top})`);

      const allData = [...props.data.map(d => d.sentiment), ...(props.backgroundData?.map(d => d.sentiment) || [])];
      const xDomain = props.fixedXDomain || d3.extent(allData) as [number, number];

      x = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
      y = d3.scaleLinear().range([innerHeight, 0]);

      svgGroup.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${innerHeight})`);
      svgGroup.append('g').attr('class', 'y-axis');
      svgGroup.append('g').attr('class', 'grid');
    }

    function updateChart() {
      const hasData = props.data.length > 0 || (props.backgroundData && props.backgroundData.length > 0);
      if (!chartContainer.value || !hasData || !svgGroup || !x || !y) {
        if (chartContainer.value) d3.select(chartContainer.value).selectAll("*").remove();
        if (hasData) initChart();
        return;
      }

      const { data, backgroundData, bins, color, xAxisLabelFormatter, yAxisLabelFormatter, showGridLines, showTicks, fixedXDomain } = props;

      const allData = [...data.map(d => d.sentiment), ...(backgroundData?.map(d => d.sentiment) || [])];
      const xDomain = fixedXDomain || d3.extent(allData) as [number, number];
      x.domain(xDomain);

      const histogram = d3.histogram<DataObject, number>()
        .value(d => d.sentiment)
        .domain(x.domain() as [number, number])
        .thresholds(typeof bins === 'number' ? x.ticks(bins) : bins as number[]);

      const binnedData = histogram(data);
      const binnedBackgroundData = histogram(backgroundData || []);

      const n = data.length || 1;
      const n_bg = backgroundData?.length || 1;
      const binWidth = (xDomain[1] - xDomain[0]) / (typeof bins === 'number' ? bins : (bins as number[]).length - 1);

      const yMaxHist = d3.max([...binnedData, ...binnedBackgroundData], d => d.length) || 0;
      y.domain([0, yMaxHist * 1.1 || 1]);

      drawAxesAndGrid();
      drawBars(binnedData, binnedBackgroundData, binWidth, n, n_bg);
    }

    function drawAxesAndGrid() {
      const { xAxisLabelFormatter, yAxisLabelFormatter, showTicks, showGridLines } = props;
      const t = svg!.transition().duration(transitionDuration);

      svgGroup!.select<SVGGElement>('.x-axis')
        .transition(t as any)
        .call(d3.axisBottom(x!).tickFormat(xAxisLabelFormatter || (d => d.toString())))
        .selectAll("text").attr("class", "text-gray-600 text-xs");

      if (showTicks) {
        svgGroup!.select<SVGGElement>('.y-axis')
          .transition(t as any)
          .call(d3.axisLeft(y!).tickFormat(yAxisLabelFormatter || (d => d.toString())))
          .selectAll("text").attr("class", "text-gray-600 text-xs");
      } else {
        svgGroup!.select<SVGGElement>('.y-axis').selectAll('*').remove();
      }

      if (showGridLines) {
        svgGroup!.select<SVGGElement>('.grid')
          .transition(t as any)
          .call(d3.axisLeft(y!).ticks(5).tickSize(-innerWidth).tickFormat(null as any))
          .selectAll("line").attr("stroke", "#e5e7eb").attr("stroke-dasharray", "2,2");
      } else {
        svgGroup!.select<SVGGElement>('.grid').selectAll('*').remove();
      }
    }

    function drawBars(binnedData: d3.Bin<DataObject, number>[], binnedBackgroundData: d3.Bin<DataObject, number>[], binWidth: number, n: number, n_bg: number) {
      const { color } = props;

      const bgBars = svgGroup!.selectAll<SVGRectElement, d3.Bin<DataObject, number>>(".bg-bar").data(binnedBackgroundData, d => d.x0 as any);
      bgBars.exit()
        .transition().duration(transitionDuration)
        .attr("y", innerHeight)
        .attr("height", 0)
        .remove();

      bgBars.enter().append("rect")
        .attr("class", "bg-bar")
        .attr("x", d => x!(d.x0 || 0))
        .attr("y", innerHeight)
        .attr("width", d => Math.max(0, x!(d.x1 || 0) - x!(d.x0 || 0) - 1))
        .attr("height", 0)
        .attr("fill", d => typeof color === 'function' ? color((d.x0! + d.x1!) / 2) : color || neutralBaseColor)
        .attr("opacity", 0.3)
        .on("mouseover", (event, d) => {
          emit('bar-mouseover', { event, data: d, background: true });
        })
        .on("mouseout", (event, d) => {
          emit('bar-mouseout', { event, data: d, background: true });
        })
        .merge(bgBars)
        .transition().duration(transitionDuration)
        .attr("x", d => x!(d.x0 || 0))
        .attr("y", d => y!(d.length))
        .attr("width", d => Math.max(0, x!(d.x1 || 0) - x!(d.x0 || 0) - 1))
        .attr("height", d => innerHeight - y!(d.length));

      const bars = svgGroup!.selectAll<SVGRectElement, d3.Bin<DataObject, number>>(".bar").data(binnedData, d => d.x0 as any);
      bars.exit()
        .transition().duration(transitionDuration)
        .attr("y", innerHeight)
        .attr("height", 0)
        .remove();

      bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x!(d.x0 || 0))
        .attr("y", innerHeight)
        .attr("width", d => Math.max(0, x!(d.x1 || 0) - x!(d.x0 || 0) - 1))
        .attr("height", 0)
        .attr("fill", d => typeof color === 'function' ? color((d.x0! + d.x1!) / 2) : color || neutralBaseColor)
        .style('cursor', 'pointer')
        .on("click", (event, d) => {
          emit('bar-click', d);
        })
        .on("mouseover", (event, d) => {
          emit('bar-mouseover', { event, data: d });
        })
        .on("mouseout", (event, d) => {
          emit('bar-mouseout', { event, data: d });
        })
        .merge(bars)
        .transition().duration(transitionDuration)
        .attr("x", d => x!(d.x0 || 0))
        .attr("y", d => y!(d.length))
        .attr("width", d => Math.max(0, x!(d.x1 || 0) - x!(d.x0 || 0) - 1))
        .attr("height", d => innerHeight - y!(d.length));
    }

    let resizeObserver: ResizeObserver;

    onMounted(() => {
      if (chartContainer.value) {
        resizeObserver = new ResizeObserver(() => {
          nextTick(() => {
            initChart();
            updateChart();
          });
        });
        resizeObserver.observe(chartContainer.value);
      }
      nextTick(() => {
        initChart();
        updateChart();
      });
    });

    onBeforeUnmount(() => {
      if (resizeObserver && chartContainer.value) {
        resizeObserver.unobserve(chartContainer.value);
      }
    });

    watch(() => [props.data, props.backgroundData], () => {
      nextTick(updateChart);
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
