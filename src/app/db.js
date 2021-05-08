import Dexie from 'dexie'
import { store } from './util'

const STORES = {
  compte: 'id, data',
  avatar: 'id, data',
  groupe: 'id, data',
  secret: 'id, data'
}

let db = null

export async function open (nom) {
  db = new Dexie(nom, { autoOpen: true })
  db.versions(1).stores(STORES)
  await db.open()
  return db
}

export function close () {
  if (db.isOpen()) {
    db.close()
    db = null
  }
}

const errcompte = 'Cette phrase ne correspond à aucun compte enregistré'
export async function connexion (ligne1, ligne2) {
  console.log('Phrase : ' + ligne1 + '\n' + ligne2)
  if (ligne1.startsWith('*')) return errcompte
  store().commit('ui/majstatuslogin', true)
}

/* état de session */
export const session = {
  // non persistant
  pcb: null, // PBKFD2 de la phrase complète saisie (clé X)
  dpbh: null, // Hash du PBKDF2 de la ligne 1 de la phrase saisie
  k: null, // clé k

  // persistant
  idc: null, // id du compte
  dhds: 0, // date-heure de dernière synchronisation persistée
  secavartars: {}, // avatars dont les secrets sont persistants en session : {ida, dhds}
  secgroupes: {} // groupes dont les secrets sont persistants en session : {idg, dhds}
}

/* caches des codes existants des avatars en contacts pour déterminer les disparus ???
{ ida, codes }
*/
export const cachescontacts = { }

/* caches des codes existants des avatars membres des groupes pour déterminer les disparus ???
{ idg, codes }
*/
export const cachesmembres = { }

/*
compte
id pcbh pcbs dma q1 q2 qm1 qm2
avatars[] : liste des noms longs
avs[] : liste des codes des avatars ???
mc{}
*/

/*
avatar
id nc cle dma photo info

- pour les avatars du compte seulement
v1 v2 vm1 vm2 qr1 qr2
contacts: {id ap na nc st}
membres: {id st q1 q2 info mc} -id: idg du groupe dont l'avatar est membre
dcte: {} - demandes de contat émises
dcte: {} - demandes de contat reçues
invg: {} - invitations aux groupes reçues
cext: {} - demandes de contacts externes émises

- pour les avatars pas du compte seulment. NON PERSISTANT
avcs: [] - liste des avatars du compte dont l'avatar est contact
mgrs: [] - liste des groupes auquel l'avatar du compte appartient et dont l'avatar est membre aussi

*/

/*
groupe
id v1 v2 q1 q2 nc cle
membres: {id nc st q1 q2} - membres du groupe
invg: {} - invitations émises par un membre du groupe
*/

/*
secret
id idg perm suppr dhc mc ida vs vp t m r tc
cc: {id perm mc}
*/
