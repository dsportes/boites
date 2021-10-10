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
    mode: 0, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion
    statushttp: 200,
    message: null,
    messageto: null,
    statuslogin: false,
    org: null,
    orgicon: null, // Non null quand l'organisation est connue localement ou sur le serveur selon le mode
    session: null,
    sessionerreur: 0
  }
}
