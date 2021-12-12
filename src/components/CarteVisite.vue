<template>
  <q-dialog v-model="cartevisite">
    <q-card class="q-ma-xs grandelargeur">
      <q-card-section style="width:100%">
        <img :src="photolocal" width="64" height="64"/>
        <q-btn flat label="Changer la photo" @click="enedition=true" />
        <q-btn flat label="Garder la photo initiale" @click="undoph" />
        <editeur-md :texte="infolocal" titre="A propos ..." editable v-on:ok="infook"></editeur-md>
        <q-btn flat label="Garder le texte initial" @click="undoinfo" />
        <q-btn flat label="Valider" color="warning" @click="valider" />
      </q-card-section>
      <q-card-section v-if="enedition">
        <q-file v-model="fileList" label="Choisir un fichier photo" accept=".jpg, .jpeg, .png" max-file-size="4000000" max-file="1"/>
        <q-btn flat :disable="camOn" label="Start caméra" @click="startCam" />
        <q-btn flat :disable="!camOn" label="Stop caméra" @click="stopCam" />
        <q-btn flat :disable="!camOn" label="Prendre une photo" @click="snapCam" />
        <q-btn flat :disable="!file.b64" label="La photo est top!" @click="ok" />
        <q-btn flat label="Garder la photo" @click="undoph" />
        <bouton-help page="p1"/>
        <div class="column items-center" style="width:100%">
          <div>
            <video ref="webcam" autoplay playsinline width="240" height="180" :class="camOn ? '' : 'd-none'"></video>
            <canvas ref="canvas" class="d-none"></canvas>
            <audio ref="sound" :src="cliccamera()" preload = "auto"></audio>
            <div v-if="!camOn" class="camoff">Caméra non démarrée</div>
          </div>
          <div class=" q-py-md">
            <cropper ref="cropper" class="cropper"
              :src="file.b64"
              :stencil-props="{aspectRatio:1/1}"
              :canvas="{height:64,width:64}"></cropper>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { useStore } from 'vuex'
import { computed, ref, onMounted, watch, toRef, reactive } from 'vue'
import BoutonHelp from './BoutonHelp.vue'
import EditeurMd from './EditeurMd.vue'
import { readFile, cfg } from '../app/util.mjs'
import Webcam from 'webcam-easy'
import { Cropper } from 'vue-advanced-cropper'

export default ({
  name: 'CarteVisite',

  props: {
    photoInit: String,
    infoInit: String
  },

  components: {
    BoutonHelp, Cropper, EditeurMd
  },

  watch: {
    async fileList (file) {
      if (file) {
        this.file = await readFile(file)
        console.log('file')
      }
    }
  },

  data () {
    return {
      fileList: null,
      file: { b64: '' },
      cam: null,
      camOn: false
    }
  },

  methods: {
    valider () {
      if (this.resultat.ph === this.photoInit && this.resultat.info === this.infoInit) {
        console.log('CV inchangée')
      } else {
        console.log('CV changée : ' + this.resultat.info + '\n' + this.resultat.ph.substring(0, 30))
        this.$emit('ok', this.resultat)
      }
    },
    infook (m) {
      this.resultat.info = m
      this.infolocal = m
    },
    undoinfo () {
      this.infolocal = this.infoInit
      this.resultat.info = this.infoInit
    },
    undoph () {
      this.enedition = false
      this.photolocal = this.photoInit || this.personne
      this.resulat.ph = this.photoInit
    },
    ok () {
      // eslint-disable-next-line no-unused-vars
      const { coordinates, canvas } = this.cropper.getResult()
      this.photolocal = canvas.toDataURL()
      this.resultat.ph = this.photolocal
      this.enedition = false
    },
    startCam () {
      if (!this.cam) {
        this.cam = new Webcam(this.webcam, 'user', this.canvas, this.sound)
      }
      this.cam.start()
      this.camOn = true
    },
    stopCam () {
      if (this.cam) {
        this.cam.stop()
      }
      this.camOn = false
    },
    snapCam () {
      if (this.camOn) {
        const x = this.cam.snap()
        this.file.type = x.substring(x.indexOf(':') + 1, x.indexOf(';'))
        this.file.b64 = x
      }
    },
    cliccamera () {
      return cfg().cliccamera.default
    }
  },

  setup (props) {
    const personne = cfg().personne.default
    const infolocal = ref('') // en Ref parce que sa valeur dépend du changement de la prop texte ET de enedition (sinon ça serait texte)
    const photolocal = ref('')
    const enedition = ref(false) // en Ref pour pouvoir le traiter dans le watch
    const infoInit = toRef(props, 'infoInit') // pour pouvoir mettre un watch sur le changement de la propriété
    const photoInit = toRef(props, 'photoInit') // pour pouvoir mettre un watch sur le changement de la propriété
    const resultat = reactive({ info: '', ph: '' })

    onMounted(() => { // initialisation de textelocal par défaut à texte
      infolocal.value = infoInit.value
      photolocal.value = photoInit.value ? photoInit.value : personne
      resultat.info = infolocal.value
      resultat.ph = photoInit.value
    })

    watch(photoInit, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      if (!enedition.value) {
        photolocal.value = ap || personne
      }
    })

    watch(infoInit, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      if (!enedition.value) {
        infolocal.value = ap
      }
    })

    const webcam = ref(null)
    const canvas = ref(null)
    const sound = ref(null)
    const cropper = ref(null)
    const $store = useStore()

    return {
      cartevisite: computed({
        get: () => $store.state.ui.cartevisite,
        set: (val) => $store.commit('ui/majcartevisite', val)
      }),
      webcam,
      canvas,
      sound,
      enedition,
      photolocal,
      infolocal,
      personne,
      resultat,
      cropper
    }
  }
})
</script>
<style lang="css">
@import '../css/cropper.css'
</style>

<style lang="sass">
@import '../css/app.sass'
.d-none
  display: none
.camoff
  width: 160px
  height: 120px
  text-align: center
  padding-top: 45px
  border: 1px solid grey
.cropper
  height: 180px
  width: 240px
  background: #DDD
</style>
