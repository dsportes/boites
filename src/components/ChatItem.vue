<template>
<q-chat-message
        name="me"
        avatar="https://cdn.quasar.dev/img/avatar3.jpg"
        stamp="7 minutes ago"
        sent
        text-color="white"
        bg-color="primary"
      >
        <div>
          Hey there!
        </div>

        <div>
          Have you seen Quasar?
          <img src="https://cdn.quasar.dev/img/discord-omq.png" class="my-emoticon">
        </div>
      </q-chat-message>
</template>

<script>
export default ({
  name: 'ChatItem',
  props: { item: Object }
})
</script>

<style lang="sass" scoped>
@import '../css/app.sass'
</style>
