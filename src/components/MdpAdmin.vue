<template>
    <q-card-section class="q-pt-none shadow-box shadow-8">
        <q-input dense clearable v-model="mdp" :type="isPwd ? 'password' : 'text'"
          @keydown.enter.prevent="ok"
          label="Mot de passe du grand argentier"
          :hint="encours ? 'Cryptage en cours ...' : 'Presser la touche \'Entrée\' à la fin de la saisie'">
        <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        </template>
        </q-input>
    </q-card-section>
</template>
<script>
import { MdpAdmin } from '../app/db'
export default ({
  name: 'MdpAdmin',
  data () {
    return {
      encours: false,
      isPwd: false,
      mdp: ''
    }
  },

  methods: {
    ok () {
      this.encours = true
      setTimeout(() => {
        const m = new MdpAdmin(this.mdp)
        this.$emit('ok-mdp', m)
        this.raz(true)
      }, 1)
    },
    raz (noemit) {
      this.encours = false
      this.mdp = ''
      if (noemit !== true) this.$emit('ok-mdp', null)
    }
  }
})
</script>

<style lang="sass" scoped>
.shadow-box
  border: 1px solid $grey-5
  border-radius:  5px !important
.t3
  height: 1.5rem
  overflow: hidden
.t1
  font-size: 1.1rem
  font-weight: bold
  font-style: italic
  color: $primary
.q-card__section
  padding: 5px
.q-card > div
  box-shadow: inherit !important
::v-deep(.q-field__bottom)
  font-size: 1.1rem
  font-weight: bold
  color: red
  font-style: italic
  bottom: 5px !important
::v-deep(.q-field__native)
  font-size: 1rem
  font-family: "Roboto Mono"
  font-weight: bold
  color: rgb(255, 6, 6) !important
</style>
