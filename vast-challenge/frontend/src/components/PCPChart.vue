<template>
  <div ref="container" class="w-full h-full relative">
    <svg
      class="block w-full h-full"
      :viewBox="`0 0 ${containerWidth} ${containerHeight}`"
      preserveAspectRatio="none"
    >
      <!-- Excluded lines list -->
      <g class="excluded-list" :transform="`translate(20, ${margin.top})`">
        <text v-if="excludedLines.length > 0" y="10" class="text-sm font-semibold fill-gray-600">Excluded</text>
        <g v-for="(line, i) in excludedLines" :key="line.id" @click="toggleExclusion(line.id)" class="cursor-pointer" @mouseover="showActionTooltip($event, `Include ${line.name || line.id}`)" @mouseleave="hideActionTooltip()">
          <text :y="30 + i * 16" class="text-xs">
            <tspan class="fill-green-600 font-bold text-sm">+</tspan>
            <tspan dx="5" class="fill-gray-700">{{ line.name || line.id }}</tspan>
          </text>
        </g>
      </g>
      <g :transform="`translate(${margin.left}, ${margin.top})`">
        <!-- Axes and ticks -->
        <g v-for="(metric, i) in metrics" :key="metric">
          <line :x1="xScale(i)" y1="0" :x2="xScale(i)" :y2="innerHeight" stroke="#ccc" />
          
          <!-- Interactive background for axis label -->
          <rect
            :x="(dragState.isDragging && dragState.draggedIndex === i ? dragState.dragX : xScale(i)) - getTextWidth(metricLabels[metric]) / 2 - 8"
            :y="innerHeight + 5"
            :width="getTextWidth(metricLabels[metric]) + 16"
            height="20"
            rx="9"
            ry="9"
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
          <!-- Min value label -->
          <text :x="xScale(i)" :y="innerHeight + 5" text-anchor="middle" class="text-xs fill-black">{{ adjustedDomains[metric].min }}</text>

          <!-- Max value label -->
          <text :x="xScale(i)" :y="-5" text-anchor="middle" class="text-xs fill-black">
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
          <g v-for="line in visibleLines" :key="line.id">
            <g
              class="cursor-pointer"
              @click="toggleExclusion(line.id)"
              @mouseover="hoveredExclusionId = line.id; showActionTooltip($event, `Exclude ${line.name || line.id}`)"
              @mouseleave="hoveredExclusionId = null; hideActionTooltip()"
            >
              <rect 
                :x="xScale(0) - 22" 
                :y="yScale(metrics[0], line.values[metrics[0]] || 0) - 8" 
                width="16" 
                height="16" 
                rx="4" 
                class="fill-white stroke-gray-300 hover:fill-red-100"
              />
              <text 
                :x="xScale(0) - 14" 
                :y="yScale(metrics[0], line.values[metrics[0]] || 0)" 
                dy="0.35em" 
                text-anchor="middle" 
                class="fill-red-500 font-bold select-none pointer-events-none"
              >
                -
              </text>
            </g>
            <polyline
              :points="computePoints(line.values)"
              stroke="transparent"
              fill="none"
              :stroke-width="jitter * 2 + (line.strokeWidth || 3)"
              style="pointer-events: stroke"
              @mouseover="handleHover(line, $event)"
              @mouseleave="handleLeave()"
              @click="handleClick(line)"
            />
            <polyline
              :points="computePoints(line.values)"
              :stroke="getLineStyle(line).stroke"
              fill="none"
              :opacity="getLineStyle(line).opacity"
              :stroke-width="getLineStyle(line).strokeWidth"
              class="cursor-pointer"
              :transform="`translate(${getOffset(line.id).x}, ${getOffset(line.id).y})`"
              style="pointer-events: none; transition: transform 0.3s ease-out, opacity 0.3s ease-out, stroke-width 0.3s ease-out"
            />
          </g>
        </g>

        <!-- Hover markers -->
        <g v-if="hoveredPoints">
          <g v-for="pt in hoveredPoints" :key="pt.metric">
            <circle :cx="pt.x" :cy="pt.y" r="4" fill="#6b7280" />
            <text :x="pt.x+6" :y="pt.y-6" class="text-xs fill-black">
              {{ pt.value }}
            </text>
          </g>
        </g>
      </g>
    </svg>
    <div
      v-if="actionTooltip.visible"
      :style="{
        position: 'absolute',
        left: actionTooltip.x + 'px',
        top: actionTooltip.y + 'px'
      }"
      class="pointer-events-none p-2 rounded-md shadow-lg bg-gray-800 text-white text-xs transition z-50"
    >
      {{ actionTooltip.text }}
    </div>
    <div
      v-if="tooltip.visible"
      :style="{
        position: 'absolute',
        left: tooltip.x + 'px',
        top: tooltip.y + 'px'
      }"
      class="pointer-events-none p-3 rounded-lg shadow-lg bg-white border border-gray-200 text-sm text-gray-800 transition max-w-xs z-50"
    >
      <div class="font-semibold text-blue-700">{{ tooltip.name }}</div>
      <div v-if="tooltip.role" class="text-gray-600 text-xs mt-1">
        Role: {{ tooltip.role }}
      </div>
      <div v-if="tooltip.metrics" class="mt-2 space-y-1">
        <div v-for="(value, metric) in filteredMetrics" :key="metric" class="flex justify-between text-xs">
          <div v-if="metricLabels[metric]">
            <span class="text-gray-600">{{ metricLabels[metric] || metric }}: </span>
            <span class="text-gray-800 font-medium">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useLinkingStore } from '../stores/linkingStore';
import { neutralBaseColor } from '../utils/colors';

export default {
  name: 'PCPChart',
  props: {
    lines: { type: Array, required: true },
    metrics: { type: Array, required: true },
    metricLabels: { type: Object, required: true },
    domains: { type: Object, required: true },
    disableSelectionHighlighting: { type: Boolean, default: false }
  },
  setup() {
    const linkingStore = useLinkingStore();
    return { linkingStore };
  },
  data() {
    return {
      margin: { top: 20, right: 50, bottom: 40, left: 150 },
      hoveredPoints: null,
      hoveredId: null,
      jitter: 10,
      containerWidth: 0,
      containerHeight: 0,
      tooltip: { visible: false, x: 0, y: 0, name: '', role: '', metrics: null },
      dragState: {
        isDragging: false,
        draggedIndex: -1,
        dropIndex: -1,
        startX: 0,
        dragX: 0
      },
      hoveredAxisIndex: -1,
      excludedIds: new Set(),
      animatedDomains: {},
      hoveredExclusionId: null,
      actionTooltip: { visible: false, x: 0, y: 0, text: '' },
    };
  },
  watch: {
    adjustedDomains: {
      handler(newVal, oldVal) {
        if (!oldVal || Object.keys(oldVal).length === 0 || Object.keys(this.animatedDomains).length === 0) {
          this.animatedDomains = JSON.parse(JSON.stringify(newVal));
          return;
        }

        const startDomains = JSON.parse(JSON.stringify(this.animatedDomains));
        const endDomains = JSON.parse(JSON.stringify(newVal));
        
        let startTime = null;
        const duration = 300; // ms

        const animate = (timestamp) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);

          const currentDomains = {};
          for (const metric in endDomains) {
            const start = startDomains[metric] || endDomains[metric];
            const end = endDomains[metric];
            currentDomains[metric] = {
              min: start.min + (end.min - start.min) * progress,
              max: start.max + (end.max - start.max) * progress,
            };
          }
          this.animatedDomains = currentDomains;

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        requestAnimationFrame(animate);
      },
      deep: true,
      immediate: true,
    }
  },
  computed: {
    selectedPerson() {
      return this.linkingStore.selectedPerson;
    },
    visibleLines() {
      return this.lines.filter(line => !this.excludedIds.has(line.id));
    },
    excludedLines() {
      return this.lines.filter(line => this.excludedIds.has(line.id));
    },
    filteredMetrics() {
        return Object.fromEntries(
          Object
            .entries(this.tooltip.metrics)
            .filter(([metric, value]) => this.metricLabels[metric])
      );
    },
    innerWidth() {
      return this.containerWidth - this.margin.left - this.margin.right;
    },
    innerHeight() {
      return this.containerHeight - this.margin.top - this.margin.bottom;
    },
    adjustedDomains() {
      const adj = {};
      this.metrics.forEach(metric => {
        if (this.visibleLines.length === 0) {
          adj[metric] = { min: 0, max: 1 };
          return;
        }

        const values = this.visibleLines.map(line => line.values[metric] || 0);
        let minVal = Math.min(...values);
        let maxVal = Math.max(...values);

        if (minVal === maxVal) {
          maxVal = minVal + 1;
        }

        adj[metric] = { min: minVal, max: maxVal };
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
      const domain = this.animatedDomains[metric];
      if (!domain || Object.keys(domain).length === 0) {
        return 0; // Should be populated immediately by watcher
      }
      const { min, max } = domain;
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
    getLineStyle(line) {
      const isSelected = this.selectedPerson === line.id;
      const isHovered = this.hoveredId === line.id || this.hoveredExclusionId === line.id;
      const hasSelection = this.selectedPerson !== '' && !this.disableSelectionHighlighting;

      let stroke = line.color;
      let opacity = line.opacity || 0.7;
      let strokeWidth = line.strokeWidth || 2;

      if (hasSelection) {
        if (isSelected) {
          stroke = neutralBaseColor;
          opacity = 1;
          strokeWidth = 4;
        } else {
          opacity = 0.1;
          strokeWidth = 1;
        }
      }

      if (isHovered) {
        stroke = neutralBaseColor;
        opacity = 1;
        strokeWidth = 3;
      }

      return { stroke, opacity, strokeWidth };
    },
    showActionTooltip(event, text) {
      const rect = this.$refs.container.getBoundingClientRect();
      this.actionTooltip.x = event.clientX - rect.left + 15;
      this.actionTooltip.y = event.clientY - rect.top + 15;
      this.actionTooltip.text = text;
      this.actionTooltip.visible = true;
    },
    hideActionTooltip() {
      this.actionTooltip.visible = false;
    },
    toggleExclusion(lineId) {
      if (this.excludedIds.has(lineId)) {
        this.excludedIds.delete(lineId);
      } else {
        this.excludedIds.add(lineId);
      }
      this.excludedIds = new Set(this.excludedIds); // for reactivity
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
      this.tooltip.role = line.role || '';
      this.tooltip.metrics = line.values || {};
      this.tooltip.visible = true;

      this.$emit('hover', line.id, event);
    },
    handleLeave() {
      this.hoveredPoints = null;
      this.hoveredId = null;
      this.tooltip.visible = false;
      this.tooltip.role = '';
      this.tooltip.metrics = null;
      this.$emit('leave');
    },

    handleClick(line) {
      if (this.linkingStore.selectedPerson === line.id) {
        this.linkingStore.setPersonId('');
      } else {
        this.linkingStore.setPersonId(line.id);
      }
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
      // Approximate text width calculation for text-xs (12px font)
      // A rough estimate: 12px font usually has a character width of about 6-7px
      return text.toString().length * 7; 
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
