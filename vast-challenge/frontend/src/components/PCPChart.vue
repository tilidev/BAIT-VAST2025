<template>
  <div class="relative">
    <svg :width="width" :height="height" class="bg-white border">
      <!-- Translate to account for margins -->
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- Axes and ticks -->
        <g v-for="(metric, i) in metrics" :key="metric">
          <line :x1="xScale(i)" y1="0" :x2="xScale(i)" :y2="innerHeight" stroke="#ccc" />
          <!-- Axis label (bold) -->
          <text :x="xScale(i)" :y="innerHeight + 20" text-anchor="middle" class="text-sm font-bold">
            {{ metricLabels[metric] }}
          </text>
          <!-- Zero tick -->
          <line :x1="xScale(i)-4" :x2="xScale(i)+4" :y1="yScale(metric, 0)" :y2="yScale(metric, 0)" stroke="#999" />
          <text :x="xScale(i)-6" :y="yScale(metric,0)+4" text-anchor="end" class="text-xs font-semibold">0</text>
          <!-- Max tick -->
          <line :x1="xScale(i)-4" :x2="xScale(i)+4" :y1="yScale(metric,adjustedDomains[metric].max)" :y2="yScale(metric,adjustedDomains[metric].max)" stroke="#999" />
          <text :x="xScale(i)-6" :y="yScale(metric,adjustedDomains[metric].max)+4" text-anchor="end" class="text-xs font-semibold">
            {{ adjustedDomains[metric].max }}
          </text>
        </g>

        <!-- Polylines with hover jitter animation -->
        <g>
          <!-- Invisible thicker path for hover detection -->
          <g v-for="line in lines" :key="line.id">
            <polyline
              :points="computePoints(line.values)"
              stroke="transparent"
              fill="none"
              :stroke-width="jitter + (line.strokeWidth || 3)"
              style="pointer-events: stroke"
              @mouseover="handleHover(line, $event)"
              @mouseleave="handleLeave"
              @click="$emit('select', line.id)"
            />
            <!-- Visible jittered line -->
            <polyline
              :points="computePoints(line.values)"
              :stroke="line.color"
              fill="none"
              :opacity="line.opacity"
              :stroke-width="line.strokeWidth || 3"
              class="cursor-pointer"
              :transform="`translate(${computeOffset(line.id)}, 0)`"
              style="pointer-events: none; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
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
    lines:        { type: Array,  required: true },
    metrics:      { type: Array,  required: true },
    metricLabels: { type: Object, required: true },
    domains:      { type: Object, required: true },
    width:        { type: Number, default: 600 },
    height:       { type: Number, default: 350 },
  },
  data() {
    return {
      margin: { top: 20, right: 30, bottom: 40, left: 30 },
      hoveredPoints: null,
      hoveredId: null,
      jitter: 20
    };
  },
  computed: {
    innerWidth() { return this.width - this.margin.left - this.margin.right; },
    innerHeight() { return this.height - this.margin.top - this.margin.bottom; },
    adjustedDomains() {
      const adj = {};
      this.metrics.forEach(m => {
        const orig = this.domains[m] || { min: 0, max: 1 };
        adj[m] = { min: 0, max: orig.max };
      });
      return adj;
    }
  },
  methods: {
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
        .map((m, i) => [
          this.xScale(i),
          this.yScale(m, values[m] || 0)
        ])
        .map(pt => pt.join(','))
        .join(' ');
    },
    computeOffset(id) {
      if (this.hoveredId !== id) return 0;
      const sigMap = {};
      this.lines.forEach(line => {
        const sig = this.metrics.map(m => line.values[m] || 0).join('|');
        sigMap[sig] = sigMap[sig] || [];
        sigMap[sig].push(line.id);
      });
      const sig = this.metrics.map(m => this.lines.find(l => l.id === id).values[m] || 0).join('|');
      const group = sigMap[sig];
      const idx = group.indexOf(id);
      const count = group.length;
      return (idx - (count - 1) / 2) * this.jitter;
    },
    handleHover(line, event) {
      this.hoveredId = line.id;
      this.hoveredPoints = this.metrics.map((m, i) => ({
        metric: m,
        x: this.xScale(i) + this.computeOffset(line.id),
        y: this.yScale(m, line.values[m] || 0) + this.computeOffset(line.id),
        value: line.values[m] || 0
      }));
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
/* Additional styling if needed */
</style>
