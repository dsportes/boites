<template>
  <q-card-section class="shadow-8 fs-md">
    <q-checkbox v-model="vkb" color="primary" style="position:relative;left:-8px"/>
    <span class="cprim fs-lg">Clavier virtuel</span>
    <div class="titre-lg">{{msg[phase]}}</div>
    <q-input dense counter hint="Au moins 16 caractères" v-model="ligne1" @focus="setKB(1)" :type="isPwd ? 'password' : 'text'" label="Première ligne de la phrase secrète">
    <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="!ligne1 || ligne1.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="ligne1 = ''"/></span>
    </template>
    </q-input>
    <q-input dense counter hint="Au moins 16 caractères" v-model="ligne2" @focus="setKB(2)" :type="isPwd ? 'password' : 'text'" label="Seconde ligne de la phrase secrète">
    <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="!ligne2 || ligne2.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer" @click="ligne2 = ''"/></span>
    </template>
    </q-input>
    <div>
      <div v-if="encours" class="t1">Cryptage en cours ...
        <q-spinner color="primary" size="2rem" :thickness="3" />
      </div>
      <div v-else class="row justify-between items-center no-wrap">
        <div v-if="isDev">
          <span class="text-primary cursor-pointer q-px-xs" v-for="(p, idx) in phrases" :key="idx" @click="selph(p)">{{idx}}</span>
        </div>
        <div>
          <q-btn color="primary" flat label="Renoncer" size="md" @click="ko" />
          <q-btn color="warning" glossy :label="labelVal()" size="md" :icon-right="iconValider"
            :disable="!ligne1 || !ligne2 || ligne1.length < 16 || ligne2.length < 16" @click="ok" />
        </div>
      </div>
    </div>
    <div class="simple-keyboard"></div>
  </q-card-section>
</template>
<script>
import { cfg, Phrase } from '../app/util.mjs'
import { toRef, ref, watch, onMounted } from 'vue'
import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

const msg = ['Phrase secrète de connexion', 'Phrase non confirmée, la re-saisir', 'Confirmer la phrase secréte']
export default ({
  name: 'PhraseSecrete',
  props: { iconValider: String, verif: Boolean, labelValider: String, initVal: Object },
  data () {
    return {
      phase: 0,
      msg: msg,
      encours: false,
      isPwd: false,
      phrases: this.$cfg.phrases,
      vligne1: '',
      vligne2: ''
    }
  },
  methods: {
    selph (p) {
      this.ligne1 = p[0]
      this.ligne2 = p[1]
    },
    labelVal () {
      if (!this.verif) return this.labelValider
      return this.phase < 2 ? 'OK' : this.labelValider
    },
    ok () {
      if (!this.verif) {
        this.okem()
      } else {
        if (this.phase < 2) {
          this.vligne1 = this.ligne1
          this.vligne2 = this.ligne2
          this.ligne1 = ''
          this.ligne2 = ''
          this.phase = 2
        } else {
          if (this.ligne1 === this.vligne1 && this.ligne2 === this.vligne2) {
            this.okem()
          } else {
            this.raz()
            this.phase = 1
          }
        }
      }
    },
    okem () {
      this.encours = true
      setTimeout(async () => {
        const ps = new Phrase()
        await ps.init(this.ligne1, this.ligne2)
        this.$emit('ok-ps', ps)
        this.raz()
      }, 300)
    },
    ko () {
      this.raz()
      this.$emit('ok-ps', null)
    },
    raz () {
      this.encours = false
      this.ligne1 = ''
      this.ligne2 = ''
      this.vligne1 = ''
      this.vligne2 = ''
      this.phase = 0
    }
  },

  setup (props) {
    const isDev = true
    // eslint-disable-next-line no-unused-vars
    const isDev2 = cfg().isDev
    const initVal = toRef(props, 'initVal')
    const ligne1 = ref('')
    const ligne2 = ref('')

    const layout = {
      default: [
        '` 1 2 3 4 5 6 7 8 9 0 \u00B0 + {bksp}',
        '{tab} a z e r t y u i o p ^ $',
        '{lock} q s d f g h j k l m \u00F9 * {enter}',
        '{shift} < w x c v b n , ; : ! {shift}',
        '.com @ {space}'
      ],
      shift: [
        "\u00B2 & \u00E9 \" ' ( - \u00E8 _ \u00E7 \u00E0 ) = {bksp}",
        '{tab} A Z E R T Y U I O P \u00A8 \u00A3',
        '{lock} Q S D F G H J K L M % \u00B5 {enter}',
        '{shift} > W X C V B N ? . / \u00A7 {shift}',
        '.com @ {space}'
      ]
    }

    const keyboard = ref(null)
    const nl = ref(0)
    const vkb = ref(false)

    onMounted(() => {
      ligne1.value = initVal.value ? initVal.value.debut : ''
      ligne2.value = initVal.value ? initVal.value.fin : ''
      nl.value = 0
      vkb.value = false
      if (keyboard.value) {
        keyboard.value.destroy()
        keyboard.value = null
      }
    })

    function onChange (input) {
      if (nl.value === 1) ligne1.value = input
      if (nl.value === 2) ligne2.value = input
    }

    function handleShift () {
      const currentLayout = keyboard.value.options.layoutName
      const shiftToggle = currentLayout === 'default' ? 'shift' : 'default'
      keyboard.value.setOptions({
        layoutName: shiftToggle
      })
    }

    // eslint-disable-next-line no-unused-vars
    function onKeyPress (button) {
      if (button === '{shift}' || button === '{lock}') handleShift()
      if (button === '{enter}') {
        keyboard.value.destroy()
        nl.value = 0
      }
    }

    function setKB (n) {
      if (!vkb.value) return
      if (!nl.value) {
        keyboard.value = new Keyboard({
          onChange: input => onChange(input),
          onKeyPress: button => onKeyPress(button),
          layout: layout,
          theme: 'hg-theme-default'
        })
      }
      if (nl.value !== n) {
        if (n === 1) keyboard.value.setInput(ligne1.value)
        if (n === 2) keyboard.value.setInput(ligne2.value)
      }
      nl.value = n
    }

    watch(() => vkb.value, (ap, av) => {
      if (!ap && keyboard.value) {
        keyboard.value.destroy()
        nl.value = 0
      }
    })

    return {
      isDev: isDev,
      keyboard,
      setKB,
      ligne1,
      ligne2,
      vkb
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.t1
  font-size: 1.1rem
  font-weight: bold
  font-style: italic
  color: $primary
.q-card__section
  padding: 0.5rem
.cprim
  color: $primary
.hg-theme-default
  color: black !important
  font-family:'Roboto Mono'
</style>
