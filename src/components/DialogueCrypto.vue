<template>
    <q-dialog v-model="dialoguecrypto">
      <q-card  style="width:500px;max-width:80vw;">
        <q-card-section>
          <div class="text-h6">Crytographie</div>
          <q-btn flat label="Lancer le test de crypto" color="primary" @click="testcrypto" />
        </q-card-section>
        <phrase-secrete class="q-ma-xs" v-on:ok-ps="okps" icon-valider="check" label-valider="OK"></phrase-secrete>
        <mdp-admin class="q-ma-xs" v-on:ok-mdp="okmdp"></mdp-admin>
        <quotas-volume class="q-ma-xs" v-on:ok-quotas="okq"></quotas-volume>
        <q-card-section>
          <div class='t1'>Hash de la ligne 1</div>
          <div class='t2'>{{ ps ? ps.dpbh : '?'}}</div>
          <div class='t1'>SHA de la clé X (PBKFD de la phrase complète)</div>
          <div class='t2'>{{ ps ? ps.pcbs64 : '?' }}</div>
          <div class='t1'>Hash du SHA de la clé X</div>
          <div class='t2'>{{ ps ? ps.pcbsh : '?' }}</div>
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
import QuotasVolume from '../components/QuotasVolume.vue'
import { Quotas } from '../app/db'

export default ({
  name: 'DialogueCrypto',

  components: {
    PhraseSecrete, MdpAdmin, QuotasVolume
  },

  data () {
    return {
      ps: null,
      mdp: null
    }
  },

  methods: {
    testcrypto () {
      crypt.test()
    },
    okps (ps) {
      this.ps = ps
    },
    okmdp (mdp) {
      this.mdp = mdp
    },
    okq (q) {
      console.log('Quotas : ' + JSON.stringify(new Quotas(q)))
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
