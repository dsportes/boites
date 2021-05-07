<template>
    <q-dialog v-model="dialoguecrypto">
      <q-card  style="width:500px;max-width:80vw;">
        <q-card-section>
          <div class="text-h6">Crytographie</div>
          <q-btn flat label="Lancer le test de crypto" color="primary" @click="testcrypto" />
        </q-card-section>
        <phrase-secrete v-on:ok-ps="crypter" bouton-check></phrase-secrete>
        <q-card-section>
          <div class='t1'>PBKFD2 de la ligne 1</div>
          <div class='t2'>{{ dpb }}</div>
          <div class='t1'>Son hash</div>
          <div class='t2'>{{ dpbh }}</div>
          <div class='t1'>PBKFD2 de la phrase complète (clé X)</div>
          <div class='t2'>{{ pcb }}</div>
          <div class='t1'>SHA de la clé X</div>
          <div class='t2'>{{ pcbs }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" icon-right="close" color="primary" @click="raz();$store.commit('ui/majdialoguecrypto',false)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed } from 'vue'
import { test, pbkfd, hash53, sha256 } from '../app/crypto'
import PhraseSecrete from '../components/PhraseSecrete.vue'
const base64url = require('base64url')

export default ({
  name: 'DialogueCrypto',

  components: {
    PhraseSecrete
  },

  data () {
    return {
      dpb: '?',
      dpbh: '?',
      pcb: '?',
      pcbs: '?'
    }
  },

  methods: {
    testcrypto () {
      test()
    },
    crypter (arg) {
      this.raz('Calcul en cours ...')
      setTimeout(() => {
        this.dpb = base64url(pbkfd(arg[0]))
        this.dpbh = hash53(this.dpb)
        const clex = pbkfd(arg[0] + '\n' + arg[1])
        this.pcb = base64url(clex)
        this.pcbs = base64url(sha256(clex))
      }, 1)
    },
    raz (m) {
      this.dpb = m || '?'
      this.dpbh = '?'
      this.pcb = '?'
      this.pcbs = '?'
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
