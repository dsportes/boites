<template>
<div v-if="sessionok" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <q-card  v-if="!avatarscform && (mode === 1 || mode === 2)" class="shadow-8">
    <q-card-actions vertical>
      <q-btn flat dense color="primary" size="md" icon="add" label="Nouveau secret personnel" @click="nvsecret(0)"/>
      <q-btn v-if="couple" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret du couple ' +  couple.nom" @click="nvsecret(1)"/>
      <q-btn v-if="groupe" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret du groupe ' +  groupe.nom" @click="nvsecret(2)"/>
      <q-btn flat dense icon="save" color="primary" label="Télécharger les secrets" @click="ouvrirdl" />
    </q-card-actions>
  </q-card>

  <div v-if="!state.lst || !state.nbs" class="titre-lg text-italic">Aucun secret trouvé répondant à ce filtre</div>

  <panel-secret v-if="avatarscform && state.lst && state.nbs"
    :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'"
    :suivant="state.idx < state.nbs - 1 ? suiv : null"
    :precedent="state.idx > 0 ? prec : null"
    :supprcreation="supprcreation"
    :index="state.idx" :sur="state.nbs"/>

  <div v-if="!avatarscform && state.lst && state.nbs" class="col">
    <div v-for="(s, idx) in state.lst" :key="s.vk"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs'">
      <div class="col-auto column q-mr-sm">
        <q-btn dense push size="sm" :icon="'expand_'+(!row[s.vk]?'less':'more')"
          color="primary" @click="togglerow(s.vk)"/>
        <q-btn dense push size="sm" color="warning" icon="add">
          <q-menu transition-show="scale" transition-hide="scale">
            <q-list dense style="min-width: 10rem">
              <q-item>
                <q-item-section class="text-italic">Nouveau secret voisin ...</q-item-section>
              </q-item>
              <q-separator />
              <q-item clickable v-close-popup @click="nvsecret(0, s)">
                <q-item-section>...personnel</q-item-section>
              </q-item>
              <q-separator />
              <q-item v-if="s.couple" clickable v-close-popup @click="nvsecret(1, s)">
                <q-item-section>...partagé avec {{s.couple.nom}}</q-item-section>
              </q-item>
              <q-separator v-if="s.groupe" />
              <q-item v-if="s.groupe" clickable v-close-popup @click="nvsecret(2, s)">
                <q-item-section>...partagé avec {{s.groupe.nom}}</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </div>
      <div class="col cursor-pointer" @click="afficherform(idx)">
        <show-html v-if="row[s.vk]" class="height-8 full-width overlay-y-auto bottomborder" :texte="s.txt.t" :idx="idx"/>
        <div v-else class="full-width text-bold">{{s.titre}}</div>
        <div class="full-width row items-center">
          <apercu-motscles class="col-6" :motscles="motscles" :src="s.mc" :groupe-id="s.ts===2?s.id:0"/>
          <div class="col-6 row justify-end items-center">
            <span class="fs-sm q-px-sm">{{s.partage}}</span>
            <span class="fs-sm font-mono">{{s.dh}}</span>
            <q-btn v-if="s.nbpj" size="sm" color="warning" flat dense icon="attach_file" :label="s.nbpj"/>
            <q-btn v-if="s.st!=99999" size="sm" color="warning" flat dense icon="auto_delete" :label="s.nbj"/>
          </div>
        </div>
      </div>
    </div>
  </div>

  <q-dialog  v-if="!$q.screen.gt.sm && sessionok" v-model="avatarscrech" position="left">
    <panel-filtre @ok="rechercher" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"/>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm && sessionok" position="top-left" expand :offset="[5,5]">
    <panel-filtre @ok="rechercher" :motscles="motscles" :etat-interne="recherche"/>
  </q-page-sticky>

  <q-dialog v-if="sessionok" v-model="dialoguedlselection">
    <q-card class="shadow-8 moyennelargeur">
      <q-card-section>
        <div class="titre-lg text-center full-width">Téléchargement sur le poste des secrets sélectionnés et de leurs fichiers</div>
        <div class="fs-md">Lancer l'application "upload" : port par défaut 8080. Penser à l'arrêter après.</div>
        <q-input flat dense label="Numéro de port" style="width:8rem" v-model="port" />
      </q-card-section>
      <q-card-actions vertical center>
        <q-btn v-if="!findl" flat dense icon="save" :disable="rundl" color="primary" label="Démarrer le téléchargement" @click="startdl" />
        <q-btn v-if="!findl" flat dense icon="close" color="warning" :label="rundl ? 'Interrompre le téléchargement' : 'Annuler'" @click="fermerdl" />
        <q-btn v-if="findl" dense icon="close" color="warning" label="Téléchargement terminé avec succès !" @click="fermerdl" />
      </q-card-actions>
      <q-card-section>
        <div class="titre-md full-width text-center text-italic q-my-md color-primary text-bold">Estimation / réalisation</div>
        <div class="row justify-center items-center">
          <div class="col-5 text-right"></div>
          <div class="col-3 text-center font-mono">Prévu</div>
          <div class="col-1 text-center font-mono"></div>
          <div class="col-3 text-center font-mono">Téléchargé</div>
        </div>
        <div class="row justify-center items-center q-my-sm">
          <div class="col-5 text-right">Nombre de secrets / fichiers</div>
          <div class="col-3 text-center font-mono">{{nbsp}} / {{nbfp}}</div>
          <q-circular-progress class="col-1 text-center" :value="nbsr * 100 / nbsp" :thickness="0.2" color="grey-5" track-color="warning" />
          <div class="col-3 text-center font-mono">{{nbsr}} / {{nbfr}}</div>
        </div>
        <div class="row justify-center items-center q-my-sm">
          <div class="col-5 text-right">Volume V1 des textes</div>
          <div class="col-3 text-center font-mono">{{edvol(v1p)}}</div>
          <q-circular-progress class="col-1 text-center" :value="v1r * 100 / v1p" :thickness="0.2" color="grey-5" track-color="warning" />
          <div class="col-3 text-center font-mono">{{edvol(v1r)}}</div>
        </div>
        <div class="row justify-center items-center q-my-sm">
          <div class="col-5 text-right">Volume V2 des fichiers</div>
          <div class="col-3 text-center font-mono">{{edvol(v2p)}}</div>
          <q-circular-progress class="col-1 text-center" :value="v2r * 100 / v2p" :thickness="0.2" color="grey-5" track-color="warning" />
          <div class="col-3 text-center font-mono">{{edvol(v2r)}}</div>
        </div>
        <div class="font-mono fs-sm height-4"><span v-if="rundl">{{encours}}</span></div>
      </q-card-section>
    </q-card>
  </q-dialog>

</div>
</template>
<script>
import { Motscles, difference, Filtre, getJourJ, putData, afficherdiagnostic, edvol, sleep } from '../app/util.mjs'
import { serial, deserial } from '../app/schemas.mjs'
import { computed, reactive, watch, isRef } from 'vue'
import { useStore } from 'vuex'
import { Secret, data } from '../app/modele.mjs'
import ShowHtml from '../components/ShowHtml.vue'
import ApercuMotscles from '../components/ApercuMotscles.vue'
import PanelSecret from '../components/PanelSecret.vue'
import PanelFiltre from '../components/PanelFiltre.vue'
import { crypt } from '../app/crypto.mjs'
import { useQuasar } from 'quasar'

const enc = new TextEncoder()

export default ({
  name: 'TabSecrets',

  components: { ApercuMotscles, PanelSecret, PanelFiltre, ShowHtml },

  props: { },

  computed: {
  },

  data () {
    return {
      stopdl: false,
      rundl: false,
      findl: false,
      encours: '',
      edvol: edvol,
      row: { },
      port: 8000,
      nbsp: 0,
      nbfp: 0,
      nbsr: 0,
      nbfr: 0,
      v1p: 0,
      v2p: 0,
      v1r: 0,
      v2r: 0
    }
  },

  methods: {
    rechercher (f) { this.state.filtre = f },

    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    ouvrirsecret (s) {
      this.secret = s
      this.avatarscform = true
    },

    fermersecret () {
      this.secret = null
      this.avatarscform = false
    },

    togglerow (vk) {
      if (this.row[vk] === true) {
        this.row[vk] = false
      } else {
        this.row[vk] = true
      }
    },

    fermerdl () {
      this.stopdl = true
      this.dialoguedlselection = false
    },

    ouvrirdl () {
      this.dialoguedlselection = true
      this.stopdl = false
      this.rundl = false
      this.findl = false
      this.encours = ''
      this.v1p = 0; this.v2p = 0; this.v1r = 0; this.v2r = 0; this.nbsp = 0; this.nbfp = 0; this.nbsr = 0; this.nbfr = 0
      for (let i = 0; i < this.state.lst.length; i++) {
        const s = this.state.lst[i]
        this.nbsp++
        this.v1p += s.v1
        this.v2p += s.v2
        this.nbfp += s.nbfa
      }
    },

    b64 (u) { return crypt.u8ToB64(enc.encode(u), true) },

    async startdl () {
      this.rundl = true
      this.encours = ''
      const l = []
      for (let i = 0; i < this.state.lst.length; i++) { const s = this.state.lst[i]; l.push([s.id, s.ns]) }
      const root = 'http://localhost:' + this.port + '/'
      const tempo = 0 // 300
      try {
        for (const x of l) {
          const s = data.getSecret(x[0], x[1])
          if (!s) continue
          if (this.stopdl) break
          const n1 = data.repertoire.na(s.id).nomf
          const n2 = s.nomf
          const buf = enc.encode(s.txt.t)
          this.v1r += buf.length
          const ec = n1 + '/' + n2 + '.md'
          this.encours = 'Ecriture : ' + ec + ' - ' + edvol(buf.length)
          const p = root + this.b64(this.org + '/' + ec)
          await putData(p, buf)
          if (tempo) await sleep(tempo)
          if (this.stopdl) break
          if (s.nbfa) {
            for (const ix in s.mfa) {
              const idf = parseInt(ix)
              const ec = n1 + '/' + n2 + '/' + s.nomFichier(idf)
              this.encours = 'Lecture  : ' + ec + ' - ' + edvol(s.mfa[idf].lg)
              const buf = await s.getFichier(idf)
              if (tempo) await sleep(tempo)
              if (this.stopdl) break
              const p = root + this.b64(this.org + '/' + ec)
              this.encours = 'Ecriture : ' + ec + ' - ' + edvol(s.mfa[idf].lg)
              await putData(p, buf)
              if (tempo) await sleep(tempo)
              if (this.stopdl) break
              this.v2r += buf.length
              this.nbfr++
              this.encours = ''
            }
          }
          this.encours = ''
          this.nbsr++
        }
        if (this.stopdl) {
          afficherdiagnostic('Opération interrompue')
          this.dialoguedlselection = false
        } else {
          this.findl = true
        }
      } catch (e) {
        afficherdiagnostic('Erreur du serveur local d\'upload : ' + e)
      }
    }
  },

  setup () {
    const $store = useStore()
    const $q = useQuasar()
    // const compte = computed(() => { return $store.state.db.compte })
    const sessionok = computed(() => { return $store.state.ui.sessionok })
    const org = computed(() => { return $store.state.ui.org })
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const groupe = computed(() => { return $store.state.db.groupe })
    const couple = computed(() => { return $store.state.db.couple })
    const mode = computed(() => $store.state.ui.mode)
    const dialoguedlselection = computed({
      get: () => $store.state.ui.dialoguedlselection,
      set: (val) => $store.commit('ui/majdialoguedlselection', val)
    })
    const secret = computed({ // secret courant
      get: () => $store.state.db.secret,
      set: (val) => $store.commit('db/majsecret', val)
    })
    const avatarscrech = computed({
      get: () => $store.state.ui.avatarscrech,
      set: (val) => $store.commit('ui/majavatarscrech', val)
    })
    const avatarscform = computed({
      get: () => $store.state.ui.avatarscform,
      set: (val) => $store.commit('ui/majavatarscform', val)
    })

    let watchStop = null
    function getRefSecrets () {
      /* Collecte les références vers les array de secrets
      - l'array de ceux de l'avatar
      - les array de tous les couples concernés
      - les array de tous les groupes concernés
      Déclare un watch dessus
      */
      for (const sid in refSecrets) delete refSecrets[sid]
      if (watchStop) {
        watchStop()
        watchStop = null
      }

      const f = state.filtre
      const setIds = new Set()
      if (avatar.value) {
        // seulement si les secrets perso sont requis
        if (f.perso) setIds.add(avatar.value.id)
        if (f.coupleId) {
          if (f.coupleId === -1) {
            // les secrets de TOUS les couples sont requis
            avatar.value.coupleIds(setIds)
          } else {
            // les secrets d'UN SEUL couple sont requis
            setIds.add(f.coupleId)
          }
        }
        if (f.groupeId) {
          if (f.groupeId === -1) {
            // les secrets de TOUS les groupes sont requis
            avatar.value.groupeIds(setIds)
          } else {
            // les secrets d'UN SEUL groupe sont requis
            setIds.add(f.groupeId)
          }
        }
      }
      setIds.forEach(id => {
        refSecrets[id] = computed(() => data.getSecret(id))
      })
      watchStop = watch(() => { return { ...refSecrets } }, () => {
        getSecrets()
      })
    }

    function getSecrets () {
      // Récupère les secrets référencés et les filtre au passage
      const f = state.filtre
      const lst = []
      f.debutFiltre()
      for (const id in refSecrets) {
        const val = refSecrets[id]
        // selon le cas on reçoit le ref ou la value
        const map = isRef(val) ? val.value : val
        // map: map des secrets de clé majeure id (avatar / couple / groupe)
        // (clé: ns, val: secret)
        for (const ns in map) {
          const secret = map[ns]
          if (f.filtre(secret)) lst.push(secret)
        }
      }
      if (state.secretencreation) lst.push(state.secretencreation)
      state.lst = lst
      state.nbs = state.lst.length
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function indexer () {
      state.idx = -1
      if (secret.value) {
        state.lst.forEach((x, n) => { if (x.pk === secret.value.pk) state.idx = n })
      }
      if (state.idx === -1) {
        if (state.lst.length) {
          state.idx = 0; secret.value = state.lst[0]
        } else {
          secret.value = null
        }
      }
    }

    function latotale () {
      getRefSecrets()
      getSecrets()
      trier()
      indexer()
    }

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: new Filtre(avatar.value ? avatar.value.id : 0).etat(),
      p: new Filtre(avatar.value ? avatar.value.id : 0).etat()
    })

    // watch(() => groupe.value, (ap, av) => { motscles.recharger() })
    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    /* Une entrée par groupe de secrets (map) attachés à une sid de l'avatar ou d'un groupe
    La valeur est une référence active */
    const refSecrets = reactive({ })

    const state = reactive({
      idx: 0,
      secretencreation: null,
      lst: [], // array des SECRETS des références ci-dessous répondant au filtre
      nbs: 0, // nombre de secrets (lst.length mais reactive)
      filtre: new Filtre(avatar.value ? avatar.value.id : 0), // Filtre par défaut
      contacts: []
    })

    watch(() => state.filtre, (filtre, filtreavant) => {
      if (!filtre || !filtreavant || filtre.equal(filtreavant)) return
      const chg = filtre.changement(filtreavant)
      if (chg >= 3) {
        latotale()
        return
      }
      if (chg >= 2) {
        getSecrets()
      }
      if (chg >= 1) {
        trier()
        indexer()
      }
    })

    latotale()

    watch(() => avatar.value, (ap, av) => {
      // Avatar modifié : la liste des groupes a pu changer, recharger SI nécessaire
      if (state.filtre.groupeId === -1) {
        const sav = av.allGrId()
        const sap = ap.allGrId()
        if (difference(sav, sap).size || difference(sap, sav).size) {
          latotale()
        }
      }
    })

    watch(() => couple.value, (ap, av) => {
      // couple modifié : recharger SI nécessaire
      if (state.filtre.coupleId === -1 || state.filtre.coupleId === (ap ? ap.id : 0)) {
        latotale()
      }
    })

    watch(() => groupe.value, (ap, av) => {
      // groupe modifié : recharger SI nécessaire
      if (state.filtre.groupeId === -1 || state.filtre.groupeId === (ap ? ap.id : 0)) {
        latotale()
      }
    })

    function nbj (dlv) { return dlv - getJourJ() }

    const evtfiltresecrets = computed(() => $store.state.ui.evtfiltresecrets)
    watch(() => evtfiltresecrets.value, (ap) => {
      const c = ap.arg
      const cmd = ap.cmd
      if (cmd === 'fsc' || cmd === 'fsg') ouvrirfiltre()
      setTimeout(() => {
        const f = new Filtre()
        if (cmd === 'fsc') { f.coupleId = c.id; f.groupeId = null }
        if (cmd === 'fsg') { f.coupleId = null; f.groupeId = c.id }
        f.perso = false
        recherche.a = f.etat() // pour que le panel de filtre affiche le filtre choisi
        recherche.p = deserial(serial(recherche.a))
        state.filtre = f // pour activer la rechercher selon ce filtre sans avoir à appuyer sur "Rechercher"
        if (cmd === 'nvc') {
          nvsecret(1)
        }
        if (cmd === 'nvg') {
          nvsecret(2)
        }
      }, 100)
    })

    function fermerfiltre () { if (!$q.screen.gt.sm) avatarscrech.value = false }
    function ouvrirfiltre () { if (!$q.screen.gt.sm) avatarscrech.value = true }

    function afficherform (idx) {
      state.idx = idx
      secret.value = state.lst[state.idx]
      avatarscform.value = true
    }

    function suiv (n) {
      if (state.idx < state.lst.length - 1) state.idx = n ? state.idx + 1 : state.lst.length - 1
      secret.value = state.lst[state.idx]
    }

    function prec (n) {
      if (state.idx > 0) state.idx = n ? state.idx - 1 : 0
      secret.value = state.lst[state.idx]
    }

    function supprcreation () {
      const s = state.lst[0]
      if (s.v !== 0) return // n'était pas en création. Etrange !
      $store.commit('db/cleanVoisins', s.ref ? s.pkref : s.pk)
      state.lst.splice(0, 1)
      state.nbs--
      state.secretencreation = null
      secret.value = state.lst.length > 0 ? state.lst[0] : null
    }

    function nvsecret (n, voisin) {
      if (state.secretencreation) {
        afficherdiagnostic('Il ne peut y avoir qu\'un seul secret en création à un instant donné')
        return
      }
      const ref = !voisin ? null : (voisin.ref ? voisin.ref : [voisin.id, voisin.ns])
      if (n === 0) { // secret personnel
        nouveausecret(new Secret().nouveauP(avatar.value.id, ref))
      } else if (n === 1) {
        const c = couple.value
        if (c) nouveausecret(new Secret().nouveauC(c.id, ref, c.avc))
      } else if (n === 2) {
        const g = groupe.value
        if (!g) {
          afficherdiagnostic('Le groupe ? n\'est pas en état d\'accepter le partage de nouveaux secrets.')
          return
        }
        if (g.sty === 0) {
          afficherdiagnostic('Le groupe ' + g.nom + ' est "archivé", création et modification de secrets impossible.')
          return
        }
        const membre = g.membreParId(avatar.value.id)
        if (!membre || !membre.stp) {
          afficherdiagnostic('Seuls les membres de niveau "auteur" et "animateur" du groupe ' + g.nom + ' peuvent créer ou modifier des secrets.')
          return
        }
        nouveausecret(new Secret().nouveauG(g.id, ref, membre.im))
      }
    }

    function nouveausecret (sec) {
      state.secretencreation = sec
      secret.value = sec
      state.lst.push(sec)
      state.nbs++
      trier()
      indexer()
      avatarscform.value = true
    }

    return {
      sessionok,
      org,
      dialoguedlselection,
      afficherform,
      suiv,
      prec,
      supprcreation,
      avatarscrech,
      avatarscform,
      fermerfiltre,
      avatar,
      secret,
      couple,
      groupe,
      motscles,
      state,
      nvsecret,
      nbj,
      mode,
      recherche
    }
  }

})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 23rem
.bottomborder
  border-bottom: 1px solid $grey-5
.secretcourant:hover
  background-color: rgba(130, 130, 130, 0.5)
</style>
