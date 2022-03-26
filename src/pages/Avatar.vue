<template>
<q-page class="fs-md q-pa-xs">
  <tab-secrets v-if="tabavatar === 'secrets'"></tab-secrets>
  <tab-contacts v-if="tabavatar === 'contacts'"></tab-contacts>
  <tab-groupes v-if="tabavatar === 'groupes'"></tab-groupes>

  <div v-if="tabavatar === 'etc' && avatar">
    <q-expansion-item label="Carte de visite de l'avatar" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <apercu-avatar class="maauto" page editer :avatar-id="avatar.id"/>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item label="Mots clés du compte" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <mots-cles :motscles="motscles" @ok="okmc"></mots-cles>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item v-if="compta.estParrain" group="groupeetc" header-class="expansion-header-class-1 bg-secondary text-white">
      <template v-slot:header>
        <q-item-section>
          <div class="titre-lg">Parrainages de l'avatar ( {{state.parrains.length}} )</div>
        </q-item-section>
      </template>
      <q-btn class="full-width maauto q-py-lg" flat dense color="primary" icon="add" label="Nouveau parrainage" @click="nvpar = true"></q-btn>
      <div v-for="p in state.parrains" :key="p.pph" class="row justify-start cursor-pointer" @click="selecpar(p)">
        <q-icon class="col-auto" size="sm" color="warning" :name="['hourglass_empty','thumb_down','thumb_up','thumb_up'][p.st]"/>
        <div class="col-3 q-pr-xs">{{p.data.nomf}}</div>
        <div class="col-3 q-px-xs">{{p.ph}}</div>
        <div class="col-4 q-pr-xs">{{p.ard}}</div>
        <q-icon class="col-auto" size="sm" color="warning" name="auto_delete"/>
        <div class="col-auto fs-sm">{{nbj(p.dlv)}}</div>
      </div>
    </q-expansion-item>

  </div>

  <q-dialog v-model="detailpar" persistent class="moyennelargeur">
    <InfoParrainage :p="parcour" :close="fermerinfo" />
  </q-dialog>

  <q-dialog v-model="nvpar" persistent class="moyennelargeur">
    <NouveauParrainage :close="fermerParrain" />
  </q-dialog>

</q-page>
</template>

<script>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import { Motscles, getJourJ } from '../app/util.mjs'
import MotsCles from '../components/MotsCles.vue'
import ApercuAvatar from '../components/ApercuAvatar.vue'
import NouveauParrainage from '../components/NouveauParrainage.vue'
import InfoParrainage from '../components/InfoParrainage.vue'
import { CvAvatar, PrefCompte } from '../app/operations.mjs'
import TabSecrets from '../components/TabSecrets.vue'
import TabContacts from '../components/TabContacts.vue'
import TabGroupes from '../components/TabGroupes.vue'
import { data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'
import { serial } from '../app/schemas.mjs'

export default ({
  name: 'Avatar',

  components: { ApercuAvatar, MotsCles, TabSecrets, NouveauParrainage, TabContacts, TabGroupes, InfoParrainage },

  computed: {
  },

  data () {
    return {
      nvpar: false,
      detailpar: false,
      parcour: null
    }
  },

  methods: {
    async okmc (mmc) {
      const datak = await crypt.crypter(data.clek, serial(mmc))
      await new PrefCompte().run('mc', datak)
    },
    fermerinfo () { this.detailpar = false },
    selecpar (p) { this.parcour = p; this.detailpar = true },
    fermerParrain () { this.nvpar = false },

    async validercv (resultat) {
      if (resultat) {
        // console.log('CV changée : ' + resultat.info + '\n' + resultat.ph.substring(0, 30))
        const cvinfo = await this.avatar.cvToRow(resultat.ph, resultat.info)
        await new CvAvatar().run(this.avatar.id, cvinfo)
      }
    }
  },

  setup () {
    onBoot()

    const $store = useStore()
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const compte = computed(() => { return $store.state.db.compte })
    const prefs = computed(() => { return $store.state.db.prefs })
    const compta = computed(() => { return $store.state.db.compta })
    const avatar = computed(() => { return $store.state.db.avatar })
    const groupe = computed(() => { return $store.state.db.groupe })
    const mode = computed(() => $store.state.ui.mode)
    const contact = computed(() => { return $store.state.db.contact })
    const parrains = computed(() => { return data.getParrain() })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    // watch(() => groupe.value, (ap, av) => { motscles.recharger() })
    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })

    const state = reactive({
      parrains: []
    })

    function mesParrains () {
      const lst = []
      for (const pph in parrains.value) {
        const p = parrains.value[pph]
        if (p.id === avatar.value.id) lst.push(p)
      }
      state.parrains = lst
    }

    mesParrains()

    watch(() => avatar.value, (ap, av) => {
      mesParrains()
    })

    watch(() => parrains.value, (ap, av) => {
      mesParrains()
    })

    function nbj (dlv) { return dlv - getJourJ() }

    const evtfiltresecrets = computed(() => $store.state.ui.evtfiltresecrets)
    watch(() => evtfiltresecrets.value, (ap) => {
      tabavatar.value = 'secrets'
      setTimeout(() => {
        $store.commit('ui/majevtfiltresecrets2', ap)
      }, 100)
    })

    return {
      diagnostic,
      compte,
      compta,
      avatar,
      groupe,
      contact,
      parrains,
      tabavatar,
      motscles,
      state,
      nbj,
      mode
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
<style lang="sass">
</style>
