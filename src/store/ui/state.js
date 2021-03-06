export default function () {
  return {
    erreur: { code: -4, message: 'néant', conseil: 'néant', stack: null },
    dialogueerreur: false,
    dialoguetrig: false,
    trigramme: null,

    message: null,
    messageto: null,

    // MainLayout
    menuouvert: false,
    panelcontacts: false,
    fichiersavion: false,
    confirmerdrc: false,
    infomode: false,
    inforeseau: false,
    infoidb: false,
    infoblocage: false,

    dialogueEXPS: false,

    tribudial: false,
    tribudialobj: null,
    comptadial: false,
    comptadialobj: null,
    coupledial: false,
    coupledialobj: null,
    membredial: false,
    membredialobj: null, // [groupeid, membreid]

    dialoguecrypto: false,
    dialoguehelp: false,
    dialoguecreationcompte: false,
    confirmstopop: false,
    dialoguetestping: false,
    dialoguesynchro: false,
    dialoguedlselection: false,
    diagnostic: null,
    dialoguechat: false,
    dialogueselchat: false,

    helpstack: [],

    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion, 4:visio
    modeinitial: 0,
    blocage: 0, // 0: pas bloqué, 1: notification de blocage imminent, 2: restriction sur l'écriture des secrets, 3: bloqué

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

    tabavatar: 'secrets',
    tabsecret: 'texte',
    evtavatarsc: null,
    evtavatarcp: null,
    evtavatargr: null,

    avatarcprech: false,
    avatarcpform: false,
    avatargrrech: false,
    avatargrform: false,
    avatarscrech: false,
    avatarscform: false,
    avatartrform: false,

    evtfiltresecrets: null,
    evtfiltresecrets2: null,

    editgr: false,
    clipboard: null,

    etapefichier: 0,

    chargements: [],
    echecs: [],
    dlencours: 0
  }
}
