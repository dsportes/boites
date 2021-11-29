/***********************************************
IMPLEMENTATION de webcrypto.js EN UTILISANT Web Cryptography API (sans Node)
***********************************************/

const base64js = require('base64-js')
const jssha256 = require('js-sha256').sha256
import { ab2b } from './schemas.mjs'

const enc = new TextEncoder()
const dec = new TextDecoder()

export const SALTS = new Array(256)
export function setSalts (a) {
  const b = new Uint8Array(a)
  for (let i = 0; i < 256; i++) {
    SALTS[i] = Uint8Array.prototype.slice.call(b, i * 16, (i + 1) * 16)
  }
}

function b64ToU8 (s) {
  const diff = s.length % 4
  let x = s
  if (diff) {
    const pad = '===='.substring(0, 4 - diff)
    x = s + pad
  }
  return base64js.toByteArray(x.replace(/-/g, '+').replace(/_/g, '/'))
}

export async function pbkfd (secret) {
  const passwordKey = await window.crypto.subtle.importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveKey'])
  const key = await window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: SALTS[0], iterations: 5000, hash: 'SHA-256' },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  const res = await window.crypto.subtle.exportKey('raw', key)
  return ab2b(res)
}

export function sha256 (buffer) {
  // return ab2b(await window.crypto.subtle.digest('SHA-256', buffer))
  return ab2b(jssha256.arrayBuffer(buffer))
}

export function random (nbytes) {
  const u8 = new Uint32Array(nbytes)
  window.crypto.getRandomValues(u8)
  return u8
}

function arrayBuffer (u8) {
  // https://stackoverflow.com/questions/37228285/uint8array-to-arraybuffer
  return u8.buffer.slice(u8.byteOffset, u8.byteLength + u8.byteOffset)
}

export async function crypter (cle, u8, idxIV) {
  const k = typeof cle === 'string' ? b64ToU8(cle) : cle
  const key = await window.crypto.subtle.importKey('raw', arrayBuffer(k), 'aes-cbc', false, ['encrypt'])
  const n = !idxIV ? 0 : (idxIV < 0 ? Number(crypto.randomBytes(1)) : idxIV)
  const iv = SALTS[n]
  const x0 = new Uint8Array(1).fill(n)
  const buf = await crypto.subtle.encrypt({ name: 'aes-cbc', iv: iv }, key, u8)
  return ab2b(concat([x0, new Uint8Array(buf)]))
}

export async function decrypter (cle, u8) {
  const k = typeof cle === 'string' ? b64ToU8(cle) : cle
  const key = await window.crypto.subtle.importKey('raw', arrayBuffer(k), 'aes-cbc', false, ['decrypt'])
  const iv = SALTS[Number(u8[0])]
  const r = await crypto.subtle.decrypt({ name: 'aes-cbc', iv: iv }, key, u8.slice(1))
  return ab2b(r)
}

export async function decrypterStr (cle, buffer) {
  const buf = await decrypter(cle, buffer)
  return dec.decode(buf)
}

function abToPem (ab, pubpriv) { // ArrayBuffer
  const s = base64js.fromByteArray(new Uint8Array(ab))
  let i = 0
  const a = ['-----BEGIN ' + pubpriv + ' KEY-----']
  while (i < s.length) {
    a.push(s.substring(i, i + 64))
    i += 64
  }
  a.push('-----END ' + pubpriv + ' KEY-----')
  return a.join('\n')
}

function keyToU8 (pem, pubpriv) {
  const d = '-----BEGIN ' + pubpriv + ' KEY-----'
  const f = '-----END ' + pubpriv + ' KEY-----'
  const s = pem.substring(d.length, pem.length - f.length)
  return base64js.toByteArray(s.replace(/\n/g, ''))
}

export async function genKeyPair () {
  const rsaOpt = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: { name: 'SHA-256' } }
  const key = await window.crypto.subtle.generateKey(rsaOpt, true, ['encrypt', 'decrypt'])
  const jpriv = await window.crypto.subtle.exportKey('pkcs8', key.privateKey)
  const jpub = await window.crypto.subtle.exportKey('spki', key.publicKey)
  return { publicKey: abToPem(jpub, 'PUBLIC'), privateKey: abToPem(jpriv, 'PRIVATE') }
}

export async function crypterRSA (clepub, u8) {
  const k = keyToU8(clepub, 'PUBLIC')
  // !!! SHA-1 pour que Node puisse decrypter !!!
  const key = await window.crypto.subtle.importKey('spki', arrayBuffer(k), { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['encrypt'])
  const buf = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, u8)
  return ab2b(buf)
}

export async function decrypterRSA (clepriv, u8) {
  const k = keyToU8(clepriv, 'PRIVATE')
  // !!! SHA-1 pour que Node puisse decrypter !!!
  const key = await window.crypto.subtle.importKey('pkcs8', arrayBuffer(k), { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['decrypt'])
  const r = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, u8)
  return ab2b(r)
}

export function concat (arrays) {
  // sum of individual array lengths
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
  if (!arrays.length) return null
  const result = new Uint8Array(totalLength)
  let length = 0
  for (const array of arrays) {
    result.set(array, length)
    length += array.length
  }
  return result
}
