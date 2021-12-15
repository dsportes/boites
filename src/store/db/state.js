export default function () {
  return {
    compte: null,
    avatar: null, // avatar courant
    groupe: null, // groupe courant
    avatars: {}, // Tous les avatars (liste sur le compte)
    groupes: {}, // Tous les groupes
    cvs: {}, // Toutes les cartes de visite : accès par data.repertoire

    parrains: {}, // Tous les parrains (pph) : un getter par id d'avatar
    rencontres: {} // Toutes les rencontres (prh) : un getter par id d'avatar

    /*
    Groupés par sid d'avatar : contacts_sid invitcts_sid invitgrs_sid
    Groupés par sid de groupe : membres_sid
    Groupés par sid d'avatar ou de groupe : secrets_sid
    */

  }
}
