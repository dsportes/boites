<template>
<q-dialog v-model="dialoguehelp">
  <q-card>
    <q-card-section>
      <div class="text-h6">Terms of Agreement</div>
    </q-card-section>

    <q-separator />

    <q-card-section style="max-height: 50vh" class="scroll">
      <div v-if="md && !$q.dark.isActive" :class="taclass() + ' col'">
        <sd-light class="markdown-body" :texte="texte"/>
      </div>
      <div v-if="md && $q.dark.isActive" :class="taclass() + ' col'">
        <sd-dark class="markdown-body" :texte="texte"/>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-actions align="right">
      <q-btn flat label="Decline" color="primary" v-close-popup />
      <q-btn flat label="Accept" color="primary" v-close-popup />
    </q-card-actions>
  </q-card>
</q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import SdLight from './SdLight.vue'
import SdDark from './SdDark.vue'

export default ({
  name: 'DialogueHelp',

  components: { SdLight, SdDark },

  data () {
    return {
    }
  },

  computed: {
    pagecode () {
      return this.helpstack[this.helpstack.length - 1]
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const dialoguehelp = computed({
      get: () => $store.state.ui.dialoguehelp,
      set: (val) => $store.commit('ui/majdialoguehelp', val)
    })
    const helpstack = computed({
      get: () => $store.state.ui.helpstack
    })

    return {
      dialoguehelp,
      helpstack
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'

</style>
