<template>
<q-page class="fs-md row">
  <div v-if="sessionok" class="col-12 col-md-7 q-pa-xs">
    <q-expansion-item label="Sélectionner un des avatars du compte" default-opened
        header-class="expansion-header-class-1 titre-lg bg-primary text-white">
      <q-btn class="q-my-sm" size="md" icon="add" label="Nouvel avatar" color="primary" dense @click="nvav=true"/>
      <div v-for="id in compte.avatarIds" :key="id" class="full-width">
        <apercu-avatar editer selectionner :avatar-id="id"/>
      </div>
    </q-expansion-item>
  </div>
  <div v-if="sessionok" class="col-12 col-md-5 q-px-xs">
    <q-expansion-item label="Identité, mémo du compte" default-opened  group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <div class="q-pa-sm column justify-center petitelargeur maauto">
        <div class="row justify-between items-center q-my-md"><span class="titre-md ">Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
        <editeur-md ref="memoed" style="height:10rem" :texte="prefs.memo" editable modetxt label-ok="OK" v-on:ok="memook"></editeur-md>
      </div>
    </q-expansion-item>
    <q-separator/>
    <q-expansion-item class="q-mt-xs" label="Mots clés" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <div class="fake"><mots-cles class="petitelargeur maauto" :motscles="motscles" @ok="okmc"></mots-cles></div>
    </q-expansion-item>
  </div>

  <q-dialog v-if="sessionok" v-model="nvav" persistent>
    <q-card class="shadow-8 petitelargeur">
      <nom-avatar label-valider="Créer l\'avatar" icon-valider="add" verif @ok-nom="nvAvatar" />
    </q-card>
  </q-dialog>
</q-page>
</template>

<script>
import { PrefCompte, CreationAvatar } from '../app/operations.mjs'
import { computed, ref, reactive, /* onMounted, */ watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import ApercuAvatar from '../components/ApercuAvatar.vue'
import NomAvatar from '../components/NomAvatar.vue'
import { Motscles, serial } from '../app/util.mjs'
import { crypt } from '../app/crypto.mjs'
import { data } from '../app/modele.mjs'

export default ({
  name: 'Compte',
  components: { EditeurMd, BoutonHelp, MotsCles, ApercuAvatar, NomAvatar },
  data () {
    return {
      u8mc: new Uint8Array([]),
      nvav: false,
      selecteur: false
    }
  },

  methods: {
    async okmc (mmc) {
      const datak = await crypt.crypter(data.clek, serial(mmc))
      await new PrefCompte().run('mc', datak)
    },
    closeSel () {
      this.selecteur = false
    },
    mcclick (args) {
      console.log('mcclick', JSON.stringify(args))
      this.selecteur = true
    },
    async memook (m) {
      this.memoed.undo()
      const datak = await crypt.crypter(data.clek, serial(m))
      await new PrefCompte().run('mp', datak)
    },
    selection (u8) {
      this.u8mc = u8
    },
    async nvAvatar (nom) {
      if (nom) await new CreationAvatar().run(nom)
      this.nvav = false
    }
  },

  setup () {
    const memoed = ref(null)
    onBoot()
    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    const compte = computed(() => $store.state.db.compte)
    const prefs = computed(() => $store.state.db.prefs)
    const cvs = computed(() => $store.state.db.cvs)
    const mode = computed(() => $store.state.ui.mode)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)
    motscles.recharger()

    watch(() => prefs.value, (ap, av) => {
      if (ap && ap.v > av.v) {
        motscles.recharger()
      }
    })

    return {
      sessionok,
      motscles,
      memoed,
      compte,
      prefs,
      mode,
      cvs
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
