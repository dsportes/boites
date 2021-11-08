import { IDBLEC_RAZ } from '../constantes'
export default function () {
  return {
    erreur: null,
    derniereerreur: null,
    statutidb: 0,
    statutnet: 0,

    dialoguecrypto: false,
    dialoguecreationcompte: false,
    confirmstopop: false,
    dialoguetestping: false,
    diagnostic: null,
    menuouvert: false,

    infomode: false,
    inforeseau: false,
    infoidb: false,

    opencours: null,

    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion, 4:visio
    modeinitial: 0,
    statutsession: 0,
    /* statut de la session
    0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compte
    ou cette opération s'est interrompue. En attente de décision déconnexion / reconnexion OU opération en cours
    1: session en partie chargée, utilisable en mode visio
    2: session totalement chargée / synchronisée et cohérente
    */

    message: null,
    messageto: null,

    org: null,

    idblec: IDBLEC_RAZ,

    page: 'Org'
  }
}
