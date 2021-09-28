const avro = require('avsc')
const crypt = require('./crypto')
// const JSONbig = require('json-bigint')

// eslint-disable-next-line no-unused-vars
const bigint = avro.types.LongType.__with({
  fromBuffer: buf => crypt.u82big(buf),
  toBuffer: n => crypt.big2u8(n < 0 ? -n : n),
  fromJSON: Number,
  toJSON: Number,
  isValid: n => typeof n === 'bigint',
  compare: (n1, n2) => n1 === n2 ? 0 : (n1 < n2 ? -1 : 1)
})

/*
- `versions` (id) : table des prochains numéros de versions (actuel et dernière sauvegarde)
- `etat` (singleton) : état courant permanent du serveur
- `avgrvq` (id) : volumes et quotas d'un avatar ou groupe
- `avrsa` (id) : clé publique d'un avatar

_**Tables aussi persistantes sur le client (IDB)**_

- `compte` (id) : authentification et données d'un compte
- `avatar` (id) : données d'un avatar et liste de ses contacts
- `invitgr` (niv) id : invitation reçue par un avatar à devenir membre d'un groupe
- `contact` (id, nc) : données d'un contact d'un avatar
- `invitct` (id) : invitation reçue à lier un contact fort avec un autre avatar
- `rencontre` (prh) id : communication par A de son nom complet à un avatar B non connu de A dans l'application
- `parrain` (pph) id : parrainage par un avatar A de la création d'un nouveau compte
- `groupe` (id) : données du groupe et liste de ses avatars, invités ou ayant été pressentis, un jour à être membre.
- `membre` (id, im) : données d'un membre du groupe
- `secret` (ids) id : données d'un secret d'un avatar ou groupe

*/

/* Compte ___________________________________________________
`pcb` : PBKFD2 de la phrase complète (clé X) - 32 bytes.

- `id` : id du compte.
- `v` : version
- `dds` : date (jour) de dernière signature.
- `dpbh` : hashBin (53 bits) du PBKFD2 du début de la phrase secrète (32 bytes). Pour la connexion, l'id du compte n'étant pas connu de l'utilisateur.
- `pcbsh` : hash du SHA pcb pour quasi-authentifier une connexion avant un éventuel échec de décryptage de `kx`.
- `kx` : clé K du compte, crypté par la X (phrase secrète courante).
- `mmck` {} : cryptées par la clé K, map des mots clés déclarés par le compte.
  - *clé* : id du mot clé de 1 à 99.
  - *valeur* : libellé du mot clé.
- `mack` {} : map des avatars du compte `[nom@rnd, cpriv]`, cryptée par la clé K
  - `nomc` : `nom@rnd` : nom complet.
  - `cpriv` : clé privée asymétrique.
*/

const compte = avro.Type.forSchema({
  name: 'rowCompte',
  type: 'record',
  fields: [
    { name: 'id', type: 'long' },
    { name: 'v', type: 'int' },
    { name: 'dds', type: 'int' },
    { name: 'dpbh', type: 'long' },
    { name: 'pcbsh', type: 'long' },
    { name: 'k', type: 'bytes' },
    { name: 'mmck', type: 'bytes' },
    { name: 'mack', type: 'bytes' }
  ]
})
exports.compte = compte

/* Invitgr ___________________________________________________
- `niv` : numéro d'invitation.
- `id` : id du membre invité.
- `v` :
- `dlv` :
- `st` : statut. Si `st` < 0, c'est une suppression.
  - `x` : 0:annulée, (1:pressenti), 2:invité, 3:ayant accepté, 4:ayant refusé, 5:sans réponse, 8: résilié, 9:disparu.
  - `y` : 1:lecteur, 2:auteur, 3:administrateur.
- `datap` : pour une invitation _en cours_, crypté par la clé publique du membre invité, référence dans la liste des membres du groupe `[idg, cleg, im]`.
  - `idg` : id du groupe.
  - `cleg` : clé du groupe.
  - `im` : indice de membre de l'invité dans le groupe.
- `datak` : crypté par la clé K du compte de l'avatar, après une acceptation :
  - `idg` : id du groupe.
  - `im` : numéro de membre de l'invité dans le groupe.
  - `info` : texte pour le membre à propos du groupe.
  - `mc` : liste des mots clés de recherche du groupe pour l'avatar.
- `clegk` : clé du groupe cryptée par la clé K après acceptation. Remise à null lors de la résiliation par un animateur (ou du membre lui-même).
*/

const invitgr = avro.Type.forSchema({
  name: 'rowInvitgr',
  type: 'record',
  fields: [
    { name: 'niv', type: 'long' },
    { name: 'id', type: 'long' },
    { name: 'v', type: 'int' },
    { name: 'dlv', type: 'int' },
    { name: 'st', type: 'int' },
    { name: 'datap', type: 'bytes' },
    { name: 'datak', type: 'bytes' },
    { name: 'clegk', type: 'bytes' }
  ]
})
exports.invitgr = invitgr
