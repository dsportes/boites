<template>
  <q-scroll-area style="height:80vh;width:22rem">
  <q-card class="shadow-8">
    <q-card-actions vertical>
      <q-btn flat dense color="primary" size="md" icon="add" label="Nouveau contact"/>
    </q-card-actions>
    <q-separator/>
  </q-card>
</q-scroll-area>
</template>

<script>

export default ({
  name: 'PanelFiltreContacts',

  props: { },

  components: { },

  computed: {
  },

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
  }

})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.q-btn--dense
  padding: 1px !important
</style>
