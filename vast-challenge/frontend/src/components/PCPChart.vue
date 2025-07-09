<template>
  <div ref="container" class="w-full h-full relative">
    <svg
      class="bg-white border block w-full h-full"
      :viewBox="`0 0 ${containerWidth} ${containerHeight}`"
      preserveAspectRatio="none"
    >
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- Axes and ticks -->
        <g v-for="(metric, i) in metrics" :key="metric">
          <line :x1="xScale(i)" y1="0" :x2="xScale(i)" :y2="innerHeight" stroke="#ccc" />
          <text :x="xScale(i)" :y="innerHeight + 20" text-anchor="middle" class="text-sm font-bold">
            {{ metricLabels[metric] }}
          </text>
          <line :x1="xScale(i)-4" :x2="xScale(i)+4" :y1="yScale(metric, 0)" :y2="yScale(metric, 0)" stroke="#999" />
          <text :x="xScale(i)-6" :y="yScale(metric,0)+4" text-anchor="end" class="text-xs font-semibold">0</text>
          <line :x1="xScale(i)-4" :x2="xScale(i)+4" :y1="yScale(metric, adjustedDomains[metric].max)" :y2="yScale(metric, adjustedDomains[metric].max)" stroke="#999" />
          <text :x="xScale(i)-6" :y="yScale(metric, adjustedDomains[metric].max)+4" text-anchor="end" class="text-xs font-semibold">
            {{ adjustedDomains[metric].max }}
          </text>
        </g>

        <!-- Polylines -->
        <g>
          <g v-for="line in lines" :key="line.id">
            <polyline
              :points="computePoints(line.values)"
              stroke="transparent"
              fill="none"
              :stroke-width="jitter * 2 + (line.strokeWidth || 3)"
              style="pointer-events: stroke"
              @mouseover="handleHover(line, $event)"
              @mouseleave="handleLeave"
              @click="$emit('select', line.id)"
            />
            <polyline
              :points="computePoints(line.values)"
              :stroke="line.color"
              fill="none"
              :opacity="line.opacity"
              :stroke-width="line.strokeWidth || 3"
              class="cursor-pointer"
              :transform="`translate(${getOffset(line.id).x}, ${getOffset(line.id).y})`"
              style="pointer-events: none; transition: transform 0.3s ease-out"
            />
          </g>
        </g>

        <!-- Hover markers -->
        <g v-if="hoveredPoints">
          <circle v-for="pt in hoveredPoints" :key="pt.metric" :cx="pt.x" :cy="pt.y" r="4" fill="red" />
          <text v-for="pt in hoveredPoints" :key="pt.metric+'-label'" :x="pt.x+6" :y="pt.y-6" class="text-xs font-semibold">
            {{ pt.value }}
          </text>
        </g>
      </g>
    </svg>
    <slot name="tooltip"></slot>
  </div>
</template>

<script>
export default {
  name: 'PCPChart',
  props: {
    lines: { type: Array, required: true },
    metrics: { type: Array, required: true },
    metricLabels: { type: Object, required: true },
    domains: { type: Object, required: true },
  },
  data() {
    return {
      margin: { top: 20, right: 30, bottom: 40, left: 30 },
      hoveredPoints: null,
      hoveredId: null,
      jitter: 10,
      containerWidth: 0,
      containerHeight: 0
    };
  },
  computed: {
    innerWidth() {
      return this.containerWidth - this.margin.left - this.margin.right;
    },
    innerHeight() {
      return this.containerHeight - this.margin.top - this.margin.bottom;
    },
    adjustedDomains() {
      const adj = {};
      this.metrics.forEach(m => {
        const orig = this.domains[m] || { min: 0, max: 1 };
        adj[m] = { min: 0, max: orig.max };
      });
      return adj;
    },
    jitterInfo() {
      const groups = {};
      this.lines.forEach(line => {
        const sig = this.metrics.map(m => line.values[m] || 0).join('|');
        (groups[sig] = groups[sig] || []).push(line.id);
      });
      const info = {};
      Object.values(groups).forEach(group => group.forEach((id, idx) => (info[id] = { idx, count: group.length })));
      return info;
    }
  },
  mounted() {
    this.observeSize();
  },
  methods: {
    observeSize() {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          this.containerWidth = entry.contentRect.width;
          this.containerHeight = entry.contentRect.height;
        }
      });
      resizeObserver.observe(this.$refs.container);
    },
    xScale(i) {
      return (this.innerWidth / (this.metrics.length - 1)) * i;
    },
    yScale(metric, value) {
      const { min, max } = this.adjustedDomains[metric];
      if (max === min) return this.innerHeight / 2;
      return this.innerHeight - ((value - min) / (max - min)) * this.innerHeight;
    },
    computePoints(values) {
      return this.metrics
        .map((m, i) => `${this.xScale(i)},${this.yScale(m, values[m] || 0)}`)
        .join(' ');
    },
    getOffset(id) {
      if (this.hoveredId !== id) return { x: 0, y: 0 };
      const { idx, count } = this.jitterInfo[id] || { idx: 0, count: 1 };
      const offset = (idx - (count - 1) / 2) * this.jitter;
      return { x: offset, y: -offset };
    },
    handleHover(line, event) {
      this.hoveredId = line.id;
      this.hoveredPoints = this.metrics.map((m, i) => ({ metric: m, x: this.xScale(i), y: this.yScale(m, line.values[m] || 0), value: line.values[m] || 0 }));
      this.$emit('hover', line.id, event);
    },
    handleLeave() {
      this.hoveredPoints = null;
      this.hoveredId = null;
      this.$emit('leave');
    }
  }
};
</script>

<style scoped>
/* No extra styles; sizing via ResizeObserver and viewBox */
</style>