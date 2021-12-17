<template>
<q-page>

  <q-card v-if="tabcompte === 'etc'" class="column align-start items-start q-pa-xs">
    <q-list bordered style="width:100%;">
      <q-expansion-item group="etc" label="Identité" default-opened header-class="titre-2 bg-primary text-white">
        <div class="titre q-my-md"><span>Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
        <div style="width:100%">
          <editeur-md ref="memoed" :texte="compte.memo" :sid="compte.sid" taille-m editable label-ok="OK" v-on:ok="memook"></editeur-md>
        </div>
      </q-expansion-item>
      <q-expansion-item group="etc" label="Mots clés" header-class="titre-2 bg-secondary text-white">
        <mots-cles></mots-cles>
      </q-expansion-item>
    </q-list>
  </q-card>

  <q-card v-if="tabcompte === 'avatars'" class="column align-start items-start">
    <h6>Liste des avatars du compte</h6>
    <div v-for="e in compte.mac" :key="e.na.id" style="width:100%">
      <apercu-avatar page editer :avatar-id="e.na.id"/>
    </div>
  </q-card>

  <q-card v-if="tabcompte === 'groupes'" class="column align-start items-start">
    <h6>Test des aperçus de mots clés</h6>
    <q-checkbox left-label v-model="court" label="Format court" />
    <div>
      <apercu-motscles :motscles="motscles" :src="u8mc" :court="court" :argsClick="{loc: 'ici', n: 3}" @clickMc="mcclick"></apercu-motscles>
    </div>
  </q-card>
</q-page>
</template>

<script>
import { MemoCompte } from '../app/operations.mjs'
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import ApercuAvatar from '../components/ApercuAvatar.vue'
import ApercuMotscles from '../components/ApercuMotscles.vue'
import { Motscles } from '../app/util.mjs'

export default ({
  name: 'Compte',
  components: { EditeurMd, BoutonHelp, MotsCles, ApercuAvatar, ApercuMotscles },
  data () {
    return {
      u8mc: new Uint8Array([200, 202, 1, 203, 2]),
      court: false
    }
  },

  methods: {
    mcclick (args) {
      console.log('mcclick', JSON.stringify(args))
    },
    async memook (m) {
      this.memoed.undo()
      await new MemoCompte().run(m)
    }
    /*
    async getcv (sid) {
      const r = await get('m1', 'getcv', { sid: sid })
      if (r) {
        const objcv = schemas.deserialize('rowcv', new Uint8Array(r))
        console.log(JSON.stringify(objcv))
      }
    },
    async getclepub (sid) {
      const r = await get('m1', 'getclepub', { sid: sid })
      if (r) {
        const c = u8ToString(new Uint8Array(r))
        console.log(c)
      }
    },
    toAvatar (id) {
      this.avatar = data.getAvatar(id)
      remplacePage('Avatar')
    },
    */
  },

  setup () {
    const memoed = ref(null)
    onBoot()
    const $store = useStore()
    const org = computed(() => $store.state.ui.org)
    // En déconnexion, compte passe à null et provoque un problème dans la page. Un getter ne marche pas ?!
    const compte = computed({
      get: () => { const c = $store.state.db.compte; return c || { ko: true } }
    })
    const avatar = computed({
      get: () => { const a = $store.state.db.avatar; return a || { ko: true } },
      set: (val) => $store.commit('db/majavatar', val)
    })
    const groupe = computed({
      get: () => { const a = $store.state.db.avatar; return a || { ko: true } },
      set: (val) => $store.commit('db/majgroupe', val)
    })
    const tabcompte = computed(() => $store.state.ui.tabcompte)
    const cvs = computed(() => $store.state.db.cvs)
    const avatars = computed(() => $store.state.db.avatars)
    const groupes = computed(() => $store.state.db.groupes)
    const mode = computed(() => $store.state.ui.mode)
    const modeleactif = computed(() => $store.state.ui.modeleactif)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1)

    onMounted(() => { motscles.recharger() })

    watch(
      () => compte.value, // OUI .value !!!
      (ap, av) => { if (ap && ap.v > av.v) { motscles.recharger() } }
    )

    return {
      motscles,
      memoed,
      org,
      compte,
      avatar,
      groupe,
      mode,
      modeleactif,
      cvs,
      avatars,
      groupes,
      tabcompte
    }
  }

})
</script>

<style lang="sass">
@import '../css/app.sass'
</style>
