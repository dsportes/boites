import base64url from 'base64url'

export function avatar (state, id) {
  return state.avatars[base64url(id)]
}

export function groupe (state, id) {
  return state.groupes[base64url(id)]
}
