<template>
    <q-dialog v-model="infoidb">
      <q-card class="moyennelargeur fs-md">
        <q-card-section>
          <div class="titre-lg text-center">Accès à la base locale</div>
        </q-card-section>
        <q-card-section>
          <q-avatar size="md">
            <img src="~assets/database_gris.svg">
          </q-avatar>
          <span :class="mode === 2 || mode === 0 || !sessionok ? 'text-bold text-primary' : ''">
            Il n'y a pas d'accès à la base locale avant connexion à un compte ou en mode incognito
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar size="md">
            <img src="~assets/database_vert.svg">
          </q-avatar>
          <span :class="(mode === 1 || mode === 3) && statutidb === 1 && sessionok ? 'text-bold text-primary' : ''">
              La base locale est accessible : un compte est connecté en mode synchronisé ou avion
          </span>
        </q-card-section>
        <q-card-section>
          <q-avatar square size="md">
            <img src="~assets/database_rouge.svg" class="bord">
          </q-avatar>
          <span :class="(mode === 1 || mode === 3) && statutidb === 2 && sessionok ? 'text-bold text-primary' : ''">
              Erreur d'accès à la base locale (corrompue ? détruite ?). Un compte est connecté en mode synchronisé ou avion.
              Les opérations de mise à jour sont interdites jusqu'à une reconnexion réussie.
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
import { computed /*, onMounted */ } from 'vue'

export default ({
  name: 'DialogueInfoIdb',

  data () {
    return {
    }
  },

  methods: {
  },

  setup () {
    const $store = useStore()
    const mode = computed(() => $store.state.ui.mode)
    const statutidb = computed(() => $store.state.ui.statutidb)
    const sessionok = computed(() => $store.state.ui.sessionok)
    const infoidb = computed({
      get: () => $store.state.ui.infoidb,
      set: (val) => $store.commit('ui/majinfoidb', val)
    })
    const dialoguetestping = computed({
      get: () => $store.state.ui.dialoguetestping,
      set: (val) => $store.commit('ui/majdialoguetestping', val)
    })

    // onMounted(() => { console.log('Infoidb ', mode.value, statutidb.value, sessionok.value) })

    return {
      mode,
      infoidb,
      statutidb,
      sessionok,
      dialoguetestping
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.bord
  border: 2px solid $negative
</style>
