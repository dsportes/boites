<template>
<div class="fs-md">
  <div class="top bg-secondary text-white">
    <q-toolbar>
      <q-btn dense size="md" icon="chevron_left" @click="fichiersavion=false"/>
      <q-toolbar-title class="titre-lg full-width text-right q-pr-sm">Fichiers accessibles en mode avion</q-toolbar-title>
    </q-toolbar>
    <div class="column justify-center">
      <div class="row items-end">
        <q-radio v-model="opt" val="c" label="contient" />
        <q-radio v-model="opt" val="d" label="débute par" />
        <q-input v-model="txt" class="q-ml-lg" style="width:4rem" label="abc"/>
      </div>
    </div>
  </div>

  <div class="filler"></div>

  <div v-for="(fc, idx) in s.lst" :key="fc" :class="dkli(idx) + ' zone cursor-pointer full-width q-mb-sm'" @click="detail(fc)">
    <q-card class="q-mx-xs">
      <div class="row justify-between items-center">
        <div class="fs-md">{{fc.data.nom}}</div>
        <div class="font-mono fs-md">{{edvol(fc.data.lg)}}</div>
      </div>
      <div>{{fc.t}}</div>
      <div>{{fc.p}}</div>
    </q-card>
    <q-separator class="q-my-xs"/>
  </div>

  <q-dialog v-model="detaildial">
    <q-card class="shadow-8 petitelargeur">
      <q-card-section>
        <div class="fs-md">Nom : {{fc.data.nom}}</div>
        <div class="fs-md">Info : {{fc.data.info}}</div>
        <div>Secret : {{fc.t}}</div>
        <div>De : {{fc.p}}</div>
        <div>Taille : {{edvol(fc.data.lg)}}</div>
        <div>Type : {{fc.data.type}}</div>
        <div>Date-heure : {{dhstring(new Date(fc.data.dh))}}</div>
      </q-card-section>
      <q-card-actions vertical>
        <q-btn class="q-my-xs" color="warning" dense flat label="Voir le secret" @click="voirsecret"/>
        <q-btn class="q-my-xs" color="primary" dense flat label="Afficher" @click="affFic"/>
        <q-btn class="q-my-xs" color="primary" dense flat label="Sauvegarder" @click="enregFic"/>
      </q-card-actions>
    </q-card>
  </q-dialog>

</div>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref } from 'vue'
import { data } from '../app/modele.mjs'
import { afficherdiagnostic, edvol, dhstring } from '../app/util.mjs'
import { saveAs } from 'file-saver'

export default ({
  name: 'FichiersAvion',

  components: { },

  data () {
    return {
      fc: null, // fichier courant
      edvol: edvol,
      dhstring: dhstring
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    detail (fc) {
      this.fc = fc
      this.detaildial = true
    },

    voirsecret () {
    },

    async blobde (b) {
      const buf = await this.fc.s.getFichier(this.fc.idf)
      if (!buf || !buf.length) return null
      const blob = new Blob([buf], { type: this.fc.data.type })
      return b ? blob : URL.createObjectURL(blob)
    },

    wop (url) { // L'appel direct de wndow.open ne semble pas marcher dans une fonction async. Etrange !
      window.open(url, '_blank')
    },

    async affFic () {
      const url = await this.blobde()
      if (url) {
        setTimeout(() => { this.wop(url) }, 500)
      } else {
        afficherdiagnostic('Contenu du fichier non disponible (corrompu ? effacé ?)')
      }
    },

    async enregFic () {
      const blob = await this.blobde(true)
      if (blob) {
        saveAs(blob, this.fc.s.nomFichier(this.fc.idf))
      } else {
        afficherdiagnostic('Contenu du fichier non disponible (corrompu ? effacé ?)')
      }
    }
  },

  setup () {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const detaildial = ref(false)
    const fichiersavion = computed({
      get: () => $store.state.ui.fichiersavion,
      set: (val) => $store.commit('ui/majfichiersavion', val)
    })
    const avsecrets = computed(() => $store.state.db.avsecrets)
    const fetats = computed(() => $store.state.db.fetats)

    const s = reactive({ blst: [], lst: [] })

    function init1 () {
      const lst = []
      for (const pk in avsecrets.value) {
        const avs = avsecrets.value[pk]
        const sec = data.getSecret(avs.id, avs.ns)
        avs.lstIdf().forEach(idf => {
          const e = data.getFetat(idf)
          // `data` : { nom, info, dh, type, gz, lg, sha }
          if (e && e.estCharge) lst.push({ k: sec.pk + '/' + idf, t: sec.titre, p: sec.nomEdACG, s: sec, idf, data: sec.mfa[idf] })
        })
      }
      lst.sort((a, b) => {
        return a.data.lg > b.data.lg ? -1 : (a.data.lg < b.data.lg ? 1 : 0)
      })
      s.blst = lst
    }

    function filtre () {
      const lst = []
      const c = opt.value === 'c'
      const t = txt.value
      s.blst.forEach(ax => {
        if (!t) {
          lst.push(ax)
        } else {
          if (c) {
            if (ax.t.indexOf(t) !== -1 || ax.data.nom.indexOf(t) !== -1) lst.push(ax)
          } else {
            if (ax.t.startsWith(t) || ax.data.nom.startsWith(t)) lst.push(ax)
          }
        }
      })
      s.lst = lst
    }

    watch(() => opt.value, (ap, av) => { filtre() })
    watch(() => txt.value, (ap, av) => { filtre() })
    watch(() => avsecrets.value, (ap, av) => { init1(); filtre() })
    watch(() => fetats.value, (ap, av) => { init1(); filtre() })

    watch(() => fichiersavion.value, (ap, av) => {
      if (!ap) {
        detaildial.value = false
      }
    })

    init1()
    filtre()

    return {
      fichiersavion,
      opt,
      txt,
      s,
      detaildial
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 5.5rem
$larg: 330px
.top
  position: absolute
  top: 0
  left: 0
  height: $haut
  width: $larg
  overflow: hidden
  background-color: $secondary
.filler
  height: $haut
  width: 100%
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.photomax
  margin-top: 4px
.q-card > div
  box-shadow: inherit !important
</style>
