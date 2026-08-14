# S2M-WEB — Fonctionnalités à implémenter

> Document de spécification de la version réelle (avec backend). La maquette statique actuelle (`pages/`, `assets/js/`) sert de référence visuelle et de parcours ; ce document décrit **ce qui doit être développé** pour en faire une application de production.

---

## 1. Vue d'ensemble

S2M-WEB est une application de gestion des **bons de sortie (BS)** pour une entreprise multi-magasins.

**Principe métier central :** le parcours d'un BS n'est jamais planifié à l'avance. Le bon circule physiquement entre les magasins ; chaque magasin qui le reçoit **scanne le QR** à son arrivée, et ce scan **crée le transit** (passage horodaté). Le parcours du bon se construit donc au fil des passages réels.

**Exigences transverses :**

- Persistance serveur de toutes les données (BS, transits, anomalies, notifications, configuration, utilisateurs).
- Authentification des utilisateurs ; chaque utilisateur est rattaché à un magasin/entité et à une fonction.
- Contrôle d'accès par menu : l'utilisateur ne voit que les parties de l'application auxquelles il a été autorisé (configuré dans l'administration).
- Responsive (utilisation sur mobile/tablette au magasin, PC au bureau).
- Audibilité/traçabilité de chaque événement (qui, quoi, quand, où).

---

## 2. Authentification et session

- Page de connexion (identifiant + mot de passe), authentification sécurisée (hash, session, déconnexion).
- L'utilisateur connecté détermine automatiquement :
  - son **magasin / entité** (pour la liste envoyés/reçus et le scan),
  - sa **fonction** (pour le contrôle d'accès par menu),
  - son **matricule** (identifiant unique).
- Sélecteur de personne connectée **supprimé** de l'interface : remplacé par la vraie session.
- Gestion des comptes : création, désactivation, réinitialisation de mot de passe.

## 3. Gestion des bons de sortie

### 3.1 Création d'un BS
- Saisie : expéditeur (magasin d'origine), destinataire (magasin de destination), référence, date, motif, articles/lignes (référence article, libellé, quantité), indication **retour attendu** (le bon est-il à rendre ou sans retour ?).
- Génération automatique du numéro de BS (ex. `BS-2026-XXXX`) et du **QR code** associé.
- Enregistrement (brouillon) puis émission (envoi) ; un BS émis ne peut plus être modifié librement.

### 3.2 Liste des BS — « BS envoyés »
- Sous-menu « BS envoyés » : tous les BS **partis du magasin de l'utilisateur connecté** (colonne bénéficiaire).
- Sous-menu « BS à recevoir » : tous les BS **dont la destination est le magasin connecté** (colonne expéditeur).
- Compteur par onglet, alimenté dynamiquement.
- Filtres sur **chacun** des deux sous-menus :
  - **Retour attendu :** Tous / À rendre / Sans retour
  - Recherche (référence, article…), statut, période de dates.
- États vides explicites (« Aucun BS envoyé par … »), ligne « X résultat(s) / Y bons pour ce magasin ».

### 3.3 Fiche détail d'un BS
- Informations du bon, articles, QR, statut courant.
- **Parcours du BS :** timeline chronologique des passages enregistrés (magasin, date/heure, statut), construite à partir des scans réels.

---

## 4. QR code et scan

- **Génération du QR :** chaque BS émis possède un QR unique encodant sa référence.
- **Scan réel** : lecture du QR via la caméra du téléphone/lecteur (bibliothèque de décodage), avec saisie manuelle de la référence en secours.
- **Le scan crée le transit** : au scan d'un BS dans un magasin, un passage (transit) est créé automatiquement :
  - numéro de transit (ex. `TR-2026-XXXX`),
  - magasin de passage (celui de l'utilisateur qui scanne),
  - agent ayant scanné, date/heure d'arrivée,
  - statut initial **« À contrôler »**.
- Gestion des cas : BS déjà scanné dans ce magasin (double scan), BS inconnu, BS annulé.

## 5. Gestion du transit

- **Tableau des transits :** tous les passages enregistrés (BS, magasin, agent, date/heure, conformité), filtrables et consultables.
- **Contrôle / validation du passage :** après le scan, l'agent contrôle la marchandise et valide :
  - **Conforme** (passage clôturé),
  - **À corriger** / anomalie (redirection vers la déclaration d'anomalie).
- Le parcours d'un BS se construit au fil des passages validés, dans l'ordre chronologique des scans.
- Aucun itinéraire planifié à l'avance : le transit n'existe qu'à partir du moment où un magasin scanne.

## 6. Anomalies

- **Déclaration** : depuis un passage (transit) ou directement ; type d'anomalie, description, pièces jointes (photo), magasin concerné, lien vers le BS.
- **Suivi** : liste des anomalies (statuts), fiche détail avec historique.
- **Résolution** : clôture de l'anomalie par la personne habilitée, notification aux intéressés.
- Les anomalies remontent dans les rapports et déclenchent les notifications configurées.

## 7. Notifications

- **Événements notifiables :** anomalie déclarée / résolue, envoi d'un BS, réception d'un BS, passage en transit, retard, rapport périodique.
- **Distribution configurable** (voir administration) : à qui envoyer chaque type d'événement.
- **Pas de canal par notification** : pas de choix de canal par message ; la diffusion se fait dans l'application (centre de notifications) et par e-mail.
- Centre de notifications : liste des notifications reçues, non-lues/consultées, lien vers l'objet concerné (BS, transit, anomalie).

## 8. Rapports et statistiques

- Rapports sur les BS, les transits, les anomalies (volumes par magasin, délais, conformité, retards).
- Export (Excel/CSV/PDF) des rapports.
- **Rapports périodiques** envoyés automatiquement aux destinataires configurés.

## 9. Traçabilité d'un BS

- Consultation du **parcours complet** d'un BS : chaque scan/passage avec magasin, agent, date/heure, statut.
- Historique des événements (création, émission, passages, anomalies, résolution).

## 10. Administration (2 configurations uniquement)

### 10.1 Gestion des menus
- Définition de **qui voit quelle partie de l'application**, selon la **fonction** (vue « Par fonction ») ou selon le **matricule / la personne** (vue « Par matricule »).
- Matrice : lignes = fonctions (ou personnes), colonnes = sections de l'application (Bons de sortie, Création d'un BS, QR & scan, Transit, Anomalies, Notifications, Rapports, Administration, Traçabilité).
- Sélection « tout » par colonne, compteur de modifications non enregistrées, enregistrement, rétablissement des défauts.
- Enregistré en base : la configuration s'applique immédiatement aux sessions actives (à la prochaine navigation).

### 10.2 Distribution des notifications
- Matrice : types d'événement × rôles/destinataires, avec activation/désactivation par type (pas de canal configurable par notification).
- Les envois réels respectent cette configuration.

---

## 11. Données à persister (schéma fonctionnel)

- **Utilisateurs** : matricule, nom, fonction, magasin/entité, compte (actif/inactif).
- **Entités / magasins** : code, nom, type.
- **Bons de sortie** : numéro, expéditeur, destinataire, dates, statut, retour attendu, lignes (article, libellé, quantité), QR.
- **Transits / passages** : numéro, BS, magasin, agent, date/heure d'arrivée, statut (à contrôler / conforme / à corriger), date de validation.
- **Anomalies** : référence, BS/transit lié, type, description, pièces jointes, statut, historique.
- **Notifications** : destinataire, type, canal, contenu, statut (non-lue/lue), objet lié.
- **Configuration** : droits par fonction et par personne (matrice menus), distribution des notifications (types × rôles).

---

## 12. Hors périmètre (non prévu à ce stade)

- Gestion des stocks / inventaires.
- Facturation, prix, calcul de marge.
- Workflow multi-niveaux d'approbation des BS (non spécifié).
