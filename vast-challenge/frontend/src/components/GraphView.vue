<template>
  <div v-if="isReady">
    <!-- <NodeLinkGraph :nodes="entities.nodes" :edges="skeleton.edges" /> -->
    <AdjacencyMatrix :entities="entities" />
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
      isReady: false
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
