export default function () {
  return {
    compte: null,
    prefs: null,
    compta: null,

    avatar: null, // avatar courant
    groupe: null, // groupe courant
    groupeplus: null, // couple courant [groupe, membre] ou membre est celui de l'avatar courant
    couple: null, // couple courant
    secret: null, // secret courant

    avatars: {}, // Tous les avatars listés sur le compte
    groupes: {}, // Tous les groupes listés sur les avatars
    couples: {}, // Tous les couples listés sur les avatars
    cvs: {}, // Toutes les cartes de visite

    faidx: {} // index des pièces jointes disponibles en mode avion

    /*
    Groupés par sid de groupe : membres@sid
    Groupés par sid d'avatar ou de groupe ou de couple : secrets@sid
    */
  }
}
