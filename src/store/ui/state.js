import { IDBLEC_RAZ } from '../constantes.js'
export default function () {
  return {
    erreur: { code: -4, message: 'néant', conseil: 'néant', stack: null },
    statutidb: 0, // 0:inconnu 1:idb accessible 2:idb inaccessible (a rencontré une erreur)
    statutnet: 0,

    dialoguecrypto: false,
    dialoguehelp: false,
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

    helpstack: [],

    opencours: null,

    connexionencours: false,

    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion, 4:visio
    modeinitial: 0,

    /* statut de la session : permet de bloquer la synchro jusqu'à ce que la connexion ait été complète
    0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compte
      ou cette opération s'est interrompue.
    1: opération de connexion / login en cours : ce temps est généralement court et se termine en 0 (échec) ou 2 (succès)
    1: session totalement chargée / synchronisée et cohérente
    */
    statutsession: 0,

    message: null,
    messageto: null,

    org: null,

    idblec: IDBLEC_RAZ,
    synclec: {},

    page: 'Org',

    tabavatar: 'secrets',
    evtavatar: null,
    evtavatarct: null,
    evtavatargr: null,
    evtfiltresecrets: null,
    evtfiltresecrets2: null,
    invitationattente: null,
    editgr: false,
    clipboard: null,
    panelinvit: false
  }
}
