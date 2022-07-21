<template>
    <q-dialog v-model="dialoguecrypto">
      <q-card class="moyennelargeur fs-md">
        <q-card-section>
          <div class="titre-lg text-center">Crytographie</div>
          <!--q-btn flat label="Test trig" color="primary" @click="testtrig" /-->
          <q-btn flat label="Test de crypto" color="primary" @click="testcrypto" />
          <bouton-help page="page1"/>
        </q-card-section>
        <q-card-section>
        </q-card-section>
        <q-card-section class="q-ma-xs">
          <phrase-secrete v-on:ok-ps="okps" icon-valider="check" label-ok="OK"></phrase-secrete>
        </q-card-section>
        <q-card-section class="q-ma-xs">
          <div class='t1'>Hash de la ligne 1</div>
          <div class='t2'>{{ ps ? ps.dpbh : '?'}}</div>
          <div class='t1'>Clé X (PBKFD de la phrase complète)</div>
          <div class='t2'>{{ ps ? ps.pcb64 : '?' }}</div>
          <div class='t1'>Hash de la clé X</div>
          <div class='t2'>{{ ps ? ps.pcbh : '?' }}</div>
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
import { crypt } from '../app/crypto.mjs'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import { post, testEcho, getTrigramme } from '../app/util.mjs'

export default ({
  name: 'DialogueCrypto',

  components: { PhraseSecrete, BoutonHelp },

  watch: {
    forfaits (ap) {
      console.log('Forfaits', this.forfaits[0], this.forfaits[1])
    }
  },

  data () {
    return {
      forfaits: [2, 3],
      ps: null,
      isPwd: false
    }
  },

  methods: {
    okps (ps) {
      this.ps = ps
    },
    async testcrypto () {
      await crypt.test1()
      await crypt.test2()
    },
    async testtrig () {
      const t = await getTrigramme()
      console.log(t)
    },
    async test2 () {
      try {
        const r = await post('m1', 'erreur', { code: -99, message: 'erreur volontaire', detail: 'détail ici', to: 20 }, 'test2')
        console.log('testok ' + JSON.stringify(r))
      } catch (e) {
        console.log('testko ' + JSON.stringify(e))
      }
    },
    async testEcho () {
      try {
        await testEcho(0)
      } catch (e) {
        console.log('>>>>' + e)
      }
    },
    testHelp () {
      this.$store.commit('ui/pushhelp', 'page1')
    }
  },

  setup () {
    const $store = useStore()
    const dialoguecrypto = computed({
      get: () => $store.state.ui.dialoguecrypto,
      set: (val) => $store.commit('ui/majdialoguecrypto', val)
    })

    return {
      dialoguecrypto
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.t1
  font-style: italic
  color: $primary
.t2
  font-family: 'Roboto Mono'
</style>
