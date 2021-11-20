const avro = require('avsc')

function ab2b (x) {
  return Buffer.from(x)
}
exports.ab2b = ab2b

const allTypes = {}

function forSchema (s) {
  const sch = avro.types.forSchema(s)
  if (s && s.name) allTypes[s.name] = sch
  return sch
}
exports.forSchema = forSchema

function serialize (s, obj) {
  const sch = s && typeof s === 'string' ? allTypes[s] : s
  return sch.toBuffer(obj)
}
exports.serialize = serialize

function deserialize (s, buf) {
  const sch = s && typeof s === 'string' ? allTypes[s] : s
  return sch.fromBuffer(buf)
}
exports.deserialize = deserialize
