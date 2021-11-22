<template>
    <q-card-section class="q-pt-none shadow-box shadow-8">
        <q-input dense v-model="mdp" :type="isPwd ? 'password' : 'text'"
          @keydown.enter.prevent="ok"
          label="Mot de passe du grand argentier"
          :hint="encours ? 'Cryptage en cours ...' : 'Presser \'Entrée\' à la fin de la saisie'">
        <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
            <span :class="mdp.length === 0 ? 'disabled' : ''"><q-icon name="cancel" class="cursor-pointer"  @click="raz"/></span>
        </template>
        </q-input>
    </q-card-section>
</template>
<script>
import { MdpAdmin } from '../app/modele'
import { cfg } from '../app/util'
export default ({
  name: 'MdpAdmin',
  props: {
    initVal: Object
  },
  data () {
    return {
      encours: false,
      isPwd: false,
      mdp: this.initVal ? this.initVal.mdp : (this.isDev ? this.$cfg.mdpadmin : '')
    }
  },

  methods: {
    ok () {
      this.encours = true
      setTimeout(async () => {
        const m = new MdpAdmin()
        await m.init(this.mdp)
        this.$emit('ok-mdp', m)
        this.encours = false
      }, 1)
    },
    raz () {
      this.encours = false
      this.mdp = /* this.isDev ? this.$cfg.mdpadmin : */ ''
      this.$emit('ok-mdp', null)
    }
  },

  setup () {
    const isDev = cfg().isDev
    return {
      isDev
    }
  }
})
</script>

<style lang="sass" scoped>
@import '../css/input.sass'
.shadow-box
  border: 1px solid $grey-5
  border-radius:  5px !important
.q-card__section
  padding: 5px
</style>
