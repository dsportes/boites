<template>
    <q-dialog v-model="dialoguecrypto">
      <q-card class="q-ma-xs moyennelargeur">
        <q-card-section>
          <div class="titre-2">Crytographie</div>
          <q-btn flat label="Lancer le test de crypto" color="primary" @click="testcrypto" />
          <q-btn flat label="Lancer le test courant" color="primary" @click="testEcho"/>
        </q-card-section>
        <phrase-secrete class="q-ma-xs" v-on:ok-ps="okps" icon-valider="check" verif label-valider="OK"></phrase-secrete>
        <mdp-admin class="q-ma-xs" v-on:ok-mdp="okmdp"></mdp-admin>
        <q-card-section>
          <div class='t1'>Hash de la ligne 1</div>
          <div class='t2'>{{ ps ? ps.dpbh : '?'}}</div>
          <div class='t1'>Clé X (PBKFD de la phrase complète)</div>
          <div class='t2'>{{ ps ? ps.pcb64 : '?' }}</div>
          <div class='t1'>Hash de la clé X</div>
          <div class='t2'>{{ ps ? ps.pcbh : '?' }}</div>
          <div class='t1'>Mot de passe</div>
          <div class='t2'>{{ mdp ? mdp.mdp64 : '?'}}</div>
          <div class='t1'>Hash du mot de passe</div>
          <div class='t2'>{{ mdp ? mdp.mdph : '?' }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" icon-right="close" color="primary" @click="ps=null;$store.commit('ui/majdialoguecrypto',false)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
const crypt = require('../app/crypto')
import PhraseSecrete from '../components/PhraseSecrete.vue'
import MdpAdmin from '../components/MdpAdmin.vue'
import { post, affichermessage, afficherdiagnostic, testEcho } from '../app/util'

export default ({
  name: 'DialogueCrypto',

  components: {
    PhraseSecrete, MdpAdmin
  },

  data () {
    return {
      ps: null,
      mdp: null
    }
  },

  methods: {
    okps (ps) {
      this.ps = ps
    },
    okmdp (mdp) {
      this.mdp = mdp
    },

    testcrypto () {
      crypt.test()
    },
    async test2 () {
      try {
        const r = await post('m1', 'erreur', { code: -99, message: 'erreur volontaire', detail: 'détail ici', to: 20 }, 'test2')
        console.log('testok ' + JSON.stringify(r))
      } catch (e) {
        console.log('testko ' + JSON.stringify(e))
      }
    },
    testm () {
      affichermessage('toto est beau', new Date().getMilliseconds() % 2)
    },
    async testEcho () {
      try {
        await testEcho(10)
      } catch (e) {
        console.log('>>>>' + e)
      }
    },
    testc () {
      crypt.test2()
    },
    testd () {
      afficherdiagnostic('mon <b>diagnostic</b>')
    },
    async testidb () {
      const l = await indexedDB.databases()
      l.forEach(db => { console.log(db) })
    }
  },

  setup () {
    const $store = useStore()
    return {
      dialoguecrypto: computed({
        get: () => $store.state.ui.dialoguecrypto,
        set: (val) => $store.commit('ui/majdialoguecrypto', val)
      })
    }
  }
})
</script>

<style lang="sass">
@import '../css/app.sass'
.t1
  font-size: 1.1rem
  font-weight: bold
  font-style: italic
.t2
  font-size: 1rem
  font-family: 'Roboto Mono'
</style>
