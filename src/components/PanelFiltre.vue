<template>
  <q-card>
    <q-card-section class="column justify-start">
      <q-btn flat color="primary" icon="add" label="Nouveau secret personnel" @click="action(1)"/>
      <q-btn v-if="contact || false" flat color="primary" icon="add" :label="'Nouveau secret partagé avec ' +  contact.nom" @click="action(2)"/>
      <q-btn v-if="groupe || false" flat color="primary" icon="add" :label="'Nouveau secret du groupe ' +  groupe.nom" @click="action(3)"/>
    </q-card-section>
    <q-card-section class="column justify-start">
      <q-checkbox v-model="perso" size="md" label="Secrets personnels" />
      <q-option-group :options="contact ? optionsct2 : optionct1" type="checkbox" v-model="groupct"/>
      <q-option-group :options="groupe ? optionsgr2 : optiongr1" type="checkbox" v-model="groupgr"/>
    </q-card-section>
    <q-card-section class="column justify-start">
    </q-card-section>
  </q-card>
</template>

<script>
import { useStore } from 'vuex'
import { computed, ref, watch } from 'vue'
import { Filtre } from '../app/util.mjs'

export default ({
  name: 'PanelFiltre',

  props: { fermer: Function },

  data () {
    return {
      pingret: null
    }
  },

  methods: {
    ok () {
      const f = new Filtre(this.avatar.id)

      this.$emit('ok', f)
      if (this.fermer) this.fermer()
    },
    annuler () {
      if (this.fermer) this.fermer()
    },
    action (n) {
      this.$emit('action', n)
      if (this.fermer) this.fermer()
    }
  },

  setup () {
    const $store = useStore()
    const avatar = computed(() => { return $store.state.db.avatar })
    const mode = computed(() => $store.state.ui.mode)
    const contact = computed(() => { return $store.state.db.avatar })
    const groupe = computed(() => { return $store.state.db.avatar })

    const perso = ref(true)

    const groupct = ref(0)
    const optionsct1 = [
      { label: 'pas de secrets partagés avec des contacts', value: 0 },
      { label: 'secrets partagés avec n\'importe quel contact', value: -1 }
    ]
    const optionsct2 = [
      { label: 'pas de secrets partagés avec des contacts', value: 0 },
      { label: 'secrets partagés avec n\'importe quel contact', value: -1 },
      { label: 'secrets partagés avec ' + contact.value.nom, value: contact.value.id }
    ]

    watch(
      () => contact.value,
      (ap, av) => {
        optionsct2.splice(2, 1, { label: 'secrets partagés avec ' + contact.value.nom, value: contact.value.id })
      })

    const groupgr = ref(0)
    const optionsgr1 = [
      { label: 'pas de secrets partagés avec des groupes', value: 0 },
      { label: 'secrets partagés avec n\'importe quel groupe', value: -1 }
    ]
    const optionsgr2 = [
      { label: 'pas de secrets partagés avec des groupes', value: 0 },
      { label: 'secrets partagés avec n\'importe quel groupe', value: -1 },
      { label: 'secrets partagés avec le groupe ' + groupe.value.nom, value: groupe.value.id }
    ]

    watch(
      () => groupe.value,
      (ap, av) => {
        optionsgr2.splice(2, 1, { label: 'secrets partagés avec le groupe ' + groupe.value.nom, value: groupe.value.id })
      })

    return {
      avatar,
      mode,
      contact,
      perso,
      groupe,
      groupct,
      optionsct1,
      optionsct2,
      groupgr,
      optionsgr1,
      optionsgr2
    }
  }

})
</script>
<style lang="sass" scpoed>
@import '../css/app.sass'
.fermer
  position: absolute
  top: 0
  left: -1rem
  z-index: 2
.q-item
  padding: 0 !important
  min-height:0 !important
</style>
