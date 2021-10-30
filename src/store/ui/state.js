import { IDBLEC_RAZ } from '../constantes'
export default function () {
  return {
    erreur: null,
    derniereerreur: null,
    dialoguecrypto: false,
    dialoguecreationcompte: false,
    diagnostic: null,
    menuouvert: false,
    reqencours: false,
    infomode: false,
    inforeseau: false,
    infosync: false,
    phasesync: 1, // 0: sync en cours, 1: login, ...
    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion
    statushttp: 200,
    message: null,
    messageto: null,
    statuslogin: false,
    org: null,
    orgicon: null,
    sessionerreur: null,
    idblec: IDBLEC_RAZ,
    phase: 0,
    idberreur: null,
    modeleactif: false
  }
}
