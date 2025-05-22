<template>
  <div>

  </div>
</template>

<script>
import { useEntityStore } from '../stores/entityStore';

export default {
  name: "EntityComponent",
  async mounted() {
    console.log("EntityComponent mounted")
    const store = useEntityStore()
    await store.init()
  }

}
</script>

<style scoped></style>
