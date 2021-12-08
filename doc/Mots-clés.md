# Mots clés, principes et gestion

Les mots clés sont utilisés pour :
- filtrer / caractériser à l'affichage les **contacts** d'un compte.
- filtrer / caractériser à l'affichage les **groupes** accédés par un compte.
- filtrer / caractériser à l'affichage les **secrets**, personnels, partagés avec un contact ou d'un groupe.

### Annotations
Une annotation est le couple,
- d'un **texte** court à destination du seul compte, 
- d'une **liste de mots clés**.

On trouve une annotation :
- sur un **contact** d'un avatar du compte.
- sur **l'invitation** à un groupe d'un des avatars du compte.
- directement sur un **secret** :
  - _personnel_ : l'annotation n'a pas de texte (le mettre directement dans le secret). Les mots clés sont ceux du compte.
  - _de couple_ : le secret étant dédoublé, l'annotation a un texte accessible au compte, Les mots clés sont ceux du compte.
  - _de groupe_ : l'annotation n'a pas de texte (le mettre directement dans le secret). Les mots clés sont ceux du groupe, attribués par un animateur.
- comme **annotation personnelle attachée à un secret de groupe**: l'annotation, texte comme mots clés, est propre au compte.

### Mots clés
Un mot clé a un **index** et un **nom** :
- **l'index** identifie le mot clé et qui l'a défini :
  - un index de 1 à 99 est un mot clé personnel d'un compte.
  - un index de 100 à 199 est un mot clé défini pour un groupe.
  - un index de 200 à 255 est un mot clé défini par l'organisation et enregistré dans sa configuration (donc peu modifiable).
- **le nom** est un texte unique dans l'ensemble des mots clés du définissant : deux mots clés d'un compte, d'un groupe ou de l'organisation ne peuvent pas avoir un même nom. 
  - le nom est court et peut contenir des caractères émojis en particulier comme premier caractère.
  - l'affichage réduit ne montre que le premier caractère si c'est un émoji, sinon les deux premiers.

#### Catégories de mots clés
Afin de faciliter leur attribution, un mot clé a une _catégorie_ qui permet de les regrouper par finalité :
- la catégorie est un mot court commençant par une majuscule : par exemple _Statut_, _Thème_, _Projet_, _Section_
- la catégorie ne fait pas partie du nom : elle est donnée à la définition / mise à jour du mot clé mais est externe.
- il n'y a pas de catégories prédéfinies.
- la catégorie ne sert qu'à l'affichage pour filtrer les mots clés selon leur usage / signification.

#### Liste de mots clés
C'est la liste de leurs index, pas de leurs noms : il est ainsi possible de corriger le nom d'un mot clé et toutes ses références s'afficheront avec le nouveau nom rectifié.

Les mots clés d'index 1 à 99 sont toujours ceux du compte qui les regardent. Ceux d'index de 200 à 255 sont toujours ceux de l'organisation.

Les mots clés de 100 à 199 ne peuvent être attachés qu'à un secret de groupe, leur signification est interprétée vis à vis du groupe détenteur du secret:
- il peut être cité dans _le secret lui-même_ par un animateur du groupe.
- il peut aussi être cité dans _l'annotation personnelle d'un compte à un secret de groupe_ : le compte peut dans cette liste citer tous les mots clés, de son compte, du groupe du secret et de l'organisation.

>Remarque : deux mots clé d'un compte et d'un groupe peuvent porter le même nom (voire d'ailleurs un mot clé de l'organisation). L'origine du mot clé est distinguée à l'affichage en cas de doublon de nom par un suffixe `-g` pour un groupe et `-o` pour l'organisation)

#### Mots clés _obsolètes_
Un mot clé _obsolète_ est un mot clé sans catégorie :
- son attribution est interdite : quand une liste de mots clés est éditée, les mots clés obsolètes sont effacés.
- la suppression définitive d'un mot clé ne s'opère que sur un mot clé obsolète. Une recherche permettra de lister où il apparaît avant de décider.

