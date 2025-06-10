<template>
    <div>
        <div>
            <div class="layoutJSON">
                Displayed as <code>[x, y, w, h]</code>:
                <div class="columns">
                    <div class="layoutItem" v-for="item in layout" :key="item.i">
                        <b>{{ item.i }}</b>: [{{ item.x }}, {{ item.y }}, {{ item.w }}, {{ item.h }}]
                    </div>
                </div>
            </div>
        </div>
        <br/>
        <div class="flex space-x-4 mb-4">
            <div @drag="drag" @dragend="dragend" class="droppable-element" draggable="true"
                 unselectable="on" data-component-type="GraphView">Drag Graph View</div>
            <div @drag="drag" @dragend="dragend" class="droppable-element" draggable="true"
                 unselectable="on" data-component-type="GeoJsonMap">Drag GeoJSON Map</div>
        </div>
        <div id="content">
            <GridLayout
                :ref="setLayoutRef"
                v-model:layout="layout"
                :col-num="colNum"
                :row-height="30"
                :is-draggable="true"
                :is-resizable="true"
                :vertical-compact="true"
                :use-css-transforms="true"
            >
                <GridItem
                    v-for="item in layout"
                    :key="item.i"
                    :ref="e => setItemRef(item, e)"
                    :x="item.x"
                    :y="item.y"
                    :w="item.w"
                    :h="item.h"
                    :i="item.i"
                >
                    <!-- <span class="text">{{ item.i }}</span> -->
                    <span class="remove" @click="removeItem(item.i)">x</span>
                    <GraphView v-if="item.component === 'GraphView'" />
                    <GeoJsonMap v-else-if="item.component === 'GeoJsonMap'" />
                </GridItem>
            </GridLayout>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, nextTick } from 'vue';
import { GridLayout, GridItem } from 'vue-grid-layout-v3';
import GraphView from './GraphView.vue'; // Import GraphView
import GeoJsonMap from './GeoJsonMap.vue'; // Import GeoJsonMap

interface LayoutItem {
    x: number;
    y: number;
    w: number;
    h: number;
    i: string;
    static?: boolean;
    component?: string; // Add a component type
}

interface DragPos {
    x: number | null;
    y: number | null;
    w: number;
    h: number;
    i: string | null;
}

export default defineComponent({
    name: 'GridLayoutContainer',
    components: {
        GridLayout,
        GridItem,
        GraphView, // Register GraphView
        GeoJsonMap, // Register GeoJsonMap
    },
    data() {
        return {
            mouseXY: { x: null as number | null, y: null as number | null },
            DragPos: { x: null, y: null, w: 1, h: 1, i: null } as DragPos,
            draggedComponentType: null as string | null, // New property to store dragged component type
            layout: [
                { x: 0, y: 0, w: 2, h: 2, i: '0' },
                { x: 2, y: 0, w: 2, h: 4, i: '1' },
                { x: 4, y: 0, w: 2, h: 5, i: '2' },
                { x: 6, y: 0, w: 2, h: 3, i: '3' },
                { x: 8, y: 0, w: 2, h: 3, i: '4' },
                { x: 10, y: 0, w: 2, h: 3, i: '5' },
                { x: 0, y: 5, w: 2, h: 5, i: '6' },
                { x: 2, y: 5, w: 2, h: 5, i: '7' },
                { x: 4, y: 5, w: 2, h: 5, i: '8' },
                { x: 5, y: 10, w: 4, h: 3, i: '9' },
            ] as LayoutItem[],
            colNum: 12,
            layoutRef: {} as any, // Type for GridLayout instance
            itemRefs: {} as { [key: string]: any }, // Type for GridItem instances
        };
    },
    mounted() {
        document.addEventListener('dragover', this.updateMouseXY, false);
    },
    beforeUnmount() {
        document.removeEventListener('dragover', this.updateMouseXY, false);
    },
    methods: {
        updateMouseXY(e: DragEvent) {
            this.mouseXY.x = e.clientX;
            this.mouseXY.y = e.clientY;
        },
        async drag(event: DragEvent) {
            this.draggedComponentType = (event.target as HTMLElement).dataset.componentType || null;

            const parentRect = document.getElementById('content')?.getBoundingClientRect();
            if (!parentRect) return;

            let mouseInGrid = false;
            if (((this.mouseXY.x! > parentRect.left) && (this.mouseXY.x! < parentRect.right)) && ((this.mouseXY.y! > parentRect.top) && (this.mouseXY.y! < parentRect.bottom))) {
                mouseInGrid = true;
            }

            if (mouseInGrid === true && (this.layout.findIndex(item => item.i === 'drop')) === -1) {
                this.layout.push({
                    x: (this.layout.length * 2) % (this.colNum || 12),
                    y: this.layout.length + (this.colNum || 12), // puts it at the bottom
                    w: 1,
                    h: 1,
                    i: 'drop',
                });
                await nextTick();
            }

            if (!this.itemRefs?.drop) {
                return;
            }

            const index = this.layout.findIndex(item => item.i === 'drop');
            if (index !== -1) {
                if (this.itemRefs?.drop?.el?.style) {
                    this.itemRefs.drop.el.style.display = 'none';
                }
                const itemRef = this.itemRefs.drop;
                const new_pos = itemRef.calcXY(this.mouseXY.y! - parentRect.top, this.mouseXY.x! - parentRect.left);
                if (mouseInGrid === true) {
                    this.layoutRef.emitter.emit('dragEvent', ['dragstart', 'drop', new_pos.x, new_pos.y, 1, 1]);
                    this.DragPos.i = String(index);
                    this.DragPos.x = this.layout[index].x;
                    this.DragPos.y = this.layout[index].y;
                }
                if (mouseInGrid === false) {
                    this.layoutRef.emitter.emit('dragEvent', ['dragend', 'drop', new_pos.x, new_pos.y, 1, 1]);
                    this.layout = this.layout.filter(obj => obj.i !== 'drop');
                    await nextTick();
                }
            }
        },
        async dragend() {
            const parentRect = document.getElementById('content')?.getBoundingClientRect();
            if (!parentRect) return;

            let mouseInGrid = false;
            if (((this.mouseXY.x! > parentRect.left) && (this.mouseXY.x! < parentRect.right)) && ((this.mouseXY.y! > parentRect.top) && (this.mouseXY.y! < parentRect.bottom))) {
                mouseInGrid = true;
            }

            if (mouseInGrid === true) {
                this.layoutRef.emitter.emit('dragEvent', ['dragend', 'drop', this.DragPos.x, this.DragPos.y, 1, 1]);
                this.layout = this.layout.filter(obj => obj.i !== 'drop');

                const newItemId = `${this.draggedComponentType || 'item'}-${Date.now()}`; // Unique ID for new item
                let newW = 4;
                let newH = 6;

                if (this.draggedComponentType === 'GeoJsonMap') {
                    newW = 6; // Example default size for map
                    newH = 8; // Example default size for map
                }

                this.layout.push({
                    x: this.DragPos.x!,
                    y: this.DragPos.y!,
                    w: newW,
                    h: newH,
                    i: newItemId,
                    component: this.draggedComponentType || undefined, // Specify component type
                });
                await nextTick();
                this.layoutRef.emitter.emit('dragEvent', ['dragend', newItemId, this.DragPos.x, this.DragPos.y, newW, newH]);
            }
        },
        setItemRef(item: LayoutItem, e: any) {
            this.itemRefs[item.i] = e;
        },
        setLayoutRef(e: any) {
            this.layoutRef = e;
        },
        removeItem(val: string) {
            const index = this.layout.findIndex(item => item.i === val);
            if (index !== -1) {
                this.layout.splice(index, 1);
            }
        },
    },
});
</script>

<style scoped>
.vue-grid-layout {
    background: #eee;
}

.vue-grid-item:not(.vue-grid-placeholder) {
    background: #ccc;
    border: 1px solid black;
}

.vue-grid-item.static {
    background: #cce;
}

.vue-grid-item .text {
    font-size: 24px;
    text-align: center;
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    margin: auto;
    height: 100%;
    width: 100%;
}

.vue-grid-item .remove {
    position: absolute;
    right: 2px;
    top: 0;
    cursor: pointer;
}

.droppable-element {
    width: 150px;
    text-align: center;
    background: #fdd;
    border: 1px solid black;
    margin: 10px 0;
    padding: 10px;
}
.layoutJSON {
    background: #ddd;
    border: 1px solid black;
    margin-top: 10px;
    padding: 10px;
}

.columns {
    columns: 120px;
}
</style>
