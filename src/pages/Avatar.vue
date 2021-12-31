<template>
<q-page>
  <div v-if="tabavatar === 'secrets'" class="q-pa-xs column justify-start" style="width:100%">
    <vue-secret v-for="(secret, idx) in state.lst" :key="secret.sid + secret.v" :idx="idx" :secret="secret" :motscles="motscles" :avobsid="avatar.id"></vue-secret>
  </div>

  <q-card v-if="tabavatar === 'contacts'" class="column align-start items-start">
    <div class="titre-3">Contacts de l'avatar</div>
  </q-card>

  <q-card v-if="tabavatar === 'groupes'" class="column align-start items-start">
    <div class="titre-3">Groupes auxquels l'avatar participe</div>
  </q-card>

  <q-card v-if="tabavatar === 'etc'" class="column align-start items-start q-pa-xs">
    <q-expansion-item group="etc" label="Carte de visite" default-opened header-class="titre-2 bg-primary text-white">
      <div v-if="avatar" style="width:100%">
        <carte-visite :nomc="avatar.nomc" :info-init="avatar.info" :photo-init="avatar.photo" @ok="validercv"/>
      </div>
    </q-expansion-item>
    <q-expansion-item group="etc" label="Mots clés du compte" header-class="titre-2 bg-secondary text-white">
      <mots-cles :motscles="motscles"></mots-cles>
    </q-expansion-item>
  </q-card>

  <q-dialog v-model="nouvsec">
    <vue-secret :secret="nouveausecret(0)" :motscles="motscles" :avobsid="avatar.id" :idx="0" :close="fclose"></vue-secret>
  </q-dialog>
</q-page>
</template>

<script>
import { computed, onMounted, reactive, watch, ref, isRef } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import { Motscles, difference } from '../app/util.mjs'
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
      if (!filtre.n1 || amc(s, filtre.n1)) lst.push(secrets[k])
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
        const cvinfo = await this.avatar.cvToRow(resultat.ph, resultat.info)
        await new CvAvatar().run(this.avatar.id, cvinfo)
      }
    }
  },

  setup () {
    onBoot()
    const $store = useStore()
    const nouvsec = ref(false)
    const compte = computed(() => { return $store.state.db.compte })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)

    const evtavatar = computed(() => $store.state.ui.evtavatar)
    watch(() => evtavatar.value, (ap) => { onEvtAvatar(ap.evt) })

    const tabavatar = computed(() => $store.state.ui.tabavatar)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)
    motscles.recharger()
    watch(
      () => compte.value, // OUI .value !!!
      (ap, av) => { if (ap && ap.v > av.v) motscles.recharger() }
    )

    function nouveausecret (id2) { // pour un couple seulement, id2 du contact de l'avatar du compte
      const s = new Secret()
      return !id2 ? s.nouveauP(avatar.value.id) : s.nouveauC(avatar.value.id, id2)
    }

    const state = reactive({ lst: [], filtre: { n1: 2 }, refSecrets: getRefSecrets() })

    watch(
      () => avatar.value,
      (ap, av) => {
        // Avatar modifié : la liste des groupes a pu changer, recharger SI nécessaire
        const sav = av.allGrId()
        const sap = ap.allGrId()
        if (difference(sav, sap).size || difference(sap, sav).size) {
          state.refSecrets = getRefSecrets()
        }
      }
    )

    function getRefSecrets () {
      const setGr = new Set()
      const refSecrets = []
      if (avatar.value) {
        setGr.add(avatar.value.id)
        avatar.value.allGrId(setGr)
      }
      setGr.forEach(id => {
        const ref = computed(() => { return data.getSecret(id) })
        refSecrets.push(ref)
      })
      return refSecrets
    }

    function getAllSecrets (ap) {
      const lst = []
      ap.forEach(val => {
        // selon le cas on reçoit le ref ou la value
        const a = isRef(val) ? val.value : val
        for (const sid in a) {
          lst.push(a[sid])
        }
      })
      return lst
    }

    watch(state.refSecrets, (ap, av) => {
      /* ap est un array des secrets PAS de leur ref */
      const lst = getAllSecrets(ap)
      state.lst = filtrer(lst, state.filtre)
    })

    onMounted(() => {
      const lst = getAllSecrets(state.refSecrets)
      state.lst = filtrer(lst, state.filtre)
    })

    watch(
      () => state.filtre, // NON pas .value
      (ap, av) => {
        const lst = getAllSecrets(state.refSecrets)
        state.lst = filtrer(lst, ap)
      }
    )

    // Pour tester la réactivité au filtre (et ouvrir le dialogue de création de secret)
    function onEvtAvatar (opt) {
      if (opt === 'plus') {
        const x = { ...state.filtre }
        x.n1++
        state.filtre = { ...x }
      } else if (opt === 'moins') {
        const x = { ...state.filtre }
        x.n1 = 0
        state.filtre = { ...x }
      } else if (opt === 'nouveau') {
        nouvsec.value = true
      }
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
