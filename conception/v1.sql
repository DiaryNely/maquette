--
-- Tables utilisant les UTILISATEURS (S2M) : transporteurs, bons_sortie,
-- passages_transit, receptions, mouvements_retour, anomalies, anomalie_messages,
-- anomalie_votes, anomalie_fichiers, notifications, audit_evenements.
-- Tables utilisant les SITES (S2M) : bons_sortie, passages_transit, receptions,
-- mouvements_retour, anomalies.
-- Tables utilisant les RÔLES (S2M) : notification_rules, menu_permissions.

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS s2m_bons_sortie
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE s2m_bons_sortie;

CREATE TABLE statut_bs (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_statut_bs_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO statut_bs (id, code, libelle) VALUES
(1, 'brouillon', 'Brouillon'),
(2, 'soumis', 'Soumis'),
(3, 'en_validation', 'En validation'),
(4, 'valide', 'Validé'),
(5, 'en_transit', 'En transit'),
(6, 'en_attente_confirmation', 'En attente de confirmation'),
(7, 'receptionne', 'Réceptionné'),
(8, 'cloture', 'Clôturé'),
(9, 'refuse', 'Refusé'),
(10, 'annule', 'Annulé');

CREATE TABLE type_article (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_type_article_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO type_article (id, code, libelle) VALUES
(1, 'Article', 'Article'),
(2, 'Info', 'Informatique'),
(3, 'Immo', 'Immobilier'),
(4, 'Fourniture', 'Fourniture'),
(5, 'Autre', 'Autre');

CREATE TABLE etat_article (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_etat_article_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO etat_article (id, code, libelle) VALUES
(1, 'Neuf', 'Neuf'),
(2, 'Bon etat', 'Bon état'),
(3, 'Usage', 'Usage'),
(4, 'A reformer', 'À réformer');

CREATE TABLE statut_etape (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_statut_etape_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO statut_etape (id, code, libelle) VALUES
(1, 'en_attente', 'En attente'),
(2, 'valide', 'Validé'),
(3, 'refuse', 'Refusé');

CREATE TABLE resultat_passage (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resultat_passage_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO resultat_passage (id, code, libelle) VALUES
(1, 'a_controler', 'À contrôler'),
(2, 'conforme', 'Conforme'),
(3, 'non_conforme', 'Non conforme');

CREATE TABLE statut_anomalie (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_statut_anomalie_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO statut_anomalie (id, code, libelle) VALUES
(1, 'ouverte', 'Ouverte'),
(2, 'en_retard', 'En retard'),
(3, 'resolue', 'Résolue'),
(4, 'abandonnee', 'Abandonnée'),
(5, 'cloturee', 'Clôturée');

CREATE TABLE vote_anomalie (
    id      BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code    VARCHAR(50)     NOT NULL,
    libelle VARCHAR(100)    NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vote_anomalie_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO vote_anomalie (id, code, libelle) VALUES
(1, 'resolue', 'Résolue'),
(2, 'abandon', 'Abandon');

--moyen acheminement
CREATE TABLE transporteurs (
    id                 BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nom                VARCHAR(190)    NOT NULL,
    contact            VARCHAR(190)    NOT NULL,
    type_transport     VARCHAR(60)     NOT NULL,
    cree_par_user_id   VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    created_at         DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_transporteurs_nom (nom)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE number_sequences (
    prefixe          VARCHAR(10)          NOT NULL,
    annee            SMALLINT UNSIGNED    NOT NULL,
    prochaine_valeur INT UNSIGNED         NOT NULL DEFAULT 1,
    PRIMARY KEY (prefixe, annee)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bons_sortie (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero                 VARCHAR(20)     NOT NULL,
    initiateur_user_id     VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    beneficiaire_user_id   VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    site_origine_id        VARCHAR(20)     NOT NULL, -- [S2M] code du site S2M-WEB
    site_destination_id    VARCHAR(20)     NOT NULL, -- [S2M] code du site S2M-WEB
    transporteur_id        BIGINT UNSIGNED NULL,
    motif                  VARCHAR(190)    NULL,
    commentaire            VARCHAR(1000)   NULL,
    date_sortie_souhaitee  DATE            NULL,
    date_limite_retour     DATE            NULL,
    statut_id              BIGINT UNSIGNED NOT NULL DEFAULT 1,
    qr_payload             VARCHAR(190)    NULL,
    qr_signature           VARCHAR(128)    NULL,
    date_emission          DATETIME        NULL,
    created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bons_sortie_numero (numero),
    KEY idx_bs_origine_statut_created (site_origine_id, statut_id, created_at),
    KEY idx_bs_destination_statut_created (site_destination_id, statut_id, created_at),
    KEY idx_bs_statut (statut_id),
    CONSTRAINT fk_bs_transporteur FOREIGN KEY (transporteur_id)
        REFERENCES transporteurs (id) ON DELETE SET NULL,
    CONSTRAINT fk_bs_statut FOREIGN KEY (statut_id)
        REFERENCES statut_bs (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bs_lignes (
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
    CONSTRAINT fk_bs_lignes_bs FOREIGN KEY (bs_id)
        REFERENCES bons_sortie (id) ON DELETE CASCADE,
    CONSTRAINT fk_bs_lignes_type_article FOREIGN KEY (type_article_id)
        REFERENCES type_article (id) ON DELETE RESTRICT,
    CONSTRAINT fk_bs_lignes_etat FOREIGN KEY (etat_id)
        REFERENCES etat_article (id) ON DELETE RESTRICT,
    CONSTRAINT chk_bs_lignes_quantite CHECK (quantite >= 1),
    CONSTRAINT chk_bs_lignes_retour CHECK (a_rendre = 0 OR date_retour_prevue IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE bs_etapes (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bs_id            BIGINT UNSIGNED NOT NULL,
    etape            VARCHAR(20)     NOT NULL,
    statut_id        BIGINT UNSIGNED NOT NULL DEFAULT 1,
    acteur_user_id   VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    decision_at      DATETIME        NULL,
    motif_refus      VARCHAR(500)    NULL,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bs_etapes (bs_id, etape),
    CONSTRAINT fk_bs_etapes_bs FOREIGN KEY (bs_id)
        REFERENCES bons_sortie (id) ON DELETE CASCADE,
    CONSTRAINT fk_bs_etapes_statut FOREIGN KEY (statut_id)
        REFERENCES statut_etape (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE passages_transit (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero            VARCHAR(20)     NOT NULL,
    bs_id             BIGINT UNSIGNED NOT NULL,
    site_id           VARCHAR(20)     NOT NULL, -- [S2M] code du site S2M-WEB
    agent_user_id     VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    scanned_at        DATETIME(3)     NOT NULL,
    resultat_id       BIGINT UNSIGNED NOT NULL DEFAULT 1,
    note              VARCHAR(500)    NULL,
    idempotency_key   VARCHAR(64)     NULL,
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_passages_numero (numero),
    UNIQUE KEY uq_passages_bs_site (bs_id, site_id),
    UNIQUE KEY uq_passages_idempotency (idempotency_key),
    KEY idx_passages_bs_scanned (bs_id, scanned_at),
    KEY idx_passages_site (site_id),
    CONSTRAINT fk_passages_bs FOREIGN KEY (bs_id)
        REFERENCES bons_sortie (id) ON DELETE RESTRICT,
    CONSTRAINT fk_passages_resultat FOREIGN KEY (resultat_id)
        REFERENCES resultat_passage (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE receptions (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bs_id                 BIGINT UNSIGNED NOT NULL,
    site_id               VARCHAR(20)     NOT NULL, -- [S2M] code du site S2M-WEB
    agent_user_id         VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    constat_at            DATETIME        NOT NULL,
    confirmed_by_user_id  VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    confirmed_at          DATETIME        NULL,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_receptions_bs (bs_id),
    KEY idx_receptions_site (site_id),
    CONSTRAINT fk_receptions_bs FOREIGN KEY (bs_id)
        REFERENCES bons_sortie (id) ON DELETE RESTRICT,
    CONSTRAINT chk_receptions_confirmation CHECK (confirmed_at IS NULL OR confirmed_by_user_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE reception_lignes (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    reception_id     BIGINT UNSIGNED NOT NULL,
    bs_ligne_id      BIGINT UNSIGNED NOT NULL,
    attendu          INT UNSIGNED    NOT NULL,
    recu             INT UNSIGNED    NOT NULL,
    ecart            INT GENERATED ALWAYS AS (CAST(recu AS SIGNED) - CAST(attendu AS SIGNED)) VIRTUAL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_reception_lignes (reception_id, bs_ligne_id),
    KEY idx_reception_lignes_bs_ligne (bs_ligne_id),
    CONSTRAINT fk_reception_lignes_reception FOREIGN KEY (reception_id)
        REFERENCES receptions (id) ON DELETE CASCADE,
    CONSTRAINT fk_reception_lignes_bs_ligne FOREIGN KEY (bs_ligne_id)
        REFERENCES bs_lignes (id) ON DELETE RESTRICT,
    CONSTRAINT chk_reception_lignes_attendu CHECK (attendu >= 0),
    CONSTRAINT chk_reception_lignes_recu CHECK (recu >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE mouvements_retour (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    bs_ligne_id          BIGINT UNSIGNED NOT NULL,
    site_retour_id       VARCHAR(20)     NOT NULL, -- [S2M] code du site S2M-WEB
    quantite             INT UNSIGNED    NOT NULL,
    etat_id              BIGINT UNSIGNED NOT NULL,
    expedie_par_user_id  VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    expedie_at           DATETIME        NULL,
    recu_par_user_id     VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    recu_at              DATETIME        NULL,
    created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_mouvements_bs_ligne (bs_ligne_id, recu_at),
    KEY idx_mouvements_site (site_retour_id),
    CONSTRAINT fk_mouvements_bs_ligne FOREIGN KEY (bs_ligne_id)
        REFERENCES bs_lignes (id) ON DELETE RESTRICT,
    CONSTRAINT fk_mouvements_etat FOREIGN KEY (etat_id)
        REFERENCES etat_article (id) ON DELETE RESTRICT,
    CONSTRAINT chk_mouvements_quantite CHECK (quantite >= 1),
    CONSTRAINT chk_mouvements_expedition CHECK (expedie_at IS NULL OR expedie_par_user_id IS NOT NULL),
    CONSTRAINT chk_mouvements_reception CHECK (recu_at IS NULL OR recu_par_user_id IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE anomalies (
    id                     BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    numero                 VARCHAR(20)     NOT NULL,
    bs_id                  BIGINT UNSIGNED NOT NULL,
    passage_transit_id     BIGINT UNSIGNED NULL,
    point_controle_site_id VARCHAR(20)     NOT NULL, -- [S2M] code du site S2M-WEB
    motif                  VARCHAR(190)    NOT NULL,
    description            TEXT            NOT NULL,
    date_limite            DATETIME        NOT NULL,
    statut_id              BIGINT UNSIGNED NOT NULL DEFAULT 1,
    cree_par_user_id       VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    created_at             DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_resolution        DATETIME        NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_anomalies_numero (numero),
    KEY idx_anomalies_bs_statut_limite (bs_id, statut_id, date_limite),
    KEY idx_anomalies_statut_limite (statut_id, date_limite),
    KEY idx_anomalies_passage (passage_transit_id),
    CONSTRAINT fk_anomalies_bs FOREIGN KEY (bs_id)
        REFERENCES bons_sortie (id) ON DELETE RESTRICT,
    CONSTRAINT fk_anomalies_passage FOREIGN KEY (passage_transit_id)
        REFERENCES passages_transit (id) ON DELETE SET NULL,
    CONSTRAINT fk_anomalies_statut FOREIGN KEY (statut_id)
        REFERENCES statut_anomalie (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE anomalie_messages (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    anomalie_id      BIGINT UNSIGNED NOT NULL,
    entite           VARCHAR(20)     NOT NULL, -- transit, securite, magasin
    auteur_user_id   VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    contenu          TEXT            NOT NULL,
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_anomalie_messages (anomalie_id, created_at),
    CONSTRAINT fk_anomalie_messages_anomalie FOREIGN KEY (anomalie_id)
        REFERENCES anomalies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE anomalie_votes (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    anomalie_id      BIGINT UNSIGNED NOT NULL,
    entite           VARCHAR(20)     NOT NULL, -- transit, securite, magasin
    vote_id          BIGINT UNSIGNED NOT NULL,
    auteur_user_id   VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    created_at       DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_anomalie_votes (anomalie_id, entite),
    CONSTRAINT fk_anomalie_votes_anomalie FOREIGN KEY (anomalie_id)
        REFERENCES anomalies (id) ON DELETE CASCADE,
    CONSTRAINT fk_anomalie_votes_vote FOREIGN KEY (vote_id)
        REFERENCES vote_anomalie (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE anomalie_fichiers (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    anomalie_id       BIGINT UNSIGNED NOT NULL,
    nom_original      VARCHAR(255)    NOT NULL,
    type_mime         VARCHAR(100)    NOT NULL,
    taille_octets     BIGINT UNSIGNED NOT NULL,
    cle_objet         VARCHAR(255)    NOT NULL,
    upload_par_user_id VARCHAR(30)    NULL, -- [S2M] matricule utilisateur S2M-WEB
    created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_anomalie_fichiers (anomalie_id),
    CONSTRAINT fk_anomalie_fichiers_anomalie FOREIGN KEY (anomalie_id)
        REFERENCES anomalies (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notifications (
    id                    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    destinataire_user_id  VARCHAR(30)     NOT NULL, -- [S2M] matricule utilisateur S2M-WEB
    type_evenement        VARCHAR(50)     NOT NULL, -- anomalie_declaree, anomalie_resolue, envoi_bs, reception_bs, passage_transit_enregistre, retard_anomalie, retard_retour, validation_attente, validation_effectuee, bs_cloture, rapport_periodique
    titre                 VARCHAR(190)    NOT NULL,
    contenu               VARCHAR(1000)   NULL,
    objet_type            VARCHAR(30)     NULL, -- bs, anomalie, passage_transit, mouvement_retour
    objet_id              BIGINT UNSIGNED NULL,
    lu_at                 DATETIME        NULL,
    created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_destinataire (destinataire_user_id, lu_at, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notification_rules (
    type_evenement  VARCHAR(50)     NOT NULL, -- anomalie_declaree, anomalie_resolue, envoi_bs, reception_bs, passage_transit_enregistre, retard_anomalie, retard_retour, validation_attente, validation_effectuee, bs_cloture, rapport_periodique
    role_cible      VARCHAR(30)     NOT NULL, -- [S2M] clé de rôle S2M-WEB
    active          TINYINT(1)      NOT NULL DEFAULT 1,
    PRIMARY KEY (type_evenement, role_cible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE menu_permissions (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    cible_type  VARCHAR(10)     NOT NULL,
    cible       VARCHAR(40)     NOT NULL, -- [S2M] clé de rôle ou matricule S2M-WEB
    section     VARCHAR(30)     NOT NULL,
    autorise    TINYINT(1)      NOT NULL DEFAULT 1,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_menu_permissions (cible_type, cible, section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE audit_evenements (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    created_at       DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    acteur_user_id   VARCHAR(30)     NULL, -- [S2M] matricule utilisateur S2M-WEB
    action           VARCHAR(50)     NOT NULL,
    objet_type       VARCHAR(30)     NOT NULL, -- bs, bs_ligne, passage_transit, reception, reception_ligne, mouvement_retour, anomalie, anomalie_message, anomalie_vote, notification, transporteur, site, utilisateur, menu_permission, notification_rule
    objet_id         BIGINT UNSIGNED NOT NULL,
    donnees          JSON            NULL,
    ip               VARCHAR(45)     NULL,
    PRIMARY KEY (id),
    KEY idx_audit_objet (objet_type, objet_id, created_at),
    KEY idx_audit_date (created_at),
    KEY idx_audit_acteur (acteur_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;