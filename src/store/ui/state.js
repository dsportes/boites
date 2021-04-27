export default function () {
  return {
    erreur: null,
    derniereerreur: null,
    reqencours: false,
    mode: 2, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion
    statushttp: 200,
    message: null,
    messageto: null,
    statuslogin: 0, // 0:pas connecté, 1:mode et org fixés, 2:compte inconnu, 3:connecté
    org: 'anonyme',
    orgicon: null
  }
}
