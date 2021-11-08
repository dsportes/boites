<template>
    <q-dialog v-model="inforeseau">
      <q-card class="q-ma-xs moyennelargeur">
        <q-card-section>
          <div class="titre-2">Etat d'accès au réseau (mode synchronisé et incognito)</div>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="sync_alt" color="grey-4" />
          <span :class="statutnet === 0  ? 'text-bold text-primary' : ''">
            Le réseau et le serveur central ne sont pas accédés avant connexion à un compte ou en mode avion.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon size="md" name="sync_alt" color="green" />
          <span :class="statutnet === 1 ? 'text-bold text-primary' : ''">
            Les échanges / synchronisations avec le serveur sont opérationnels.
          </span>
        </q-card-section>
        <q-card-section>
          <q-icon name="sync_alt" size="md" color="warning"/>
          <span :class="statutnet === 2 ? 'text-bold text-primary' : ''">
            Les échanges / synchronisations avec le serveur ont été interrompus :
            les opérations de mise à jour sont interdites jusqu'à ce que la session ait été resynchronisée.
          </span>
        </q-card-section>
        <q-card-actions  align="left">
          <q-btn v-if="(mode === 1 || mode === 2)" dense size="md" color="primary"
            icon="logout" label="Tests d'accès à la base et au serveur" @click="dialoguetestping = true" v-close-popup/>
        </q-card-actions>
        <q-card-actions align="right">
          <q-btn flat label="J'ai lu" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'

export default ({
  name: 'DialogueInfoReseau',

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const mode = computed(() => $store.state.ui.mode)
    const statutnet = computed(() => $store.state.ui.statutnet)
    const inforeseau = computed({
      get: () => $store.state.ui.inforeseau,
      set: (val) => $store.commit('ui/majinforeseau', val)
    })
    const dialoguetestping = computed({
      get: () => $store.state.ui.dialoguetestping,
      set: (val) => $store.commit('ui/majdialoguetestping', val)
    })

    return {
      mode,
      inforeseau,
      statutnet,
      dialoguetestping
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
