<template>
  <router-view />
</template>
<script>
import { getCurrentInstance } from 'vue'
import { setgp } from './app/util'

export default ({
  name: 'App',
  setup () {
    setgp(getCurrentInstance().appContext.config.globalProperties)
  }
})
</script>
