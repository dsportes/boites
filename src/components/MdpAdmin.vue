<template>
    <q-card-section class="q-pt-none shadow-box shadow-8">
        <q-input dense clearable v-model="mdp" :type="isPwd ? 'password' : 'text'" label="Mot de passe du grand argentier">
        <template v-slot:append>
            <q-icon :name="isPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="isPwd = !isPwd"/>
        </template>
        </q-input>
        <div class="t3">
          <div v-if="encours" class="t1">Cryptage en cours ...</div>
          <div v-else class="row justify-between items-center">
              <q-btn flat label="RAZ" color="primary" @click="raz" />
              <q-btn color="primary" flat label="OK" size="md" icon-right="check" @click="ok" />
          </div>
        </div>
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
  font-size: 0.9rem
  font-weight: bold
  bottom: 5px !important
::v-deep(.q-field__native)
  font-size: 1rem
  font-family: "Roboto Mono"
  font-weight: bold
  color: rgb(255, 6, 6) !important
</style>
