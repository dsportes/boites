## Gestion des fichiers disponibles en mode avion
- Chaque fichier est identifié par idf (grand nombre aléatoire).
- Chaque fichier est attaché à un **secret** identifié par `id ns`, ne peut en changer et est immuable.
- Un fichier peut être détruit, pas mis à jour.

### Cache des fichiers en IDB
Deux tables gèrent ce stockage en IDB :
- `fdata` : colonnes `idj, data`. Seulement insertion et suppression
  - `data` est crypté par la clé K du compte (pas la clé `idf`)
- `fetat` : colonnes `idf, data : {dhd, dhc, lg, nom info}`. Insertion, suppression et mise à jour.
  - `dhd` : date-heure de demande de chargement.
  - `dhc` : date-heure de chargement.
  - `lg` : taille du fichier (source, son v2).
  - `nom info` : à titre d'information.

#### Transactions
- `fetat` peut subir une insertion sans mise à jour de `fdada`.
- `fetat` peut subir une suppression sans mise à jour de `fdata` si le row indique qu'il était encore en attente (`dhc` 0).
- `fetat` et `fdata` peuvent subir une suppression synchronisée.
- quand `fdata` subit une insertion, `fetat` subit dans la même transaction la mise à jour de `dhc`.

La table `fetat` est,
- lue à l'ouverture d'une session en modes _synchronisé_ et _avion_ (lecture seule),
- l'état _commité_ est disponible en mémoire durant toute la session.

#### Démon
En mode synchronisé un démon tourne en tâche de fond pour obtenir du serveur les fichiers requis pas encore disponibles en IDB.

Dans la barre de statut en haut, l'icône du mode synchronisé est en _warning_ quand il y a des fichiers en attente / chargement. Quand on clique sur cette icône, la liste `fetat` est lisible (avec l'indication en tête du fichier éventuellement _en cours de chargement_).

#### État de disponibilité pour le secret _courant_
Dans db/store, le state `dispofichiers` est synchronisé avec db/secret (le secret _courant_). Le démon maintient dans `dispofichiers` la liste des idf _en cours de chargement_ (en fait demandés mais pas encore chargés). La page des fichiers attachés du secret courant peut ainsi afficher si le fichier est disponible localement ou non :
- en mode _avion_ ceci indique si il sera ou non affichable,
- en mode _synchronisé_ ceci indique si son affichage est _gratuit_ (et immédiat).

## Objets Secret et AvSsecret
Les objets `Secret` sont ceux de classe `Secret` disponible dans le store/db.
- Identifiant : `[id, ns]`
- Propriété `mfa` : c'est une map,
  - _clé_ : `idf`, l'identifiant d'un fichier attaché,
  - _valeur_ : `{ nom, lg, dh ... }`, nom externe et taille. Pour un nom donné pour un secret donné il y a donc plusieurs versions de fichier chacune identifiée par son idf et ayant une date-heure d'insertion dh. Pour un nom donné il y a donc un fichier _le plus récent_.

Un objet de classe `AvSecret` existe pour chaque secret pour lequel le compte a souhaité avoir au moins un des fichiers attachés disponible en mode avion.
- Identifiant : `[id, ns]`
- Propriétés :
  - `lidf` : liste des identifiants des fichiers explicitement cités par leur identifiant comme étant souhaité _hors ligne_.
  - `mnom` : une map ayant,
    - _clé_ : `nom` d'un fichier dont le compte a souhaité disposer de la _version la plus récente_ hors ligne.
    - _valeur_ : `idf`, identifiant de cette version constaté dans l'état le plus récent du secret.

Chaque objet de classe `AvSecret` est disponible dans db/store avec la même structure que pour secret :
- une entrée `avsecret@id` qui donne une map de clé `ns` pour chaque objet `AvSecret`.

`AvSecret` est maintenu en IDB à chaque changement :
- la clé primaire `id,id2` est comme de Secret cryptée par la clé K du compte.
- _data_ est la sérialisation de `{lidf, mnom}` cryptée par la clé K du compte.

En mode _synchronisé_ et _avion_ tous les `AvSecret` sont chargés en mémoire dans db/store.

### Mises à jour des AvSecret
Il y a deux sources de mise à jour :
-**(a) le compte fait évoluer ses souhaits**, modifie `lidf / mnom` : il peut en résulter,
  - une liste d'idf à ne plus conserver en IDB,
  - une seconde liste d'idf qui ne l'étaient pas et doivent désormais l'être. 
  - Ces deux listes sont calculées par comparaison entre la version _actuelle_ d'un `AvSecret` et sa version _future_ (désormais souhaitée).
-**(b) une mise à jour d'un `Secret`** peut faire apparaître des incohérences avec l'`AvSecret` correspondant (quand il y en a un) et qui doit se mettre en conformité:
  - des idf cités dans `lidf` n'existent plus : ils doivent être supprimés.
  - pour un nom dans `mnom`, l'idf cité n'est plus le plus récent (il doit être supprimé **et** un autre devient requis et _peut-être_ non stocké donc inscrit comme _à charger_).
  - des noms cités dans `mnom` n'existent plus, ce qui entraîne la disparition des idf correspondants (et de l'entrée `mnom`).
  - en conséquence il résulte de la comparaison entre un `Secret` et son `AvSecret` correspondant :
    - une liste d'idf à supprimer dans `fetat fdata` ce qui est fait sur l'instant.
    - une liste d'idf _à charger_ et noté dans `fetat` sur l'instant, le chargement effectif étant effectué à retardement par le démon.
    - une mise à jour de l'`AvSecret` pour tenir compte des contraintes du nouveau `Secret`, voire sa suppression si Secret est supprimé **ou** que `lidf` et `mnom` sont vides.

**Les traitements (a) sont effectués quand le compte en a exprimé le souhait par action UI**. Ils sont immédiats pour les suppressions mais les chargements de nouveaux idf seront traitées par le démon avec retard.

**Les traitements (b) sont effectués** :
- en fin d'initialisation de la session en mode _synchronisé_ quand tous les `Secret` sont chargés : il détecte,
  - les mises à jour éventuelles de chaque `AvSecret` pour chaque objet `Secret` existant correspondant.
  - les suppressions des `AvSecret` (et donc des idf dans `fdata / fetat`) pour chaque `AvSecret` pour lequel il n'existe plus de `Secret` (existant) associé.
- **à la synchronisation pour chaque mise à jour / suppression** d'un `Secret` entraînant le cas échéant une mise à jour ou une suppression de l'`AvSecret` correspondant.

