<template>
  <div :class="dkli(idx) + ' row full-width fs-md q-pa-xs'">
    <div class="col-auto column items-center">
      <img class="col-auto q-my-xs photomax" :src="s.photo"/>
      <q-btn class="col-auto q-mb xs" dense size="md" icon="content_copy" color="primary" @click.stop="copier" />
      <q-btn class="col-auto" v-if="compta" dense size="md" icon="euro" color="primary" @click.stop="ouvrircompta" />
    </div>
    <div class="col q-pl-sm">
      <div>
        <info-txt class="bord2" :label="s.na.nom" noicon :info="s.na.nom + ' ID:' + s.na.id"/>
        <span v-if="parrain" class="q-ml-sm text-bold text-warning">PARRAIN</span>
        <q-btn v-if="naTribu" class="q-ml-sm" :label="naTribu.nom" dense no-caps color="primary" @click.stop="ouvrirtribu"/>
      </div>
      <show-html :class="(cvEditable ? 'height-4 bord' : 'height-2') + ' q-my-xs'" :texte="s.info" :idx="idx"
        @click="detailcv=true"/>
    </div>

  <q-dialog v-model="cvdetail">
    <q-card class="petitelargeur">
      <q-card-section>
        <div class="titre-lg text-center q-mb-md">Carte de visite de {{s.na.nom}}</div>
        <editeur-md class="height-12" :texte="s.info"/>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat color="primary" label="J'ai lu" v-close-popup/>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <q-dialog v-model="cvloc">
    <carte-visite :na="s.na" :close="closecv" :photo-init="s.photo" :info-init="s.info" @ok="cvchangee"/>
  </q-dialog>

  <q-dialog v-model="tribudial" full-height position="right">
    <div class="moyennelargeur">
      <panel-tribu :close="fermertribu" />
    </div>
  </q-dialog>

  <q-dialog v-model="comptadial" full-height position="right">
    <panel-compta :cpt="cpt" :close="fermercompta"/>
  </q-dialog>

</div>
</template>

<script>
import { useStore } from 'vuex'
import { watch, toRef, reactive, computed, ref } from 'vue'
import CarteVisite from './CarteVisite.vue'
import ShowHtml from './ShowHtml.vue'
import EditeurMd from './EditeurMd.vue'
import PanelTribu from './PanelTribu.vue'
import PanelCompta from './PanelCompta.vue'
import InfoTxt from './InfoTxt.vue'
import { Cv, data } from '../app/modele.mjs'
import { cfg, affichermessage } from '../app/util.mjs'
import { IDCOMPTABLE } from '../app/api.mjs'
import { GetCompta } from '../app/operations.mjs'

export default ({
  name: 'IdentiteCv',

  props: {
    naAvatar: Object, // na de l'avatar
    cvEditable: Boolean, // Si true la cv est editable et est reçue sur @cv-changee
    parrain: Boolean, // affiche PARRAIN à côté du nom
    compta: Boolean, // Si true, bouton d'affichage de la compta
    idx: Number,
    naTribu: Object // Si présent, le nom de la tribu est affiché avec un lien pour ouvrir le panel
  },

  components: { InfoTxt, ShowHtml, CarteVisite, EditeurMd, PanelTribu, PanelCompta },

  computed: { },

  data () { return { } },

  methods: {
    dkli (idx) { return this.$q.dark.isActive ? (idx ? 'sombre' + (idx % 2) : 'sombre0') : (idx ? 'clair' + (idx % 2) : 'clair0') },

    ouvrircv () { if (this.cvEditable) this.cvloc = true; else this.cvdetail = true },
    closecv () { this.cvloc = false },

    ouvrirtribu () {
      const t = data.getTribu(this.naTribu.id)
      this.tribu = t
      this.tribudial = true
    },
    fermertribu () { this.tribudial = false },

    cvchangee (res) {
      if (res && this.idAvatar) {
        const cv = new Cv().init(this.idAvatar, res.ph, res.info)
        this.$emit('cv-changee', cv)
      }
    },

    copier () {
      affichermessage(this.s.na.nom + ' copié')
      this.$store.commit('ui/majclipboard', this.s.na)
    },

    fermercompta () { this.comptadial = false },

    async ouvrircompta () {
      const compta = await new GetCompta().run(this.s.na.id)
      this.cpt = {
        x: compta.compteurs,
        av: { na: this.s.na, estPrimaire: true }
      }
      this.comptadial = true
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
    const comptadial = ref(false)
    const tribudial = ref(false)
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
          s.photo = cv.photo || phavatar
        }
        s.info = cv.info
      } else {
        s.photo = id === IDCOMPTABLE ? phsuperman : phavatar
        s.info = ''
      }
    }

    watch(() => cvs.value, (ap, av) => {
      init()
    })

    watch(() => sessionok.value, (ap, av) => {
      cvloc.value = false
      cvdetail.value = false
    })

    init()

    return {
      cvloc,
      cvdetail,
      comptadial,
      tribudial,
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
  border-top: 1px solid $grey-5
  border-bottom: 1px solid $grey-5
.q-btn--dense
  padding: 0 3px
  min-height: auto
.bord2
  border-radius: 3px
  border: 1px solid $grey-5
  padding: 1px 3px
</style>
<style lang="css">
@import '../css/cropper.css'
</style>
