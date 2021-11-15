<template>
  <q-dialog v-model="dialoguetestping">
    <q-card class="q-ma-xs moyennelargeur">
      <q-card-section>
        <div class="titre-2">Accès au serveur distant</div>
        <div v-if="mode === 1 || mode === 2">
          <q-btn dense label="Ping du serveur" color="primary" @click="pingsrv"/>
          <div>{{ resultat1 }}</div>
        </div>
        <div v-else>Possible seulement en mode incognito ou synchronisé</div>
      </q-card-section>
      <q-card-section>
        <div class="titre-2">Accès à la base de l'organisation sur le serveur distant</div>
        <div v-if="(mode === 1 || mode === 2) && org != null">
          <q-btn dense label="Ping de la base sur le serveur" color="primary" @click="pingsrvdb"/>
          <div>{{ resultat2 }}</div>
        </div>
        <div v-else>Possible seulement en mode incognito ou synchronisé et si l'organisation a été choisie</div>
      </q-card-section>
      <q-card-section>
        <div class="titre-2">Accès à la base locale d'un compte</div>
        <div v-if="(mode === 1 || mode === 3) && sessionId != null">
          <q-btn dense label="Ping de la base locale" color="primary" @click="pingIDB"/>
          <div>{{ resultat3 }}</div>
        </div>
        <div v-else>Possible seulement en mode avion ou synchronisé après connexion à un compte</div>
      </q-card-section>
      <q-card-actions align="right">
          <q-btn flat label="Fermer" color="primary" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>
<script>
import { ping, post } from '../app/util'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { data } from '../app/modele'
import { getEtat } from '../app/db'

export default ({
  name: 'DialogueTestPing',

  data () {
    return {
      resultat1: '-',
      resultat2: '-',
      resultat3: '-'
    }
  },

  methods: {
    async pingsrv () {
      this.resultat1 = '-'
      const ret = await ping()
      this.resultat1 = ret ? 'OK : ' + ret : 'KO'
    },
    async pingsrvdb () {
      this.resultat2 = '-'
      let ret = null
      try {
        ret = await post(null, 'm1', 'pingdb', {})
        this.resultat2 = ret ? 'OK : ' + new Date(ret.dhc / 1000).toISOString() : 'KO'
      } catch (e) {
        this.resultat2 = 'KO : ' + e.message
      }
    },
    async pingIDB () {
      if (!data.db) {
        this.resultat3 = 'La base n\'est pas accessible avant connexion à un compte en mode synchronisé ou avion'
      } else {
        this.resultat3 = '-'
        try {
          await getEtat()
          this.resultat3 = 'OK'
        } catch (e) {
          this.resultat3 = 'KO'
        }
      }
    }
  },

  setup () {
    const $store = useStore()
    const dialoguetestping = computed({
      get: () => $store.state.ui.dialoguetestping,
      set: (val) => $store.commit('ui/majdialoguetestping', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const sessionId = computed(() => $store.state.ui.sessionid)
    const org = computed(() => $store.state.ui.org)
    const compte = computed(() => $store.state.db.compte)
    return {
      dialoguetestping,
      sessionId,
      mode,
      org,
      compte
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.q-card__section
  padding: 5px
</style>
