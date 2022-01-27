export default function () {
  return {
    compte: null,
    prefs: null,
    avatar: null, // avatar courant
    groupe: null, // groupe courant
    contact: null, // contact courant
    secret: null, // secret courant
    avatars: {}, // Tous les avatars (liste sur le compte)
    groupes: {}, // Tous les groupes
    repertoire: {}, // Toutes les cartes de visite : accès par data.repertoire

    parrains: {}, // Tous les parrains (pph) : un getter par id d'avatar
    rencontres: {}, // Toutes les rencontres (prh) : un getter par id d'avatar

    pjidx: {} // index des pièces jointes disponibles en mode avion

    /*
    Groupés par sid d'avatar : contacts_sid invitcts_sid invitgrs_sid
    Groupés par sid de groupe : membres_sid
    Groupés par sid d'avatar ou de groupe : secrets_sid
    */

  }
}
