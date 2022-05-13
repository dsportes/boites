<template>
<div v-if="sessionok" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <q-btn class="q-ma-sm" dense icon="add" label="Créer un nouveau groupe"
    color="primary" @click="nouvgr = true"/>

  <div v-if="!state.lst || !state.lst.length" class="titre-lg">
    L'avatar n'est membre d'aucun groupe correspondant au critère de recherche</div>

  <panel-groupe v-if="avatargrform && state.lst && state.lst.length"
    :groupe="groupe"
    :suivant="state.idx < state.lst.length - 1 ? suiv : null"
    :precedent="state.idx > 0 ? prec : null"
    :index="state.idx" :sur="state.lst.length"/>

  <div v-if="!avatargrform && state.lst && state.lst.length">
    <div v-for="(x, idx) in state.lst" :key="x.k"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs' + (idx === state.idx ? ' courant' : '')">
      <div class="row items-start full-width">
        <div class="col row cursor-pointer" @click="afficher(idx)">
          <img class="col-auto photomax" :src="photo(x.g)"/>
          <div class="col q-px-sm">
            <div class="titre-md text-bold">{{x.g.nomEdMb(x.m)}}</div>
            <div v-if="x.g.dfh" class="text-negative bg-yellow-4 text-bold q-pa-xs">
              Le groupe n'a pas de compte qui l'héberge. Mises à jour et créations de secrets bloquées.
              S'auto-détruira dans {{nbj(x.g.dfh)}} jour(s).
            </div>
            <div v-if="x.g.pc1 > 80 || x.g.pc2 > 80">
              <q-icon name="warning" size="md" color="warning"/>
              <span class="text-warning q-px-sm text-bold">Alerte sur les volumes - v1: {{x.g.pc1}}% / v2: {{x.g.pc2}}%</span>
            </div>
            <div v-if="x.g.stx === 2" class="text-italic text-bold text-negative">Invitation bloquées - Vote pour le déblocage en cours</div>
            <div v-if="x.g.sty === 1" class="text-italic text-bold text-negative">Création et mises à jour de secrets bloquées</div>
            <div>
              <q-icon size="sm" :color="x.m.stx < 2 ?'primary':'warning'" :name="x.m.stx === 1 ? 'hourglass_empty' : 'thumb_up'"/>
              <span class="q-px-xs">{{x.m.stx === 1 ? 'invité,' : 'actif,'}}</span>
              <span class="q-px-xs" :color="x.m.stp < 2 ?'primary':'warning'">{{['Simple lecteur','Auteur','Animateur'][x.m.stp]}}</span>
              <span v-if="x.g.imh === x.m.im" class="q-px-xs text-bold text-italic text-warning">Hébergeur du groupe</span>
            </div>
            <div v-if="x.m.ard && x.m.ard.length" class="row justify-between">
              <show-html class="col" style="height:1.8rem;overflow:hidden" :texte="x.m.ard" :idx="idx"/>
              <div class="col-auto q-pl-sm fs-sm">{{x.m.dhed}}</div>
            </div>
            <div v-else class="text-italic">(rien sur l'ardoise partagée avec le groupe)</div>
            <show-html v-if="x.m.info && x.m.info.length" class="height-2" :texte="x.m.info" :idx="idx"/>
            <div v-else class="text-italic">(pas de commentaires personnels à propos du groupe)</div>
            <apercu-motscles :motscles="motscles" :src="x.m.mc" :groupe-id="x.m.id"/>
          </div>
        </div>
        <q-btn class="col-auto btnmenu" size="md" color="white" icon="menu" flat dense>
          <q-menu touch-position transition-show="scale" transition-hide="scale">
            <q-list dense class="bord1">
              <q-item clickable v-close-popup @click="avatargrform = true">
                <q-item-section>Détail et édition du groupe</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="voirsecrets(x)">
                <q-item-section>Voir les secrets du groupe</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="nouveausecret(x)">
                <q-item-section>Nouveau secret de groupe</q-item-section>
              </q-item>
              <q-separator />
              <q-item v-if="x.m.stx === 1" clickable v-close-popup @click="accepterinvit(x.m)">
                <q-item-section>Accepter l'invitation</q-item-section>
              </q-item>
              <q-separator />
              <q-item v-if="x.m.stx === 1" clickable v-close-popup @click="refuserinvit(x.m)">
                <q-item-section>Refuser l'invitation</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
    </div>
  </div>

  <q-dialog v-if="sessionok" v-model="nouvgr" class="petitelargeur">
    <q-card class="petitelargeur shadow-8">
      <q-card-section>
        <div class="titre-lg">Création d'un nouveau groupe</div>
        <div class="titre-md">Nom du groupe</div>
        <nom-avatar icon-valider="check" verif groupe label-valider="Valider" @ok-nom="oknom" />
        <q-separator/>
        <div v-if="nomgr">
          <div class="titre-md">Forfaits attribués</div>
          <choix-forfaits v-model="forfaits" :f1="1" :f2="1"/>
        </div>
      </q-card-section>
      <q-card-actions>
        <q-btn flat dense color="primary" icon="close" label="renoncer" @click="nouvgr=false" />
        <q-btn flat dense color="warning" :disable="!nomgr" icon="check" label="Créer le groupe" @click="creergroupe"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-if="!$q.screen.gt.sm && sessionok" v-model="avatargrrech" position="left">
    <panel-filtre-groupes @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"/>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm && sessionok" position="top-left" expand :offset="[5,5]">
    <panel-filtre-groupes @ok="rechercher" :motscles="motscles" :etat-interne="recherche"/>
  </q-page-sticky>
</div>
</template>
<script>
import { computed, reactive, watch } from 'vue'
import { useStore } from 'vuex'
import { Motscles, FiltreGrp, cfg, getJourJ } from '../app/util.mjs'
import PanelFiltreGroupes from './PanelFiltreGroupes.vue'
import PanelGroupe from './PanelGroupe.vue'
import ShowHtml from './ShowHtml.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import NomAvatar from './NomAvatar.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import { data } from '../app/modele.mjs'
import { CreationGroupe, AcceptInvitGroupe, RefusInvitGroupe } from '../app/operations.mjs'

export default ({
  name: 'TabGroupes',

  components: { PanelFiltreGroupes, PanelGroupe, ApercuMotscles, ShowHtml, ChoixForfaits, NomAvatar },

  computed: {
  },

  data () {
    return {
      nouvgr: false,
      forfaits: [1, 1],
      nomgr: ''
    }
  },

  methods: {
    nbj (j) { return j - getJourJ() + cfg().limitesjour.groupenonheb },
    voirsecrets () {
      this.evtfiltresecrets = { cmd: 'fsg', arg: this.groupe }
    },

    nouveausecret () {
      this.evtfiltresecrets = { cmd: 'nvg', arg: this.groupe }
    },

    fermerfiltre () { this.avatargrrech = false },

    rechercher (f) { this.state.filtre = f },

    oknom (nom) { this.nomgr = nom },

    async creergroupe () {
      await new CreationGroupe().run(this.avatar, this.nomgr, this.forfaits)
      this.nouvgr = false
    },

    async accepterinvit (m) {
      await new AcceptInvitGroupe().run(m)
    },
    async refuserinvit (m) {
      await new RefusInvitGroupe().run(m, this.avatar)
    },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const $store = useStore()
    const phdef = cfg().groupe
    const sessionok = computed(() => { return $store.state.ui.sessionok })

    /* La liste des groupes relatives à l'avatar courant
    est en fait la liste des objets Membre de l'avatar courant
    (pas directement le groupe lui-même).
    Mais la clé de la map refMembres est bien l'id du groupe
    */
    /* Une entrée par id de groupe :
    la valeur est l'objet membre correspondant à l'avatar courant */
    const refMembres = reactive({ })

    /* Une entrée par sid de groupe :
    la valeur est l'objet groupe */
    const refGroupes = reactive({ })

    let watchStopm = null
    let watchStopg = null

    function getRefMbGr () {
      /* Collecte les références vers les array de membres de tous les groupes
      référencés en entête de l'avatar courant
      Déclare deux watch dessus: un pour le membre de l'avatar, un pour le groupe
      */
      for (const id in refMembres) delete refMembres[id]
      if (watchStopm) {
        watchStopm()
        watchStopm = null
      }
      for (const id in refGroupes) delete refGroupes[id]
      if (watchStopg) {
        watchStopg()
        watchStopg = null
      }

      if (avatar.value) {
        const av = avatar.value
        av.groupeIds().forEach(idg => {
          const g = data.getGroupe(idg)
          if (!g.estZombi) {
            const im = av.im(idg)
            refMembres[idg] = computed(() => data.getMembre(idg, im))
            refGroupes[idg] = computed(() => data.getGroupe(idg))
          }
        })
        watchStopm = watch(() => { return { ...refMembres } }, () => {
          getGroupes()
        })
        watchStopg = watch(() => { return { ...refGroupes } }, () => {
          getGroupes()
        })
      }
    }

    const compte = computed(() => { return $store.state.db.compte })
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const groupes = computed(() => { return $store.state.db.groupes })
    const groupe = computed({ // groupe courant
      get: () => $store.state.db.groupe,
      set: (val) => $store.commit('db/majgroupe', val)
    })
    const mode = computed(() => $store.state.ui.mode)
    const avatargrrech = computed({
      get: () => $store.state.ui.avatargrrech,
      set: (val) => $store.commit('ui/majavatargrrech', val)
    })
    const avatargrform = computed({
      get: () => $store.state.ui.avatargrform,
      set: (val) => $store.commit('ui/majavatargrform', val)
    })

    const cvs = computed(() => { return $store.state.db.cvs })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreGrp().etat(),
      p: new FiltreGrp().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    function getGroupes () {
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const x in refMembres) {
        const idg = parseInt(x)
        const m = refMembres[idg]
        const g = data.getGroupe(idg)
        if (!g) continue
        if (f.filtre(g, m)) lst.push({ g: g, m: m, k: m.id + '/' + m.v + '/' + g.v })
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
      if (groupe.value) state.lst.forEach((x, n) => { if (x.g.id === groupe.value.id) state.idx = n })
      if (state.idx === -1) {
        if (state.lst.length) {
          state.idx = 0; groupe.value = state.lst[0].g
        } else {
          groupe.value = null
        }
      }
    }

    function latotale () {
      getRefMbGr()
      getGroupes()
      trier()
      indexer()
    }

    function photo (g) {
      const cv = cvs.value[g.id]
      return cv && cv[0] ? cv[0] : phdef
    }

    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })

    const state = reactive({
      /* array des "mbgr" { m, g, k } répondant au filtre
      - m : objet membre d'un groupe g correspondant à l'avatar courant. Il porte l'id du groupe g
      - g : le groupe lui-même : c'est une jointure par l'id du groupe qui est de fait
      identifiant dans cette liste.
      - k : clé unique (id du groupe et versions du membre et du groupe)
      */
      lst: [],
      idx: 0, // index du mbgr courant dans la liste
      filtre: new FiltreGrp() // Filtre par défaut
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

    watch(() => groupes.value, (ap, av) => {
      latotale()
    })

    watch(() => groupe.value, (ap, av) => {
      indexer()
    })

    watch(() => cvs.value, (ap, av) => {
      latotale()
    })

    function afficher (idx) {
      state.idx = idx
      groupe.value = state.lst[state.idx]
      avatargrform.value = true
    }

    function suiv (n) {
      if (state.idx < state.lst.length - 1) state.idx = n ? state.idx + 1 : state.lst.length - 1
      groupe.value = state.lst[state.idx].g
    }

    function prec (n) {
      if (state.idx > 0) state.idx = n ? state.idx - 1 : 0
      groupe.value = state.lst[state.idx].g
    }

    return {
      sessionok,
      groupe,
      photo,
      compte,
      avatar,
      motscles,
      state,
      recherche,
      mode,
      evtfiltresecrets,
      avatargrrech,
      avatargrform,
      afficher,
      suiv,
      prec
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
.bord1
  border:  1px solid $grey-5
  min-width: 20rem
</style>
