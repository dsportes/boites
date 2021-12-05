<template>
<q-page>
  <q-card v-if="tabcompte === 'apropos'" class="column align-start items-start q-pa-xs">
      <div class="titre q-my-md"><span>Code du compte : {{compte.sid}}</span><bouton-help page="page1"/></div>
      <div style="width:100%">
        <editeur-md v-model="compte.memo" taille-init="1" titre="Mon mémo" editable v-on:ok="memook"></editeur-md>
      </div>
  </q-card>

  <q-card v-if="tabcompte === 'motscles'" class="column align-start items-start">
    <h6>Mes mots clé</h6>
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
import { computed } from 'vue'
import { useStore } from 'vuex'
import { get, u8ToString } from '../app/util'
import { onBoot, remplacePage, data } from '../app/modele.mjs'
import { schemas } from '../app/schemas.mjs'
import EditeurMd from '../components/EditeurMd.vue'
import BoutonHelp from '../components/BoutonHelp.vue'

export default ({
  name: 'Compte',
  components: { EditeurMd, BoutonHelp },
  data () {
    return {
      tab: 'apropos'
    }
  },

  watch: {
    /*
    compte () {
      console.log(this.compte.sid + '/' + this.compte.memo)
    }
    */
  },

  methods: {
    memook (m) {
      // simulation du retour sync de maj serveur
      console.log(m)
      const c = this.compte.clone
      c.memo = m
      c.v++
      data.setCompte(c)
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

    return {
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
