<template>
  <q-card v-if="sessionok" class="q-ma-xs moyennelargeur fs-md">
    <q-card-section class="column justify-start">
      <div class="row justify-between">
        <div class='titre-lg'>{{nom}}</div>
        <bouton-help page="p1"/>
      </div>
      <div>Code: <span class='font-mono'>{{sid}}</span></div>
    </q-card-section>
    <q-separator />
    <q-card-section class="row justify-start">
      <div><img :src="photolocal" :width="taillephoto.width" :height="taillephoto.height" class="classeph"/></div>
      <div class="col column jusitify-center">
        <q-btn icon="mode_edit" label="Changer la photo" @click="enedition=true" />
        <q-btn :disable="!modifph" icon="undo" label="Garder la photo initiale" @click="undoph" />
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section v-if="enedition">
      <div class="q-mb-sm column justify-center">
        <q-file v-model="fileList" label="Choisir un fichier photo" accept=".jpg, .jpeg, .png" max-file-size="4000000" max-file="1"/>
        <div class="row justify-center">
          <q-btn flat :disable="camOn" color="primary" label="Start caméra" @click="startCam" />
          <q-btn flat :disable="!camOn" label="Stop caméra" @click="stopCam" />
          <q-btn flat :disable="camOn" icon="flip_camera_ios" @click="flipCam" />
        </div>
        <q-btn flat :disable="!camOn" color="primary" label="Prendre une photo" @click="snapCam" />
        <div class="row justify-center">
          <q-btn icon="check" small-caps :disable="!file.b64" color="warning" label="La photo est trop top!" @click="phok" />
          <q-btn icon="undo" small-caps label="C'était mieux avant!" @click="undoph" />
        </div>
      </div>
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
            :canvas="taillephoto"></cropper>
        </div>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <editeur-md ref="md" :texte="infolocal" v-model="resultat.info" editable modetxt style="height:10rem"></editeur-md>
    </q-card-section>
    <q-separator />
    <q-card-actions align="right">
      <q-btn size="md" v-if="!modif" flat dense icon="close" label="Fermer" @click="undogen" />
      <q-btn v-else flat icon="undo" label="Annuler" @click="undogen" />
      <q-btn :disable="!modif" flat icon="check" label="Valider" color="warning" @click="valider" />
    </q-card-actions>
  </q-card>
</template>
<script>

import { ref, watch, toRef, reactive, computed } from 'vue'
import { useStore } from 'vuex'
import BoutonHelp from './BoutonHelp.vue'
import EditeurMd from './EditeurMd.vue'
import { readFile, cfg } from '../app/util.mjs'
import Webcam from 'webcam-easy'
import { Cropper } from 'vue-advanced-cropper'

const TPH = { height: 32, width: 32 }

export default ({
  name: 'CarteVisite',

  props: {
    photoInit: String,
    infoInit: String,
    na: Object,
    close: Function
  },

  components: {
    BoutonHelp, Cropper, EditeurMd
  },

  computed: {
    taillephoto () { return TPH },
    modif () {
      return this.resultat.info !== this.infoInit || this.modifph
    },
    modifph () {
      return this.resultat.ph !== this.photoInit
    }
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
      camOn: false,
      nvinfo: ''
    }
  },

  methods: {
    undogen () {
      this.undoph()
      this.md.undo()
      this.$emit('ok', false)
      if (this.close) this.close()
    },
    valider () {
      this.$emit('ok', !this.modif ? false : this.resultat)
      if (this.close) this.close()
    },
    undoph () {
      this.enedition = false
      this.photolocal = this.photoInit || this.phdef
      this.resultat.ph = this.photoInit
      this.stopCam()
    },
    phok () {
      // eslint-disable-next-line no-unused-vars
      const { coordinates, canvas } = this.cropper.getResult()
      this.photolocal = canvas.toDataURL()
      this.resultat.ph = this.photolocal
      this.enedition = false
      this.stopCam()
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
    flipCam () {
      if (!this.camOn) this.cam.flip()
    },
    cliccamera () {
      return cfg().cliccamera.default
    }
  },

  setup (props) {
    const $store = useStore()
    const sessionok = computed(() => $store.state.ui.sessionok)

    const phdef = cfg().avatar

    const webcam = ref(null)
    const canvas = ref(null)
    const sound = ref(null)
    const cropper = ref(null)
    const md = ref(null)
    const infolocal = ref('') // en Ref parce que sa valeur dépend du changement de la prop texte ET de enedition (sinon ça serait texte)
    const photolocal = ref('')
    const enedition = ref(false) // en Ref pour pouvoir le traiter dans le watch
    const nom = ref('')
    const sid = ref('')

    const infoInit = toRef(props, 'infoInit') // pour pouvoir mettre un watch sur le changement de la propriété
    const photoInit = toRef(props, 'photoInit') // pour pouvoir mettre un watch sur le changement de la propriété
    const na = toRef(props, 'na')

    const resultat = reactive({ info: '', ph: '' })

    function init () {
      nom.value = na.value.nom
      sid.value = na.value.sid
      infolocal.value = infoInit.value
      photolocal.value = photoInit.value ? photoInit.value : phdef
      resultat.info = infolocal.value
      resultat.ph = photoInit.value
    }

    watch(photoInit, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      if (!enedition.value) {
        photolocal.value = ap || phdef
      }
    })

    watch(infoInit, (ap, av) => {
      if (!enedition.value) {
        infolocal.value = ap
      }
    })

    watch(na, (ap, av) => {
      nom.value = ap.nom
      sid.value = ap.sid
    })

    // onMounted(() => { init() }) ???
    init()

    return {
      sessionok,
      phdef,
      nom,
      sid,
      md,
      webcam,
      canvas,
      sound,
      enedition,
      photolocal,
      infolocal,
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

.classeph
  border-radius: $tphradius
  border: 1px solid grey
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
