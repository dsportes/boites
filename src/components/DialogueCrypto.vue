<template>
    <q-dialog v-model="dialoguecrypto">
      <q-card class="q-ma-xs moyennelargeur fs-md">
        <q-card-section>
          <div class="titre-lg text-center">Crytographie</div>
          <q-btn flat label="Test de crypto" color="primary" @click="testcrypto" />
          <q-btn flat label="Test msg" color="primary" @click="testm"/>
          <q-btn flat label="CV" color="primary" @click="cvloc=true"/>
          <q-btn flat label="TS" color="primary" @click="testsecrets=true"/>
          <bouton-help page="page1"/>
          <editeur-md ref="edmd" :texte="memo" v-model="texteedite" editable label-ok="Valider" v-on:ok="memook"></editeur-md>
        </q-card-section>
        <q-card-section class="q-ma-xs">
          <phrase-secrete v-on:ok-ps="okps" icon-valider="check" verif label-ok="OK"></phrase-secrete>
          <mdp-admin class="q-ma-xs" v-on:ok-mdp="okmdp"></mdp-admin>
        </q-card-section>
        <q-card-section class="q-ma-xs">
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
      <q-dialog v-model="cvloc">
        <carte-visite :nomc="nomc" :close="closecv" info-init="Mon info initiale" photo-init="" @ok="okcv"/>
      </q-dialog>
      <q-dialog v-model="testsecrets">
        <test-secrets></test-secrets>
      </q-dialog>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed, ref } from 'vue'
import { crypt } from '../app/crypto.mjs'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import MdpAdmin from '../components/MdpAdmin.vue'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import CarteVisite from '../components/CarteVisite.vue'
import TestSecrets from '../components/TestSecrets.vue'
import { post, affichermessage, afficherdiagnostic, testEcho, NomAvatar } from '../app/util.mjs'

export default ({
  name: 'DialogueCrypto',

  components: {
    PhraseSecrete, MdpAdmin, EditeurMd, BoutonHelp, CarteVisite, TestSecrets
  },

  watch: {
    texteedite (ap) {
      console.log(ap)
    }
  },

  data () {
    return {
      ps: null,
      mdp: null,
      memo: 'Mon beau memo',
      cvloc: false,
      testsecrets: false,
      texteedite: '',
      nomc: new NomAvatar('Toto', true).nomc
    }
  },

  methods: {
    memook (m) {
      console.log(m.substring(0, 10))
      this.edmd.undo()
      setTimeout(() => { this.memo = m }, 3000)
    },
    okps (ps) {
      this.ps = ps
    },
    okmdp (mdp) {
      this.mdp = mdp
    },
    okcv (resultat) {
      if (resultat) {
        console.log('CV changée : ' + resultat.info + ' lgph: ' + resultat.ph.length)
      }
    },
    closecv () {
      this.cvloc = false
    },
    async testcrypto () {
      await crypt.test1()
      await crypt.test2()
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
        await testEcho(0)
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
    },
    testHelp () {
      this.$store.commit('ui/pushhelp', 'page1')
    }
  },

  setup () {
    const edmd = ref(null)
    const $store = useStore()
    return {
      edmd,
      dialoguecrypto: computed({
        get: () => $store.state.ui.dialoguecrypto,
        set: (val) => $store.commit('ui/majdialoguecrypto', val)
      })
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
