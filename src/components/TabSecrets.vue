<template>
<div v-if="sessionok" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
  <q-card  v-if="!avatarscform && (mode === 1 || mode === 2)" class="shadow-8">
    <q-card-actions vertical>
      <q-btn flat dense color="primary" size="md" icon="add" label="Nouveau secret personnel" @click="action(0)"/>
      <q-btn v-if="couple" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret du couple ' +  couple.nom" @click="action(1)"/>
      <q-btn v-if="groupe" flat dense size="md" color="primary" icon="add" :label="'Nouveau secret du groupe ' +  groupe.nom" @click="action(2)"/>
      <div class="row justify-center">
        <q-input flat dense label="Port d'upload local" style="width:8rem" v-model="port" />
        <q-btn class="q-ml-sm" flat dense icon="save" label="Upload local" @click="action(3, port)" />
      </div>
    </q-card-actions>
  </q-card>

  <div v-if="!state.lst || !state.lst.length" class="titre-lg text-italic">Aucun secret trouvé répondant à ce filtre</div>

  <panel-secret v-if="avatarscform && state.lst && state.lst.length"
    :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'"
    :suivant="state.idx < state.lst.length - 1 ? suiv : null"
    :precedent="state.idx > 0 ? prec : null"
    :index="state.idx" :sur="state.lst.length"/>

  <div v-if="!avatarscform && state.lst && state.lst.length" class="col">
    <div v-for="(s, idx) in state.lst" :key="s.vk"
      :class="dkli(idx) + ' zone full-width row items-start q-py-xs'">
      <q-btn class="col-auto q-mr-sm" dense push size="sm" :icon="'expand_'+(!row[s.vk]?'less':'more')"
        color="primary" @click="togglerow(s.vk)"/>
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
    <panel-filtre @ok="rechercher" @action="action" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"/>
  </q-dialog>

  <q-page-sticky v-if="$q.screen.gt.sm && sessionok" position="top-left" expand :offset="[5,5]">
    <panel-filtre @ok="rechercher" @action="action" :motscles="motscles" :etat-interne="recherche"/>
  </q-page-sticky>

</div>
</template>
<script>
import { Motscles, difference, Filtre, getJourJ, upload, normpath, afficherdiagnostic } from '../app/util.mjs'
import { serial, deserial } from '../app/schemas.mjs'
import { computed, reactive, watch, isRef } from 'vue'
import { useStore } from 'vuex'
import { Secret, data } from '../app/modele.mjs'
import ShowHtml from '../components/ShowHtml.vue'
import ApercuMotscles from '../components/ApercuMotscles.vue'
import PanelSecret from '../components/PanelSecret.vue'
import PanelFiltre from '../components/PanelFiltre.vue'
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
      row: { },
      port: 8000
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

    async action (n, p) {
      if (n === 3) {
        await this.upload(p)
      } else {
        this.nvsecret(n)
      }
    },

    async upload (port) {
      try {
        let nbpj = 0
        let v1 = 0, v2 = 0
        for (let i = 0; i < this.state.lst.length; i++) {
          const s = this.state.lst[i]
          console.log(s.path)
          const buf = enc.encode(s.txt.t)
          v1 += buf.length
          await upload(port, s.path + '.md', buf)
          if (s.nbpj) {
            for (const cpj in s.mpj) {
              const pj = s.mpj[cpj]
              const buf = await s.datapj(pj)
              v2 += buf.length
              const p = s.path + '/' + normpath(pj.nom, true)
              await upload(port, p, buf)
              nbpj++
            }
          }
        }
        afficherdiagnostic('Upload de ' + this.state.lst.length +
          ' secrets (' + nbpj + 'pièce(s) jointe(s)) terminé avec succès. Volume total : ' + v1 + ' + ' + v2)
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
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const groupe = computed(() => { return $store.state.db.groupe })
    const couple = computed(() => { return $store.state.db.couple })
    const mode = computed(() => $store.state.ui.mode)
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
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function indexer () {
      state.idx = -1
      if (secret.value) state.lst.forEach((x, n) => { if (x.id === secret.value.id) state.idx = n })
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

    function nvsecret (n) {
      if (state.secretencreation) {
        afficherdiagnostic('Il ne peut y avoir qu\'un seul secret en création à un instant donné')
        return
      }
      if (n === 0) { // secret personnel
        nouveausecret(new Secret().nouveauP(avatar.value.id))
      } else if (n === 1) {
        const c = couple.value
        if (c) nouveausecret(new Secret().nouveauC(c.id, null, c.avc))
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
        nouveausecret(new Secret().nouveauG(g.id, null, membre.im))
      }
    }

    function nouveausecret (sec) {
      state.secretencreation = sec
      secret.value = sec
      state.lst.push(sec)
      trier()
      indexer()
      avatarscform.value = true
    }

    return {
      sessionok,
      afficherform,
      suiv,
      prec,
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
