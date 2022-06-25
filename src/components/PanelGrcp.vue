<template>
<span class="fs-md">
  <q-btn :label="label" :icon-right="icon" :color="color" no-caps dense size="sm" @click="ouvrir"/>

  <q-dialog v-model="ouvpanel" full-height position="right">
    <q-card class="petitelargeur">
      <div class="top bg-secondary full-width text-white">
        <q-toolbar>
          <q-toolbar-title class="titre-lg full-width text-left q-pl-sm">{{selgr ? 'Groupes' : 'Contacts'}}</q-toolbar-title>
          <q-btn dense size="md" icon="chevron_right" @click="ko"/>
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

    <div v-for="x in s.lst" :key="x.id" class="zone cursor-pointer full-width q-mb-sm'" @click="ok(x.id)">
      {{x.nom}}
    </div>

    </q-card>
  </q-dialog>
</span>
</template>

<script>
import { useStore } from 'vuex'
import { computed, reactive, watch, ref, toRef } from 'vue'
import { data } from '../app/modele.mjs'

export default ({
  name: 'PanelGrcp',
  props: { label: String, icon: String, grcp: String, color: String },

  components: { },

  data () {
    return {
      ouvpanel: false
    }
  },

  methods: {
    ouvrir () {
      this.init1()
      this.ouvpanel = true
    },
    ok (id) {
      if (this.selgr) {
        this.groupe = data.getGroupe(id)
      } else {
        this.couple = data.getCouple(id)
      }
      this.ouvpanel = false
      this.$emit('ok', id)
    },
    ko () {
      this.ouvpanel = false
      this.$emit('ko')
    }
  },

  setup (props) {
    const $store = useStore()
    const opt = ref('c')
    const txt = ref('')
    const grcp = toRef(props, 'grcp')
    const selgr = grcp.value === 'gr'
    const avatar = computed(() => $store.state.db.avatar)
    const groupe = computed({ // groupe courant
      get: () => $store.state.db.groupe,
      set: (val) => $store.commit('db/majgroupe', val)
    })
    const couple = computed({ // couple courant
      get: () => $store.state.db.couple,
      set: (val) => $store.commit('db/majcouple', val)
    })

    const s = reactive({ blst: [], lst: [] })

    function init1 () {
      const lst = []
      if (selgr) {
        avatar.value.groupeIds().forEach(id => {
          const g = data.getGroupe(id)
          if (g.sty === 0) {
            const m = avatar.value.membre(id)
            if (m.stx === 2 && m.stp > 0) {
              lst.push({ nom: g.nomEd, id: id })
            }
          }
        })
      } else {
        avatar.value.coupleIds().forEach(id => {
          const c = data.getCouple(id)
          if (c.stp >= 4 && c.stI === 1) {
            lst.push({ nom: c.nomEd, id: id })
          }
        })
      }
      lst.sort((a, b) => { return a.nom < b.nom ? -1 : (b.nom > a.nom ? 1 : 0) })
      s.blst = lst
      filtre()
    }

    function filtre () {
      const lst = []
      const c = opt.value === 'c'
      const t = txt.value
      s.blst.forEach(x => {
        if (!t) {
          lst.push(x)
        } else {
          if (c) {
            if (x.nom.indexOf(t) !== -1) lst.push(x)
          } else {
            if (x.nom.startsWith(t)) lst.push(x)
          }
        }
      })
      s.lst = lst
    }

    watch(() => opt.value, (ap, av) => { filtre() })
    watch(() => txt.value, (ap, av) => { filtre() })

    return {
      groupe,
      couple,
      selgr,
      opt,
      txt,
      s,
      init1,
      avatar
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
@import '../css/input.sass'
$haut: 6rem
$larg: 330px
.top
  position: absolute
  top: 0
  left: 0
  height: $haut !important
  width: $larg
  overflow: hidden
  background-color: $secondary
.filler
  height: $haut !important
  width: 100%
.q-toolbar
  padding: 2px !important
  min-height: 0 !important
.q-card > div
  box-shadow: inherit !important
</style>
