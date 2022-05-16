<template>
    <q-dialog v-model="dialoguecrypto">
      <q-card class="moyennelargeur fs-md">
        <q-card-section>
          <div class="titre-lg text-center">Crytographie</div>
          <q-btn flat label="Test de crypto" color="primary" @click="testcrypto" />
          <bouton-help page="page1"/>
        </q-card-section>
        <q-card-section>

    <q-checkbox v-model="vkb" label="Clavier virtuel" />
    <q-input dense counter hint="Au moins 16 caractères" @focus="setKB(1)" v-model="ligne1" :type="isPwd ? 'password' : 'text'" label="Première ligne de la phrase secrète">
    <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="!ligne1 || ligne1.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="ligne1 = ''"/></span>
    </template>
    </q-input>
    <q-input dense counter hint="Au moins 16 caractères" @focus="setKB(2)" v-model="ligne2" :type="isPwd ? 'password' : 'text'" label="Seconde ligne de la phrase secrète">
    <template v-slot:append>
        <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        <span :class="!ligne2 || ligne2.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="ligne2 = ''"/></span>
    </template>
    </q-input>

          <div class="simple-keyboard"></div>
        </q-card-section>
        <q-card-section class="q-ma-xs">
          <phrase-secrete v-on:ok-ps="okps" icon-valider="check" label-ok="OK"></phrase-secrete>
        </q-card-section>
        <q-card-section class="q-ma-xs">
          <div class='t1'>Hash de la ligne 1</div>
          <div class='t2'>{{ ps ? ps.dpbh : '?'}}</div>
          <div class='t1'>Clé X (PBKFD de la phrase complète)</div>
          <div class='t2'>{{ ps ? ps.pcb64 : '?' }}</div>
          <div class='t1'>Hash de la clé X</div>
          <div class='t2'>{{ ps ? ps.pcbh : '?' }}</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" icon-right="close" color="primary" @click="ps=null;$store.commit('ui/majdialoguecrypto',false)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
</template>

<script>
import { useStore } from 'vuex'
import { computed, ref, watch } from 'vue'
import { crypt } from '../app/crypto.mjs'
import PhraseSecrete from '../components/PhraseSecrete.vue'
import BoutonHelp from '../components/BoutonHelp.vue'
import { post, testEcho } from '../app/util.mjs'
// eslint-disable-next-line no-unused-vars
import Keyboard from 'simple-keyboard'
import 'simple-keyboard/build/css/index.css'

export default ({
  name: 'DialogueCrypto',

  components: { PhraseSecrete, BoutonHelp },

  watch: {
    forfaits (ap) {
      console.log('Forfaits', this.forfaits[0], this.forfaits[1])
    }
  },

  data () {
    return {
      forfaits: [2, 3],
      ps: null,
      isPwd: false
    }
  },

  methods: {
    onInputChange (input) {
    },
    onInputFocus (input) {
    },
    okps (ps) {
      this.ps = ps
    },
    async testcrypto () {
      await crypt.test1()
      await crypt.test2()
    },
    async test2 () {
      try {
        const r = await post('m1', 'erreur', { code: -99, message: 'erreur volontaire', detail: 'détail ici', to: 20 }, 'test2')
        console.log('testok ' + JSON.stringify(r))
      } catch (e) {
        console.log('testko ' + JSON.stringify(e))
      }
    },
    async testEcho () {
      try {
        await testEcho(0)
      } catch (e) {
        console.log('>>>>' + e)
      }
    },
    testHelp () {
      this.$store.commit('ui/pushhelp', 'page1')
    }
  },

  setup () {
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

    const ligne1 = ref('')
    const ligne2 = ref('')
    const nl = ref(0)
    const vkb = ref(false)

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
      console.log('Button pressed: ' + button)
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

    const $store = useStore()
    const dialoguecrypto = computed({
      get: () => $store.state.ui.dialoguecrypto,
      set: (val) => $store.commit('ui/majdialoguecrypto', val)
    })

    return {
      dialoguecrypto,
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
@import '../css/app.sass'
.t1
  font-style: italic
  color: $primary
.t2
  font-family: 'Roboto Mono'
.hg-theme-default
  color: black !important
  font-family:'Roboto Mono'
</style>
