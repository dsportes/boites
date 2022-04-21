export default function () {
  return {
    compte: null,
    prefs: null,
    compta: null,

    avatar: null, // avatar courant
    groupe: null, // groupe courant
    membre: null, // membre courant
    couple: null, // couple courant
    secret: null, // secret courant

    avatars: {}, // Tous les avatars listés sur le compte
    groupes: {}, // Tous les groupes listés sur les avatars
    couples: {}, // Tous les couples listés sur les avatars
    cvs: {}, // Toutes les cartes de visite
    fetats: {}, // Tous les Fetat
    avsecrets: {},

    tousAx: {}
    /* Map par leur id de tous les avatars externes : { na, x, c, m }
    - na : son na
    - x : si true, c'est un disparu
    - c : set des ids des couples dont il est avatar externe
    - m : set des [id, im] des membres dont il est avatar externe
    */

    /*
    Groupés par sid de groupe : membres@sid
    Groupés par sid d'avatar ou de groupe ou de couple : secrets@sid avsecrets@sid
    */
  }
}
