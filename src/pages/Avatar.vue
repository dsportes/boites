<template>
<q-page class="fs-md q-pa-xs">
  <tab-secrets v-if="sessionok && tabavatar === 'secrets'"></tab-secrets>
  <tab-couples v-if="sessionok && tabavatar === 'couples'"></tab-couples>
  <tab-groupes v-if="sessionok && tabavatar === 'groupes'"></tab-groupes>

  <div v-if="sessionok && tabavatar === 'etc'">
    <q-btn v-if="compta.estParrain" class="full-width maauto q-py-lg" flat dense color="primary"
      icon="add" label="Nouveau parrainage" @click="nvpar = true"></q-btn>

    <q-expansion-item label="Carte de visite de l'avatar" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <identite-cv :nom-avatar="avatar.na" type="avatar" invitable editable @cv-changee="cvchangee"/>
    </q-expansion-item>
    <q-separator/>

    <q-expansion-item label="Mots clés du compte" group="groupeetc"
      header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
      <mots-cles :motscles="motscles" @ok="okmc"></mots-cles>
    </q-expansion-item>
    <q-separator/>

  </div>

  <q-dialog v-model="nvpar" persistent class="moyennelargeur">
    <NouveauParrainage :close="fermerParrain" />
  </q-dialog>

</q-page>
</template>

<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import { Motscles } from '../app/util.mjs'
import MotsCles from '../components/MotsCles.vue'
import IdentiteCv from '../components/IdentiteCv.vue'
import NouveauParrainage from '../components/NouveauParrainage.vue'
import { PrefCompte, MajCv } from '../app/operations.mjs'
import TabSecrets from '../components/TabSecrets.vue'
import TabCouples from '../components/TabCouples.vue'
import TabGroupes from '../components/TabGroupes.vue'
import { data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'
import { serial } from '../app/schemas.mjs'

export default ({
  name: 'Avatar',

  components: { IdentiteCv, MotsCles, TabSecrets, NouveauParrainage, TabCouples, TabGroupes },

  computed: { },

  data () { return { } },

  methods: {
    async cvchangee (cv) {
      await new MajCv().run(cv)
    },
    async okmc (mmc) {
      const datak = await crypt.crypter(data.clek, serial(mmc))
      await new PrefCompte().run('mc', datak)
    },
    fermerParrain () { this.nvpar = false }
  },

  setup () {
    onBoot()

    const $store = useStore()
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const nvpar = ref(false)
    const prefs = computed(() => { return $store.state.db.prefs })
    const compta = computed(() => { return $store.state.db.compta })
    const avatar = computed(() => { return $store.state.db.avatar })
    // const groupe = computed(() => { return $store.state.db.groupe })
    const mode = computed(() => $store.state.ui.mode)
    // const couple = computed(() => { return $store.state.db.couple })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    // watch(() => groupe.value, (ap, av) => { motscles.recharger() })
    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const tabavatar = computed({
      get: () => $store.state.ui.tabavatar,
      set: (val) => $store.commit('ui/majtabavatar', val)
    })

    watch(() => sessionok.value, (ap, av) => {
      nvpar.value = false
    })

    return {
      sessionok,
      nvpar,
      compta,
      avatar,
      tabavatar,
      motscles,
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
