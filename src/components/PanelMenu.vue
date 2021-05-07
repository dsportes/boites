<template>
  <q-list>
    <q-item-section>
      <q-item-label header class="text-grey-8">Build : {{ $cfg.build }}</q-item-label>
    </q-item-section>
    <q-item-section>
      <q-item>
      <q-btn flat label="Panneau cryptographie" color="primary" @click="crypto" />
      </q-item>
    </q-item-section>
  </q-list>
</template>

<script>
// import { useStore } from 'vuex'
// import { computed } from 'vue'

export default ({
  name: 'PanelMenu',

  data () {
    return {
    }
  },

  methods: {
    crypto () {
      this.$store.commit('ui/majdialoguecrypto', true)
      this.$store.commit('ui/majmenuouvert', false)
    }
  },

  setup () {
    // const $store = useStore()
    return {
    }
  }

})
</script>
