<template>
<q-page>

  <q-card v-if="tabcompte === 'etc'" class="column align-start items-start q-pa-xs">
    <q-list bordered style="width:100%;">
      <q-expansion-item group="etc" label="Identité" default-opened header-class="titre-2 bg-primary text-white">
        <div class="titre q-my-md"><span>Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
        <div style="width:100%">
          <editeur-md ref="memoed" :texte="compte.memo" taille-m editable label-ok="OK" v-on:ok="memook"></editeur-md>
        </div>
      </q-expansion-item>
      <q-expansion-item group="etc" label="Mots clés" header-class="titre-2 bg-secondary text-white">
        <mots-cles></mots-cles>
      </q-expansion-item>
    </q-list>
  </q-card>

  <q-card v-if="tabcompte === 'avatars'" class="column align-start items-start">
    <h6>Liste des avatars du compte</h6>
    <div v-for="e in compte.mac" :key="e.na.sid">
        <div>{{e.na.sid}} - {{e.na.nomc}} {{e.cpriv.length}}</div>
        <q-btn label="GET cv" color="primary" @click="getcv(e.na.sid)" />
        <q-btn label="GET clepub" color="primary" @click="getclepub(e.na.sid)" />
        <q-btn label="Vue Avatar" color="primary" @click="toAvatar(e.na.sid)" />
    </div>
  </q-card>

  <q-card v-if="tabcompte === 'groupes'" class="column align-start items-start">
    <h6>Liste des cartes de visite</h6>
    <div v-for="cv in cvs" :key="cv.sid">
        <div>{{cv.sid}} - {{cv.na.nomc}}</div>
    </div>
  </q-card>
</q-page>
</template>

<script>
import { MemoCompte } from '../app/operations'
import { computed, ref /* , watch */ } from 'vue'
import { useStore } from 'vuex'
import { get, u8ToString } from '../app/util.mjs'
import { onBoot, remplacePage } from '../app/modele.mjs'
import { schemas } from '../app/schemas.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'

export default ({
  name: 'Compte',
  components: { EditeurMd, BoutonHelp, MotsCles },
  data () {
    return {
      tab: 'apropos'
    }
  },

  methods: {
    async memook (m) {
      this.memoed.undo()
      // console.log(m)
      // eslint-disable-next-line no-undef
      await new MemoCompte().run(m)
      /* simulation locale
      setTimeout(() => {
        const c = this.compte.clone
        c.memo = m
        c.v++
        data.setCompte(c)
        console.log('Après setCompte : ' + this.compte.memo)
      }, 5000)
      */
    },
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
    toAvatar (sid) {
      this.avatar = this.avatars[sid]
      remplacePage('Avatar')
    },
    toGroupe (sid) {
      this.groupe = this.groupes[sid]
      remplacePage('Groupe')
    }
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

    /*
    watch(
      () => compte.value,
      (ap, av) => {
        console.log('Mémo : ' + ap.memo + '\n' + av.memo)
      }
    )
    */

    return {
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
