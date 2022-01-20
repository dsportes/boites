<template>
<q-page class="fs-md">
  <div v-if="tabavatar === 'secrets'" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
    <div v-if="state.lst && state.lst.length" class="col">
      <div v-for="(s, idx) in state.lst" :key="s.vk" :class="dkli(idx) + ' full-width row items-start q-py-xs'">
        <q-btn class="col-auto q-mr-sm" dense push size="sm" :icon="'expand_'+(!row[s.vk]?'less':'more')"
          color="primary" @click="togglerow(s.vk)"/>
        <div class="secretcourant col cursor-pointer" @click="ouvrirsecret(s)">
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
    <div v-if="!state.lst || !state.lst.length" class="titre-lg text-italic">Aucun secret trouvé répondant à ce filtre</div>
  </div>

  <div v-if="tabavatar === 'contacts'" class="full-width">
    <div class="titre-lg">Contacts de l'avatar</div>
  </div>

  <div v-if="tabavatar === 'groupes'" class="full-width">
    <div class="titre-lg">Groupes auxquels l'avatar participe</div>
  </div>

  <div v-if="tabavatar === 'etc' && avatar">
    <q-list class="full-width">
      <q-expansion-item label="Carte de visite" default-opened
        header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
        <div class="fake"><apercu-avatar class="maauto" page editer :avatar-id="avatar.id"/></div>
      </q-expansion-item>
      <q-expansion-item class="q-mt-xs" label="Mots clés du compte"
        header-class="expansion-header-class-1 titre-lg bg-secondary text-white">
        <div class="fake"><mots-cles class="maauto" :motscles="motscles"></mots-cles></div>
      </q-expansion-item>
    </q-list>
  </div>

  <q-dialog v-model="editsec" class="moyennelargeur">
    <panel-secret :secret="secret" :close="fermersecret"/>
  </q-dialog>

  <q-dialog v-model="panelfiltre" position="left">
    <panel-filtre @ok="rechercher" @action="action" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre>
  </q-dialog>

  <q-page-sticky v-if="tabavatar === 'secrets' && $q.screen.gt.sm" position="top-left" expand :offset="[5,5]">
    <panel-filtre @ok="rechercher" @action="action" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre>
  </q-page-sticky>
</q-page>
</template>

<script>
import { computed, /* onMounted, */ reactive, watch, ref, isRef } from 'vue'
import { useStore } from 'vuex'
import { onBoot } from '../app/page.mjs'
import { Motscles, difference, Filtre, upload, normpath } from '../app/util.mjs'
// import BoutonHelp from '../components/BoutonHelp.vue'
import ApercuMotscles from '../components/ApercuMotscles.vue'
import MotsCles from '../components/MotsCles.vue'
import ApercuAvatar from '../components/ApercuAvatar.vue'
import PanelSecret from '../components/PanelSecret.vue'
import PanelFiltre from '../components/PanelFiltre.vue'
import ShowHtml from '../components/ShowHtml.vue'
import { CvAvatar } from '../app/operations.mjs'
import { Secret, data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'

const enc = new TextEncoder()

export default ({
  name: 'Avatar',

  components: { /* BoutonHelp, */ ApercuAvatar, ApercuMotscles, MotsCles, PanelSecret, PanelFiltre, ShowHtml },

  data () {
    return {
      row: { },
      editsec: false
    }
  },

  methods: {
    ouvrirsecret (s) {
      this.secret = s
      this.editsec = true
    },
    fermersecret () {
      this.editsec = false
    },
    togglerow (vk) {
      if (this.row[vk] === true) {
        this.row[vk] = false
      } else {
        this.row[vk] = true
      }
    },
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },
    async action (n, p) {
      if (this.secret) return
      if (n === 1) { // secret personnel
        this.ouvrirsecret(new Secret().nouveauP(this.avatar.id))
      } else if (n === 2) {
        const c = this.contact
        if (c && c.accepteNouveauSecret) {
          this.ouvrirsecret(new Secret().nouveauC(this.avatar.id, c))
        } else {
          this.diagnostic = 'Le contact ' + (c ? c.nom : '?') + ' n\'est pas en état d\'accepter le partage de nouveaux secrets.'
        }
      } else if (n === 3) {
        const g = this.groupe
        if (!g) {
          this.diagnostic = 'Le groupe ? n\'est pas en état d\'accepter le partage de nouveaux secrets.'
          return
        }
        if (g.sty === 0) {
          this.diagnostic = 'Le groupe ' + g.nom + ' est "archivé", création et modification de secrets impossible.'
          return
        }
        const im = g.imDeId(this.avatar.id)
        const membre = im ? data.getMembre(g.id, im) : null
        if (!membre || !membre.stp) {
          this.diagnostic = 'Seuls les membres de niveau "auteur" et "animateur" du groupe ' + g.nom + ' peuvent créer ou modifier des secrets.'
          return
        }
        this.ouvrirsecret(new Secret().nouveauG(this.avatar.id, g))
      } else if (n === 4) {
        await this.upload(p)
      }
    },
    fermerfiltre () {
      this.panelfiltre = false
    },
    rechercher (f) {
      this.state.filtre = f
      // console.log(JSON.stringify(f))
    },
    async validercv (resultat) {
      if (resultat) {
        // console.log('CV changée : ' + resultat.info + '\n' + resultat.ph.substring(0, 30))
        const cvinfo = await this.avatar.cvToRow(resultat.ph, resultat.info)
        await new CvAvatar().run(this.avatar.id, cvinfo)
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
        this.diagnostic = 'Upload de ' + this.state.lst.length +
          ' secrets (' + nbpj + 'pièce(s) jointe(s)) terminé avec succès. Volume total : ' + v1 + ' + ' + v2
      } catch (e) {
        this.diagnostic = 'Erreur du serveur local d\'upload : ' + e
      }
    }
  },

  setup () {
    onBoot()

    let watchStop = null
    function getRefSecrets () {
      /* Collecte les références vers les array de secrets
      - l'array de ceux de l'avatar
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
        // seulement si les secrets perso et des contacts sont requis
        if (f.perso || f.contactId) setIds.add(avatar.value.id)
        if (f.groupeId) {
          if (f.groupeId === -1) {
            // les secrets de TOUS les groupes sont requis
            avatar.value.allGrId(setIds)
          } else {
            // les secrets d'UN SEUL groupe sont requis
            setIds.add(f.groupeId)
          }
        }
      }
      setIds.forEach(id => {
        const sid = crypt.idToSid(id)
        refSecrets[sid] = computed(() => data.getSecret(sid))
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
      for (const sid in refSecrets) {
        const val = refSecrets[sid]
        // selon le cas on reçoit le ref ou la value
        const map = isRef(val) ? val.value : val // map: map de secrets (clé: sid, val: secret)
        for (const sid in map) {
          const secret = map[sid]
          if (f.filtre(secret)) lst.push(secret)
        }
      }
      state.lst = lst
    }

    function trier () {
      const l = []; state.lst.forEach(x => l.push(x))
      l.sort((a, b) => state.filtre.fntri(a, b))
      state.lst = l
    }

    function latotale () {
      getRefSecrets()
      getSecrets()
      trier()
    }

    const $store = useStore()
    const diagnostic = computed({
      get: () => $store.state.ui.diagnostic,
      set: (val) => $store.commit('ui/majdiagnostic', val)
    })
    const nouvsec = ref(false)
    const compte = computed(() => { return $store.state.db.compte })
    const prefs = computed(() => { return $store.state.db.prefs })
    const avatar = computed(() => { return $store.state.db.avatar })
    const contact = computed(() => { return $store.state.db.contact })
    const groupe = computed(() => { return $store.state.db.groupe })
    const mode = computed(() => $store.state.ui.mode)
    const secret = computed({ // secret courant
      get: () => $store.state.db.secret,
      set: (val) => $store.commit('db/majsecret', val)
    })

    const panelfiltre = ref(false)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, null)
    motscles.recharger()

    const z = new Uint8Array([])
    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: { perso: true, ct: 0, gr: 0, mc1: z, mc2: z, perm: true, temp: 99998, modif: 0, texte: '', corps: false, tri: 0 },
      p: { perso: true, ct: 0, gr: 0, mc1: z, mc2: z, perm: true, temp: 99998, modif: 0, texte: '', corps: false, tri: 0 }
    })

    // watch(() => groupe.value, (ap, av) => { motscles.recharger() })
    watch(() => prefs.value, (ap, av) => { motscles.recharger() })

    const evtavatar = computed(() => $store.state.ui.evtavatar)
    watch(() => evtavatar.value, (ap) => {
      if (ap.evt === 'recherche') panelfiltre.value = true
    })

    const tabavatar = computed(() => $store.state.ui.tabavatar)

    function nouveausecret (id2) { // pour un couple seulement, id2 du contact de l'avatar du compte
      const s = new Secret()
      return !id2 ? s.nouveauP(avatar.value.id) : s.nouveauC(avatar.value.id, id2)
    }

    /* Une entrée par groupe de secrets (map) attachés à une sid de l'avatar ou d'un groupe
    La valeur est une référence active */
    const refSecrets = reactive({ })

    const state = reactive({
      lst: [], // array des SECRETS des références ci-dessous répondant au filtre
      filtre: new Filtre(avatar.value ? avatar.value.id : 0) // Filtre par défaut
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

    watch(() => contact.value, (ap, av) => {
      // contact modifié : recharger SI nécessaire
      if (state.filtre.contactId) {
        latotale()
      }
    })

    watch(() => groupe.value, (ap, av) => {
      // groupe modifié : recharger SI nécessaire
      if (state.filtre.groupeId === -1 || state.filtre.groupeId === (ap ? ap.id : 0)) {
        latotale()
      }
    })

    return {
      diagnostic,
      compte,
      avatar,
      secret,
      tabavatar,
      motscles,
      state,
      nouveausecret,
      nouvsec,
      mode,
      panelfiltre,
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
<style lang="sass">
</style>
