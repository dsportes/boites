<template>
<q-page>
  <div v-if="tabavatar === 'secrets'" :class="$q.screen.gt.sm ? 'ml20' : 'q-pa-xs full-width'">
    <!--
    <div v-if="$q.screen.gt.sm" class="q-mr-md shadow-4 col-auto largeurfiltre">
    </div>
    <div class="col-auto" style="width:2px;height:100vh;background-color:grey"></div>
    -->
    <div v-if="state.lst && state.lst.length" class="col">
      <vue-secret v-for="(secret, idx) in state.lst" :key="secret.vk" :idx="idx" :secret="secret" :motscles="motscles" :avobsid="avatar.id"></vue-secret>
    </div>
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

  <q-dialog v-if="$q.screen.lt.md" v-model="panelfiltre" position="left">
    <div class="largeurfiltre">
      <panel-filtre @ok="rechercher" @action="action" :motscles="motscles" :etat-interne="recherche" :fermer="fermerfiltre"></panel-filtre>
    </div>
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
import { Motscles, difference, Filtre } from '../app/util.mjs'
// import BoutonHelp from '../components/BoutonHelp.vue'
import MotsCles from '../components/MotsCles.vue'
import CarteVisite from '../components/CarteVisite.vue'
import VueSecret from '../components/VueSecret.vue'
import PanelFiltre from '../components/PanelFiltre.vue'
import { CvAvatar } from '../app/operations.mjs'
import { Secret, data } from '../app/modele.mjs'
import { crypt } from '../app/crypto.mjs'

export default ({
  name: 'Avatar',

  components: { /* BoutonHelp, */ CarteVisite, MotsCles, VueSecret, PanelFiltre },

  data () {
    return {
    }
  },

  methods: {
    action (n) {
      if (n === 1) {
        this.nouvsec = true
      }
    },
    fermerfiltre () {
      this.panelfiltre = false
    },
    rechercher (f) {
      this.state.filtre = f
      console.log(JSON.stringify(f))
    },
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

    const watchedRefs = new Map() // clé: sid, val: fonction de stop

    function getRefSecrets () {
      /* Collecte les références vers les array de secrets
      - l'array de ceux de l'avatar
      - les array de tous les groupes concernés
      Déclare un watch dessus
      */
      for (const sid in refSecrets) {
        const stop = watchedRefs.get(sid)
        if (stop) stop()
        delete refSecrets[sid]
      }
      watchedRefs.clear()

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
        const ref = computed(() => data.getSecret(sid))
        refSecrets[sid] = ref
        if (!watchedRefs.has(sid)) {
          const stop = watch(() => refSecrets[sid], (ap, av) => {
            getSecrets()
          })
          watchedRefs.set(sid, stop)
        }
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
    const nouvsec = ref(false)
    const compte = computed(() => { return $store.state.db.compte })
    const avatar = computed(() => { return $store.state.db.avatar })
    const contact = computed(() => { return $store.state.db.contact })
    const groupe = computed(() => { return $store.state.db.groupe })
    const mode = computed(() => $store.state.ui.mode)

    const panelfiltre = ref(false)

    const mc = reactive({ categs: new Map(), lcategs: [], st: { enedition: false, modifie: false } })
    const motscles = new Motscles(mc, 1, groupe.value ? groupe.value.id : null)
    motscles.recharger()

    const z = new Uint8Array([])
    const recherche = reactive({ // doit correspondre au Filtre par défaut
      a: { perso: true, ct: 0, gr: 0, mc1: z, mc2: z, perm: true, temp: 99998, modif: 0, texte: '', corps: false, tri: 0 },
      p: { perso: true, ct: 0, gr: 0, mc1: z, mc2: z, perm: true, temp: 99998, modif: 0, texte: '', corps: false, tri: 0 }
    })

    watch(() => groupe.value, (ap, av) => { motscles.recharger() })
    watch(() => compte.value, (ap, av) => { motscles.recharger() })

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
      compte,
      avatar,
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
.largeurfiltre
  width: 20rem

.ml20
  width: 100%
  padding: 0.2rem 0.2rem 0.2rem 21rem
</style>
