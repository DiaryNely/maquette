# S2M-WEB — Fonctionnalités à implémenter

> Document de spécification de la version réelle (avec backend). La maquette statique actuelle
> (`pages/`, `assets/js/`) sert de référence visuelle et de parcours ; ce document décrit **ce qui
> doit être développé** pour en faire une application de production.

---

## 1. Vue d'ensemble

S2M-WEB est une application de gestion des **bons de sortie (BS)** pour une entreprise multi-magasins.

**Principe métier central :** le parcours d'un BS n'est jamais planifié à l'avance. Le bon circule
physiquement entre les magasins ; chaque magasin qui le reçoit **scanne le QR** à son arrivée, et ce
scan **crée le transit** (passage horodaté). Le parcours du bon se construit donc au fil des
passages réels, dans l'ordre chronologique des scans, sans itinéraire prédéfini.

**Cycle de vie d'un bon de sortie :** création (brouillon) → soumission → **workflow de validation**
(Responsable, Sécurité) → **transit** (scan + contrôle des quantités) → **réception** → **retours**
(articles à rendre) → clôture. Une **anomalie** détectée à tout contrôle bloque la progression du
bon jusqu'à sa résolution.

**Exigences transverses :**

- Persistance serveur de toutes les données (utilisateurs, personnel, magasins, BS, transits,
  réceptions, anomalies, notifications, moyens d'acheminement, configuration).
- Authentification fournie par l'application existante (hors périmètre) ; chaque utilisateur est
  rattaché à un magasin/entité et à une fonction.
- Contrôle d'accès par menu : l'utilisateur ne voit que les parties de l'application auxquelles il a
  été autorisé (configuré dans l'administration).
- Responsive (utilisation sur mobile/tablette au magasin, PC au bureau).
- Traçabilité de chaque événement (qui, quoi, quand, où) et horodatage systématique.
- **Affichage compact des tableaux** : chaque information tient sur une seule ligne ; un contenu trop
  long est tronqué avec « … » (texte normal, cliquable). Un clic déplie le contenu complet dans la
  ligne, un second clic le replie — sans bouton supplémentaire, et sans élargir/rétrécir la colonne.
  S'applique automatiquement à toutes les cellules textuelles des tableaux de données (les cellules
  contenant un lien, un badge, un champ ou un bouton sont exclues).
- **Recherche avec suggestions** : les champs de saisie « personnel » et « moyen d'acheminement »
  proposent des suggestions cliquables (navigation clavier ↑/↓ + Entrée), filtrées selon le contexte
  (magasin choisi), pour distinguer les homonymes (matricule, rôle, magasin affichés).

---

## 2. Authentification, rôles et navigation

### 2.1 Authentification (déjà existante — hors périmètre)

Le **login n'est pas à implémenter** : l'application dispose déjà de sa propre authentification
(existante dans l'application, ou intégrée à l'application hôte). S2M-WEB consomme la session
existante pour déterminer automatiquement :

- le **magasin / entité** de l'utilisateur (pour la liste envoyés/reçus, le scan et la réception),
- sa **fonction** (pour le contrôle d'accès par menu),
- son **matricule** (identifiant unique).

Le périmètre de S2M-WEB se limite à la **gestion des permissions** : qui voit quelle partie de
l'application (matrice des menus, § 10.1). La gestion des comptes (création, désactivation,
récupération de mot de passe) reste celle de l'application existante.

### 2.2 Simulation des rôles (maquette)

La maquette simule trois rôles, accessibles depuis la page « Simulation des rôles »
(`index.html?page=login`), chacun avec son portail (`pages/lambda/`, `pages/transit/`,
`pages/admin/`) et son menu restreint. Le rôle est porté par le préfixe d'URL
(`?page=lambda/…`, `?page=transit/…`, `?page=admin/…`) ; tous les liens internes suivent
automatiquement ce préfixe. Cette page de simulation n'est qu'un **outil de maquette** : en
production, la session provient de l'authentification existante (§ 2.1).

| Rôle | Identité simulée | Menu | Pages accessibles |
|---|---|---|---|
| **Personnel** (`lambda`) | Rakotobe Hery · Magasin central | Bons de sortie (Liste des BS, Création d'un BS) · Notifications | bs-list, bs-create, bs-detail, notifications, anomalie-detail |
| **Scan & Transit** (`transit`) | Rabemananjara Solo · Plateforme logistique | Transit (Scan & Gestion du transit) · Notifications | transit, bs-detail, anomalie-detail, notifications |
| **Administrateur** (`admin`) | Automat SI · Siège - Administration S2M | Bons de sortie · Suivi · Anomalies · Notifications · Rapports · Administration | toutes |

**Permissions simulées (page « Simulation des rôles ») :**

- **Personnel** : crée un BS ; voit ses BS envoyés et reçus avec tous les détails ; consulte ses
  notifications ; signale la réception des BS reçus.
- **Scan & Transit** : ne peut **pas** créer de BS ; n'a **pas** de liste des anomalies (il voit
  uniquement le détail des anomalies liées à un BS) ; scanne les BS, gère le transit, contrôle les
  quantités, signale la réception d'un BS arrivé, crée une anomalie, consulte ses notifications.
- **Administrateur** : tout consulter, gérer l'ensemble des fonctionnalités et les configurations
  (menus, distribution des notifications) ; il ne scanne pas : il assure le **suivi des bons de
  sortie** en lecture seule (pas de scan ni de contrôle) et ne participe pas à la concertation d'une
  anomalie.

---

## 3. Gestion des bons de sortie

### 3.1 Création d'un BS (`bs-create`)

Le formulaire de création est organisé en deux sections :

**1. Informations de l'opération**
- **Date de sortie souhaitée** (date).
- **Commentaire** (facultatif).
- **Moyen d'acheminement** : recherche avec suggestions parmi les moyens enregistrés (nom, contact,
  transport) ; bouton **« Ajouter »** ouvrant un panneau de création d'un nouveau moyen (nom complet,
  contact, moyen de transport), qui s'ajoute ensuite aux suggestions. Le moyen sélectionné est repris
  sur la fiche détail du BS.

**2. Articles et destinataires**
- Une **table d'articles** : chaque ligne porte son **type** (Article / Info / Immo / Fourniture /
  Autre), **code**, **désignation**, **quantité**, **état** (Neuf / Bon état / Usage / À réformer),
  sa **destination** (magasin, « Non précisée » possible) et son **bénéficiaire**.
- **Destination et bénéficiaire par ligne** : un seul BS peut couvrir plusieurs magasins et plusieurs
  bénéficiaires. Le champ bénéficiaire est une **recherche avec suggestions filtrées selon le
  magasin choisi sur la ligne** ; la valeur retenue est le simple nom de la personne (jamais une
  concaténation). Un **bandeau récapitule la répartition** (ex. « 3 articles répartis entre : 2 ×
  Magasin central, 1 × Entrepôt S2M. 2 bénéficiaires renseignés ») pour la validation.
- **À rendre** (case à cocher OUI) : si coché, saisie de la **date de retour prévue** sur la ligne.
- Ajout de lignes (« Ajouter un article » / bouton + de l'en-tête de table) et suppression par ligne ;
  le nombre minimal de lignes est 1.
- Bouton **« Valider »** (émission du bon).

**Génération automatique** : numéro de BS (ex. `BS-2026-XXXX`) et **QR code** associé, générés à la
création. Enregistrement (brouillon) puis émission (envoi) ; un BS émis ne peut plus être modifié
librement.

### 3.2 Liste des BS — « BS envoyés » / « BS à recevoir » (`bs-list`)

Deux sous-menus avec **compteur dynamique** par onglet :

- **« BS envoyés »** : tous les BS partis du magasin de l'utilisateur connecté.
- **« BS à recevoir »** : tous les BS dont la destination est le magasin connecté.

**Administrateur** : une **liste unique** de tous les BS (tous magasins, sans les onglets
« BS envoyés » / « BS à recevoir »), en lecture seule — aucun bouton de réception.

**Filtres sur chacun des deux sous-menus** : recherche (BS, initiateur/bénéficiaire, motif) ;
statut (Brouillon, Soumis, En cours, Validé, Refusé, Annulé, Clôturé, **Réceptionné**) ; retour
attendu (Tous / À rendre / Sans retour) ; période (date de début / de fin) ; bouton Réinitialiser ;
export Excel.

**Colonnes** : N° BS (lien), Date, Initiateur, Magasin initiateur, Bénéficiaire, Magasin
bénéficiaire, Retour attendu (badge « À rendre » / « Sans retour »), Motif, Statut (badge), Actions.

**Actions par ligne** : voir le détail ; si le bon est un **brouillon** : modifier + annuler ; sur
l'onglet « BS à recevoir » (hors admin) : **« Réceptionner »** (voir § 6), qui devient
« Réceptionné » (désactivé) une fois la réception signalée.

**États et pagination** : état vide explicite (« Aucun BS envoyé par … » / « Aucun BS à recevoir
pour … »), ligne « X résultat(s) / Y bons pour ce magasin », pagination (aller à la page,
précédent/suivant).

### 3.3 Fiche détail d'un BS (`bs-detail`)

- **En-tête** : numéro du BS (lien/texte), badge de statut, actions : Retour, **QR Code** (modale),
  Modifier, **Annuler le BS**.
- **Informations générales** : initiateur, bénéficiaire, magasin d'origine, magasin de destination,
  moyen d'acheminement, motif, date de sortie, date limite de retour (avec nombre d'articles à
  rendre).
- **Articles et suivi des retours** : table par ligne (type, code, désignation, unité, quantité,
  état, **destination**, **bénéficiaire**, à rendre, retour prévu, **suivi du retour**) + chips
  récapitulatifs (nombre de destinations, de bénéficiaires, d'articles à rendre). Les retours
  partiels ou complets sont enregistrés à la réception (quantité restituée, état constaté, date
  effective) ; un retour non effectué à la date prévue déclenche une alerte.
- **Workflow de validation** : 5 étapes visuelles — **Initiateur → Responsable → Sécurité → Transit →
  Réception** — chacune avec son acteur, les étapes validées marquées « done », l'étape courante
  marquée « current ».
- **Analyse du parcours** : durée écoulée, étapes validées, passages transit (conformes / à
  contrôler), retours à effectuer.
- **Chronologie du parcours** (dépliable) : création, soumission, validations (Responsable,
  Sécurité), passages transit (scan QR), réception — chaque événement avec acteur, date/heure et
  description.
- **Anomalies liées** : table (code, point de contrôle, motif, statut, action).
- **Carte « Réception de la marchandise »** : magasin de destination, bénéficiaire, articles
  attendus, bouton **« Signaler la réception »** (masqué pour l'admin) ; après signalement, badge
  « Réceptionné le … » et bandeau de confirmation (voir § 6).

---

## 4. QR code et scan

- **Génération du QR** : chaque BS émis possède un QR unique encodant sa référence (rendu
  déterministe par référence dans la maquette).
- **Scan réel** : lecture du QR via la caméra du téléphone/lecteur, avec **saisie manuelle de la
  référence** en secours.
- **Le scan crée le transit** : au scan d'un BS dans un magasin, un passage (transit) est créé
  automatiquement : numéro de transit (ex. `TR-2026-XXXX`), magasin de passage (celui de
  l'utilisateur qui scanne), agent ayant scanné, date/heure d'arrivée, statut initial
  **« À contrôler »**.
- Gestion des cas : BS déjà scanné dans ce magasin (double scan — le transit existant est renvoyé),
  BS inconnu, BS annulé.

---

## 5. Scan & gestion du transit

### 5.1 Page Scan & Transit (`transit`)

**Étape 1 — Scanner le BS** : cadre caméra (état « Recherche d'un QR code… »), sélection du
**magasin où se trouve l'agent**, **agent connecté** (recherche avec suggestions du personnel du
magasin), ou saisie manuelle de la référence du BS + bouton « Scanner ».

**Étape 2 — Détails du bon** : les informations et les articles du bon ne s'affichent **qu'après le
scan** (aucun détail pré-affiché). Après scan : initiateur, bénéficiaire, parcours
(initiateur → destinataire), étape workflow, nombre d'articles/pièces, dont à rendre ; table des
articles avec **quantité attendue** par ligne.

**Contrôle / validation du passage** :
- Pour chaque article, l'agent saisit la **quantité reçue** (champ non pré-rempli).
- **« Confirmer le passage »** : si toutes les quantités reçues correspondent aux quantités
  attendues → passage **« Conforme »** (clôturé) ; sinon → passage **« Non conforme »** avec la liste
  des écarts (code, attendu, reçu) et le BS reste **bloqué** jusqu'à résolution de l'anomalie.
- **« Déclarer une anomalie »** : ouvre la modale de déclaration (le BS concerné est déterminé par
  le contexte et affiché en lecture seule).
- **« Signaler la réception »** : l'agent de transit peut déclarer la réception du BS scanné
  (modale, voir § 6) ; « Réception déjà signalée » (désactivé) si déjà fait.

**Parcours construit du BS** : table des passages du bon (numérotés, magasin, agent, date/heure,
résultat), construite au fil des scans. **Historique des transits** (dépliable) : tous les passages
enregistrés (BS, magasin, agent, date/heure, conformité, anomalie), filtrable par recherche.

### 5.2 Suivi admin — « Transits par bon de sortie » (`admin/transit`)

Lecture seule : l'administrateur ne scanne pas et ne contrôle pas.

- Table **« Transits par bon de sortie »** : Bon de sortie, **Dernier passage** (magasin), **Trajet**
  (magasin initiateur → magasin destinataire), Conformité (badge), Anomalie (lien), action
  « Voir le parcours ».
- **Modale « Parcours construit »** : tous les passages du BS (Passage n°, Magasin, Agent, Date /
  heure, Résultat), avec compteur.
- Filtre de recherche par numéro de BS + bouton Réinitialiser.

---

## 6. Gestion de la réception

La réception se signale **là où le bon est déjà visible** (aucune page dédiée, pour éviter toute
redondance avec la liste des BS) :

- **Personnel (lambda)** : l'onglet **« BS à recevoir »** de la liste des BS porte, sur chaque bon
  reçu, une action **« Réceptionner »** (bouton de la ligne) ; une fois la réception signalée, le
  bouton devient « Réceptionné » (désactivé) et le statut du bon passe à **« Réceptionné »**.
- **Scan & Transit** : après le scan d'un BS, l'agent dispose du bouton **« Signaler la réception »**
  dans le panneau de contrôle (à côté de « Confirmer le passage » et « Déclarer une anomalie ») ;
  « Réception déjà signalée » si le bon est déjà réceptionné.
- **Fiche détail d'un BS** : carte « Réception de la marchandise » avec le bouton « Signaler la
  réception » (masqué pour l'admin, qui suit en lecture seule).
- **Administrateur** : lecture seule — aucun bouton de signalement (liste des BS unique, carte du
  détail sans action).
- **Signalement** : modale de confirmation détaillée (BS, magasin de destination, bénéficiaire,
  motif, retour attendu) avec la **liste des articles et la confirmation des quantités reçues
  article par article** (champs pré-remplis avec la quantité attendue, ajustables ; toutes les
  quantités doivent être renseignées avant validation, sinon message d'erreur dans la modale). Les
  quantités reçues sont enregistrées avec la réception.
- L'enregistrement est **horodaté et rattaché à l'identité du déclarant**, persisté (localStorage
  en maquette, base en production).
- **Propagation** : le BS passe au statut **« Réceptionné »** (badge + filtre de statut) ; la fiche
  détail marque l'étape **Réception** du workflow comme effectuée et ajoute l'événement à la
  **chronologie du parcours** ; une notification « Réception enregistrée » est distribuée (initiateur,
  bénéficiaire).
- La date de réception sert de **point de départ au suivi des retours** (articles à rendre).

---

## 7. Anomalies

### 7.1 Liste des anomalies (`anomalies`)

- **KPIs** : anomalies ouvertes, résolues (30 jours), en retard de résolution, durée moyenne de
  résolution.
- **Filtres** : recherche (anomalie, BS, motif), statut (Ouverte / Résolue / En retard / Clôturée),
  lieu ; export Excel.
- **Table** : Code (lien), BS lié (lien), Point (lieu de contrôle), Motif, Détection, Date limite,
  **Durée** (délai écoulé, ex. « J+2 » en rouge si dépassé), Statut (badge), action voir.
- Pagination.

### 7.2 Déclaration d'une anomalie (modale, pas de page dédiée)

Ouverte depuis la **liste des anomalies** (« Nouvelle anomalie ») ou depuis un **passage de
transit** (« Déclarer une anomalie ») :

- Le **bon de sortie concerné n'est pas choisi** : il est déterminé par le contexte (passage
  contrôlé) et affiché en lecture seule ; sans contexte, le champ reste vide.
- **Motif** en saisie libre avec suggestions (Quantité manquante, Colis endommagé, Étiquette
  illisible, Emballage ouvert / scellé brisé, Retard de livraison, Identité non vérifiable, Autre),
  **description détaillée**, **magasin / lieu du contrôle** et **date limite de résolution**.
- Pièces jointes (photo) à prévoir côté backend.
- Pas d'options de notification ni de suivi dans le formulaire : la distribution des notifications
  est gérée par la configuration administrateur (§ 10.2).
- Confirmation dans la modale : code de l'anomalie (ex. `ANO-2026-020`), rappel que la progression
  du BS est **bloquée** jusqu'à résolution, lien « Voir l'anomalie ».

### 7.3 Fiche détail d'une anomalie (`anomalie-detail`)

- **Informations** : BS concerné (lien), magasin / lieu du contrôle, créateur, date de détection,
  motif, description, date limite de résolution, résolution (date + durée).
- **Historique complet** (dépliable) : création, action système (transmission aux responsables),
  résolution, clôture — acteur, date/heure, description, badge de statut.
- **Délai de résolution** : durée effective (barre de progression), délai imparti, alerte de retard
  déclenchée par le système si dépassement, impact sur le BS (progression bloquée).
- **Concertation des responsables** (chatbox) : participants **Transit / Sécurité / Magasin** avec
  pastilles de statut, fil de discussion (messages horodatés et signés), saisie de message, et
  boutons **« Déclarer résolue » / « Abandonner »** — la décision finale ne s'active qu'à
  **l'unanimité** des entités (vote de chaque entité), puis le badge de l'anomalie est mis à jour.
- **Administrateur** : la chatbox est **masquée** (le rôle admin suit l'anomalie — informations,
  historique, délai — sans participer à la concertation).

---

## 8. Notifications (`notifications`)

- **Compteur de non lues** dans l'en-tête, bouton **« Tout marquer comme lu »**.
- **Filtres** : Toutes / Non lues / Anomalies / Retards / Résolutions (chips cliquables).
- **Fil d'actualités** en ordre chronologique inverse : chaque notification porte une **icône de
  catégorie**, un titre, une description, les **destinataires** et un délai relatif.
- **Catégories** (types d'événements notifiés) : anomalie déclarée, retard (anomalie / retour),
  validation en attente / effectuée, anomalie résolue, **réception enregistrée**, BS clôturé.
- **Interaction** : clic sur une notification → marquée comme lue (le compteur se met à jour) puis
  **lien vers l'objet concerné** (BS, anomalie) dans le portail du rôle connecté.
- **Distribution configurable** : à qui envoyer chaque type d'événement (voir § 10.2). Pas de canal
  configurable par notification : diffusion dans l'application (centre de notifications) et par
  e-mail.

---

## 9. Rapports & statistiques (`rapports`)

- **Période** hebdomadaire / mensuel (bascule), **export Excel** du rapport et de la liste des
  anomalies.
- **KPIs** : BS envoyés, BS reçus, anomalies sur la période (résolues / non résolues / durée moyenne
  de résolution), BS à rendre.
- **Bons de sortie par statut** (barres horizontales) : clôturés, validés, en cours, soumis,
  brouillons, refusés, annulés.
- **Statistiques d'anomalies** : donut résolues / non résolues, durée moyenne de résolution, motif
  le plus fréquent, lieu le plus touché.
- **Suivi du matériel à rendre** : retours effectués, en attente (dans les délais), en retard — les
  retours partiels comptent comme effectués dès leur enregistrement à la réception ; lien « Voir les
  BS ».
- **Liste des anomalies** (résolues / non résolues) : Code, BS, Motif, Point, Ouverture, Résolution,
  Statut — exportable.
- **Rapports périodiques** envoyés automatiquement aux destinataires configurés.

---

## 10. Administration — deux configurations uniquement (`admin`)

### 10.1 Gestion des menus

- Définition de **qui voit quelle partie de l'application**, selon la **fonction** (vue « Par
  fonction ») ou selon le **matricule / la personne** (vue « Par matricule »).
- **Sections** (colonnes de la matrice) : Bons de sortie, Création d'un BS, QR Code & scan, Transit,
  Anomalies, Notifications, Rapports, Administration, Traçabilité.
- **Filtres** (vue « Par matricule ») : fonction, personne, entité / magasin, recherche par
  personne ; sélection « tout » par colonne ; **compteur de modifications non enregistrées** ;
  boutons **Enregistrer** et **Rétablir les défauts** ; export Excel.
- Enregistré en base : la configuration s'applique immédiatement aux sessions actives (à la
  prochaine navigation).

### 10.2 Distribution des notifications

- **Matrice types d'événement × rôles destinataires** :
  - Types : Anomalie déclarée, Anomalie résolue, Envoi d'un BS, Réception d'un BS, Passage en
    transit enregistré, Retard (anomalie / retour), Rapport périodique.
  - Rôles : Initiateur, Responsable, Sécurité, Transit, Réception, Destinataire, Administrateur.
- Activation / désactivation **par type** (interrupteur « Activé »), sélection « tout » par colonne,
  compteur de modifications non enregistrées, Enregistrer, Rétablir les défauts.
- Pas de canal configurable par notification ; les envois réels respectent cette configuration.

---

## 11. Données à persister (schéma fonctionnel)

- **Utilisateurs** : matricule, nom, fonction, magasin/entité, compte (actif/inactif).
- **Entités / magasins** : code, nom, type.
- **Personnel** : nom, matricule, magasin/entité, rôle (catalogue des bénéficiaires et des agents).
- **Moyens d'acheminement** : nom (transporteur/société), contact, moyen de transport.
- **Bons de sortie** : numéro, initiateur, dates (création, sortie souhaitée, limite de retour),
  statut (brouillon, soumis, en cours, validé, refusé, annulé, clôturé, réceptionné), retour attendu,
  moyen d'acheminement, motif, commentaire, lignes (type, code, désignation, quantité, état,
  **destination, bénéficiaire et date de retour prévue par article**), QR.
- **Transits / passages** : numéro, BS, magasin, agent, date/heure d'arrivée, statut (à contrôler /
  conforme / non conforme), note, anomalie liée.
- **Réceptions** : BS, date/heure, déclarant (matricule), magasin de réception, lignes (code,
  quantité attendue, quantité reçue).
- **Anomalies** : référence, BS/transit lié, point de contrôle, motif, description, date limite,
  statut (ouverte / résolue / en retard / clôturée / abandonnée), historique (actions, résolution,
  clôture), concertation (échanges et votes des entités).
- **Notifications** : destinataire, type, contenu, statut (non-lue/lue), objet lié.
- **Configuration** : droits par fonction et par personne (matrice menus), distribution des
  notifications (types × rôles, activation par type).

---

## 12. Modules de la maquette (implémentation actuelle)

La maquette implémente déjà, côté client, une partie du comportement attendu — à reproduire côté
backend :

- **`assets/js/app.js`** — routage des pages par paramètre d'URL, portails par rôle (préfixe),
  préfixage automatique des liens internes, garde d'accès par rôle, en-tête utilisateur simulé.
- **`assets/js/demande.js`** — création de BS : lignes d'articles (ajout/suppression), case
  « À rendre » + date de retour, recherche de personnel avec suggestions, recherche et ajout de
  moyens d'acheminement, répartition multi-destination (bandeau récapitulatif).
- **`assets/js/bs-list.js`** — liste des BS : deux onglets envoyés / à recevoir, filtres (recherche,
  statut, retour), compteurs, badges, actions par ligne, liste unique admin (tous les BS), statut « Réceptionné ».
- **`assets/js/transit.js`** — scan : création du transit (persistance `s2m.transits.v1`), contrôle
  des quantités, conformité / non-conformité, table des passages, parcours d'un BS, vue admin
  (dernier passage, trajet, conformité, anomalie), déclaration d'anomalie.
- **`assets/js/reception.js`** — signalement de réception (liste « à recevoir », scan, fiche
  détail) : modale avec confirmation des quantités reçues, persistance `s2m.receptions.v1`,
  propagation du statut « Réceptionné » et mise à jour du workflow / chronologie du détail.
- **`assets/js/admin.js`** — matrice de gestion des menus (par fonction / par matricule) et matrice
  de distribution des notifications, compteurs de modifications, enregistrement / rétablissement.
- **`assets/js/mockup.js`** — interactions transverses : menu hamburger (accordéon, lien actif),
  onglets, modales, notifications (filtres, marquer comme lu), concertation d'anomalie (chatbox et
  vote unanime), **troncature « … » cliquable des tableaux**, masquage de la concertation pour le
  rôle admin.
- **`assets/js/qr-fake.js`** — génération d'un QR déterministe par référence (remplacé par un vrai
  générateur en production).
