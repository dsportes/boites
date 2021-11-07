import { IDBLEC_RAZ } from '../constantes'
export default function () {
  return {
    erreur: null,
    derniereerreur: null,

    dialoguecrypto: false,
    dialoguecreationcompte: false,
    confirmstopop: false,
    dialoguetestping: false,
    diagnostic: null,
    menuouvert: false,

    infomode: false,
    inforeseau: false,

    opencours: false,

    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion, 4:visio
    modeinitial: 0,
    statutsession: 0,

    message: null,
    messageto: null,

    org: null,

    idblec: IDBLEC_RAZ,

    page: 'Org'
  }
}
