const crypt = require('./crypto')
const u8ToB64 = require('./crypto').u8ToB64
const b64ToU8 = require('./crypto').b64ToU8

const enc = new TextEncoder()
// const dec = new TextDecoder()

async function pbkfd (secret) {
  const passwordKey = await window.crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: crypt.SALTS(0), iterations: 5000, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  return new Uint8Array(await window.crypto.subtle.exportKey('raw', key))
}

async function sha256 (buffer) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', buffer))
}

async function testWAC () {
  const secret = 'toto est beau'
  const p1 = crypt.pbkfd(secret)
  console.log(u8ToB64(p1, true))
  const p2 = await pbkfd(secret)
  const s1 = u8ToB64(p2, true)
  let u8 = b64ToU8(s1)
  const s2 = u8ToB64(p2, false)
  console.log(s1)
  console.log(s2)
  u8 = b64ToU8(s1)
  const s3 = u8ToB64(u8, false)
  console.log(s3)

  const sha1 = crypt.sha256(enc.encode(secret))
  const sha2 = await sha256(enc.encode(secret))
  console.log(u8ToB64(sha1, true))
  console.log(u8ToB64(sha2, true))
}
exports.testWAC = testWAC
