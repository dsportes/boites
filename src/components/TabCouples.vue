<template>
<div v-if="sessionok" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">

  <div v-if="mode === 1 || mode === 2" class="q-my-xs petitelargeur column items-start">
    <q-btn flat color="warning" icon="add_circle" label="Rencontre ..." @click="phraserenc=!phraserenc"/>
    <q-card v-if="phraserenc" class="petitelargeur text-center q-mb-sm">
        <q-input class="full-width" dense v-model="phrase" label="Phrase de rencontre"
          @keydown.enter.prevent="crypterphrase" :type="isPwd ? 'password' : 'text'"
          hint="Presser 'Entrée' à la fin de la saisie">
        <template v-slot:append>
          <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
          <span :class="phrase.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="phrase=''"/></span>
        </template>
        </q-input>
        <div v-if="encours" class="fs-md text-italic text-primary">Cryptage en cours ...
          <q-spinner color="primary" size="2rem" :thickness="3" />
        </div>
    </q-card>
  </div>

  <div v-if="!state.lst || !state.lst.length" class="titre-lg">Aucun couple ne correspond au critère de recherche</div>

  <panel-couple v-if="avatarcpform && state.lst && state.lst.length"
    :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'"
    :couple="couple"
    :suivant="state.idx < state.lst.length - 1 ? suiv : null"
    :precedent="state.idx > 0 ? prec : null"
    :index="state.idx" :sur="state.lst.length"/>

  <div v-if="!avatarcpform && state.lst && state.lst.length">
    <div v-for="(c, idx) in state.lst" :key="c.pkv"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs' + (idx === state.idx ? ' courant' : '')">
      <div class="row items-start full-width">
        <div class="col row cursor-pointer" @click="afficher(idx)">
          <img class="col-auto photomax" :src="photo(c)"/>
          <q-icon class="col-auto q-pa-xs" size="sm" :color="c.stx<2?'primary':'warning'" :name="icone(c.stp)"/>
          <div class="col-3 q-px-xs">{{nom(c)}}</div>
          <div class="col q-pr-xs">{{c.ard.substring(0,80)}}</div>
          <div class="col-auto fs-sm">{{dhstring(c.dh)}}</div>
        </div>

        <q-btn class="col-auto btnmenu" size="md" color="white" icon="menu" flat dense>
          <menu-couple :c="c" />
        </q-btn>
      </div>
    </div>
  </div>

  <q-dialog v-model="nvrenc">
    <nouvelle-rencontre :phrase="phrase" :clex="clex" :phch="phch" :close="closerenc"/>
  </q-dialog>

  <q-dialog v-model="acceptrenc">
    <accept-rencontre :couple="couple" :phch="phch" :close="closeacceptrenc"/>
  </q-dialog>

  <q-dialog v-if="!$q.screen.gt.sm && sessionok" v-model="avatarcprech" position="left">
    <panel-filtre-couples @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"/>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm && sessionok" position="top-left" expand :offset="[5,5]">
    <panel-filtre-couples @ok="rechercher" :motscles="motscles" :etat-interne="recherche"/>
  </q-page-sticky>

</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { get, Motscles, FiltreCp, cfg, dhstring, dlvDepassee } from '../app/util.mjs'
import PanelFiltreCouples from './PanelFiltreCouples.vue'
import PanelCouple from './PanelCouple.vue'
import MenuCouple from './MenuCouple.vue'
import AcceptRencontre from './AcceptRencontre.vue'
import NouvelleRencontre from './NouvelleRencontre.vue'
import { data, Contact, Couple } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'
import { deserial } from '../app/schemas.mjs'

export default ({
  name: 'TabCouples',

  components: { PanelFiltreCouples, PanelCouple, MenuCouple, AcceptRencontre, NouvelleRencontre },

  computed: { },

  data () {
    return {
      dhstring: dhstring,
      phraserenc: false,
      isPwd: false,
      encours: false,
      nvrenc: false,
      acceptrenc: false,
      phrase: ''
    }
  },

  methods: {
    fermerfiltre () { this.avatarcprech = false },

    rechercher (f) { this.state.filtre = f },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    closerenc () { this.nvrenc = false },

    closeacceptrenc () { this.acceptrenc = false },

    crypterphrase () {
      if (!this.phrase) return
      this.encours = true
      setTimeout(async () => {
        this.clex = await crypt.pbkfd(this.phrase)
        let hx = ''
        for (let i = 0; i < this.phrase.length; i = i + 2) hx += this.phrase.charAt(i)
        this.phch = crypt.hash(hx)
        this.encours = false
        const resp = await get('m1', 'getContact', { phch: this.phch })
        if (!resp || !resp.length) {
          this.nvrenc = true
        } else {
          try {
            const row = deserial(new Uint8Array(resp))
            const contact = await new Contact().fromRow(row)
            if (dlvDepassee(contact.dlv)) {
              this.diagnostic = 'Cette phrase de rencontre n\'est plus valide'
              return
            }
            // eslint-disable-next-line no-unused-vars
            const [cc, id, nom] = await contact.getCcId(this.clex)
            const resp2 = await get('m1', 'getCouple', { id })
            if (!resp2) {
              this.diagnostic = 'Pas de rencontre en attente avec cette phrase'
              return
            }
            const row2 = deserial(new Uint8Array(resp2))
            this.couple = await new Couple().fromRow(row2, cc)
            this.phraserenc = false
            this.acceptrenc = true
          } catch (e) {
            console.log(e.toString())
          }
        }
      }, 1)
    }
  },

  setup () {
    const phdef = cfg().couple
    const $store = useStore()
    const editcp = ref(false)
    const sessionok = computed(() => { return $store.state.ui.sessionok })

    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const couple = computed({ // couple courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })
    const avatarcprech = computed({
      get: () => $store.state.ui.avatarcprech,
      set: (val) => $store.commit('ui/majavatarcprech', val)
    })
    const avatarcpform = computed({
      get: () => $store.state.ui.avatarcpform,
      set: (val) => $store.commit('ui/majavatarcpform', val)
    })

    const couples = computed(() => { return avatar.value ? data.getCouple() : [] })
    const cvs = computed(() => { return $store.state.db.cvs })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreCp().etat(),
      p: new FiltreCp().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    function getCouples () {
      const avi = avatar.value.id
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const id in couples.value) {
        const cp = couples.value[id]
        if (cp.idI === avi && f.filtre(cp)) lst.push(cp)
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function indexer () {
      state.idx = -1
      if (couple.value) state.lst.forEach((x, n) => { if (x.id === couple.value.id) state.idx = n })
      if (state.idx === -1) {
        if (state.lst.length) {
          state.idx = 0; couple.value = state.lst[0]
        } else {
          couple.value = null
        }
      }
    }

    function latotale () {
      if (!sessionok.value) return
      getCouples()
      trier()
      indexer()
    }

    function photo (c) {
      const cv = cvs.value[c.id]
      if (cv && cv[0]) return cv[0]
      if (c.naE) return c.naE.photo || phdef
      return phdef
    }

    function nom (c) { return c.naE ? c.naE.noml : c.na.nom }

    function icone (p) {
      return ['thumb_up', 'hourglass_empty', 'thumb_down', 'thumb_up', 'o_thumb_down', 'person_off'][p]
    }

    const state = reactive({
      lst: [], // array des Couples répondant au filtre
      idx: 0, // index du couple courant dans la liste
      filtre: new FiltreCp() // Filtre par défaut
    })

    latotale()

    watch(() => state.filtre, (filtre, filtreavant) => {
      if (!filtre || !filtreavant || filtre.equal(filtreavant)) return
      const chg = filtre.changement(filtreavant)
      if (chg >= 2) {
        latotale()
      }
      if (chg >= 1) {
        trier()
        indexer()
      }
    })

    watch(() => avatar.value, (ap, av) => {
      latotale()
    })

    watch(() => couples.value, (ap, av) => {
      latotale()
    })

    watch(() => couple.value, (ap, av) => {
      indexer()
    })

    watch(() => cvs.value, (ap, av) => {
      latotale()
    })

    watch(() => sessionok.value, (ap, av) => {
    })

    function afficher (idx) {
      state.idx = idx
      couple.value = state.lst[state.idx]
      avatarcpform.value = true
    }

    function suiv (n) {
      if (state.idx < state.lst.length - 1) state.idx = n ? state.idx + 1 : state.lst.length - 1
      couple.value = state.lst[state.idx]
    }

    function prec (n) {
      if (state.idx > 0) state.idx = n ? state.idx - 1 : 0
      couple.value = state.lst[state.idx]
    }

    return {
      suiv,
      prec,
      afficher,
      sessionok,
      photo,
      nom,
      icone,
      editcp,
      avatar,
      couple,
      motscles,
      state,
      recherche,
      mode,
      avatarcprech,
      avatarcpform
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.courant
  border-left: 4px solid $warning !important
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
.btnmenu
  position: relaive
  top: -6px
.photomax
  position: relative
  top: 3px
</style>
