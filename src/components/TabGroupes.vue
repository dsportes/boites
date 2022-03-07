<template>

  <div :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
    <div v-if="state.lst && state.lst.length" class="col fs-md">
      <div v-for="(x, idx) in state.lst" :key="x.k">
        <q-card class="shadow-8">
          <div :class="dkli(idx) + ' zone full-width row items-start q-py-xs cursor-pointer'">
            <div class="col-auto column justify-center q-px-xs">
              <img class="photomax" :src="x.g.photo || personnes"/>
              <q-btn size="md" color="primary" icon="menu" flat dense class="q-mt-sm"/>
            </div>
            <div class="col q-px-sm">
              <div class="titre-md text-bold">{{x.g.nom}}</div>
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
              <div v-if="x.m.ard.length !== 0" class="row justify-between">
                <show-html class="col height-2" :texte="x.m.ard" :idx="idx"/>
                <div class="col-auto q-pl-sm fs-sm">{{x.m.dhed}}</div>
              </div>
              <div v-else class="text-italic">(rien sur l'ardoise partagée avec le groupe)</div>
              <show-html v-if="x.m.info.length !== 0" class="height-2" :texte="x.m.info" :idx="idx"/>
              <div v-else class="text-italic">(pas de commentaires personnels à propos du groupe)</div>
              <apercu-motscles :motscles="motscles" :src="x.m.mc" :groupe-id="x.m.id"/>
            </div>
            <q-menu touch-position transition-show="scale" transition-hide="scale">
              <q-list dense style="min-width: 10rem">
                <q-item clickable v-close-popup @click="afficher(x)">
                  <q-item-section>Afficher / éditer le groupe</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="voirsecrets(x)">
                  <q-item-section>Voir les secrets du groupe</q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable v-close-popup @click="nouveausecret(x)">
                  <q-item-section>Nouveau secret de groupe</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </div>
        </q-card>
      </div>
    <div v-if="!state.lst || !state.lst.length" class="titre-lg">L'avatar n'est memebre d'auncun groupe</div>
  </div>

  <q-dialog v-model="editgr" class="moyennelargeur">
    <div>Bonjour</div>
    <panel-groupe :close="fermeredit"/>
  </q-dialog>

  <q-dialog v-model="nouvgr" class="petitelargeur">
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

  <q-dialog v-model="panelfiltre" position="left">
    <panel-filtre-groupes @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre" @action="nouveauGroupe"></panel-filtre-groupes>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre-groupes @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre" @action="nouveauGroupe"/>
  </q-page-sticky>
</div>
</template>
<script>
import { computed, reactive, watch, ref } from 'vue'
import { useStore } from 'vuex'
import { Motscles, FiltreGrp, cfg, getJourJ } from '../app/util.mjs'
import PanelFiltreGroupes from './PanelFiltreGroupes.vue'
import PanelGroupe from './PanelGroupe.vue'
import ShowHtml from './ShowHtml.vue'
import ChoixForfaits from './ChoixForfaits.vue'
import NomAvatar from './NomAvatar.vue'
import ApercuMotscles from './ApercuMotscles.vue'
import { data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'
import { CreationGroupe } from '../app/operations.mjs'

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
    nbj (j) { return j - getJourJ() },
    voirsecrets (x) {
      this.groupepluscourant(x)
      this.evtfiltresecrets = { cmd: 'fsg', arg: x.g }
    },

    nouveausecret (x) {
      this.groupepluscourant(x)
      this.evtfiltresecrets = { cmd: 'nvg', arg: x.g }
    },

    afficher (x) {
      this.groupepluscourant(x)
      this.editgr = true
    },

    groupepluscourant (x) {
      // console.log(x.g.nom)
      this.groupeplus = x
    },

    fermeredit () { this.editgr = false },

    fermerfiltre () {
      this.panelfiltre = false
    },

    rechercher (f) {
      this.state.filtre = f
    },

    nouveauGroupe () { this.nouvgr = true },

    oknom (nom) { this.nomgr = nom },

    async creergroupe () {
      await new CreationGroupe().run(this.avatar, this.nomgr, this.forfaits)
    },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') }
  },

  setup () {
    const $store = useStore()
    const personnes = cfg().personnes.default

    /* La liste des groupes relatives à l'avatar courant
    est en fait la liste des objets Membre de l'avatar courant
    (pas directement le groupe lui-même).
    Mais la clé de la map refMembres est bien l'id du groupe
    */
    let watchStopm = null
    let watchStopg = null
    function getRefMbGr () {
      /* Collecte les références vers les array de membres de tous les groupes
      référencés en entête de l'avatar courant
      Déclare deux watch dessus: un pour le membre de l'avatar, un pour le groupe
      */
      for (const sid in refMembres) delete refMembres[sid]
      if (watchStopm) {
        watchStopm()
        watchStopm = null
      }
      for (const sid in refGroupes) delete refGroupes[sid]
      if (watchStopg) {
        watchStopg()
        watchStopg = null
      }

      if (avatar.value) {
        const ida = avatar.value.id
        const setIds = avatar.value.allGrId()
        setIds.forEach(id => {
          const sid = crypt.idToSid(id)
          refMembres[sid] = computed(() => data.getMembreParId(sid, ida))
          refGroupes[sid] = computed(() => data.getGroupe(sid))
        })
        watchStopm = watch(() => { return { ...refMembres } }, () => {
          getGroupes()
        })
        watchStopg = watch(() => { return { ...refGroupes } }, () => {
          getGroupes()
        })
      }
    }

    /* Une entrée par sid de groupe :
    la valeur est l'objet membre correspondant à l'avatar courant */
    const refMembres = reactive({ })

    /* Une entrée par sid de groupe :
    la valeur est l'objet groupe */
    const refGroupes = reactive({ })

    const compte = computed(() => { return $store.state.db.compte })
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const groupes = computed(() => { return $store.state.db.groupes })
    const mode = computed(() => $store.state.ui.mode)
    const editgr = computed({
      get: () => $store.state.ui.editgr,
      set: (val) => $store.commit('ui/majeditgr', val)
    })

    const groupeplus = computed({ // groupe courant
      get: () => $store.state.db.groupeplus,
      set: (val) => $store.commit('db/majgroupeplus', val)
    })
    const repertoire = computed(() => { return $store.state.db.repertoire })

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new FiltreGrp().etat(),
      p: new FiltreGrp().etat()
    })

    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const panelfiltre = ref(false)

    function getGroupes () {
      const f = state.filtre
      f.debutFiltre()
      const lst = []
      for (const sid in refMembres) {
        const m = refMembres[sid]
        const g = data.getGroupe(sid)
        if (!g) continue
        if (f.filtre(g, m)) lst.push({ g: g, m: m, k: g.sid + '/' + g.v + '/' + m.pk + '/' + m.v })
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function latotale () {
      getRefMbGr()
      getGroupes()
      trier()
    }

    const evtavatargr = computed(() => $store.state.ui.evtavatargr)
    watch(() => evtavatargr.value, (ap) => {
      if (ap.evt === 'recherche') panelfiltre.value = true
    })

    const evtfiltresecrets = computed({ // secret courant
      get: () => $store.state.ui.evtfiltresecrets,
      set: (val) => $store.commit('ui/majevtfiltresecrets', val)
    })

    const state = reactive({
      lst: [], // array des Contacts répondant au filtre
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
      }
    })

    watch(() => avatar.value, (ap, av) => {
      latotale()
    })

    watch(() => groupes.value, (ap, av) => {
      latotale()
    })

    watch(() => repertoire.value, (ap, av) => {
      latotale()
    })

    return {
      personnes,
      compte,
      avatar,
      groupeplus,
      motscles,
      state,
      panelfiltre,
      recherche,
      mode,
      evtfiltresecrets,
      editgr
    }
  }

})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
.photomax
  position: relative
  top: 5px
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
</style>
