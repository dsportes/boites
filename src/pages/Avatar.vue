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
    <vue-secret v-for="secret in lstSecrets.lst" :key="secret.sid" :secret="secret" :motscles="motscles"></vue-secret>
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
import { Secret } from '../app/modele.mjs'

export default ({
  name: 'Avatar',

  components: { /* BoutonHelp, */ CarteVisite, MotsCles, VueSecret },

  data () {
    return {
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

    let txt1 = []; for (let i = 0; i < 200; i++) txt1.push('Mon titre 1 et **mon texte 1**'); txt1 = txt1.join('\n')
    let txt2 = []; for (let i = 0; i < 10; i++) txt2.push('Mon **titre 2** et mon texte 2'); txt2 = txt2.join('\n')
    // temp, txt, mc, ref
    const s1 = new Secret().nouveauP(true, txt1, new Uint8Array([3, 4, 202]))
    const s2 = new Secret().nouveauP(true, txt2, new Uint8Array([1, 2, 203, 205]), [s1.sid, s1.sid2])
    const tests = [s1, s2]
    const lstSecrets = reactive({ lst: tests })

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
      lstSecrets,
      mode
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
