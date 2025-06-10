<template>
  <div v-if="isReady">
    <!-- <NodeLinkGraph :nodes="entities.nodes" :edges="skeleton.edges" /> -->
    <div class="flex">
      <AdjacencyMatrix class="flex-auto" :entities="entities" :filter="filterJo" />
      <AdjacencyMatrix class="flex-auto" :entities="entities" :filter="filterTr" />
      <AdjacencyMatrix class="flex-auto" :entities="entities" :filter="filterFi" />
    </div>
  </div>
  <div v-else>
    Loading...
    {{ entities }}
  </div>
</template>

<script>
import { useGraphStore } from '../stores/graphStore.ts'
// import NodeLinkGraph from './NodeLinkGraph.vue'
import AdjacencyMatrix from './AdjacencyMatrix.vue'

export default {
  name: 'GraphView',
  components: {
    // NodeLinkGraph,
    AdjacencyMatrix
  },
  data() {
    return {
      isReady: false,
      filterJo: ["jo"],
      filterTr: ["tr"],
      filterFi: ["fi"]
    }
  },
  watch: {
    entities(newVal, oldVal) {
      if (newVal.length > 0) {
        this.isReady = true
      }
    }
  },
  computed: {
    entities() {
      const store = useGraphStore()
      return store.sentimentPerTopic
    }
  },
  async beforeCreate() {
    const store = useGraphStore()
    await store.init()
  }
}
</script>
