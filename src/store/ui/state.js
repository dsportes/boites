export default function () {
  return {
    erreur: { code: -4, message: 'néant', conseil: 'néant', stack: null },
    dialogueerreur: false,

    message: null,
    messageto: null,

    // MainLayout
    menuouvert: false,
    confirmerdrc: false,
    infomode: false,
    inforeseau: false,
    infoidb: false,

    dialoguecrypto: false,
    dialoguehelp: false,
    dialoguecreationcompte: false,
    confirmstopop: false,
    dialoguetestping: false,
    dialoguesynchro: false,
    diagnostic: null,

    helpstack: [],

    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion, 4:visio
    modeinitial: 0,

    org: null,

    page: 'Org',

    opencours: null,

    statutidb: 0, // 0:inconnu 1:idb accessible 2:idb inaccessible (a rencontré une erreur)
    statutnet: 0,

    /* statut de la session : permet de bloquer la synchro jusqu'à ce que la connexion ait été complète
    0: fantôme : la session n'a pas encore été ouverte par une opération de login / création compte
      ou cette opération s'est interrompue.
    1: opération de connexion / login en cours : ce temps est généralement court et se termine en 0 (échec) ou 2 (succès)
    2: session totalement chargée / synchronisée et cohérente
    */
    statutsession: 0,
    sessionok: false,
    syncitems: {},

    /* Dernier état de session synchronisé
    - dhdebutp : dh de début de la dernière session sync terminée
    - dhfinp : dh de fin de la dernière session sync terminée
    - dhdebut: dh de début de la session sync en cours
    - dhsync: dh du dernier traitement de synchronisation
    - dhpong: dh du dernier pong reçu
    */
    sessionsync: null,

    tabavatar: 'etc',
    evtavatarsc: null,
    evtavatarcp: null,
    evtavatargr: null,

    avatarcprech: false,
    avatarcpform: false,
    avatargrrech: false,
    avatargrform: false,

    evtfiltresecrets: null,
    evtfiltresecrets2: null,
    invitationattente: null,
    editgr: false,
    clipboard: null,
    panelinvit: false
  }
}
