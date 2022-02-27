export default function () {
  return {
    compte: null,
    prefs: null,
    compta: null,
    ardoise: null,
    avatar: null, // avatar courant
    groupe: null, // groupe courant
    groupeplus: null, // couple courant [groupe, membre] ou membre est celui de l'avatar courant
    contact: null, // contact courant
    secret: null, // secret courant
    avatars: {}, // Tous les avatars (liste sur le compte)
    groupes: {}, // Tous les groupes
    repertoire: {}, // Toutes les cartes de visite : accès par data.repertoire

    parrains: {}, // Tous les parrains (pph) : un getter par id d'avatar
    rencontres: {}, // Toutes les rencontres (prh) : un getter par id d'avatar

    pjidx: {} // index des pièces jointes disponibles en mode avion

    /*
    Groupés par sid d'avatar : contacts_sid
    Groupés par sid de groupe : membres_sid
    Groupés par sid d'avatar ou de groupe : secrets_sid
    */

  }
}
