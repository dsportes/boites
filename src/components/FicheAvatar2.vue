<template>
  <div :class="dkli(idx) + ' row full-width fs-md q-pa-xs'">
    <div class="col-auto column items-center">
      <img class="photomax" :src="s.photo"/>
      <q-btn dense class="q-my-xs" rounded size="sm" icon="content_copy" color="primary" @click.stop="copier" />
    </div>
    <div class="col q-pl-sm">
      <div class="row items-center">
        <div class="col-auto">
          <info-txt class="bord2" :label="s.na.nom" noicon :info="s.na.nom + ' ID:' + s.na.id"/>
          <span v-if="parrain" class="q-ml-sm text-bold text-warning">PARRAIN</span>
        </div>
        <q-space/>
        <slot name="statut" class="col-auto text-right">
        </slot>
        <q-btn v-if="!noMenu" class="q-ml-sm col-auto" dense size="md" color="primary" icon="menu">
          <q-menu transition-show="scale" transition-hide="scale">
            <div :class="' menu column fs-md font-mono'">
              <div class="item row items-center" v-close-popup @click="copier">
                <q-icon class="col-auto q-ml-sm" size="md" name="content_copy"/>
                <span class="col">Copier</span>
              </div>
              <q-separator v-if="cvEditable"/>
              <div v-if="cvEditable" class="item row items-center" v-close-popup @click="ouvrircv">
                <q-icon class="col-auto q-ml-sm" size="md" name="mode_edit"/>
                <span class="col">Éditer la carte de visite</span>
              </div>
            </div>
          </q-menu>
        </q-btn>
      </div>
      <show-html v-if="s.info" class="q-my-xs bord height-4 cursor-pointer"
        :texte="s.info" :idx="idx" @click="zoomdial=true"/>
      <div v-else class="q-my-xs titre-md full-width text-center bord cursor-pointer text-italic text-grey5">
        (pas d'autre information)
      </div>
      <div v-if="actions" class="row justify-center q-pa-xs">
        <slot name="actions"></slot>
      </div>
    </div>

  <q-dialog v-model="cvdetail">
    <q-card class="petitelargeur">
      <q-card-section>
        <div class="titre-lg text-center q-mb-md">Carte de visite de {{s.na.nom}}</div>
        <editeur-md class="height-16" :texte="s.info"/>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="primary" label="J'ai lu" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="cvloc">
    <carte-visite :na="s.na" :close="closecv" :photo-init="s.photo" :info-init="s.info" @ok="cvchangee"/>
  </q-dialog>

  <q-dialog v-model="zoomdial">
    <q-card class="moyennelargeur">
      <q-card-section>
        <editeur-md class="height-16" :texte="s.info"/>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="primary" label="J'ai lu" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>
</div>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed, ref } from 'vue'
import CarteVisite from './CarteVisite.vue'
import ShowHtml from './ShowHtml.vue'
import EditeurMd from './EditeurMd.vue'
import InfoTxt from './InfoTxt.vue'
import { Cv, data } from '../app/modele.mjs'
import { cfg, affichermessage } from '../app/util.mjs'
import { IDCOMPTABLE } from '../app/api.mjs'

export default ({
  name: 'FicheAvatar2',

  props: {
    naAvatar: Object, // na de l'avatar
    cvEditable: Boolean, // Si true la cv est editable et est reçue sur @cv-changee
    parrain: Boolean, // affiche PARRAIN à côté du nom
    idx: Number,
    noMenu: Boolean, // Si true le bouton menu (et le menu) n'apparaissent pas
    actions: Boolean // A un slot "actions"
  },

  components: { InfoTxt, ShowHtml, CarteVisite, EditeurMd },

  computed: { },

  data () {
    return {
    }
  },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    ouvrircv () { if (this.cvEditable) this.cvloc = true; else this.cvdetail = true },
    closecv () { this.cvloc = false },

    cvchangee (res) {
      if (res && this.naAvatar) {
        const cv = new Cv().init(this.naAvatar.id, res.ph, res.info)
        this.$emit('cv-changee', cv)
      }
    },

    copier () {
      affichermessage(this.s.na.nom + ' copié')
      this.$store.commit('ui/majclipboard', this.s.na)
    }
  },

  setup (props) {
    const $store = useStore()
    const phavatar = cfg().avatar
    const phsuperman = cfg().superman
    const phdisparu = cfg().disparu
    const sessionok = computed(() => $store.state.ui.sessionok)

    const cvloc = ref(false)
    const cvdetail = ref(false)
    const zoomdial = ref(false)
    const naAvatar = toRef(props, 'naAvatar')

    const s = reactive({ photo: phavatar, info: '', na: null })

    const cvs = computed(() => { return $store.state.db.cvs })

    function init () {
      s.na = naAvatar.value
      if (!sessionok.value || !s.na) return
      const id = s.na.id
      const cv = data.getCv(id)
      if (cv) {
        if (id === IDCOMPTABLE) {
          s.photo = phsuperman
        } else if (cv.x) {
          s.photo = phdisparu
        } else {
          s.photo = cv[0] || phavatar
        }
        s.info = cv[1]
      } else {
        s.photo = id === IDCOMPTABLE ? phsuperman : phavatar
        s.info = ''
      }
    }

    watch(() => naAvatar.value, (ap, av) => {
      init()
    })

    watch(() => cvs.value, (ap, av) => {
      init()
    })

    watch(() => sessionok.value, (ap, av) => {
      cvloc.value = false
      cvdetail.value = false
      zoomdial.value = false
    })

    init()

    return {
      cvloc,
      cvdetail,
      zoomdial,
      s,
      sessionok
    }
  }
})
</script>
<style lang="sass" scoped>
@import '../css/app.sass'
.ligne:hover
  background-color: rgba(130, 130, 130, 0.5)
.q-card > div
  box-shadow: inherit !important
.bord
  border-bottom: 1px solid $grey-5
.bord3
  border-top: 1px solid $grey-5
.bord2
  border-radius: 3px
  border: 1px solid $grey-5
  padding: 1px 3px
.menu
  min-width: 15rem
  padding: 2px
  border-radius: 3px
  border: 2px solid $grey-5
.item
  margin: 2px
  border-left: solid 2px transparent
  cursor: pointer
.item:hover
  border-left: solid 2px $warning
</style>
<style lang="css">
@import '../css/cropper.css'
</style>
