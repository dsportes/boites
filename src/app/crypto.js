const crypto = require('crypto')
const base64url = require('base64url') // https://www.npmjs.com/package/base64url
const base64js = require('base64-js')
const decoder = new TextDecoder('utf-8')
const encoder = new TextEncoder('utf-8')

const SALTS = new Array(256)
function setSalts (a) {
  const b = new Uint8Array(a)
  for (let i = 0; i < 256; i++) {
    SALTS[i] = Uint8Array.prototype.slice.call(b, i * 16, (i + 1) * 16)
  }
  return SALTS
}
exports.setSalts = setSalts

function sha256 (buffer) {
  return crypto.createHash('sha256').update(buffer).digest()
}
exports.sha256 = sha256

function pbkfd (secret) {
  return crypto.pbkdf2Sync(secret, SALTS[0], 5000, 32, 'sha256')
}
exports.pbkfd = pbkfd

function random (nbytes) { return crypto.randomBytes(nbytes) }
exports.random = random

function rnd6 () { return u8ToInt(random(6)) }
exports.rnd6 = rnd6

function hash (str, big = false, b64 = false, seed = 0) {
  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const r = big ? 4294967296n * BigInt(h2) + BigInt(h1) : 4294967296 * (2097151 & h2) + (h1 >>> 0)
  if (Number.isSafeInteger(r)) {
    console.log(r)
  }
  return b64 ? int2base64(r) : r
}
exports.hash = hash

function hashBin (str, big = false, b64 = false, seed = 0) {
  // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed
  for (let i = 0, ch; i < str.length; i++) {
    ch = str[i]
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const r = big ? 4294967296n * BigInt(h2) + BigInt(h1) : 4294967296 * (2097151 & h2) + (h1 >>> 0)
  return b64 ? int2base64(r) : r
}
exports.hashBin = hashBin

const c64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
function int2base64 (n) {
  let r = '', x = n, i
  const b = typeof n !== 'number'
  while (x) {
    i = b ? Number(x % 64n) : x % 64
    r += c64.charAt(i < 0 ? -i : i)
    x = b ? x / 64n : Math.floor(x / 64)
  }
  return r
}
exports.int2base64 = int2base64

function writeUInt32LE (u8, value, offset) {
  value = +value
  offset = offset >>> 0
  u8[offset + 3] = (value >>> 24)
  u8[offset + 2] = (value >>> 16)
  u8[offset + 1] = (value >>> 8)
  u8[offset] = (value & 0xff)
  return offset + 4
}

const max32 = BigInt(2 ** 32)
function big2u8 (n) {
  if (typeof n === 'number') n = BigInt(n)
  if (n < 0) n = -n
  const buf = new Uint8Array(8)
  writeUInt32LE(buf, Number(n / max32), 4)
  writeUInt32LE(buf, Number(n % max32), 0)
  return buf
}
exports.big2u8 = big2u8

function readUInt32LE (u8, offset) {
  offset = offset >>> 0
  return ((u8[offset]) |
      (u8[offset + 1] << 8) |
      (u8[offset + 2] << 16)) +
      (u8[offset + 3] * 0x1000000)
}

function u82big (u8, number = false) {
  const fort = BigInt(readUInt32LE(u8, 4))
  const faible = BigInt(readUInt32LE(u8, 0))
  const r = (fort * max32) + faible
  return !number ? r : Number(r)
}
exports.u82big = u82big

const BI_MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)
function u8ToInt (u8) {
  if (!u8 || !u8.length || u8.length > 8) return 0
  let r = 0n
  for (let i = u8.length - 1; i > 0; i--) {
    r += BigInt(u8[i]) * (p2b[i - 1] + 1n)
  }
  r += BigInt(u8[0])
  return r > BI_MAX_SAFE_INTEGER ? r : Number(r)
}
exports.u8ToInt = u8ToInt

const p2 = [255, (256 ** 2) - 1, (256 ** 3) - 1, (256 ** 4) - 1, (256 ** 5) - 1, (256 ** 6) - 1, (256 ** 7) - 1]
const p2b = [255n, (256n ** 2n) - 1n, (256n ** 3n) - 1n, (256n ** 4n) - 1n, (256n ** 5n) - 1n, (256n ** 6n) - 1n, (256n ** 7n) - 1n]
function intToU8 (n) {
  const bi = typeof n === 'bigint'
  if (n < 0) n = -n
  const p2x = bi ? p2b : p2
  let l = 8
  for (let i = 6; i >= 0; i--, l--) if (n > p2x[i]) break
  const u8 = new Uint8Array(l)
  for (let i = 0; i < 8; i++) {
    u8[i] = bi ? Number(n % 256n) : n % 256
    n = bi ? (n / 256n) : Math.floor(n / 256)
  }
  return u8
}
exports.intToU8 = intToU8

function crypter (cle, buffer, idxIV) {
  const k = typeof cle === 'string' ? base64url.toBuffer(cle) : cle
  const n = !idxIV ? 0 : (idxIV < 0 ? Number(crypto.randomBytes(1)) : idxIV)
  const cipher = crypto.createCipheriv('aes-256-cbc', k, SALTS[n])
  const x0 = new Uint8Array(1)
  x0[0] = n
  const x1 = cipher.update(buffer)
  const x2 = cipher.final()
  return concat([x0, x1, x2])
}
exports.crypter = crypter

function decrypter (cle, buffer) {
  const k = typeof cle === 'string' ? base64url.toBuffer(cle) : cle
  const decipher = crypto.createDecipheriv('aes-256-cbc', k, SALTS[Number(buffer[0])])
  const x1 = decipher.update(buffer.slice(1))
  const x2 = decipher.final()
  return concat([x1, x2])
}
exports.decrypter = decrypter

function decrypterStr (cle, buffer) {
  const buf = decrypter(cle, buffer)
  return decoder.decode(buf)
}
exports.decrypterStr = decrypterStr

/* The `generateKeyPairSync` (node) method accepts two arguments:
  1. The type ok keys we want, which in this case is "rsa"
  2. An object with the properties of the key
  The standard secure default length for RSA keys is 2048 bits
  return : { publicKey, privateKey }
*/
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

async function genkeypairBrowser () {
  const rsaOpt = { name: 'RSA-OAEP', modulusLength: 2048, publicExponent: new Uint8Array([0x01, 0x00, 0x01]), hash: { name: 'SHA-512' } }
  const key = await window.crypto.subtle.generateKey(rsaOpt, true, ['encrypt', 'decrypt'])
  const jpriv = await window.crypto.subtle.exportKey('pkcs8', key.privateKey)
  const jpub = await window.crypto.subtle.exportKey('spki', key.publicKey)
  return { publicKey: abToPem(jpub, 'PUBLIC'), privateKey: abToPem(jpriv, 'PRIVATE') }
}

async function genKeyPair () {
  let kp
  if (typeof window !== 'undefined') {
    kp = await genkeypairBrowser()
  } else {
    kp = crypto.generateKeyPairSync('rsa',
      {
        modulusLength: 2048, // the length of your key in bits
        publicKeyEncoding: {
          type: 'spki', // recommended to be 'spki' by the Node.js docs
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8', // recommended to be 'pkcs8' by the Node.js docs
          format: 'pem'
          // cipher: 'aes-256-cbc',   // *optional*
          // passphrase: 'top secret' // *optional*
        }
      })
  }
  return kp
}
exports.genKeyPair = genKeyPair

/* encryption RSA avec la clé publique
  data est un Buffer
*/
function encrypterRSA (publicKey, data) {
  return crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha512' }, data)
}
exports.encrypterRSA = encrypterRSA

/* decryption RSA avec la clé privée
  encryptedData est un Buffer
*/
function decrypterRSA (privateKey, encryptedData) {
  return crypto.privateDecrypt({ key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha512' }, encryptedData)
}
exports.decrypterRSA = decrypterRSA

function id2b (id) { // to buffer (u8)
  if (typeof id === 'string') return base64url.toBuffer(id) // b64 -> buffer
  if (typeof id === 'number') return intToU8(id) // int / bigint -> buffer
  return id // déjà en buffer
}
exports.id2b = id2b

function id2n (id) { // to number (int / bigint)
  if (typeof id === 'string') return u8ToInt(base64url.toBuffer(id)) // b64 -> buffer
  if (typeof id === 'number') return id // déjà en number
  return u8ToInt(id) // u8 -> number
}
exports.id2n = id2n

function id2s (id) { // to string (b64)
  if (typeof id === 'string') return id // déjà en B64
  if (typeof id === 'number') return base64url(intToU8(id)) // int -> u8 -> b64
  return base64url(id) // u8 -> b64
}
exports.id2s = id2s

async function test () {
  console.log(process.version)
  const cle = encoder.encode('toto est beau')
  const clebin = sha256(cle)
  const cle64 = base64url(clebin)
  console.log(cle64)
  let x = pbkfd('toto est beau')
  const y = base64url(x)
  console.log(y)
  x = random(16)
  console.log(base64url(x))
  x = random(6)
  console.log(u8ToInt(x))
  const xx = 'https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript'
  x = encoder.encode(xx)
  const e1 = crypter(clebin, x)
  console.log(e1.toString('hex'))
  const d1 = decrypter(clebin, e1)
  console.log(decoder.decode(d1))
  const n = Number(crypto.randomBytes(1)[0])
  const e2 = crypter(cle64, x, n)
  console.log(e2.toString('hex'))
  const d2 = decrypter(clebin, e2)
  console.log(decoder.decode(d2))
  const e3 = crypter(cle64, x, n)
  console.log(e3.toString('hex'))
  const d3 = decrypter(clebin, e3)
  console.log(decoder.decode(d3))
  const kp = await genKeyPair()
  const encRSA = encrypterRSA(kp.publicKey, x)
  console.log('encypted data RSA : ' + encRSA.toString('base64'))
  const decRSA = decrypterRSA(kp.privateKey, encRSA)
  console.log('decypted data RSA : ' + decRSA.toString('utf8'))
  console.log(int2base64(12345678))
  console.log(int2base64(12345678n))
  console.log(hash(xx, false, false))
  console.log(hash(xx, false, true))
  console.log(hash(xx, true, false))
  console.log(hash(xx, true, true))
  let z = hash(xx, false)
  console.log(z)
  const b1 = big2u8(z)
  console.log(base64url(b1))
  console.log(u82big(b1))
  z = hash(xx, true)
  console.log(z)
  const b2 = big2u8(z)
  console.log(base64url(b2))
  console.log(u82big(b2, true))
  console.log(u82big(b2))
  console.log(b1.length + ' - ' + b2.length)
}
exports.test = test

function test2 () {
  // const m7 = p2b[6] + 10n
  const m7 = (2n ** 64n) - 1n
  const m5 = p2[4] + 10
  const m5b = p2b[4] + 10n
  const m1 = 10
  let u7, v7, i7, j7
  const t1 = new Date().getTime()
  for (let i = 0; i < 1000; i++) {
    u7 = intToU8(m7)
    i7 = u8ToInt(u7)
  }
  const t2 = new Date().getTime()
  console.log((t2 - t1) + 'ms')
  for (let i = 0; i < 1000; i++) {
    v7 = big2u8(m7)
    j7 = u82big(v7)
  }
  const t3 = new Date().getTime()
  console.log((t3 - t2) + 'ms')
  console.log('u7 ' + hashBin(u7))
  console.log('v7 ' + hashBin(v7))

  const u5 = intToU8(m5)
  const v5 = big2u8(m5b)
  const i5 = u8ToInt(u5)
  const j5 = u82big(v5)
  console.log('u5 ' + hashBin(u5))
  console.log('v5 ' + hashBin(v5))

  const u1 = intToU8(m1)
  const v1 = big2u8(10n)
  const i1 = u8ToInt(u1)
  const j1 = u82big(v1)
  console.log('u1 ' + hashBin(u1))
  console.log('v1 ' + hashBin(v1))

  console.log(m7 + ' ' + u7.toString('hex') + ' ' + v7.toString('hex') + ' ' + i7 + ' ' + j7)
  console.log(m5 + ' ' + u5.toString('hex') + ' ' + v5.toString('hex') + ' ' + i5 + ' ' + j5)
  console.log(m1 + ' ' + u1.toString('hex') + ' ' + v1.toString('hex') + ' ' + i1 + ' ' + j1)
}
exports.test2 = test2

function concat (arrays) {
  // sum of individual array lengths
  const totalLength = arrays.reduce((acc, value) => acc + value.length, 0)
  if (!arrays.length) return null
  const result = new Uint8Array(totalLength)
  // for each array - copy it over result
  // next array is copied right after the previous one
  let length = 0
  for (const array of arrays) {
    result.set(array, length)
    length += array.length
  }
  return result
}
exports.concat = concat
