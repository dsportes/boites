<template>
  <q-card class="q-ma-xs moyennelargeur">
    <q-card-section class="column justify-start">
      <div><span class='titre-2'>{{n.na.nom}}</span><span class='titre-5'>@{{n.na.sfx}}</span><bouton-help page="p1"/></div>
      <div>Identifiant: <span class='font-mono'>{{n.na.sid}}</span></div>
    </q-card-section>
    <q-separator />
    <q-card-section class="row justify-start">
      <div><img :src="photolocal" width="64" height="64" class="ph"/></div>
      <div class="col column jusitify-center">
        <q-btn icon="mode_edit" label="Changer la photo" @click="enedition=true" />
        <q-btn :disable="!modifph" icon="undo" label="Garder la photo initiale" @click="undoph" />
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section v-if="enedition">
      <div class="column justify-center">
        <q-file v-model="fileList" label="Choisir un fichier photo" accept=".jpg, .jpeg, .png" max-file-size="4000000" max-file="1"/>
        <div class="row justify-center">
          <q-btn flat :disable="camOn" color="primary" label="Start caméra" @click="startCam" />
          <q-btn flat :disable="!camOn" label="Stop caméra" @click="stopCam" />
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
            :canvas="{height:64,width:64}"></cropper>
        </div>
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <editeur-md ref="md" :texte="infolocal" v-model="resultat.info" taille-m editable></editeur-md>
    </q-card-section>
    <q-separator />
    <q-card-actions align="right">
      <q-btn :disable="!modif" flat icon="undo" label="Annuler" @click="undogen" />
      <q-btn :disable="!modif" flat icon="check" label="Valider" color="warning" @click="valider" />
    </q-card-actions>
  </q-card>
</template>
<script>

import { ref, onMounted, watch, toRef, reactive } from 'vue'
import BoutonHelp from './BoutonHelp.vue'
import EditeurMd from './EditeurMd.vue'
import { readFile, cfg } from '../app/util.mjs'
import { NomAvatar } from '../app/modele.mjs'
import Webcam from 'webcam-easy'
import { Cropper } from 'vue-advanced-cropper'

export default ({
  name: 'CarteVisite',

  props: {
    photoInit: String,
    infoInit: String,
    nomc: String
  },

  components: {
    BoutonHelp, Cropper, EditeurMd
  },

  computed: {
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
    valider () {
      if (!this.modif) {
        console.log('CV inchangée')
      } else {
        console.log('CV changée : ' + this.resultat.info + '\n' + this.resultat.ph.substring(0, 30))
        this.$emit('ok', this.resultat)
      }
    },
    undogen () {
      this.undoph()
      const mdelt = this.md
      mdelt.undo()
      this.$emit('annuler')
    },
    undoph () {
      this.enedition = false
      this.photolocal = this.photoInit || this.personne
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
    cliccamera () {
      return cfg().cliccamera.default
    }
  },

  setup (props) {
    const md = ref(null)
    const personne = cfg().personne.default
    const infolocal = ref('') // en Ref parce que sa valeur dépend du changement de la prop texte ET de enedition (sinon ça serait texte)
    const photolocal = ref('')
    const n = reactive({ na: { nom: '', sid: '', sfrx: '' } })
    const enedition = ref(false) // en Ref pour pouvoir le traiter dans le watch
    const infoInit = toRef(props, 'infoInit') // pour pouvoir mettre un watch sur le changement de la propriété
    const photoInit = toRef(props, 'photoInit') // pour pouvoir mettre un watch sur le changement de la propriété
    const nomc = toRef(props, 'nomc')
    const resultat = reactive({ info: '', ph: '' })

    onMounted(() => { // initialisation de textelocal par défaut à texte
      infolocal.value = infoInit.value
      photolocal.value = photoInit.value ? photoInit.value : personne
      resultat.info = infolocal.value
      resultat.ph = photoInit.value
      if (nomc.value) n.na = new NomAvatar(nomc.value)
    })

    watch(photoInit, (ap, av) => { // quand texte change, textelocal ne change pas si en édition
      if (!enedition.value) {
        photolocal.value = ap || personne
      }
    })

    watch(infoInit, (ap, av) => {
      if (!enedition.value) {
        infolocal.value = ap
      }
    })

    watch(nomc, (ap, av) => {
      n.na = new NomAvatar(ap)
    })

    const webcam = ref(null)
    const canvas = ref(null)
    const sound = ref(null)
    const cropper = ref(null)

    return {
      md,
      webcam,
      canvas,
      sound,
      enedition,
      photolocal,
      infolocal,
      n,
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
.ph
  border-radius: 32px
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
