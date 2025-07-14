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
          
          <!-- Interactive background for axis label -->
          <rect
            :x="(dragState.isDragging && dragState.draggedIndex === i ? dragState.dragX : xScale(i)) - getTextWidth(metricLabels[metric]) / 2 - 6"
            :y="innerHeight + 8"
            :width="getTextWidth(metricLabels[metric]) + 12"
            height="20"
            rx="10"
            ry="10"
            :fill="getAxisBackgroundColor(i)"
            :opacity="getAxisBackgroundOpacity(i)"
            class="cursor-move"
            @mousedown="startDrag(i, $event)"
            @mouseover="handleAxisHover(i)"
            @mouseleave="handleAxisLeave"
          />
          
          <text 
            :x="dragState.isDragging && dragState.draggedIndex === i ? dragState.dragX : xScale(i)" 
            :y="innerHeight + 20" 
            text-anchor="middle" 
            class="text-sm font-bold cursor-move select-none pointer-events-none"
            :class="{ 
              'fill-blue-600': dragState.isDragging && dragState.draggedIndex === i, 
              'fill-red-500': dragState.isDragging && dragState.dropIndex === i && dragState.dropIndex !== dragState.draggedIndex,
              'opacity-50': dragState.isDragging && dragState.draggedIndex !== i
            }"
          >
            {{ metricLabels[metric] }}
          </text>
          <line :x1="xScale(i)-4" :x2="xScale(i)+4" :y1="yScale(metric, 0)" :y2="yScale(metric, 0)" stroke="#999" />
          <text :x="xScale(i)-6" :y="yScale(metric,0)+4" text-anchor="end" class="text-xs font-semibold">0</text>
          <line :x1="xScale(i)-4" :x2="xScale(i)+4" :y1="yScale(metric, adjustedDomains[metric].max)" :y2="yScale(metric, adjustedDomains[metric].max)" stroke="#999" />
          <text :x="xScale(i)-6" :y="yScale(metric, adjustedDomains[metric].max)+4" text-anchor="end" class="text-xs font-semibold">
            {{ adjustedDomains[metric].max }}
          </text>
        </g>
        
        <!-- Drag preview line -->
        <line 
          v-if="dragState.isDragging && dragState.dropIndex !== -1 && dragState.dropIndex !== dragState.draggedIndex"
          :x1="xScale(dragState.dropIndex)" 
          :y1="-10" 
          :x2="xScale(dragState.dropIndex)" 
          :y2="innerHeight + 30" 
          stroke="red" 
          stroke-width="3" 
          opacity="0.7"
        />

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
    <div
      v-if="tooltip.visible"
      :style="{
        position: 'absolute',
        left: tooltip.x + 'px',
        top: tooltip.y + 'px'
      }"
      class="px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg pointer-events-none"
    >
      {{ tooltip.name }}
    </div>
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
      containerHeight: 0,
      tooltip: { visible: false, x: 0, y: 0, name: '' },
      dragState: {
        isDragging: false,
        draggedIndex: -1,
        dropIndex: -1,
        startX: 0,
        dragX: 0
      },
      hoveredAxisIndex: -1
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
    this.setupGlobalDragListeners();
  },
  beforeUnmount() {
    this.removeGlobalDragListeners();
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
      this.hoveredPoints = this.metrics.map((m, i) => ({
        metric: m,
        x: this.xScale(i),
        y: this.yScale(m, line.values[m] || 0),
        value: line.values[m] || 0
      }));

      const rect = this.$refs.container.getBoundingClientRect();
      this.tooltip.x = event.clientX - rect.left + 10;
      this.tooltip.y = event.clientY - rect.top + 10;
      this.tooltip.name = line.name || line.id;
      this.tooltip.visible = true;

      this.$emit('hover', line.id, event);
    },
    handleLeave() {
      this.hoveredPoints = null;
      this.hoveredId = null;
      this.tooltip.visible = false;
      this.$emit('leave');
    },
    
    // Drag and drop methods
    startDrag(index, event) {
      event.preventDefault();
      this.dragState.isDragging = true;
      this.dragState.draggedIndex = index;
      this.dragState.startX = event.clientX;
      this.dragState.dragX = this.xScale(index);
      this.dragState.dropIndex = -1;
      
      document.body.style.cursor = 'grabbing';
    },
    
    setupGlobalDragListeners() {
      this.handleMouseMove = (event) => {
        if (!this.dragState.isDragging) return;
        
        const rect = this.$refs.container.getBoundingClientRect();
        const svgX = event.clientX - rect.left - this.margin.left;
        
        //update drag position
        this.dragState.dragX = svgX;
        
        // Find the closest axis
        let closestIndex = -1;
        let minDistance = Infinity;
        
        for (let i = 0; i < this.metrics.length; i++) {
          const axisX = this.xScale(i);
          const distance = Math.abs(svgX - axisX);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        }
        
        // Only show drop indicator if we're close enough to an axis (within 50px)
        if (minDistance < 50) {
          this.dragState.dropIndex = closestIndex;
        } else {
          this.dragState.dropIndex = -1;
        }
      };
      
      this.handleMouseUp = () => {
        if (this.dragState.isDragging) {
          const { draggedIndex, dropIndex } = this.dragState;
          
          if (dropIndex !== -1 && dropIndex !== draggedIndex) {
            // Emit reorder event
            this.$emit('reorder-axes', draggedIndex, dropIndex);
          }
          
          // Reset drag state
          this.dragState.isDragging = false;
          this.dragState.draggedIndex = -1;
          this.dragState.dropIndex = -1;
          this.dragState.dragX = 0;
          document.body.style.cursor = '';
        }
      };
      
      document.addEventListener('mousemove', this.handleMouseMove);
      document.addEventListener('mouseup', this.handleMouseUp);
    },
    
    removeGlobalDragListeners() {
      if (this.handleMouseMove) {
        document.removeEventListener('mousemove', this.handleMouseMove);
      }
      if (this.handleMouseUp) {
        document.removeEventListener('mouseup', this.handleMouseUp);
      }
    },
    
    handleAxisHover(index) {
      if (!this.dragState.isDragging) {
        // Show that axis is draggable
        document.body.style.cursor = 'grab';
      }
      this.hoveredAxisIndex = index;
    },
    
    handleAxisLeave() {
      if (!this.dragState.isDragging) {
        document.body.style.cursor = '';
      }
      this.hoveredAxisIndex = -1;
    },
    
    // Helper methods for styling
    getTextWidth(text) {
      // Approximate text width calculation - could be improved with actual measurement
      return text.length * 7; // Rough estimate for 14px font
    },
    
    getAxisBackgroundColor(index) {
      if (this.dragState.isDragging && this.dragState.draggedIndex === index) {
        return '#3b82f6'; // Blue for dragged
      }
      if (this.dragState.isDragging && this.dragState.dropIndex === index && this.dragState.dropIndex !== this.dragState.draggedIndex) {
        return '#ef4444'; // Red for drop target
      }
      if (this.hoveredAxisIndex === index) {
        return '#6b7280'; // Gray for hover
      }
      return '#9ca3af'; // Default gray
    },
    
    getAxisBackgroundOpacity(index) {
      if (this.dragState.isDragging && this.dragState.draggedIndex === index) {
        return 0.8;
      }
      if (this.dragState.isDragging && this.dragState.dropIndex === index && this.dragState.dropIndex !== this.dragState.draggedIndex) {
        return 0.7;
      }
      if (this.hoveredAxisIndex === index) {
        return 0.6;
      }
      return 0.3; // Default subtle background
    }
  }
};
</script>

<style scoped>
/* Drag and drop styles */
.select-none {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.cursor-move {
  cursor: move;
}

.cursor-move:hover {
  cursor: grab;
}

.cursor-move:active {
  cursor: grabbing;
}

.pointer-events-none {
  pointer-events: none;
}

/* Transition for smooth axis label color changes */
text, rect {
  transition: fill 0.2s ease-in-out, opacity 0.2s ease-in-out;
}
</style>
