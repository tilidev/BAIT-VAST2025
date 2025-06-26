<template>
    <div>
        <div class="controls">
            <label>Active Dataset:</label>
            <select v-model="activeDataset" @change="updateForces">
                <option v-for="ds in datasets" :key="ds" :value="ds">{{ ds }}</option>
            </select>

            <label style="margin-left: 20px;">
                <input type="checkbox" v-model="excludeOrganizations" @change="onFilterToggle" />
                Exclude ENTITY_ORGANIZATION
            </label>

            <label style="margin-left: 20px;">
                Left Industry:
                <select v-model="leftIndustry" @change="onFilterToggle">
                    <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
                </select>
            </label>

            <label style="margin-left: 10px;">
                Right Industry:
                <select v-model="rightIndustry" @change="onFilterToggle">
                    <option v-for="ind in industries" :key="ind" :value="ind">{{ ind }}</option>
                </select>
            </label>
        </div>

        <div class="scale-container">
            <!-- Left column -->
            <div class="column-wrapper left" :style="getColumnStyle('left')">
                <svg ref="svgLeft" :width="svgWidth" :height="svgHeight" />
            </div>

            <!-- Scale beam -->
            <div class="scale-base" :style="{ transform: `translateX(-50%) rotate(${tippingAngle}deg)` }" />
            <div class="pivot-dot" />

            <!-- Right column -->
            <div class="column-wrapper right" :style="getColumnStyle('right')">
                <svg ref="svgRight" :width="svgWidth" :height="svgHeight" />
            </div>
        </div>
    </div>
</template>

<script>
import * as d3 from 'd3';

export default {
    name: 'IndustrySentimentBubbles',
    data() {
        return {
            svgWidth: 300,
            svgHeight: 500,
            allData: [],
            leftNodes: [],
            rightNodes: [],
            leftSim: null,
            rightSim: null,
            activeDataset: 'all',
            datasets: ['all'],
            industries: [],
            leftIndustry: '',
            rightIndustry: '',
            excludeOrganizations: false
        };
    },
    computed: {
        tippingAngle() {
            const leftSum = this.leftNodes
                .filter(this.isActive)
                .reduce((sum, n) => sum + n.data.agg_sentiment, 0);
            const rightSum = this.rightNodes
                .filter(this.isActive)
                .reduce((sum, n) => sum + n.data.agg_sentiment, 0);
            const total = leftSum + rightSum;
            const relative = total === 0 ? 0 : (leftSum - rightSum) / total;
            const scale = d3.scaleLinear().domain([-1, 1]).range([-15, 15]);
            return scale(relative);
        }
    },
    methods: {
        async fetchData() {
            const res = await fetch('/api/industry-pro-contra-sentiments');
            const data = await res.json();
            this.allData = data;

            // Setup datasets and industries
            this.datasets = ['all', ...new Set(data.map(d => d.dataset))];
            this.industries = [...new Set(data.map(d => d.industry))];
            if (!this.leftIndustry) this.leftIndustry = this.industries[0] || '';
            if (!this.rightIndustry) this.rightIndustry = this.industries[1] || this.industries[0] || '';

            this.updateAll();
        },
        onFilterToggle() {
            this.updateAll();
        },
        updateAll() {
            this.splitNodesBySupportedSide();
            this.renderChart(this.leftNodes, this.$refs.svgLeft, 'left');
            this.renderChart(this.rightNodes, this.$refs.svgRight, 'right');
        },
        splitNodesBySupportedSide() {
            this.leftNodes = [];
            this.rightNodes = [];
            const areaScale = d3.scaleSqrt().domain([0, 1]).range([5, 30]);
            this.allData.forEach(d => {
                if (d.agg_sentiment === 0) return;
                if (this.excludeOrganizations && d.entity_type === 'ENTITY_ORGANIZATION') return;
                if (![this.leftIndustry, this.rightIndustry].includes(d.industry)) return;
                const node = { radius: areaScale(Math.abs(d.agg_sentiment)), data: d };
                const positive = d.agg_sentiment > 0;
                const supportsLeft =
                    (d.industry === this.leftIndustry && positive) ||
                    (d.industry === this.rightIndustry && !positive);
                if (supportsLeft) this.leftNodes.push(node);
                else this.rightNodes.push(node);
            });
        },
        isActive(node) {
            return this.activeDataset === 'all' || node.data.dataset === this.activeDataset;
        },
        renderChart(nodes, svgRef, side) {
            const svg = d3.select(svgRef);
            svg.selectAll('*').remove();
            // circles
            const group = svg.selectAll('g').data(nodes).enter().append('g');
            group
                .append('circle')
                .attr('r', d => d.radius)
                .attr('fill', d => {
                    const active = this.isActive(d);
                    if (!active) return 'grey';
                    return d.data.agg_sentiment < 0 ? 'orange' : 'steelblue';
                });
            group
                .append('text')
                .attr('text-anchor', 'middle')
                .style('pointer-events', 'none')
                .style('font-size', '9px')
                .style('fill', 'white')
                .selectAll('tspan')
                .data(d => [d.data.entity_id, `${d.data.agg_sentiment.toFixed(2)} | ${d.data.dataset}`])
                .enter()
                .append('tspan')
                .attr('x', 0)
                .attr('dy', (d, i) => i === 0 ? '-0.3em' : '1.1em')
                .text(d => d);
            // simulation
            const sim = d3.forceSimulation(nodes)
                .force('x', d3.forceX(this.svgWidth / 2).strength(0.05))
                .force('y', d3.forceY(d => (this.isActive(d) ? this.svgHeight : 0)).strength(0.1))
                .force('collide', d3.forceCollide(d => d.radius + 2))
                .alphaDecay(0.02)
                .alpha(0.7)
                .on('tick', () => {
                    group.attr('transform', d => {
                        d.x = Math.max(d.radius, Math.min(this.svgWidth - d.radius, d.x));
                        d.y = Math.max(d.radius, Math.min(this.svgHeight - d.radius, d.y));
                        return `translate(${d.x},${d.y})`;
                    });
                });
            if (side === 'left') this.leftSim = sim;
            else this.rightSim = sim;
        },
        updateForces() {
            [
                { sim: this.leftSim, nodes: this.leftNodes, ref: this.$refs.svgLeft },
                { sim: this.rightSim, nodes: this.rightNodes, ref: this.$refs.svgRight }
            ].forEach(({ sim, nodes, ref }) => {
                if (!sim) return;
                sim
                    .force('y', d3.forceY(d => (this.isActive(d) ? this.svgHeight : 0)).strength(0.1))
                    .alphaDecay(0.02)
                    .alpha(0.7)
                    .restart();
                d3.select(ref).selectAll('circle').attr('fill', d => {
                    const active = this.isActive(d);
                    if (!active) return 'grey';
                    return d.data.agg_sentiment < 0 ? 'orange' : 'steelblue';
                });
            });
        },
        getColumnStyle(side) {
            const tilt = this.tippingAngle;
            const rad = (tilt * Math.PI) / 180;
            const half = this.svgWidth / 2;
            const offset = Math.sin(rad) * half;
            const translateY = side === 'left' ? offset : -offset;
            const rotate = tilt / 2;
            return {
                transform: `translateY(${translateY}px) rotate(${rotate}deg)`,
                zIndex: 2
            };
        }
    },
    mounted() {
        this.fetchData();
    },
    beforeDestroy() {
        if (this.leftSim) this.leftSim.stop();
        if (this.rightSim) this.rightSim.stop();
    }
};
</script>

<style scoped>
.controls {
    text-align: center;
    margin-bottom: 10px;
}

.scale-container {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    position: relative;
    margin-top: 40px;
}

.column-wrapper {
    width: 300px;
    height: 500px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    transition: transform 0.6s ease;
    position: relative;
}

.scale-base {
    position: absolute;
    bottom: -5px;
    left: 50%;
    width: 700px;
    height: 16px;
    background: black;
    border-radius: 6px;
    transform-origin: center bottom;
    transition: transform 0.6s ease;
    z-index: 1;
}

.pivot-dot {
    position: absolute;
    bottom: -10px;
    left: 50%;
    width: 20px;
    height: 20px;
    background: #222;
    border-radius: 50%;
    transform: translateX(-50%);
    z-index: 2;
}

svg {
    background: transparent;
    z-index: 2;
}

select {
    padding: 4px 8px;
}
</style>