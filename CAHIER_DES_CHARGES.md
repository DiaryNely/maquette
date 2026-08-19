# Cahier des charges — S2M-WEB : gestion des Bons de Sortie (BS)

> Document rédigé à partir de l'analyse complète de la maquette statique (`E:\stage\maquette`).
> Version 1.0 — 19/08/2026 — Statut : à valider.

---

## 1. Présentation générale

### 1.1 Contexte

S2M est une entreprise multi-sites dont les mouvements de matériel entre magasins sont régis par des **Bons de Sortie (BS)**. Le circuit actuel est manuel : les besoins de traçabilité, de contrôle aux points de passage et de suivi des retours ne sont pas couverts.

Référentiel des entités (maquette) :

| Entité | Rôle dans le circuit |
|---|---|
| Magasin central | Magasinage, réception |
| Entrepôt S2M | Magasinage |
| Plateforme logistique | Transit — point de contrôle |
| Barrière de sortie | Transit — point de contrôle |
| Poste de contrôle | Sécurité — validation |
| Siège - Administration S2M | Direction, Réception, Administration |

### 1.2 Objet et motivation

- **Dématérialiser** le circuit complet du BS : création → validation → transit → réception → retours → clôture.
- **Tracer chaque mouvement** : tout événement est horodaté et rattaché à un acteur identifié.
- **Construire le parcours par le scan** : le parcours d'un BS n'est jamais planifié à l'avance ; c'est le scan du QR code qui crée le transit au moment où le bon arrive dans un magasin.
- **Maîtriser les pertes** grâce aux obligations de retour (articles « à rendre »).
- **Détecter et résoudre les anomalies** dans un délai maîtrisé (2 jours), avec blocage de la progression tant qu'une anomalie n'est pas résolue.
- **Piloter** grâce à des rapports et statistiques temps réel pour la Direction.

### 1.3 Environnement technique

**Maquette (état actuel)** :

- 100 % statique : HTML5, CSS3, JavaScript vanilla — aucune dépendance de build, aucun framework.
- SPA simulée : `index.html?page=<rôle>/<page>` avec chargement des pages par `fetch` (`inclure()` dans `app.js`).
- Persistance de démonstration : `localStorage` (clés `s2m.*` : `s2m.receptions.v2`, `s2m.stock.v1`, `s2m.retours.v2`, `s2m.transits.v1`, `s2m.validations.v1`, …).
- Assets cache-bustés (`?v=`) ; icônes FontAwesome ; design system maison (tokens `--m-*`, composants `mock-*`).
- QR de démonstration généré en SVG déterministe (`qr-fake.js`) — visuel uniquement, non scannable.

**Version réelle (cible)** — cf. `FONCTIONNALITES.md` et `BACKEND.md` :

- Application web intégrée à l'application mère **S2M-WEB**.
- Authentification, référentiels (magasins, personnel avec matricule, comptes) fournis par S2M-WEB.
- Base de données persistante ; scan QR réel (postes fixes ou mobiles).
- Points d'intégration balisés `[INTÉGRATION]` dans les deux documents de spécification.

### 1.4 Périmètre de déploiement

- 6 entités/sites couvertes ; 4 rôles simulés dans la maquette (`lambda`, `transit`, `direction`, `admin`) ; 7 fonctions métier couvertes par la matrice des accès (initiateur, responsable, sécurité, transit, réception, destinataire, administrateur).
- Utilisateurs cibles : personnel magasin, agents transit, sécurité, direction, administrateur.
- Points de scan obligatoires : Barrière de sortie, Plateforme logistique, Poste de contrôle, magasins.

## 2. Objectifs

### 2.1 Objectifs mesurables

| Objectif | Indicateur | Cible |
|---|---|---|
| Dématérialiser le circuit des BS | % de BS sans support papier | 100 % |
| Tracer chaque mouvement | % de transits créés par scan QR | 100 % |
| Maîtriser les retours | % de retours effectués dans les délais | ≥ 95 % |
| Résoudre rapidement les anomalies | Durée moyenne de résolution | ≤ 2 jours |
| Réduire la fréquence des anomalies | Taux d'anomalies par BS | En baisse |
| Piloter avec des données fiables | Rapports consultés | Hebdomadaire |

### 2.2 Prérequis

- Référentiels magasins et personnel (matricules uniques) fiables et à jour.
- Réseau disponible sur les points de contrôle ; postes ou lecteurs QR.
- Authentification unifiée via S2M-WEB en version réelle.
- Adoption du scan QR comme **déclencheur unique** de création de transit.

## 3. Acteurs et rôles

### 3.1 Tableau des rôles

| Rôle | Définition | Planifier (créer / agir) | Consulter |
|---|---|---|---|
| Initiateur (demandeur) | Personnel d'un magasin qui formule la demande de sortie | Créer et soumettre un BS, réceptionner, effectuer des retours | Ses BS, notifications, anomalies |
| Responsable (magasin / entrepôt) | Valide localement, supervise les initiateurs | Valider au niveau local | BS, anomalies, rapports |
| Sécurité | Contrôle aux points de passage (Poste de contrôle) | Contrôler, participer à la concertation des anomalies | Transits, anomalies |
| Transit | Agent de la Plateforme logistique / Barrière de sortie | Scanner le QR, contrôler les quantités, déclarer une anomalie | Transits, anomalies, traçabilité |
| Réception | Personnel du magasin de destination (Siège) | Réceptionner, contrôler les quantités | BS, transits, anomalies, traçabilité |
| Destinataire | Bénéficiaire final du matériel | — | Ses BS, scans |
| Direction | Décide de la validation des BS, pilote l'activité | Valider / refuser les BS soumis | Rapports et statistiques |
| Administrateur | Configure l'application, sans décision métier | Configurer les accès et la distribution des notifications | Lecture seule sur le reste |

### 3.2 Hiérarchie

- **Direction** (Siège) — validation des BS, arbitrage, pilotage.
- **Responsables** (magasin / entrepôt) — encadrent les initiateurs, première ligne de validation.
- **Sécurité** (Poste de contrôle) — contrôle aux points de passage.
- **Transit** (Plateforme logistique, Barrière de sortie) — transport et contrôle intermédiaire.
- **Initiateurs / magasiniers / réception** (Magasin central, Entrepôt S2M, Siège) — exécution du circuit.
- **Administrateur** (Automat SI) — rôle transverse de configuration, sans pouvoir métier.

### 3.3 Accès et permissions

Matrice des accès de la maquette (configuration par défaut, modifiable par l'administrateur) :

| Fonction | Sections accessibles |
|---|---|
| Initiateur | Bons de sortie, Création d'un BS, QR Code & scan, Transit, Traçabilité |
| Responsable | + Anomalies, Rapports |
| Sécurité | Scan, Transit, Anomalies |
| Transit | Scan, Transit, Anomalies, Traçabilité |
| Réception | Bons, Scan, Transit, Anomalies, Traçabilité |
| Destinataire | Bons, Scan |
| Administrateur | Toutes les sections |

Pages de la maquette par rôle simulé :

| Rôle simulé | Pages accessibles |
|---|---|
| `lambda` (Personnel) | bs-list, bs-create, bs-detail, notifications, anomalie-detail, retours, reception |
| `transit` | scan, transit (wizard 2 étapes), anomalies, trace |
| `direction` | validations, rapports |
| `admin` | admin (menus + notifications), rapports, lecture seule |

## 4. Spécifications fonctionnelles

### 4.1 Personnel — Initiateur (rôle `lambda`)

1. **Liste des BS** — deux onglets : « BS envoyés » et « BS à recevoir » ; recherche, filtres, badges de statut ; lien vers la fiche détail.
2. **Fiche détail BS** — fiche partagée (informations, articles, statut étape par étape, QR) ; actions contextuelles : *Modifier* (brouillon), *Réceptionner ce BS* (si attendu au magasin courant).
3. **Création d'un BS** (`bs-create`) :
   - Lignes d'articles dynamiques (ajout / suppression, minimum 1 ligne).
   - Bénéficiaire : sélection du **magasin de destination** puis recherche du personnel **de ce magasin** (suggestions avec matricule pour distinguer les homonymes).
   - Moyen d'acheminement : recherche avec suggestions + ajout (nom, moyen de transport, contact).
   - Option « article à rendre » par ligne, avec date limite de retour obligatoire si cochée.
   - Sauvegarde en brouillon puis soumission.
4. **Réception** (`reception`) — accès direct depuis le BS à recevoir ; contrôle des quantités attendues vs reçues, saisie des écarts, ajout d'articles supplémentaires, enregistrement (→ stock + activation des retours).
5. **Retours** (`retours`) — obligations de retour (effectués / en attente / en retard), renvoi du matériel, réception du retour, clôture du BS.
6. **Anomalies** — consultation de la fiche anomalie (détail, historique, concertation).
7. **Notifications** — fil d'actualités chronologique inverse, filtres (toutes, non lues, anomalies, retards, résolutions…), « tout marquer comme lu ».

### 4.2 Transit (rôle `transit`)

1. **Scan QR** — le scan du QR d'un BS dans le magasin courant crée un **transit horodaté** (parcours construit au fil des événements, sans itinéraire prédéfini) ; chaque scan dans un autre magasin ajoute un passage.
2. **Wizard 2 étapes** — 1) identification du BS par scan ; 2) contrôle des quantités (conforme / écart).
3. **Déclaration d'anomalie** — accessible depuis le scan (BS et magasin de contrôle pré-remplis) : motif, description, date limite de résolution (2 jours).
4. **Traçabilité** — consultation des transits successifs d'un BS.

### 4.3 Sécurité

- Contrôle aux points de passage (Poste de contrôle).
- Participation à la **concertation** des anomalies (chat des responsables : Transit, Sécurité, Magasin) avec décision unanime requise.
- Validation de l'étape Sécurité (notification émise).

### 4.4 Direction (rôle `direction`)

1. **Liste des BS en attente de validation** (statut *Soumis*) avec KPIs : en attente / validés / refusés / traités ; recherche ; export Excel ; pagination.
2. **Décision** :
   - *Valider* → le BS passe à *Validé* et poursuit le workflow.
   - *Refuser* → **motif obligatoire**, le BS passe à *Refusé* et ne poursuit pas (re-soumission possible après correction).
3. **Fiche détail** consultable avant décision (même fiche que le demandeur, cohérente via `?bs=`).
4. **Rapports et statistiques** — KPIs (BS envoyés / reçus / à rendre, anomalies), répartition des BS par statut, statistiques d'anomalies (donut résolues/non résolues, durée moyenne, motif le plus fréquent, lieu le plus touché), suivi du matériel à rendre, liste des anomalies exportable ; période hebdomadaire / mensuelle.

> Note : `FONCTIONNALITES.md` (version réelle) prévoit en complément un workflow de validation « Responsable → Sécurité » avant le transit ; la maquette matérialise pour l'instant la validation par la Direction. À confirmer pour la version réelle.

### 4.5 Administrateur (rôle `admin`)

1. **Gestion des menus** — matrice des accès : qui voit quelle section de l'application, **par fonction ou par matricule**.
2. **Distribution des notifications** — types d'événement × rôles destinataires, activation / désactivation **par type** (pas de canal configurable par notification).
3. **Lecture seule** sur le reste de l'application (liste des BS, rapports, traçabilité).

### 4.6 Fonctions transverses

1. **Notifications automatiques** — déclencheurs : retard de résolution, anomalie déclarée, anomalie résolue, réception enregistrée, BS clôturé, validation Sécurité, BS en attente de validation. Destinataires par rôle (ex. : retard → Administrateur + Responsable magasin).
2. **Traçabilité** — timeline par BS et par anomalie (acteur + horodatage + description).
3. **Export Excel** — rapports, listes (anomalies, validations).

## 5. Règles de gestion

Chaque règle s'exprime sous la forme : **déclencheur → condition → conséquence**.

### RG-01 — Le parcours se construit par le scan
- **Déclencheur** : un BS arrive dans un magasin.
- **Condition** : le QR du BS est scanné à cet endroit.
- **Conséquence** : un transit horodaté est créé pour ce BS à cet endroit ; **jamais** de parcours planifié à l'avance.

### RG-02 — Anomalie bloquante
- **Déclencheur** : contrôle non conforme (scan / transit).
- **Condition** : anomalie créée (motif + description + lieu de contrôle).
- **Conséquence** : la progression du BS est **bloquée** jusqu'à la résolution de l'anomalie.

### RG-03 — Délai de résolution
- **Déclencheur** : anomalie ouverte.
- **Condition** : non résolue au-delà du délai imparti (2 jours).
- **Conséquence** : alerte de retard déclenchée automatiquement + notification aux responsables (transit, magasin, administrateur).

### RG-04 — Clôture par concertation
- **Déclencheur** : anomalie résolue ou abandonnée.
- **Condition** : décision **unanime** des responsables (Transit, Sécurité, Magasin).
- **Conséquence** : résolution → passage autorisé à l'étape suivante ; abandon → anomalie close sans passage.

### RG-05 — Validation par la Direction
- **Déclencheur** : BS soumis.
- **Condition** : la Direction doit statuer avant poursuite.
- **Conséquence** : *Validé* → le BS poursuit le workflow ; *Refusé* (motif obligatoire) → le BS ne poursuit pas ; le demandeur peut corriger et re-soumettre.

### RG-06 — Réception et stock
- **Déclencheur** : arrivée du BS au magasin de destination.
- **Condition** : contrôle des quantités attendues vs reçues.
- **Conséquence** : les écarts sont saisis, les articles supplémentaires acceptés ; à l'enregistrement, le **stock du magasin est mis à jour** et les **obligations de retour sont activées**.

### RG-07 — Retours obligatoires
- **Déclencheur** : article marqué « à rendre » à la création.
- **Condition** : retour non effectué.
- **Conséquence** : le BS **ne se clôture jamais** tant que tous les retours ne sont pas effectués ; cycle complet : Envoi → Réception → Obligation de retour → Renvoi → Réception du retour → Clôture ; suivi retard / attente / effectué.

### RG-08 — Modification du BS
- **Déclencheur** : demande de modification d'un BS.
- **Condition** : BS au statut *Brouillon* (ou *Refusé* avant re-soumission).
- **Conséquence** : modification autorisée ; **jamais** de modification après soumission.

### RG-09 — Bénéficiaire
- **Déclencheur** : création d'un BS.
- **Condition** : magasin de destination sélectionné.
- **Conséquence** : le bénéficiaire est **toujours** choisi parmi le personnel de ce magasin ; le matricule est affiché pour distinguer les homonymes.

### RG-10 — Moyen d'acheminement
- **Déclencheur** : création d'un BS.
- **Condition** : moyen d'acheminement non renseigné.
- **Conséquence** : le BS ne peut **pas** être soumis sans moyen d'acheminement (nom, transport, contact).

### RG-11 — Traçabilité
- **Déclencheur** : tout événement (création, soumission, validation, scan, réception, résolution, clôture).
- **Condition** : —.
- **Conséquence** : enregistrement systématique de l'acteur + horodatage ; **aucun** événement anonyme.

### RG-12 — Notifications
- **Déclencheur** : événement métier (anomalie, retard, résolution, réception, clôture, validation).
- **Condition** : type d'événement actif et rôle destinataire autorisé (configuration administrateur).
- **Conséquence** : notification émise aux bons destinataires ; un type désactivé **ne notifie jamais**.

## 6. Contraintes

### 6.1 Contraintes structurelles

- La maquette est **statique et sans backend** : la persistance se limite à `localStorage` (données de démonstration) ; le QR est simulé (`qr-fake.js`).
- La version réelle **doit** s'appuyer sur S2M-WEB pour l'authentification, les référentiels (magasins, personnel, comptes) et la base de données — ces éléments sont **hors périmètre** de la maquette.
- Pas de build ni de framework : compatibilité navigateurs récents, JavaScript vanilla.
- Les écrans, composants (`mock-*`) et le vocabulaire des boutons doivent rester **uniformes** dans toute l'application (boutons : neutre / teal / orange / bleu / rouge, cf. `mockup.css`).

### 6.2 Contraintes de délai

- Livraison de la maquette par itérations fonctionnelles (voir planning §8) ; chaque module livré doit être testable de bout en bout dans la démo.
- La version réelle ne démarre qu'après validation du présent cahier des charges et des spécifications (`FONCTIONNALITES.md`, `BACKEND.md`).

### 6.3 Points à confirmer

1. Délai de résolution d'une anomalie fixé à **2 jours** — à valider par la Direction.
2. Workflow de validation en version réelle : « Responsable → Sécurité » uniquement, ou validation Direction systématique ?
3. Canaux de notification en version réelle : in-app, e-mail, push ?
4. Scan QR : postes fixes aux points de contrôle ou mobiles dédiés ?
5. Articles supplémentaires en réception : acceptation libre ou validation complémentaire requise ?
6. Portée de « tout marquer comme lu » (global ou par filtre) et conservation de l'historique de lecture.
7. Seuils et indicateurs des rapports (périodes, motifs, lieux) à confirmer avec la Direction.
8. Traçabilité des modifications d'un BS entre brouillon et soumission : à conserver ?

## 7. Livrables

| Livrable | Format | Statut |
|---|---|---|
| Cahier des charges | Markdown (`CAHIER_DES_CHARGES.md`) | Livré — à valider |
| Maquette navigable S2M-WEB | HTML / CSS / JS statiques (cache-busting `?v=`) | Livrée (itérations) |
| Spécifications fonctionnelles (version réelle) | Markdown (`FONCTIONNALITES.md`) | Livré |
| Spécifications techniques backend | Markdown (`BACKEND.md`) | Livré |
| Modules JS par domaine | JS vanilla : `app.js`, `bs-list.js`, `demande.js`, `transit.js`, `validation.js`, `reception.js`, `retours.js`, `admin.js`, `mockup.js`, `menu.js`, `qr-fake.js` | Livrés |
| Pages par rôle | HTML : `pages/` (`lambda`, `transit`, `direction`, `admin`) | Livrées |
| Application de production intégrée à S2M-WEB | Application web | À planifier |

## 8. Planning prévisionnel

Fonctionnalité par fonctionnalité :

| Phase | Détail | Jours |
|---|---|---|
| 1. Cadrage | Analyse du besoin, rédaction du cahier des charges, validation | 5 |
| 2. Socle maquette | Shell SPA, routage par rôle, menu flottant, design system (`mock-*`, tokens `--m-*`) | 5 |
| 3. BS — liste & détail | Liste envoyés / à recevoir, fiche partagée, QR, badges de statut | 6 |
| 4. BS — création | Lignes d'articles, bénéficiaire par magasin, moyen d'acheminement, brouillon / soumission | 5 |
| 5. Transit & scan | Scan QR → transit horodaté, wizard 2 étapes, contrôle des quantités | 5 |
| 6. Validation Direction | Liste en attente, valider / refuser (motif obligatoire), KPIs, export | 4 |
| 7. Réception | Contrôle quantités, écarts, articles supplémentaires, stock, activation des retours | 4 |
| 8. Retours | Obligations, renvoi, réception du retour, clôture, suivi retard | 5 |
| 9. Anomalies | Déclaration, fiche détail, historique, concertation, délais, blocage | 6 |
| 10. Notifications | Fil d'actualités, filtres, marquage lu, déclencheurs automatiques | 3 |
| 11. Rapports & statistiques | KPIs, graphiques, exports, période hebdo / mensuel | 5 |
| 12. Administration | Matrice des accès, distribution des notifications | 4 |
| 13. Finitions & tests | Uniformisation de l'interface (boutons, cartes), parcours de bout en bout, corrections | 5 |
| **Total maquette** | | **62** |
| 14. Version réelle | Intégration S2M-WEB (auth, référentiels, BDD), scan QR réel, recette | 20 |
| **Total global** | | **82** |