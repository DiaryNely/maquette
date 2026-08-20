
-- Même base MySQL que S2M (apps2m) ; base S2M intouchable. FK uniquement vers
-- les cibles S2M déjà indexées : personnel_p.nummatr, fonction_p.nom_fonction,
-- moyen_acheminement.id_ma. Pas de FK vers magasin (Num_magasin non indexé) :
-- relations num_magasin_* assurées par l'application.
-- Toutes les tables créées par ce module portent le préfixe gbs_ ; les tables
-- S2M (moyen_acheminement, personnel_p, magasin, fonction_p) restent sans préfixe.

CREATE TABLE gbs_statut_bs (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_statut_bs_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO gbs_statut_bs (id, code, libelle) VALUES
(1, 'brouillon', 'Brouillon'),
(2, 'soumis', 'Soumis'),
(3, 'en_attente_validation', 'En attente de validation'),
(4, 'valide', 'Validé'),
(5, 'en_transit', 'En transit'),
(6, 'en_attente_confirmation', 'En attente de confirmation'),
(7, 'receptionne', 'Réceptionné'),
(8, 'cloture', 'Clôturé'),
(9, 'refuse', 'Refusé'),
(10, 'annule', 'Annulé');

CREATE TABLE gbs_type_article (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_type_article_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO gbs_type_article (id, code, libelle) VALUES
(1, 'Article', 'Article'),
(2, 'Info', 'Informatique'),
(3, 'Immo', 'Immobilier'),
(4, 'Fourniture', 'Fourniture'),
(5, 'Autre', 'Autre');

CREATE TABLE gbs_etat_article (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_etat_article_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO gbs_etat_article (id, code, libelle) VALUES
(1, 'Neuf', 'Neuf'),
(2, 'Bon etat', 'Bon état'),
(3, 'Usage', 'Usage'),
(4, 'A reformer', 'À réformer');

CREATE TABLE gbs_resultat_passage (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resultat_passage_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO gbs_resultat_passage (id, code, libelle) VALUES
(1, 'a_controler', 'À contrôler'),
(2, 'conforme', 'Conforme'),
(3, 'non_conforme', 'Non conforme');

CREATE TABLE gbs_statut_anomalie (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_statut_anomalie_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

INSERT INTO gbs_statut_anomalie (id, code, libelle) VALUES
(1, 'ouverte', 'Ouverte'),
(2, 'en_retard', 'En retard'),
(3, 'resolue', 'Résolue'),
(4, 'abandonnee', 'Abandonnée'),
(5, 'cloturee', 'Clôturée');

--moyen acheminement ---- [Deja existante] (S2M, base apps2m — ne pas créer, ne pas modifier)
-- Rôle : moyen d'acheminement du BS (véhicule / chauffeur). Référencé par gbs_bons_sortie.id_ma.
CREATE TABLE `moyen_acheminement` (
  `id_ma` int NOT NULL AUTO_INCREMENT,
  `type` varchar(255) DEFAULT NULL,
  `nom` varchar(255) DEFAULT NULL,
  `tel` varchar(255) DEFAULT NULL,
  `entite` varchar(255) DEFAULT NULL,
  `numMat` varchar(255) DEFAULT NULL,
  `remarque` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id_ma`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

---- [Deja existante] (S2M, base apps2m — ne pas créer, ne pas modifier)
-- Rôle : utilisateurs / personnel du groupe. Matricule = nummatr → colonnes nummatr_*.
CREATE TABLE `personnel_p` (
  `id_personnel` int NOT NULL AUTO_INCREMENT,
  `nummatr` varchar(10) NOT NULL,
  `nomcomplet` varchar(100) DEFAULT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `num_tel` varchar(20) DEFAULT NULL,
  `mail` varchar(50) DEFAULT NULL,
  `date_embauche` varchar(10) DEFAULT NULL,
  `etat` tinyint(1) NOT NULL DEFAULT '1',
  `idfonction` int NOT NULL,
  `idmagasin` int NOT NULL,
  `num_magasin` int DEFAULT NULL,
  PRIMARY KEY (`id_personnel`),
  UNIQUE KEY `nummatr` (`nummatr`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

---- [Deja existante] (S2M, base apps2m — ne pas créer, ne pas modifier)
-- Rôle : sites / magasins de la chaîne. Code = Num_magasin → colonnes num_magasin_*.
CREATE TABLE `magasin` (
  `id_magasin` int NOT NULL AUTO_INCREMENT,
  `Num_magasin` int NOT NULL,
  `Nom_magasin` varchar(255) NOT NULL,
  `Categorie_magasin` int NOT NULL,
  `Adr_magasin` varchar(255) DEFAULT NULL,
  `email_mag` varchar(255) DEFAULT '--- -- --- --',
  `phone_mag` varchar(20) DEFAULT '--- -- --- --',
  `idregion` int DEFAULT '0',
  `etat_mag` smallint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id_magasin`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;

---- [Deja existante] (S2M, base apps2m — ne pas créer, ne pas modifier)
-- Rôle : fonctions / rôles des personnels. Rôle = nom_fonction → nom_fonction / cible.
CREATE TABLE `fonction_p` (
  `id_fonction` int NOT NULL AUTO_INCREMENT,
  `nom_fonction` varchar(100) DEFAULT NULL,
  `genre` varchar(10) DEFAULT 'S',
  `id_dir` int NOT NULL DEFAULT '0',
  `id_srv` int NOT NULL DEFAULT '0',
  `id_dep` int NOT NULL DEFAULT '0',
  `id_secteur` int NOT NULL DEFAULT '0',
  `is_lead_dir` int NOT NULL DEFAULT '0',
  `is_lead_srv` int NOT NULL DEFAULT '0',
  `is_lead_dep` int NOT NULL DEFAULT '0',
  `is_lead_secteur` int NOT NULL DEFAULT '0',
  `heures_de_base` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id_fonction`),
  UNIQUE KEY `nom_fonction` (`nom_fonction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;


CREATE TABLE gbs_bons_sortie (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero                 VARCHAR(20)     NOT NULL, -- BS-XXXXXXXX (aléatoire, préfixe BS)
    nummatr_initiateur     VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    nummatr_beneficiaire   VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    num_magasin_origine    INT             NOT NULL, -- [S2M] Num_magasin de magasin
    num_magasin_destination INT            NOT NULL, -- [S2M] Num_magasin de magasin
    id_ma                  INT             NULL, -- [S2M] id_ma de moyen_acheminement
    motif                  VARCHAR(190)    NULL,
    commentaire            VARCHAR(1000)   NULL,
    date_sortie_souhaitee  DATE            NULL,
    date_limite_retour     DATE            NULL,
    statut_id              BIGINT UNSIGNED NOT NULL DEFAULT 1,
    date_emission          DATETIME        NULL,
    created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bons_sortie_numero (numero),
    KEY idx_bs_magasin_origine_statut_created (num_magasin_origine, statut_id, created_at),
    KEY idx_bs_magasin_destination_statut_created (num_magasin_destination, statut_id, created_at),
    KEY idx_bs_statut (statut_id),
    KEY idx_bs_nummatr_initiateur (nummatr_initiateur),
    KEY idx_bs_nummatr_beneficiaire (nummatr_beneficiaire),
    KEY idx_bs_id_ma (id_ma),
    CONSTRAINT fk_bs_statut FOREIGN KEY (statut_id)
        REFERENCES gbs_statut_bs (id) ON DELETE RESTRICT,
    CONSTRAINT fk_bs_nummatr_initiateur FOREIGN KEY (nummatr_initiateur)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT,
    CONSTRAINT fk_bs_nummatr_beneficiaire FOREIGN KEY (nummatr_beneficiaire)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT,
    CONSTRAINT fk_bs_id_ma FOREIGN KEY (id_ma)
        REFERENCES moyen_acheminement (id_ma) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- QR du bon de sortie : instantané signé des informations embarquées dans le
-- code QR (numéro, départ, arrivée, initiateur, réceptionneur) + payload/signature.
CREATE TABLE gbs_qr_bons_sortie (
    id                      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bs_id                   BIGINT UNSIGNED NOT NULL,
    numero                  VARCHAR(20)     NOT NULL, -- numéro du bon de sortie (snapshot)
    num_magasin_origine     INT             NOT NULL, -- [S2M] Num_magasin de magasin (destination de départ)
    num_magasin_destination INT             NOT NULL, -- [S2M] Num_magasin de magasin (destination d'arrivée)
    nummatr_initiateur      VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p (initiateur)
    nummatr_recepteur       VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p (réceptionneur / bénéficiaire)
    qr_payload              VARCHAR(190)    NULL,
    qr_signature            VARCHAR(128)    NULL,
    created_at              DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_qr_bons_sortie_bs (bs_id),
    UNIQUE KEY uq_qr_bons_sortie_numero (numero),
    KEY idx_qr_bons_sortie_magasin_origine (num_magasin_origine),
    KEY idx_qr_bons_sortie_magasin_destination (num_magasin_destination),
    KEY idx_qr_bons_sortie_nummatr_initiateur (nummatr_initiateur),
    KEY idx_qr_bons_sortie_nummatr_recepteur (nummatr_recepteur),
    CONSTRAINT fk_qr_bons_sortie_bs FOREIGN KEY (bs_id)
        REFERENCES gbs_bons_sortie (id) ON DELETE CASCADE,
    CONSTRAINT fk_qr_bons_sortie_nummatr_initiateur FOREIGN KEY (nummatr_initiateur)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT,
    CONSTRAINT fk_qr_bons_sortie_nummatr_recepteur FOREIGN KEY (nummatr_recepteur)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_bs_lignes (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bs_id                BIGINT UNSIGNED NOT NULL,
    type_article_id      BIGINT UNSIGNED NOT NULL,
    code                 VARCHAR(60)     NOT NULL,
    designation          VARCHAR(190)    NOT NULL,
    quantite             INT UNSIGNED    NOT NULL,
    etat_id              BIGINT UNSIGNED NOT NULL,
    a_rendre             TINYINT(1)      NOT NULL DEFAULT 0,
    date_retour_prevue   DATE            NULL,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_bs_lignes_bs_rendre (bs_id, a_rendre),
    KEY idx_bs_lignes_type_article (type_article_id),
    KEY idx_bs_lignes_etat (etat_id),
    CONSTRAINT fk_bs_lignes_bs FOREIGN KEY (bs_id)
        REFERENCES gbs_bons_sortie (id) ON DELETE CASCADE,
    CONSTRAINT fk_bs_lignes_type_article FOREIGN KEY (type_article_id)
        REFERENCES gbs_type_article (id) ON DELETE RESTRICT,
    CONSTRAINT fk_bs_lignes_etat FOREIGN KEY (etat_id)
        REFERENCES gbs_etat_article (id) ON DELETE RESTRICT,
    CONSTRAINT chk_bs_lignes_quantite CHECK (quantite >= 1),
    CONSTRAINT chk_bs_lignes_retour CHECK (a_rendre = 0 OR date_retour_prevue IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Pas de workflow fixe à étapes prédéfinies : chaque passage au transit est une
-- étape (gbs_passages_transit = la trace du parcours du BS). Le statut global du
-- BS suit les statuts de gbs_statut_bs.
CREATE TABLE gbs_passages_transit (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero            VARCHAR(20)     NOT NULL, -- TR-XXXXXXXX (aléatoire, préfixe TR)
    bs_id             BIGINT UNSIGNED NOT NULL,
    num_magasin       INT             NOT NULL, -- [S2M] Num_magasin de magasin
    nummatr_agent     VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    scanned_at        DATETIME(3)     NOT NULL,
    resultat_id       BIGINT UNSIGNED NOT NULL DEFAULT 1,
    note              VARCHAR(500)    NULL,
    idempotency_key   VARCHAR(64)     NULL,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_passages_numero (numero),
    UNIQUE KEY uq_passages_bs_magasin (bs_id, num_magasin),
    UNIQUE KEY uq_passages_idempotency (idempotency_key),
    KEY idx_passages_bs_scanned (bs_id, scanned_at),
    KEY idx_passages_magasin (num_magasin),
    KEY idx_passages_resultat (resultat_id),
    KEY idx_passages_nummatr_agent (nummatr_agent),
    CONSTRAINT fk_passages_bs FOREIGN KEY (bs_id)
        REFERENCES gbs_bons_sortie (id) ON DELETE RESTRICT,
    CONSTRAINT fk_passages_resultat FOREIGN KEY (resultat_id)
        REFERENCES gbs_resultat_passage (id) ON DELETE RESTRICT,
    CONSTRAINT fk_passages_nummatr_agent FOREIGN KEY (nummatr_agent)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_receptions (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero                VARCHAR(20)     NOT NULL, -- REC-XXXXXXXX (aléatoire, préfixe REC)
    bs_id                 BIGINT UNSIGNED NOT NULL,
    num_magasin           INT             NOT NULL, -- [S2M] Num_magasin de magasin
    nummatr_agent         VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    constat_at            DATETIME        NOT NULL,
    nummatr_confirmation  VARCHAR(10)     NULL, -- [S2M] nummatr de personnel_p
    confirmed_at          DATETIME        NULL,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_receptions_numero (numero),
    UNIQUE KEY uq_receptions_bs (bs_id),
    KEY idx_receptions_magasin (num_magasin),
    KEY idx_receptions_nummatr_agent (nummatr_agent),
    KEY idx_receptions_nummatr_confirmation (nummatr_confirmation),
    CONSTRAINT fk_receptions_bs FOREIGN KEY (bs_id)
        REFERENCES gbs_bons_sortie (id) ON DELETE RESTRICT,
    CONSTRAINT fk_receptions_nummatr_agent FOREIGN KEY (nummatr_agent)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT,
    CONSTRAINT fk_receptions_nummatr_confirmation FOREIGN KEY (nummatr_confirmation)
        REFERENCES personnel_p (nummatr) ON DELETE SET NULL,
    CONSTRAINT chk_receptions_confirmation CHECK (confirmed_at IS NULL OR nummatr_confirmation IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Lignes de la réception : une ligne par article du BS contrôlé (bs_ligne_id
-- renseigné, attendu = quantité du BS) ou par article supplémentaire reçu sans
-- être dans le BS (bs_ligne_id NULL, code + désignation renseignés, attendu = 0).
CREATE TABLE gbs_reception_lignes (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reception_id     BIGINT UNSIGNED NOT NULL,
    bs_ligne_id      BIGINT UNSIGNED NULL,
    code             VARCHAR(60)     NULL,
    designation      VARCHAR(190)    NULL,
    attendu          INT UNSIGNED    NOT NULL,
    recu             INT UNSIGNED    NOT NULL,
    ecart            INT GENERATED ALWAYS AS (CAST(recu AS SIGNED) - CAST(attendu AS SIGNED)) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_reception_lignes (reception_id, bs_ligne_id),
    KEY idx_reception_lignes_bs_ligne (bs_ligne_id),
    CONSTRAINT fk_reception_lignes_reception FOREIGN KEY (reception_id)
        REFERENCES gbs_receptions (id) ON DELETE CASCADE,
    CONSTRAINT fk_reception_lignes_bs_ligne FOREIGN KEY (bs_ligne_id)
        REFERENCES gbs_bs_lignes (id) ON DELETE RESTRICT,
    CONSTRAINT chk_reception_lignes_attendu CHECK (attendu >= 0),
    CONSTRAINT chk_reception_lignes_recu CHECK (recu >= 0),
    CONSTRAINT chk_reception_lignes_supplement CHECK (
        (bs_ligne_id IS NOT NULL AND code IS NULL AND designation IS NULL)
        OR (bs_ligne_id IS NULL AND code IS NOT NULL AND designation IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_mouvements_retour (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero               VARCHAR(20)     NOT NULL, -- MR-XXXXXXXX (aléatoire, préfixe MR)
    bs_ligne_id          BIGINT UNSIGNED NOT NULL,
    num_magasin_retour  INT             NOT NULL, -- [S2M] Num_magasin de magasin
    quantite             INT UNSIGNED    NOT NULL,
    etat_id              BIGINT UNSIGNED NOT NULL,
    nummatr_expediteur   VARCHAR(10)     NULL, -- [S2M] nummatr de personnel_p
    expedie_at           DATETIME        NULL,
    nummatr_recepteur    VARCHAR(10)     NULL, -- [S2M] nummatr de personnel_p
    recu_at              DATETIME        NULL,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_mouvements_numero (numero),
    KEY idx_mouvements_bs_ligne (bs_ligne_id, recu_at),
    KEY idx_mouvements_magasin_retour (num_magasin_retour),
    KEY idx_mouvements_etat (etat_id),
    KEY idx_mouvements_nummatr_expediteur (nummatr_expediteur),
    KEY idx_mouvements_nummatr_recepteur (nummatr_recepteur),
    CONSTRAINT fk_mouvements_bs_ligne FOREIGN KEY (bs_ligne_id)
        REFERENCES gbs_bs_lignes (id) ON DELETE RESTRICT,
    CONSTRAINT fk_mouvements_etat FOREIGN KEY (etat_id)
        REFERENCES gbs_etat_article (id) ON DELETE RESTRICT,
    CONSTRAINT fk_mouvements_nummatr_expediteur FOREIGN KEY (nummatr_expediteur)
        REFERENCES personnel_p (nummatr) ON DELETE SET NULL,
    CONSTRAINT fk_mouvements_nummatr_recepteur FOREIGN KEY (nummatr_recepteur)
        REFERENCES personnel_p (nummatr) ON DELETE SET NULL,
    CONSTRAINT chk_mouvements_quantite CHECK (quantite >= 1),
    CONSTRAINT chk_mouvements_expedition CHECK (expedie_at IS NULL OR nummatr_expediteur IS NOT NULL),
    CONSTRAINT chk_mouvements_reception CHECK (recu_at IS NULL OR nummatr_recepteur IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_anomalies (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero                 VARCHAR(20)     NOT NULL, -- AN-XXXXXXXX (aléatoire, préfixe AN)
    bs_id                  BIGINT UNSIGNED NOT NULL,
    passage_transit_id     BIGINT UNSIGNED NULL,
    num_magasin_controle INT            NOT NULL, -- [S2M] Num_magasin de magasin
    motif                  VARCHAR(190)    NOT NULL,
    description            TEXT            NOT NULL,
    date_limite            DATETIME        NOT NULL,
    statut_id              BIGINT UNSIGNED NOT NULL DEFAULT 1,
    nummatr_createur      VARCHAR(10)     NULL, -- [S2M] nummatr de personnel_p
    created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_resolution        DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_anomalies_numero (numero),
    KEY idx_anomalies_bs_statut_limite (bs_id, statut_id, date_limite),
    KEY idx_anomalies_statut_limite (statut_id, date_limite),
    KEY idx_anomalies_passage (passage_transit_id),
    KEY idx_anomalies_magasin_controle (num_magasin_controle),
    KEY idx_anomalies_nummatr_createur (nummatr_createur),
    CONSTRAINT fk_anomalies_bs FOREIGN KEY (bs_id)
        REFERENCES gbs_bons_sortie (id) ON DELETE RESTRICT,
    CONSTRAINT fk_anomalies_passage FOREIGN KEY (passage_transit_id)
        REFERENCES gbs_passages_transit (id) ON DELETE SET NULL,
    CONSTRAINT fk_anomalies_statut FOREIGN KEY (statut_id)
        REFERENCES gbs_statut_anomalie (id) ON DELETE RESTRICT,
    CONSTRAINT fk_anomalies_nummatr_createur FOREIGN KEY (nummatr_createur)
        REFERENCES personnel_p (nummatr) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Chat d'une anomalie : UNE conversation par anomalie (une anomalie = un fil de
--   discussion), pouvant réunir plusieurs personnels (participants). Il y a donc
--   autant de conversations que d'gbs_anomalies. Le vote de chaque participant
--   (resolue / abandon) est stocké sur sa ligne de participation (dot de statut
--   de l'entité dans la maquette) ; à l'unanimité, l'application bascule
--   l'anomalie en statut 'resolue' ou 'abandonnee'.
CREATE TABLE gbs_anomalie_participants (
    anomalie_id BIGINT UNSIGNED NOT NULL,
    nummatr     VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    vote        VARCHAR(10)     NULL, -- resolue, abandon
    voted_at    DATETIME        NULL,
    PRIMARY KEY (anomalie_id, nummatr),
    KEY idx_anomalie_participants_nummatr (nummatr),
    CONSTRAINT fk_anomalie_participants_anomalie FOREIGN KEY (anomalie_id)
        REFERENCES gbs_anomalies (id) ON DELETE CASCADE,
    CONSTRAINT fk_anomalie_participants_nummatr FOREIGN KEY (nummatr)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT,
    CONSTRAINT chk_anomalie_participants_vote CHECK (vote IS NULL OR vote IN ('resolue', 'abandon'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_anomalie_messages (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    anomalie_id      BIGINT UNSIGNED NOT NULL,
    nummatr_auteur   VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    contenu          TEXT            NOT NULL,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_anomalie_messages_anomalie (anomalie_id, created_at),
    KEY idx_anomalie_messages_nummatr_auteur (nummatr_auteur),
    CONSTRAINT fk_anomalie_messages_anomalie FOREIGN KEY (anomalie_id)
        REFERENCES gbs_anomalies (id) ON DELETE CASCADE,
    CONSTRAINT fk_anomalie_messages_nummatr_auteur FOREIGN KEY (nummatr_auteur)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Statut de lecture d'un message (lu / non lu) : une ligne par (message, lecteur).
-- Un message est 'lu' pour un participant dès qu'une ligne existe (lu_at = moment
-- de lecture) ; l'application calcule le nombre de messages non lus d'un participant
-- via les messages de l'anomalie sans ligne ici.
CREATE TABLE gbs_anomalie_message_lus (
    message_id BIGINT UNSIGNED NOT NULL,
    nummatr    VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    lu_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, nummatr),
    KEY idx_anomalie_message_lus_nummatr (nummatr),
    CONSTRAINT fk_anomalie_message_lus_message FOREIGN KEY (message_id)
        REFERENCES gbs_anomalie_messages (id) ON DELETE CASCADE,
    CONSTRAINT fk_anomalie_message_lus_nummatr FOREIGN KEY (nummatr)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- Pièces jointes d'un message du chat d'anomalie (un message peut en avoir
-- plusieurs ; l'auteur du message est l'uploader).
CREATE TABLE gbs_anomalie_message_fichiers (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    message_id    BIGINT UNSIGNED NOT NULL,
    nom_original  VARCHAR(255)    NOT NULL,
    type_mime     VARCHAR(100)    NOT NULL,
    taille_octets BIGINT UNSIGNED NOT NULL,
    cle_objet     VARCHAR(255)    NOT NULL,
    created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_anomalie_message_fichiers_message (message_id),
    CONSTRAINT fk_anomalie_message_fichiers_message FOREIGN KEY (message_id)
        REFERENCES gbs_anomalie_messages (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_notifications (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nummatr_destinataire  VARCHAR(10)     NOT NULL, -- [S2M] nummatr de personnel_p
    type_evenement        VARCHAR(50)     NOT NULL, -- anomalie_declaree, anomalie_resolue, envoi_bs, reception_bs, passage_transit_enregistre, retard_anomalie, retard_retour, validation_attente, validation_effectuee, bs_cloture, rapport_periodique
    titre                 VARCHAR(190)    NOT NULL,
    contenu               VARCHAR(1000)   NULL,
    objet_type            VARCHAR(30)     NULL, -- bs, anomalie, passage_transit, mouvement_retour
    objet_id              BIGINT UNSIGNED NULL,
    lu_at                 DATETIME        NULL,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_destinataire (nummatr_destinataire, lu_at, created_at),
    CONSTRAINT fk_notifications_nummatr_destinataire FOREIGN KEY (nummatr_destinataire)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_notification_rules (
    type_evenement  VARCHAR(50)     NOT NULL, -- anomalie_declaree, anomalie_resolue, envoi_bs, reception_bs, passage_transit_enregistre, retard_anomalie, retard_retour, validation_attente, validation_effectuee, bs_cloture, rapport_periodique
    nom_fonction    VARCHAR(100)    NOT NULL, -- [S2M] nom_fonction de fonction_p
    active          TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (type_evenement, nom_fonction),
    KEY idx_notification_rules_nom_fonction (nom_fonction),
    CONSTRAINT fk_notification_rules_nom_fonction FOREIGN KEY (nom_fonction)
        REFERENCES fonction_p (nom_fonction) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

CREATE TABLE gbs_menu_permissions (
    id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom_fonction VARCHAR(100)    NULL, -- [S2M] nom_fonction de fonction_p (cible = rôle)
    nummatr      VARCHAR(10)     NULL, -- [S2M] nummatr de personnel_p (cible = personne)
    section      VARCHAR(30)     NOT NULL,
    autorise     TINYINT(1)      NOT NULL DEFAULT 1,
    updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_menu_permissions (nom_fonction, nummatr, section),
    KEY idx_menu_permissions_nummatr (nummatr),
    CONSTRAINT fk_menu_permissions_nom_fonction FOREIGN KEY (nom_fonction)
        REFERENCES fonction_p (nom_fonction) ON DELETE RESTRICT,
    CONSTRAINT fk_menu_permissions_nummatr FOREIGN KEY (nummatr)
        REFERENCES personnel_p (nummatr) ON DELETE RESTRICT,
    CONSTRAINT chk_menu_permissions_cible CHECK (
        (nom_fonction IS NOT NULL AND nummatr IS NULL)
        OR (nom_fonction IS NULL AND nummatr IS NOT NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

