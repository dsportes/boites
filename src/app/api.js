const avro = require('avsc')
const crypt = require('./crypto')
const JSONbig = require('json-bigint')

const version = '1'
exports.version = version

const echo = avro.Type.forSchema({
  name: 'echo',
  type: 'record',
  fields: [
    { name: 'a', type: 'int' },
    { name: 'b', type: 'string' },
    { name: 'org', type: ['null', 'string'], default: null }
  ]
})

const echoResp = avro.Type.forSchema({
  name: 'echoResp',
  type: 'record',
  fields: [
    { name: 'a', type: 'int' },
    { name: 'b', type: 'string' },
    { name: 'org', type: ['null', 'string'] }
  ]
})

const conn1Compte = avro.Type.forSchema({
  name: 'conn1Compte',
  type: 'record',
  fields: [
    { name: 'pcbsh', type: 'long' },
    { name: 'dpbh', type: 'long' }
  ]
})

const respBase1 = avro.Type.forSchema({
  name: 'respBase1',
  type: 'record',
  fields: [
    { name: 'status', type: 'int' },
    { name: 'rows', type: { type: 'array', items: ['bytes'] } }
  ]
})

const argTypes = {
  testconnexion: [conn1Compte, respBase1]
}
exports.argTypes = argTypes

const types = { echo, echoResp }
exports.types = types

async function testdb () {
  const c1 = {
    dhc: 123,
    pcbs: crypt.random(4),
    k: crypt.random(32),
    // idx: 456n,
    idx: 999007199254740991n,
    mcs: { 1: 'toto', 2: 'juju' },
    avatars: ['toto', 'titi']
  }

  console.log(c1.idx)
  console.log(JSONbig.stringify(c1))
  const buf = types.idbCompte.toBuffer(c1)
  const c2 = types.idbCompte.fromBuffer(buf)
  console.log(JSONbig.stringify(c2))
  console.log(c2.idx)
}
exports.testdb = testdb
