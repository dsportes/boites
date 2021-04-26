
export function affichermessage ({ commit, state }, { texte, important }) {
  const to1 = state.messageto
  if (to1) clearTimeout(to1)
  commit('nouveaumessage', { texte, important })
  const n1 = state.message.n
  const to2 = setTimeout(() => {
    const n2 = state.message ? state.message.n : -1
    if (n1 === n2) {
      commit('razmessage')
    }
  }, important ? 10000 : 5000)
  commit('majmessageto', to2)
}
