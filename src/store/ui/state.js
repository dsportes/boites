export default function () {
  return {
    erreur: null,
    derniereerreur: null,
    reqencours: false,
    mode: 2, // 0:inconnu, 1:synchronise, 2:incognito, 3:avion
    statushttp: 200,
    message: null,
    messageto: null,
    org: 'anonyme'
  }
}
