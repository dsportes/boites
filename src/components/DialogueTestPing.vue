<template>
  <q-dialog v-model="dialoguetestping">
    <q-card class="q-ma-xs moyennelargeur">
      <q-card-section>
        <div class="titre-2">Accès au serveur distant</div>
        <div v-if="mode === 1 || mode === 2">
          <q-btn dense label="Ping du serveur" color="primary" @click="pingsrv"/>
          <div>{{ resultat1a }}</div>
          <div>{{ resultat1b }}</div>
        </div>
        <div v-else>Possible seulement en mode incognito ou synchronisé</div>
      </q-card-section>
      <q-card-section>
        <div class="titre-2">Accès à la base de l'organisation sur le serveur distant</div>
        <div v-if="(mode === 1 || mode === 2) && org != null">
          <q-btn dense label="Ping de la base sur le serveur" color="primary" @click="pingsrvdb"/>
          <div>{{ resultat2a }}</div>
          <div>{{ resultat2b }}</div>
        </div>
        <div v-else>Possible seulement en mode incognito ou synchronisé et si l'organisation a été choisie</div>
      </q-card-section>
      <q-card-section>
        <div class="titre-2">Accès à la base locale d'un compte</div>
        <div v-if="sessionok && (mode === 1 || mode === 3)">
          <q-btn dense label="Ping de la base locale" color="primary" @click="pingIDB"/>
          <div>{{ resultat3a }}</div>
          <div>{{ resultat3b }}</div>
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
import { ping, post, appexc } from '../app/util'
import { computed } from 'vue'
import { useStore } from 'vuex'
import { data } from '../app/modele'
import { getEtat } from '../app/db'
import { E_SRV, AppExc } from '../app/api.mjs'

export default ({
  name: 'DialogueTestPing',

  data () {
    return {
      resultat1a: '-',
      resultat1b: '-',
      resultat2a: '-',
      resultat2b: '-',
      resultat3a: '-',
      resultat3b: '-'
    }
  },

  methods: {
    async pingsrv () {
      this.resultat1a = '-'
      this.resultat1b = '-'
      try {
        const ret = await ping()
        this.resultat1a = 'OK'
        this.resultat1b = ret
      } catch (e) {
        const ex = new AppExc(E_SRV, e.message, e.stack)
        data.setErWS(ex)
        const m = data.degraderMode()
        this.resultat1a = 'KO' + (m ? ' - ' + m : '')
        this.resultat1b = ex.message
      }
    },
    async pingsrvdb () {
      this.resultat2a = '-'
      this.resultat2b = '-'
      try {
        const ret = await post(null, 'm1', 'pingdb', {})
        this.resultat2a = 'OK'
        this.resultat2b = new Date(ret.dhc / 1000).toISOString()
      } catch (e) {
        const ex = appexc(e)
        const m = data.degraderMode()
        this.resultat2a = 'KO' + (m ? ' - ' + m : '')
        this.resultat2b = ex.message
      }
    },
    async pingIDB () {
      if (!data.db) {
        this.resultat3a = 'La base n\'est pas accessible avant connexion à un compte en mode synchronisé ou avion'
      } else {
        this.resultat3a = '-'
        this.resultat3b = '-'
        try {
          await getEtat()
          this.resultat3a = 'OK'
        } catch (e) {
          const ex = appexc(e)
          const m = data.degraderMode()
          this.resultat3a = 'KO' + (m ? ' - ' + m : '')
          this.resultat3b = ex.message
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
    const mode = computed(() => $store.state.ui.modeinitial)
    const sessionok = computed(() => $store.state.ui.sessionok)
    const org = computed(() => $store.state.ui.org)
    return {
      dialoguetestping,
      sessionok,
      mode,
      org
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.q-card__section
  padding: 5px
</style>
