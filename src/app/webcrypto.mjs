/***********************************************
IMPLEMENTATION de webcrypto.js EN UTILISANT Web Cryptography API (sans Node)
***********************************************/

import { sha256 as jssha256 } from 'js-sha256'
import { toByteArray, fromByteArray } from './base64.mjs'

function ab2b (ab) { return new Uint8Array(ab) }

const enc = new TextEncoder()
const dec = new TextDecoder()

export const SALTS = new Array(256)
export function setSalts (a) {
  const b = new Uint8Array(a)
  for (let i = 0; i < 256; i++) {
    SALTS[i] = Uint8Array.prototype.slice.call(b, i * 16, (i + 1) * 16)
  }
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
  const u8 = new Uint8Array(nbytes)
  window.crypto.getRandomValues(u8)
  return u8
}

export function arrayBuffer (u8) {
  if (!u8) {
    return null
  }
  // https://stackoverflow.com/questions/37228285/uint8array-to-arraybuffer
  return u8.buffer.slice(u8.byteOffset, u8.byteLength + u8.byteOffset)
}

export async function crypter (cle, u8, idxIV) {
  if (typeof u8 === 'string') u8 = enc.encode(u8)
  const key = await window.crypto.subtle.importKey('raw', arrayBuffer(cle), 'aes-cbc', false, ['encrypt'])
  const n = !idxIV ? Number(random(1)) : idxIV
  const iv = SALTS[n]
  const x0 = new Uint8Array(1).fill(n)
  const buf = await crypto.subtle.encrypt({ name: 'aes-cbc', iv: iv }, key, arrayBuffer(u8))
  return ab2b(concat([x0, new Uint8Array(buf)]))
}

export async function decrypter (cle, u8) {
  const key = await window.crypto.subtle.importKey('raw', arrayBuffer(cle), 'aes-cbc', false, ['decrypt'])
  const iv = SALTS[Number(u8[0])]
  const r = await crypto.subtle.decrypt({ name: 'aes-cbc', iv: iv }, key, arrayBuffer(u8.slice(1)))
  return ab2b(r)
}

export async function decrypterStr (cle, buffer) {
  const buf = await decrypter(cle, buffer)
  return dec.decode(arrayBuffer(buf))
}

function abToPem (ab, pubpriv) { // ArrayBuffer
  const s = fromByteArray(new Uint8Array(ab))
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
  return toByteArray(s.replace(/\n/g, ''))
}

export async function genKeyPair (asPem) {
  const rsaOpt = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: { name: 'SHA-256' } }
  const key = await window.crypto.subtle.generateKey(rsaOpt, true, ['encrypt', 'decrypt'])
  const jpriv = await window.crypto.subtle.exportKey('pkcs8', key.privateKey)
  const jpub = await window.crypto.subtle.exportKey('spki', key.publicKey)
  if (asPem) return { publicKey: abToPem(jpub, 'PUBLIC'), privateKey: abToPem(jpriv, 'PRIVATE') }
  return { publicKey: new Uint8Array(jpub), privateKey: new Uint8Array(jpriv) }
}

export async function crypterRSA (clepub, u8) {
  if (typeof u8 === 'string') u8 = enc.encode(u8)
  const k = typeof clepub === 'string' ? keyToU8(clepub, 'PUBLIC') : clepub
  // !!! SHA-1 pour que Node puisse decrypter !!!
  const key = await window.crypto.subtle.importKey('spki', arrayBuffer(k), { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['encrypt'])
  const buf = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, arrayBuffer(u8))
  return ab2b(buf)
}

export async function decrypterRSA (clepriv, u8) {
  const k = typeof clepriv === 'string' ? keyToU8(clepriv, 'PRIVATE') : clepriv
  // !!! SHA-1 pour que Node puisse decrypter !!!
  const key = await window.crypto.subtle.importKey('pkcs8', arrayBuffer(k), { name: 'RSA-OAEP', hash: 'SHA-1' }, false, ['decrypt'])
  const r = await crypto.subtle.decrypt({ name: 'RSA-OAEP' }, key, arrayBuffer(u8))
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
