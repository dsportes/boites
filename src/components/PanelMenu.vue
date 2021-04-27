<template>
  <q-list>
    <q-item-label header class="text-grey-8">Build : {{ $cfg.build }}</q-item-label>
    <q-item-label header class="text-grey-8">Principaux liens</q-item-label>
    <q-item v-for="link in linksList" :key="link.title" v-bind="link"
     clickable tag="a" target="_blank" :href="link.link">
      <q-item-section v-if="link.icon" avatar>
        <q-icon :name="link.icon" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ link.title }}</q-item-label>
        <q-item-label caption>{{ link.caption }}</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>
</template>

<script>
// import { defineComponent } from 'vue'
const linksList = [
  { title: 'Docs', caption: 'quasar.dev', icon: 'school', link: 'https://quasar.dev' },
  { title: 'Github', caption: 'github.com/quasarframework', icon: 'code', link: 'https://github.com/quasarframework' }
]

export default ({
  name: 'PanelMenu',

  data () {
    return {
      linksList
    }
  }
})
</script>
