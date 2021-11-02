import { IDBLEC_RAZ } from '../constantes'
export default function () {
  return {
    erreur: null,
    derniereerreur: null,
    dialoguecrypto: false,
    dialoguecreationcompte: false,
    confirmstopchargement: false,
    dialoguetestping: false,
    diagnostic: null,
    menuouvert: false,
    reqencours: false,
    infomode: false,
    inforeseau: false,
    infoidb: false,
    syncencours: false,
    idberreur: null,
    modeleactif: false,
    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion
    statushttp: 200,
    message: null,
    messageto: null,
    org: null,
    sessionerreur: null,
    idblec: IDBLEC_RAZ,
    page: 'Org'
  }
}
