<template>
<q-page>

  <q-card v-if="tabavatar === 'etc'" class="column align-start items-start q-pa-xs">
    <q-list bordered style="width:100%;">
      <q-expansion-item group="etc" label="Carte de visite" default-opened header-class="titre-2 bg-primary text-white">
        <div style="width:100%">
          <carte-visite :nomc="avatar.nomc" :info-init="avatar.info" :photo-init="avatar.photo" @ok="validercv"/>
        </div>
      </q-expansion-item>
      <q-expansion-item group="etc" label="Mots clés du compte" header-class="titre-2 bg-secondary text-white">
        <mots-cles :motscles="motscles"></mots-cles>
      </q-expansion-item>
    </q-list>
  </q-card>

  <div v-if="tabavatar === 'secrets'" class="q-pa-xs column justify-start" style="width:100%">
    <vue-secret v-for="secret in lstSecrets" :key="secret.sid" :secret="secret" :motscles="motscles"></vue-secret>
  </div>
</q-page>
</template>

<script>
import { computed, /* onMounted, */ reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import { Motscles } from '../app/util.mjs'
// import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import CarteVisite from '../components/CarteVisite.vue'
import VueSecret from '../components/VueSecret.vue'
import { CvAvatar } from '../app/operations.mjs'

const lstSecrets = [
  { sid: 'abc', titre: 'titre du secret 1', mc: new Uint8Array([3, 4, 202]), dh: '2020/12/19 15:07:32', nbpj: 2 },
  { sid: 'def', titre: 'titre du secret 2', mc: new Uint8Array([1, 201, 202]), dh: '2020/12/19 15:07:59' }
]

export default ({
  name: 'Avatar',
  components: { /* BoutonHelp, */ CarteVisite, MotsCles, VueSecret },
  data () {
    return {
      lstSecrets: lstSecrets
    }
  },

  watch: {
  },

  methods: {
    async validercv (resultat) {
      if (resultat) {
        // console.log('CV changée : ' + resultat.info + '\n' + resultat.ph.substring(0, 30))
        const cvinfo = await this.a.av.cvToRow(resultat.ph, resultat.info)
        await new CvAvatar().run(this.a.av.id, cvinfo)
      }
    }
  },

  setup () {
    onBoot()
    const $store = useStore()
    const compte = computed(() => { const c = $store.state.db.compte; return c || { ko: true } })
    const avatar = computed(() => { const a = $store.state.db.avatar; return a || { ko: true } })
    const mode = computed(() => $store.state.ui.mode)
    const tabavatar = computed(() => $store.state.ui.tabavatar)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)
    motscles.recharger()

    // onMounted(() => { console.log('onMounted Avatar: ' + motscles.mapAll.size) })

    watch(
      () => compte.value, // OUI .value !!!
      (ap, av) => {
        if (ap && ap.v > av.v) {
          motscles.recharger()
          console.log('watch compte Avatar: ' + motscles.mapAll.size)
        }
      }
    )

    return {
      compte,
      avatar,
      tabavatar,
      motscles,
      mode
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
