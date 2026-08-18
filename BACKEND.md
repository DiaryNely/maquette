# S2M-WEB — Module « Bons de sortie / Transit » : spécification technique backend

> Ce document décrit **ce qui doit être implémenté côté serveur** pour faire de la maquette statique
> (`pages/`, `assets/js/`) une application de production. La maquette ne couvre que l'aspect visuel et
> une partie du comportement client (persistance en `localStorage`, données de démo codées en dur).
> Pour chaque fonctionnalité, sont précisés : **logique métier**, **données à gérer**, **traitements**,
> **validations**, **statuts** et **interactions** (événements, notifications, propagation).
>
> **Contexte — application mère et module :** S2M-WEB est **l'application mère** (gestion de l'entreprise :
> magasins, personnel, comptes, authentification). Le périmètre décrit ici est un **nouveau module**
> (gestion des bons de sortie, transit, réception, anomalies) développé comme **une application distincte**,
> qui sera **intégrée ensuite dans S2M-WEB**. Le module est donc conçu pour fonctionner d'abord en
> autonomie (avec une session et des référentiels simulés), puis pour se brancher sur S2M-WEB lors de
> l'intégration (session, référentiels, navigation, permissions). Les points d'intégration sont signalés
> [INTÉGRATION] dans le document.
>
> Le document de référence fonctionnel est `FONCTIONNALITES.md` ; le présent document en est la
> déclinaison technique. Les numéros de sections (§) renvoient à `FONCTIONNALITES.md`.

---

## 1. Fondations transverses

### 1.1 Authentification et session

- **Source de vérité [INTÉGRATION]** : l'authentification est fournie par **S2M-WEB, l'application mère**
  (§ 2.1 de FONCTIONNALITES.md). Le module est une application séparée : **il ne gère pas de login** et
  ne possède pas sa propre base de comptes.
  - **Phase autonome (avant intégration)** : le module fonctionne avec une **session simulée** (un
    utilisateur/magasin/rôle configuré côté serveur pour la recette), sur les mêmes principes que les
    rôles simulés de la maquette (`?page=lambda|transit|admin`).
  - **Phase intégrée** : le module consomme la session de S2M-WEB (SSO / session partagée / en-têtes
    d'authentification relayés par un proxy, selon la technique d'intégration retenue) ; chaque requête
    est résolue à partir de cette session, jamais à partir de paramètres clients.
- **Contrat de session** : à chaque requête, le backend du module résout l'utilisateur connecté et
  fournit au client :
  - `matricule` (identifiant unique),
  - `nom` complet,
  - `fonction` / `role` (Personnel, Transit, Administrateur, Réception…),
  - `magasin` / entité de rattachement,
  - la **liste des sections autorisées** (issue de la matrice des menus, § 10.1).
- **Implémentation** : middleware d'authentification (session partagée / SSO avec S2M-WEB, ou cookie/JWT selon la technique d'intégration retenue) + résolution du contexte utilisateur dans chaque contrôleur. Aucun identifiant utilisateur ne doit être accepté du client (ni dans l'URL, ni dans le corps). En phase autonome, une session simulée configurée côté serveur.

### 1.2 Contrôle d'accès

- **Matrice des menus** : table `menu_permissions` (fonction × section, ou matricule × section) gérée côté administration (§ 10). Chaque section correspond à un module : `bs`, `bs-create`, `qr-scan`, `transit`, `anomalies`, `notifications`, `rapports`, `administration`, `tracabilite`.
- **Garde d'accès** : la maquette simule cette garde en client (`ROLE_PAGES` dans `assets/js/app.js`) ; en production elle est **appliquée côté serveur** :
  - le middleware vérifie que l'utilisateur a droit à la ressource demandée (page, endpoint, action) ;
  - les endpoints de lecture et d'écriture renvoient `403` sinon ;
  - les données sont filtrées par magasin (un Personnel ne voit que les BS de son magasin, un Transit que ses scans, l'admin voit tout en lecture seule).
- **Règles par rôle** (reprendre strictement la maquette) :
  - *Personnel* : crée/modifie/annule ses BS, consulte envoyés/reçus, signale la réception des BS reçus.
  - *Scan & Transit* : ne crée **pas** de BS ; scanne, contrôle les quantités, confirme passage et réception, déclare des anomalies, consulte les détails liés et ses notifications.
  - *Administrateur* : lecture seule sur tout (pas de scan, pas de contrôle, pas de participation à la concertation) ; gère les configurations (menus, distribution des notifications).

### 1.3 Traçabilité et horodatage

- **Règle** : tout événement métier est horodaté **côté serveur** (jamais l'horloge client) et rattaché au matricule de l'utilisateur connecté.
- **Journal d'audit** : table `audit_log` append-only (id, horodatage, matricule, entité cible [bs, transit, reception, anomalie…], référence, action, données modifiées, IP). Chaque événement de la chronologie des BS (création, soumission, validations, scans, réception) et des anomalies (création, transmission, résolution, clôture) est écrit dans ce journal, ce qui alimente les timelines affichées en maquette (`data-bs-timeline`, historique des anomalies).

### 1.4 Notifications (moteur)

- **Génération** : un service de notifications est déclenché **par événement métier** (voir § 8) — jamais directement par le client.
- **Distribution configurable** : la table `notification_rules` (type d'événement × rôle destinataire, activé/désactivé, § 10.2) détermine les destinataires ; l'initiateur/bénéficiaire du BS sont toujours candidats selon la règle.
- **Livraison** : insertion en base (centre de notifications) + envoi e-mail selon la configuration. Un compteur de non-lues est maintenu par destinataire.

### 1.5 API générale

- **Style** : REST, JSON, versionné (`/api/v1/...`).
- **Conventions communes** :
  - pagination (`page`, `limit`) et tri explicites sur toutes les listes ;
  - filtres (recherche, statut, période, retour) implémentés côté SQL, jamais en mémoire ;
  - erreurs structurées `{ code, message, details[] }` avec statuts HTTP cohérents (400 validation, 401 non authentifié, 403 non autorisé, 404 introuvable, 409 conflit de statut, 422 règle métier) ;
  - **idempotence** : les actions déclenchées par scan (création de transit) et par clic double (confirmation) doivent être idempotentes ou protégées par verrou/transaction.
- **Exports** : génération serveur de fichiers Excel (xlsx) pour les listes BS, anomalies, rapports et matrices d'administration.

---

## 2. Référentiels (données de base)

| Entité | Champs | Remarques |
|---|---|---|
| `stores` (magasins/entités) | code, nom, type (Magasin, Entrepôt, Siège, Poste de contrôle, Plateforme logistique, Barrière…) | catalogue figé des lieux utilisés dans le scan, les parcours et la réception |
| `personnel` | nom, matricule (unique), magasin/entité, rôle (Magasinier, Responsable magasin, Transit, Sécurité, Réception, Comptable…) | référentiel des bénéficiaires et des agents ; source des recherches avec suggestions (homonymes possibles : le matricule est la clé) |
| `transporters` (moyens d'acheminement) | nom, contact, moyen de transport, créé par, date | création depuis le formulaire BS (« Ajouter ») et administration |
| `users` | matricule (clé), nom, fonction, magasin, compte actif/inactif, sections autorisées | compte géré par S2M-WEB (app mère) ; le module gère uniquement les permissions (éventuellement en lecture seule depuis S2M-WEB) |

**Validations** : unicité du matricule ; unicité du nom de magasin ; champ contact requis pour un moyen d'acheminement ; un personnel appartient à un seul magasin.

**Interactions** : ces référentiels alimentent les recherches avec suggestions (personnel filtré par magasin, § 3.1) ; l'admin peut les consulter/gérer (lecture seule sur les utilisateurs hors périmètre).

---

## 3. Bons de sortie (BS)

### 3.1 Création (`bs-create`)

**Logique métier** — un BS est un ensemble de lignes d'articles, chaque ligne étant autonome (type, code, désignation, quantité, état, **destination**, **bénéficiaire**, **à rendre**, **date de retour prévue**). Il n'y a pas de destination principale.

**Données** : `bs` (en-tête) + `bs_lines` (lignes).

**Traitements** :
1. Génération du numéro `BS-AAAA-NNNN` (séquence annuelle, transactionnel, contrainte d'unicité).
2. Génération du **QR code** encodant la référence du BS (§ 4.1).
3. État initial : `brouillon`. Le bon n'est émis que lors de la soumission (« Valider ») → `soumis`.

**Validations** (côté serveur, à l'émission comme à l'enregistrement) :
- au moins **1 ligne** ;
- chaque ligne : code non vide, désignation non vide, quantité entière ≥ 1, état ∈ {Neuf, Bon état, Usage, À réformer} ;
- si « à rendre » coché ⇒ **date de retour prévue requise** et postérieure à la date de sortie ;
- le bénéficiaire doit exister dans le référentiel personnel et appartenir au **magasin de destination de la ligne** (la sélection client est une suggestion ; le serveur résout le matricule) ;
- moyen d'acheminement requis (nom + contact) ;
- un BS **émis ne peut plus être modifié** librement (seuls les brouillons sont modifiables/annulables).

**Interactions** : à l'émission → notification « Envoi d'un BS » (selon configuration) ; l'en-tête et les lignes alimentent la fiche détail (§ 3.5) et le contrôle de transit (§ 5).

### 3.2 Cycle de vie et statuts

| Statut | Signification | Transitions autorisées |
|---|---|---|
| `brouillon` | en cours de saisie | → soumis, annulé |
| `soumis` | en attente de validation | → en cours (validation Responsable), refusé |
| `en_cours` | validation enchaînée (Responsable → Sécurité) | → validé, refusé, annulé |
| `valide` | workflow de validation terminé, en transit | → en_cours (pas de retour arrière), réceptionné (après passage transit) |
| `refuse` | refusé à une étape de validation | terminal |
| `annule` | annulé (brouillon ou en cours) | terminal (le scan d'un BS annulé est refusé) |
| `receptionne` | réception signalée (voir § 6) | → cloture |
| `cloture` | retours soldés, fin de vie | terminal |

**Règles métier** :
- une **anomalie non résolue bloque la progression** : aucun passage de statut (validation, réception, clôture) n'est accepté tant qu'une anomalie liée au BS n'est pas résolue/clôturée (§ 7.5) ;
- le passage `transit` (contrôle du bon) est une condition préalable à la réception : en production, la réception d'un BS n'est possible que si le BS est passé par le transit (au minimum un passage conforme), ou selon la règle métier retenue ;
- l'horodatage et le matricule de chaque transition sont enregistrés (audit + chronologie).

### 3.3 Workflow de validation

- **Étapes** : Initiateur → **Responsable** → **Sécurité** → **Transit** → **Réception** (rendu visuel `data-workflow-step`).
- **Backend** : table `bs_workflow` (bs, étape, statut [en_attente, valide, refuse], acteur, date). Le passage à l'étape suivante est un **événement transactionnel** qui vérifie que l'étape précédente est validée et que l'utilisateur a le rôle requis.
- **Interactions** : chaque validation déclenche une notification « Validation en attente / effectuée » vers l'acteur suivant ; l'étape courante est renvoyée au client pour le rendu.

### 3.4 Liste / recherche / filtres (`bs-list`)

**Traitements** :
- deux vues par magasin connecté : **« BS envoyés »** (origine = magasin) et **« BS à recevoir »** (destination = magasin), avec compteur dynamique par onglet ; **l'admin** a une liste unique tous magasins, sans onglets ni actions de réception ;
- filtres combinables : recherche texte (BS, initiateur/bénéficiaire, motif), statut (dont `receptionne`), retour attendu (tous / à rendre / sans retour), période (date début/fin), réinitialisation ;
- pagination serveur, tri, et **export Excel** ;
- colonnes : N° BS (lien), date, initiateur, magasin initiateur, bénéficiaire, magasin bénéficiaire, retour attendu, motif, statut (badge), actions.

**Données** : `bs` + agrégats (nombre de lignes, retours attendus).

**Validations** : l'utilisateur ne voit que les BS de son magasin (sauf admin) ; les filtres sont appliqués côté SQL.

### 3.5 Fiche détail (`bs-detail`)

**Données renvoyées** : en-tête (numéro, badge statut, actions selon statut : retour, QR, modifier, annuler), informations générales (initiateur, bénéficiaire, magasins, acheminement, motif, dates, articles à rendre), lignes d'articles avec destination/bénéficiaire/à rendre/retour prévu/**suivi du retour**, workflow, analyse du parcours (durée, étapes, passages), chronologie (audit), anomalies liées, carte « Réception de la marchandise ».

**Traitements** :
- calcul du **suivi des retours** par ligne (quantité restituée, état constaté, date effective — issus de la réception) ;
- alerte de retard : si un retour prévu est dépassé sans restitution complète, l'événement est créé et notifié (catégorie « Retard (retour) ») ;
- la carte réception est en lecture seule pour l'admin (aucun bouton) ;
- la modale QR affiche le QR généré au § 4.1.

---

## 4. QR code et scan

### 4.1 Génération du QR

- **Payload** : la référence du BS (`BS-AAAA-NNNN`) ; en production, prévoir un payload signé/vérifiable (ex. référence + signature HMAC) pour empêcher la forge, avec le minimum de données pour rester lisible.
- **Bibliothèque** : générateur serveur (ex. `qrcode`) au moment de l'émission ; le QR est stocké (image ou payload + rendu à la volée) et servi dans la fiche détail et la modale.
- La maquette (`qr-fake.js`) produit un rendu déterministe côté client : à remplacer par le QR réel servi par le backend.

### 4.2 Scan

**Endpoint** : `POST /api/v1/scans` avec la valeur lue (caméra ou saisie manuelle) + le magasin de l'utilisateur.

**Traitements / validations** :
1. décoder la référence (et vérifier la signature) ;
2. charger le BS : s'il n'existe pas → `404` avec message « BS inconnu » ; s'il est `annule` → refus (`422`) ;
3. **créer le transit** pour (BS, magasin, agent) si inexistant (§ 5.1) ; si le BS a déjà été scanné à ce magasin (**double scan**), renvoyer le transit existant (idempotence, aucun doublon) ;
4. renvoyer au client : le transit créé/existant + le détail complet du BS (articles, quantités attendues, à rendre, à recevoir) pour le contrôle.

**Interactions** : chaque scan écrit un passage dans `transits` et un événement d'audit ; la première création déclenche la notification « Passage en transit enregistré » (selon configuration).

---

## 5. Transit — Scan & Gestion (`transit`)

### 5.1 Passage et contrôle des quantités

**Données** : `transits` (id `TR-AAAA-NNNN`, bs, magasin, agent [matricule], arrivee [serveur], resultat, note, anomalie).

**Statuts d'un passage** :

| Statut | Signification |
|---|---|
| `a_controle` | créé au scan, contrôle en cours |
| `conforme` | toutes les quantités reçues = quantités attendues (passage clôturé) |
| `non_conforme` | écart de quantité constaté (le BS est bloqué jusqu'à résolution de l'anomalie) |

**Traitement « Confirmer le passage »** — deux validations **distinctes et nécessaires** (§ 5.2) :
- pour chaque ligne, comparer la **quantité reçue** saisie à la **quantité attendue** ;
- si toutes correspondent → `conforme` ; sinon → `non_conforme` avec la **liste des écarts** (code, attendu, reçu) renvoyée au client et l'obligation de déclarer une anomalie pour poursuivre ;
- la saisie des quantités est faite **une seule fois** par l'agent (table du détail) ; elle alimente à la fois le contrôle de passage et l'enregistrement de réception.

**Validations** : quantité reçue numérique ≥ 0 par ligne ; toutes les lignes renseignées avant confirmation ; un passage déjà validé ne peut pas être re-validé (idempotence).

### 5.2 Réception article par article

**Règles** (reprendre la maquette) :
- la table du détail du transit indique par ligne si l'article **doit être réceptionné** (« À recevoir ») ;
- pour chaque article : l'agent renseigne la **quantité réellement reçue** puis **confirme sa réception** (case « Reçu ») ;
- « **Confirmer la réception** » : enregistre la réception avec les quantités réellement reçues **par ligne** (code, attendu, reçu) ;
- **validations** : une ligne « À recevoir » non confirmée, ou une quantité invalide, bloque la validation (message explicite) ; la réception est horodatée et rattachée au matricule de l'agent ; le bouton passe à « Réception déjà signalée » une fois fait.

**Interactions** : l'enregistrement alimente `receptions` (§ 6) et la propagation du statut « Réceptionné ».

### 5.3 Déclaration d'anomalie depuis le transit

- Le BS concerné est **déterminé par le contexte** (passage contrôlé) et affiché en lecture seule ; le magasin/lieu de contrôle est celui du scan.
- Ouverture de la modale de déclaration (§ 7.1) sans réinitialiser le contrôle en cours.

### 5.4 Suivi administrateur (`admin/transit`)

- **Table « Transits par bon de sortie »** : BS, dernier passage (magasin), trajet (initiateur → destinataire), conformité (badge), anomalie (lien), action « Voir le parcours ».
- **Modale « Parcours construit »** : tous les passages du BS classés chronologiquement (n°, magasin, agent, date/heure, résultat), avec compteur.
- **Filtres** : recherche par numéro de BS + réinitialisation.
- **Traitements** : agrégation par BS (dernier passage = plus récent), reconstruction du trajet à partir du référentiel (magasin initiateur → magasin destinataire) — lecture seule, aucun contrôle possible pour l'admin.

---

## 6. Réception

### 6.1 Enregistrement

**Données** : `receptions` (bs, date/heure [serveur], déclarant [matricule], magasin de réception, lignes `[{code, attendu, recu}]`).

**Points d'entrée** (le bon est déjà visible — aucune page dédiée) :
- liste des BS, onglet « BS à recevoir » (Personnel) : bouton « Réceptionner » ;
- page Scan & Transit : bouton « Confirmer la réception » (article par article, § 5.2) ;
- fiche détail : carte « Réception de la marchandise » ;
- admin : aucune action (lecture seule).

**Validations** : le BS doit être destiné au magasin du déclarant (hors cas transit) ; toutes les quantités reçues renseignées ; unicité de la réception par BS (une seule réception, rejet en cas de doublon).

### 6.2 Propagation

Après enregistrement, en **une transaction** :
1. statut du BS → `receptionne` ;
2. étape **Réception** du workflow marquée effectuée + événement ajouté à la chronologie ;
3. notification « Réception enregistrée » vers initiateur et bénéficiaire (selon configuration) ;
4. les **retours** des articles « à rendre » sont initialisés : le suivi des retours démarre à la date de réception ; les quantités restituées enregistrées à la réception (retours partiels ou complets) alimentent le suivi par ligne (§ 3.5).

---

## 7. Anomalies

### 7.1 Déclaration (modale, pas de page dédiée)

**Données** : `anomalies` (référence `ANO-AAAA-NNNN`, bs/transit lié, point de contrôle [magasin/lieu], motif, description, date limite de résolution, statut, pièces jointes [photos], créateur, date de détection [serveur]).

**Validations** :
- motif requis (saisie libre avec suggestions : Quantité manquante, Colis endommagé, Étiquette illisible, Emballage ouvert / scellé brisé, Retard de livraison, Identité non vérifiable, Autre) ;
- description détaillée requise ;
- date limite requise ;
- le BS concerné vient du contexte (passage contrôlé) et est en lecture seule ; sans contexte, champ vide ;
- pièces jointes (photos) : taille/type limités, stockage serveur, upload avant validation.

**Interactions** : la création **bloque la progression du BS** (aucun passage de statut tant que non résolue) et notifie « Anomalie déclarée » aux destinataires configurés.

### 7.2 Cycle de vie

| Statut | Signification | Transitions |
|---|---|---|
| `ouverte` | déclarée, en attente | → resolue, en_retard, abandonnee |
| `en_retard` | date limite dépassée (calcul automatique) | → resolue, abandonnee |
| `resolue` | décision unanime « résolue » (§ 7.3) | → cloturee |
| `cloturee` | clôturée après résolution | terminal |
| `abandonnee` | décision unanime « abandonner » | terminal |

**Traitements** : un job programmé (ou calcul à la lecture) bascule `ouverte` → `en_retard` lorsque la date limite est dépassée, crée la notification « Retard (anomalie) » et affiche la durée « J+n » sur la liste.

### 7.3 Concertation des entités responsables

**Participants** : **Transit, Sécurité, Magasin** (pastilles de statut, fil de discussion horodaté et signé).

**Données** : `anomaly_messages` (anomalie, entité, auteur, contenu, date) et `anomaly_votes` (anomalie, entité, vote [`resolu` | `abandon`], date, auteur).

**Logique métier** :
- chaque entité **vote** (résolue / abandonner) ; le bouton de décision finale ne s'active que lorsque **toutes les entités ont voté à l'unanimité** (même choix) ;
- à l'unanimité : l'anomalie passe à `resolue` ou `abandonnee`, le badge est mis à jour, le BS est **débloqué** (si résolue) et la chronologie alimentée ;
- l'administrateur est exclu de la concertation (lecture seule : informations, historique, délai).

**Validations** : un vote par entité ; pas de second vote ; messages réservés aux entités participantes ; modification du vote impossible après validation.

### 7.4 Délais et alertes

- Date limite de résolution obligatoire ; calcul de la durée effective (barre de progression), délai imparti, alerte de retard.
- Impact sur le BS : progression bloquée tant que l'anomalie n'est pas résolue/clôturée (règle appliquée par les services de transition de statut du BS, § 3.2).

---

## 8. Notifications

**Données** : `notifications` (destinataire [matricule], type, titre, contenu, statut [non_lue/lue], objet lié [bs/anomalie/transit], date [serveur]).

**Types d'événements** (§ 10.2) : Anomalie déclarée, Anomalie résolue, Envoi d'un BS, Réception d'un BS, Passage en transit enregistré, Retard (anomalie / retour), Validation en attente / effectuée, BS clôturé, Rapport périodique.

**Traitements** :
1. un événement métier est émis (service dédié) ;
2. la règle de distribution (`notification_rules`, activée/désactivée par type) détermine les destinataires ;
3. insertion des notifications + envoi e-mail éventuel ;
4. le compteur de non-lues est recalculé/incrémenté par destinataire.

**Endpoints** : liste (filtres : toutes / non lues / anomalies / retards / résolutions), « tout marquer comme lu », marquer une notification comme lue **puis** rediriger vers l'objet concerné (BS, anomalie) dans le portail du rôle connecté.

---

## 9. Rapports & statistiques (`rapports`)

**Traitements** (agrégations SQL sur la période, hebdomadaire/mensuel) :
- KPIs : BS envoyés, BS reçus, anomalies (résolues / non résolues / durée moyenne de résolution), BS à rendre ;
- répartition des BS par statut (barres horizontales) ;
- statistiques d'anomalies (donut résolu / non résolu, durée moyenne, motif le plus fréquent, lieu le plus touché) ;
- suivi du matériel à rendre : retours effectués / en attente dans les délais / en retard (les retours partiels comptent comme effectués dès leur enregistrement à la réception) ;
- liste des anomalies exportable.

**Exports** : export Excel du rapport et de la liste des anomalies.

**Interactions** : envoi automatique des **rapports périodiques** aux destinataires configurés (job planifié) ; lien « Voir les BS » vers la liste filtrée.

---

## 10. Administration

### 10.1 Matrice des menus

**Données** : `menu_permissions` (cible [fonction | matricule], section, autorisé).

**Traitements** :
- deux vues : **par fonction** et **par matricule/personne** (filtres : fonction, personne, entité/magasin, recherche) ;
- sélection « tout » par colonne, compteur de modifications non enregistrées, boutons **Enregistrer** et **Rétablir les défauts**, export Excel ;
- à l'enregistrement : mise à jour en base + **application immédiate aux sessions actives** (invalidation de cache / nouvelle résolution des permissions à la requête suivante).

### 10.2 Distribution des notifications

**Données** : `notification_rules` (type d'événement, rôle destinataire, activé).

**Traitements** : matrice types × rôles (Initiateur, Responsable, Sécurité, Transit, Réception, Destinataire, Administrateur), activation/désactivation par type, sélection « tout » par colonne, compteur, Enregistrer / Rétablir les défauts ; les envois réels respectent cette configuration (aucun canal configurable par notification).

---

## 11. Schéma de données (récapitulatif)

```
users              (matricule PK, nom, fonction, magasin FK, actif)
stores             (id PK, code UK, nom, type)
personnel          (id PK, nom, matricule UK, magasin FK, role)
transporters       (id PK, nom, contact, transport, cree_par FK, date)
bs                 (id PK, numero UK [BS-AAAA-NNNN], initiateur FK, beneficiaire FK,
                    magasin_origine FK, magasin_destination FK, moyen FK, motif,
                    commentaire, date_sortie, date_limite_retour, statut,
                    date_creation, date_emission, qr_payload, qr_sig)
bs_lines           (id PK, bs FK, type, code, designation, quantite, etat,
                    destination FK, beneficiaire FK, a_rendre, date_retour_prevue,
                    retour_effectue, retour_etat, retour_date)
bs_workflow        (id PK, bs FK, etape, statut, acteur FK, date)
transits           (id PK [TR-AAAA-NNNN], bs FK, magasin FK, agent FK,
                    arrivee, resultat [a_controle|conforme|non_conforme],
                    note, anomalie FK)
receptions         (id PK, bs FK, magasin FK, declarant FK, date) + lignes
reception_lines    (id PK, reception FK, code, attendu, recu)
anomalies          (id PK [ANO-AAAA-NNNN], bs FK, transit FK, point_controle,
                    motif, description, date_limite, statut, cree_par FK,
                    date_detection, date_resolution)
anomaly_messages   (id PK, anomalie FK, entite, auteur FK, contenu, date)
anomaly_votes      (id PK, anomalie FK, entite, vote, auteur FK, date)
anomaly_attachments(id PK, anomalie FK, fichier, type, taille)
notifications      (id PK, destinataire FK, type, titre, contenu, statut, objet, date)
notification_rules (type, role, active)
menu_permissions   (cible, section, autorise)
audit_log          (id PK, horodatage, matricule, entite, reference, action, donnees)
```

**Contraintes** : unicité `bs.numero`, `transits.id`, `anomalies.id`, `receptions.bs` ; index sur `bs.statut`, `bs.magasin_*`, `transits.bs`, `transits.magasin`, `anomalies.statut`, `notifications.destinataire` (compteur), `audit_log.horodatage`.

---

## 12. API REST (vue d'ensemble)

| Méthode | Endpoint | Rôle | Fonction |
|---|---|---|---|
| GET | `/api/v1/stores` | tous | référentiel magasins |
| GET | `/api/v1/personnel?magasin=` | tous | recherche personnel (suggestions) |
| GET/POST | `/api/v1/transporters` | personnel | liste / création moyen d'acheminement |
| GET | `/api/v1/bs` | personnel/transit/admin | liste filtrée + pagination |
| POST | `/api/v1/bs` | personnel | création brouillon |
| PUT | `/api/v1/bs/{id}` | personnel | modification (brouillon) |
| POST | `/api/v1/bs/{id}/submit` | personnel | émission (→ soumis) |
| POST | `/api/v1/bs/{id}/validate` | responsable/sécurité | validation d'étape |
| POST | `/api/v1/bs/{id}/cancel` | personnel/responsable | annulation |
| GET | `/api/v1/bs/{id}` | tous | fiche détail (workflow, lignes, retours, chronologie, anomalies) |
| GET | `/api/v1/bs/{id}/qr` | tous | QR code du BS |
| POST | `/api/v1/scans` | transit | scan → création/retour transit + détail BS |
| POST | `/api/v1/transits/{id}/passage` | transit | « Confirmer le passage » (conforme/non conforme) |
| POST | `/api/v1/transits/{id}/reception` | transit | « Confirmer la réception » (lignes code/attendu/reçu) |
| GET | `/api/v1/transits` | admin | transits par BS (dernier passage, trajet) |
| GET | `/api/v1/transits?bs=` | tous | passages d'un BS (parcours construit) |
| POST | `/api/v1/receptions` | personnel/transit | signaler une réception |
| POST | `/api/v1/anomalies` | transit/personnel | déclarer une anomalie (avec pièces jointes) |
| GET | `/api/v1/anomalies` | tous | liste + filtres + KPIs |
| GET | `/api/v1/anomalies/{id}` | tous | détail (messages, votes, délai) |
| POST | `/api/v1/anomalies/{id}/messages` | entités | message de concertation |
| POST | `/api/v1/anomalies/{id}/votes` | entités | vote (résolu/abandon) |
| POST | `/api/v1/anomalies/{id}/final` | entités (unanime) | décision finale |
| GET/POST | `/api/v1/notifications` | tous | liste / marquer comme lu |
| GET | `/api/v1/rapports?periode=` | admin | KPIs et agrégations |
| GET | `/api/v1/exports/...` | admin/personnel | exports Excel (bs, anomalies, rapports) |
| GET/PUT | `/api/v1/admin/menus` | admin | matrice des menus |
| GET/PUT | `/api/v1/admin/notification-rules` | admin | distribution des notifications |

---

## 13. Contraintes transverses

- **Transactions** : création de BS (en-tête + lignes + QR), scan (transit + audit), passage, réception (enregistrement + propagation statut/workflow/notifications), résolution d'anomalie (votes + déblocage du BS) sont des opérations atomiques.
- **Concurrence** : double-clic sur « Confirmer le passage » / « Confirmer la réception » → idempotence (vérification de statut dans la transaction) ; double scan → pas de doublon de transit (contrainte d'unicité (bs, magasin) en dehors de la table ou vérification transactionnelle).
- **Sécurité** : autorisations par middleware (§ 1.2) ; validation stricte de toutes les entrées (whitelist d'enums, longueurs, types) ; QR signé (§ 4.1) ; uploads contrôlés (§ 7.1) ; aucun matricule/magasin accepté du client.
- **Horodatage** : toujours côté serveur ; fuseau horaire unique (stockage UTC, affichage local).
- **Performances** : index de recherche (ILIKE sur numéro/nom avec pg_trgm ou équivalent), pagination obligatoire, agrégations de rapports précalculables.
- **Intégration dans S2M-WEB (application mère)** : le module est développé séparément puis intégré.
  Points d'intégration : (1) **authentification** — session/SSO de S2M-WEB consommée par le module (§ 1.1) ;
  (2) **référentiels** — personnel, magasins et utilisateurs de S2M-WEB (API ou base partagée), sinon
  synchronisés/importés ; (3) **navigation** — le module est exposé comme une section de S2M-WEB (URL
  intégrée, menu, permissions appliquées par la matrice des menus) ; (4) **base de données** — base du
  module dédiée (recommandé) ou tables dans la base de S2M-WEB, avec préfixe de schéma ; en phase autonome,
  les référentiels sont simulés puis remplacés à l'intégration.

---

## Annexe A — Correspondance maquette ↔ backend

| Maquette (fichier) | Rôle dans la maquette | Remplacé par (backend) |
|---|---|---|
| `assets/js/app.js` | routage, rôles simulés, garde d'accès, préfixe des liens | routage serveur + middleware d'accès (§ 1.1, 1.2) |
| `assets/js/demande.js` | création BS : lignes, « à rendre », recherches, répartition | API `POST/PUT /bs` + validation métier (§ 3.1) |
| `assets/js/bs-list.js` | liste, onglets, filtres, pagination, export, statut « Réceptionné » | API `GET /bs` (filtres SQL), exports (§ 3.4) |
| `assets/js/transit.js` | scan → transit, contrôle quantités, passage, réception par ligne, parcours | API `/scans`, `/transits/{id}/passage`, `/transits/{id}/reception` (§ 4, 5) |
| `assets/js/reception.js` | enregistrement réception + propagation statut/workflow | API `POST /receptions` + transaction de propagation (§ 6) |
| `assets/js/mockup.js` | modales, notifications, concertation/vote unanime, troncature | API `/anomalies/*`, `/notifications` + moteur de décision (§ 7.3, 8) |
| `assets/js/admin.js` | matrices menus & notifications, compteurs, exports | API `/admin/*` + application immédiate (§ 10) |
| `assets/js/qr-fake.js` | QR déterministe côté client | génération serveur du QR (§ 4.1) |
| `localStorage 's2m.transits.v1'` | persistance des transits | table `transits` |
| `localStorage 's2m.receptions.v1'` | persistance des réceptions | table `receptions` + `reception_lines` |
| Données de démo (PERSONNEL, BS, SEED…) | données figées dans les modules JS | référentiels en base (stores, personnel, transporters, bs) |
