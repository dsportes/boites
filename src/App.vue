<template>
  <router-view />
</template>
<script>
import { setstore } from './app/util'
import { useStore } from 'vuex'
export default ({
  name: 'App',
  setup () {
    setstore(useStore())
  }
})
</script>
