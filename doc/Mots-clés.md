# Mots clés, principes et gestion

Les mots clés sont utilisés pour :
- filtrer à l'affichage les contacts d'un compte.
- filtrer à l'affichage les groupes accédés par un compte.
- filtrer à l'affichage les secrets, personnels, partagés avec un contact ou d'un groupe.

### Annotations
Une annotation est le couple d'un texte court à destination du seul compte et d'une liste de mots clés.

On trouve une annotation :
- sur un contact d'un avatar du compte.
- sur le membre représentant un des avatars du compte dans un groupe.
- directement sur un secret :
  - personnel : l'annotation n'a pas de texte (le mettre directement dans le secret). Les mots clés sont ceux du compte.
  - de couple : le secret étant dédoublé, l'annotation a un texte qui ne concerne qu'un des deux membres du couples, Les mots clés sont ceux du compte.
  - de groupe : l'annotation n'a pas de texte (le mettre directement dans le secret). Les mots clés sont ceux du groupe, attribués par un animateur.
- comme annotation personnelle d'un avatar attachée à un secret de groupe: l'annotation, texte comme mots clés, est propre au compte.

### Mots clés
Un mot clé a un index et un nom :
- l'index identifie le mot clé et qui l'a défini :
  - un index de 1 à 99 est un mot clé personnel d'un compte.
  - un index de 100 à 199 est un mot clé défini pour un groupe.
  - un idex de 200 à 255 est un mot clé défini par l'organisation et enregistré dans sa configuration (donc peu modifiable).
- le nom est un texte unique dans l'ensemble des mots clés du définissant : deux mots clés d'un compte, d'un groupe ou de l'organisation ne peuvent pas avoir un même nom. Le nom est court et peut contenir des caractères émojis.

#### Catégories de mots clés
Afin de faciliter leur attribution, un mot clé a une catégorie qui permet des regrouper par finalité :
- la catégorie est un mot court : par exemple _statut_, _thème_, _projet_, _section_
- la catégorie ne fait pas partie du nom : elle est donnée à la définition / mise à jour du mot clé mais est externe.
- il n'y a pas de catégories prédéfinies.
- la catégorie ne sert qu'à l'affichage pour filter les mots clés selon leur usage / signification.

#### Liste de mots clés
C'est simplement la liste de leurs index : il est ainsi possible de corriger le nom d'un mot clé et toutes ses références s'afficheront avec le nouveau nom rectifié.

Les mots clés d'index 1 à 99 sont toujours ceux du compte qui les regardent. Ceux d'index de 200 à 255 sont toujours ceux de l'organisation.

En revanche les mots clés de 100 à 199 ne peuvent attachés qu'à un secret de groupe : sa signification est interprétée vis à vis du groupe détenteur du secret:
- il peut être cité dans le secret lui-même par un animateur du groupe.
- il peut aussi être cité dans l'annotation personnelle d'un compte attachée à un secret de groupe : le compte pouvant dans ce cas citer tous les mots clés, du compte, du groupe du secret et de l'organisation (et pas seulement les siens).

#### Mots clés obsolètes
Supprimer le nom d'un secret devenu obsolète est délicat : les secrets, contacts et groupes qui le contiennent ne le verront plus.

Réattribuer l'index, lui donner une signification totalement différente, est délicat toujours vis à vis des secrets, contacts et groupes qui le référencent.

Un mot clé obsolète est marqué par convention avec un ? comme première lettre :
- son attribution nouvelle est interdite.
- pendant un temps le plus long possible réattribuer son index est déconseillé, du moins tant qu'il reste des secrets / contacts / groupes auxquels il est attaché.

### Opération d'annotation
L'opération d'annotation attache une liste de mots clés et un texte éventuel d'annotation à un secret, un contact ou un groupe (sur le membre du groupe représentant un des avatars du compte).

Mais cette opération peut _éventuellement_ et conjointement porter une mise à jour des listes de mots clés,
- du compte,
- du groupe si le compte a un de ses avatars animateurs du groupe.

En effet il va arriver que souhaitant attacher un mot clé à un secret par exemple, l'utilisateur s'aperçoive qu'il n'est pas défini et le fasse sur l'instant en déclarant un nouveau mot clé ou en corrigeant la formulation d'un autre.

L'opération d'annotation peut aussi le cas échéant ne procéder qu'à la mise à jour des mots clés (du compte et / ou d'un groupe) sans enregistrer d'annotation.

### Implémentation UI
(à suivre)
