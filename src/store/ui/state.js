import { IDBLEC_RAZ } from '../constantes'
export default function () {
  return {
    erreur: { code: -4, message: 'néant', conseil: 'néant', stack: null },
    statutidb: 0, // 0:inconnu 1:idb accessible 2:idb inaccessible (a rencontré une erreur)
    statutnet: 0,

    dialoguecrypto: false,
    dialoguecreationcompte: false,
    confirmstopop: false,
    dialoguetestping: false,
    dialoguesynchro: false,
    dialogueerreur: false,
    diagnostic: null,
    menuouvert: false,
    confirmerdrc: false,

    infomode: false,
    inforeseau: false,
    infoidb: false,

    opencours: null,

    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion, 4:visio
    modeinitial: 0,
    statutsession: 0,
    /* statut de la session
    0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compteS
    1: session en partie chargée, utilisable en mode visio
    2: session totalement chargée / synchronisée et cohérente
    */

    message: null,
    messageto: null,

    org: null,

    idblec: IDBLEC_RAZ,
    synclec: {},

    page: 'Org'
  }
}
