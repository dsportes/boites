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
    <vue-secret v-for="(secret, idx) in state.lst" :key="secret.sid + secret.v" :idx="idx" :secret="secret" :motscles="motscles"></vue-secret>
  </div>

  <q-dialog v-model="nouvsec">
    <vue-secret :secret="nouveausecret" :motscles="motscles" :idx="0" :close="fclose"></vue-secret>
  </q-dialog>
</q-page>
</template>

<script>
import { computed, onMounted, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import { Motscles } from '../app/util.mjs'
// import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import CarteVisite from '../components/CarteVisite.vue'
import VueSecret from '../components/VueSecret.vue'
import { CvAvatar } from '../app/operations.mjs'
import { Secret, data } from '../app/modele.mjs'

function amc (secret, n) {
  if (!secret || !secret.mc) return false
  return !n || secret.mc.indexOf(n) !== -1
}

function filtrer (secrets, filtre) {
  const lst = []
  if (secrets) {
    for (const k in secrets) {
      const s = secrets[k]
      if (amc(s, filtre.n1)) lst.push(secrets[k])
    }
  }
  return lst
}

export default ({
  name: 'Avatar',

  components: { /* BoutonHelp, */ CarteVisite, MotsCles, VueSecret },

  data () {
    return {
    }
  },

  methods: {
    fclose () {
      this.nouvsec = false
    },
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
    const nouvsec = ref(false)
    const compte = computed(() => { const c = $store.state.db.compte; return c || { ko: true } })
    const avatar = computed(() => { const a = $store.state.db.avatar; return a || { ko: true } })
    const mode = computed(() => $store.state.ui.mode)
    const evtavatar = computed(() => $store.state.ui.evtavatar)
    const tabavatar = computed(() => $store.state.ui.tabavatar)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)
    motscles.recharger()

    // ts, id, nr, txt, mc, temp
    const nouveausecret = new Secret().nouveauP(0, avatar.value.id, 0, 'Nouveau secret ...', new Uint8Array([]), false)

    const secrets = computed(() => { return data.getSecret(avatar.value.sid) })

    const state = reactive({ lst: [], filtre: { n1: 2 } })

    onMounted(() => {
      state.lst = filtrer(secrets.value, state.filtre)
    })

    watch(
      () => evtavatar.value,
      (ap) => {
        onEvtAvatar(ap.evt)
      }
    )

    watch(
      () => compte.value, // OUI .value !!!
      (ap, av) => {
        if (ap && ap.v > av.v) {
          motscles.recharger()
        }
      }
    )

    watch(
      () => secrets.value,
      (ap, av) => {
        state.lst = filtrer(ap, state.filtre)
      }
    )

    watch(
      () => state.filtre, // NON pas .value
      (ap, av) => {
        state.lst = filtrer(secrets.value, ap)
      }
    )

    function onEvtAvatar (opt) {
      if (opt === 'plus') {
        plus(1)
      } else if (opt === 'plus') {
        plus(-1)
      } else if (opt === 'nouveau') {
        nouvsec.value = true
      }
      console.log('Evt reçu : ' + opt)
    }

    function plus (n) { // Il faut réassigner un nouvel objet
      const x = { ...state.filtre }
      x.n1 += n
      state.filtre = { ...x }
    }

    return {
      compte,
      avatar,
      tabavatar,
      motscles,
      state,
      nouveausecret,
      nouvsec,
      mode
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'

</style>
