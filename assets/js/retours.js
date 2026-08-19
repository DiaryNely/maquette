/* ============================================================
   RETOURS — cycle des articles « à rendre » (mockup S2M-WEB)

   Un article marqué « à rendre » ne se résume pas à un statut :
   c'est un cycle de mouvement d'un article entre deux parties.

       Envoi → réception (constat transit) → obligation de retour
             → renvoi (expédition) → réception du retour → clôture

   L'obligation de retour est créée / activée à la réception d'une
   ligne « à rendre » (le destinataire devient responsable du
   retour), toujours rattachée à la ligne d'article ET au BS
   d'origine (jamais déconnectée de l'opération initiale), et suit
   les quantités réellement restituées (retours partiels possibles).
   La clôture n'intervient que lorsque la quantité due est
   entièrement rendue ; tout l'historique des mouvements est
   conservé sur chaque obligation.

   Persistance : localStorage (clé s2m.retours.v2).
   En-têtes des BS : bs-list.js (window.S2M.bsList).
   Lignes d'articles : catalogue partagé ci-dessous (aligné sur les
   BS_DETAILS du module transit pour les bons de démo).
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 's2m.retours.v2';

    /* Utilisateur connecté (simulé) : Rakotobe Hery — Magasin central.
       La version réelle lira la session utilisateur. */
    var CURRENT_USER = 'Rakotobe Hery';

    /* --- Catalogue des lignes d'articles (référentiel de démo) ---
       aRendre : la ligne est une sortie temporaire, l'article doit
       revenir au magasin d'origine ; dateRetour : date prévue de
       restitution (saisie à la création du BS, § demande). */
    var LIGNES = {
        'BS-2026-0142': [
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 10, etat: 'Neuf', aRendre: false },
            { code: 'MAT-011', designation: 'Écran 24" Dell P2422H', qte: 2, etat: 'Bon état', aRendre: true, dateRetour: '12/09/2026' },
            { code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1, etat: 'Neuf', aRendre: true, dateRetour: '12/09/2026' },
            { code: 'FOU-031', designation: 'Boîte de stylos à bille bleu (12)', qte: 5, etat: 'Neuf', aRendre: false }
        ],
        'BS-2026-0138': [
            { code: 'MAT-022', designation: 'Écran 22" Dell E2222H', qte: 2, etat: 'Neuf', aRendre: false },
            { code: 'FOU-045', designation: 'Clavier + souris USB (lot)', qte: 3, etat: 'Neuf', aRendre: false },
            { code: 'MAT-030', designation: 'Onduleur 1000 VA', qte: 1, etat: 'Neuf', aRendre: true, dateRetour: '20/09/2026' }
        ],
        'BS-2026-0134': [
            { code: 'MAT-088', designation: 'Multimètre Fluke 179', qte: 1, etat: 'Bon état', aRendre: true, dateRetour: '14/08/2026' },
            { code: 'MAT-091', designation: 'Pince ampèremétrique', qte: 1, etat: 'Neuf', aRendre: false }
        ],
        'BS-2026-0130': [
            { code: 'MAT-045', designation: 'Perceuse à percussion Bosch', qte: 1, etat: 'Bon état', aRendre: true, dateRetour: '05/08/2026' },
            { code: 'MAT-040', designation: 'Visseuse sans fil', qte: 1, etat: 'Neuf', aRendre: false }
        ]
    };

    function linesOf(bs) { return LIGNES[bs] || []; }

    function lineOf(bs, code) {
        var lines = linesOf(bs);
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].code === code) return lines[i];
        }
        return null;
    }

    /* --- En-têtes des BS (bs-list.js) --- */

    function bsList() { return (window.S2M && window.S2M.bsList) || []; }

    function bsOf(ref) {
        var list = bsList();
        for (var i = 0; i < list.length; i++) {
            if (list[i].bs === ref) return list[i];
        }
        return null;
    }

    /* --- Utilitaires --- */

    function currentRole() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/')[0] || null;
    }

    function pageName() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/').pop() || '';
    }

    function currentUser() {
        return currentRole() === 'admin' ? 'Administrateur - Automat SI' : 'Rakotobe Hery (Personnel)';
    }

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function now() {
        var d = new Date();
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
            ' à ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* Date « JJ/MM/AAAA » déjà passée (retour en retard) */
    function isDatePassee(d) {
        if (!d) return false;
        var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
        if (!m) return false;
        var due = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    }

    /* --- Persistance des obligations --- */

    function load() {
        var raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
        if (raw) {
            try {
                var list = JSON.parse(raw);
                if (Array.isArray(list)) return list;
            } catch (e) { /* données corrompues : on repart des données de démo */ }
        }
        var seed = seedData();
        save(seed);
        return seed;
    }

    function save(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
    }

    function nextId(list) {
        var max = 0;
        for (var i = 0; i < list.length; i++) {
            var m = /(\d+)$/.exec(list[i].id || '');
            if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        return 'RET-2026-' + String(max + 1).padStart(4, '0');
    }

    function findObligation(list, bs, code) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].bs === bs && list[i].code === code) return list[i];
        }
        return null;
    }

    /* Données de démo : obligations déjà engagées (réception déjà
       constatée), cohérentes avec le catalogue et les BS. Les statuts
       sont recalculés depuis les quantités — jamais stockés. */
    function seedData() {
        return [
            {
                id: 'RET-2026-0001', bs: 'BS-2026-0142', code: 'MAT-011',
                designation: 'Écran 24" Dell P2422H', qteDue: 2, qteRendue: 0, qteEnTransit: 0,
                dateRetourPrevue: '12/09/2026', responsable: 'Rasoanirina Miora',
                reception: { date: '15/08/2026 à 10:00', par: 'Rabemananjara Solo (Transit)', qte: 2 },
                mouvements: [
                    { type: 'reception', date: '15/08/2026 à 10:00', par: 'Rabemananjara Solo (Transit)', qte: 2 }
                ],
                createdAt: 0
            },
            {
                id: 'RET-2026-0002', bs: 'BS-2026-0142', code: 'MAT-008',
                designation: 'Ordinateur portable Dell Latitude 5440', qteDue: 1, qteRendue: 0, qteEnTransit: 1,
                dateRetourPrevue: '12/09/2026', responsable: 'Rasoanirina Miora',
                reception: { date: '15/08/2026 à 10:00', par: 'Rabemananjara Solo (Transit)', qte: 1 },
                mouvements: [
                    { type: 'reception', date: '15/08/2026 à 10:00', par: 'Rabemananjara Solo (Transit)', qte: 1 },
                    { type: 'renvoi', date: '17/08/2026 à 15:30', par: 'Rakotobe Hery (Personnel)', qte: 1, canal: 'transit' }
                ],
                createdAt: 1
            },
            {
                id: 'RET-2026-0003', bs: 'BS-2026-0138', code: 'MAT-030',
                designation: 'Onduleur 1000 VA', qteDue: 1, qteRendue: 0, qteEnTransit: 0,
                dateRetourPrevue: '20/09/2026', responsable: 'Razafindrakoto Lova',
                reception: { date: '10/08/2026 à 09:20', par: 'Rabemananjara Solo (Transit)', qte: 1 },
                mouvements: [
                    { type: 'reception', date: '10/08/2026 à 09:20', par: 'Rabemananjara Solo (Transit)', qte: 1 }
                ],
                createdAt: 2
            },
            {
                id: 'RET-2026-0004', bs: 'BS-2026-0130', code: 'MAT-045',
                designation: 'Perceuse à percussion Bosch', qteDue: 1, qteRendue: 1, qteEnTransit: 0,
                dateRetourPrevue: '05/08/2026', responsable: 'Razafindrakoto Lova',
                reception: { date: '28/07/2026 à 11:00', par: 'Rabemananjara Solo (Transit)', qte: 1 },
                mouvements: [
                    { type: 'reception', date: '28/07/2026 à 11:00', par: 'Rabemananjara Solo (Transit)', qte: 1 },
                    { type: 'renvoi', date: '03/08/2026 à 14:10', par: 'Rakotobe Hery (Personnel)', qte: 1, canal: 'transit' },
                    { type: 'retour_recu', date: '05/08/2026 à 09:45', par: 'Rakotobe Hery (Personnel)', qte: 1 },
                    { type: 'cloture', date: '05/08/2026 à 09:45', par: 'Rakotobe Hery (Personnel)' }
                ],
                createdAt: 3
            },
            {
                id: 'RET-2026-0005', bs: 'BS-2026-0134', code: 'MAT-088',
                designation: 'Multimètre Fluke 179', qteDue: 1, qteRendue: 0, qteEnTransit: 0,
                dateRetourPrevue: '14/08/2026', responsable: 'Rakotobe Hery',
                reception: { date: '01/08/2026 à 08:30', par: 'Rabemananjara Solo (Transit)', qte: 1 },
                mouvements: [
                    { type: 'reception', date: '01/08/2026 à 08:30', par: 'Rabemananjara Solo (Transit)', qte: 1 }
                ],
                createdAt: 4
            }
        ];
    }

    /* --- Cycle métier --- */

    var STATUT_LABEL = {
        en_attente: 'En attente',
        en_retard: 'En retard',
        retour_expedie: 'Retour expédié',
        cloture: 'Clôturé'
    };

    var STATUT_CLASS = {
        en_attente: 'badge--encours',
        en_retard: 'badge--retard',
        retour_expedie: 'badge--info',
        cloture: 'badge--valide'
    };

    /* Statut calculé depuis les quantités (jamais stocké) :
       - tout le dû est rendu → clôture ;
       - un renvoi est en cours → retour expédié (en attente de
         réception au magasin d'origine) ;
       - sinon, la date prévue est dépassée → en retard. */
    function statutOf(o) {
        if (o.qteRendue >= o.qteDue) return 'cloture';
        if (o.qteEnTransit > 0) return 'retour_expedie';
        if (isDatePassee(o.dateRetourPrevue)) return 'en_retard';
        return 'en_attente';
    }

    /* Libellé du badge selon la vue (le bénéficiaire « doit rendre »,
       l'initiateur « attend le retour »). */
    function labelFor(st, role) {
        if (st === 'cloture') return 'Clôturé';
        if (st === 'retour_expedie') return 'Retour expédié';
        if (role === 'admin' || activeTab === 'tab2') {
            return st === 'en_attente' ? 'Chez le bénéficiaire' : 'Retard de renvoi';
        }
        return st === 'en_attente' ? 'À retourner' : 'En retard';
    }

    /* Obligations enrichies des en-têtes de BS et du catalogue */
    function obligations() {
        var list = load();
        return list.map(function (o) {
            var b = bsOf(o.bs) || {};
            var line = lineOf(o.bs, o.code) || {};
            return {
                id: o.id,
                bs: o.bs,
                code: o.code,
                designation: line.designation || o.designation || o.code,
                qteDue: o.qteDue,
                qteRendue: o.qteRendue,
                qteEnTransit: o.qteEnTransit,
                dateRetourPrevue: o.dateRetourPrevue || line.dateRetour || '',
                responsable: o.responsable || b.beneficiaire || '',
                initiateur: b.initiateur || '',
                beneficiaire: b.beneficiaire || '',
                origine: b.origine || '',
                destination: b.destination || '',
                reception: o.reception || null,
                mouvements: o.mouvements || [],
                createdAt: o.createdAt || 0
            };
        });
    }

    /* 1. RÉCEPTION — active / crée l'obligation de retour.
       Appelé après l'enregistrement du constat de réception (transit,
       § transit.js) : chaque ligne « à rendre » réellement reçue crée
       (ou met à jour) l'obligation rattachée à (BS, ligne). Le
       destinataire devient responsable du retour. */
    function activateFromReception(bs, lignes) {
        var list = load();
        var changed = false;
        (lignes || []).forEach(function (l) {
            if (!l || !l.aRendre || !(parseInt(l.recu, 10) > 0)) return;
            var qte = parseInt(l.recu, 10);
            var line = lineOf(bs, l.code) || {};
            var b = bsOf(bs) || {};
            var ob = findObligation(list, bs, l.code);
            if (!ob) {
                ob = {
                    id: nextId(list),
                    bs: bs,
                    code: l.code,
                    designation: line.designation || l.code,
                    qteDue: qte,
                    qteRendue: 0,
                    qteEnTransit: 0,
                    dateRetourPrevue: l.dateRetour || line.dateRetour || '',
                    responsable: b.beneficiaire || '',
                    reception: { date: now(), par: currentUser(), qte: qte },
                    mouvements: [{ type: 'reception', date: now(), par: currentUser(), qte: qte }],
                    createdAt: Date.now()
                };
                list.push(ob);
                changed = true;
            } else {
                /* réception déjà connue (re-scan / retour partiel) : on
                   aligne la quantité due sur la quantité réellement reçue */
                ob.qteDue = Math.max(parseInt(ob.qteDue, 10) || 0, qte);
                ob.reception = { date: now(), par: currentUser(), qte: qte };
                ob.mouvements.push({ type: 'reception', date: now(), par: currentUser(), qte: qte });
                changed = true;
            }
        });
        if (changed) save(list);
        return list;
    }

    /* 2. RENVOI — le destinataire expédie le retour vers le magasin
       d'origine. La quantité renvoyée peut être partielle ; le retour
       conserve le lien avec le BS et la ligne d'origine. */
    function expedier(bs, code, qte) {
        var list = load();
        var ob = findObligation(list, bs, code);
        if (!ob) return { ok: false, message: 'Aucune obligation de retour pour cet article.' };
        qte = parseInt(qte, 10);
        if (isNaN(qte) || qte <= 0) return { ok: false, message: 'Quantité invalide.' };
        var restant = ob.qteDue - ob.qteRendue - ob.qteEnTransit;
        if (qte > restant) {
            return { ok: false, message: 'Quantité supérieure au restant dû (' + restant + ' unité(s)).' };
        }
        ob.qteEnTransit += qte;
        ob.mouvements.push({ type: 'renvoi', date: now(), par: currentUser(), qte: qte, canal: 'transit' });
        save(list);
        return { ok: true, ob: ob };
    }

    /* 3. RÉCEPTION DU RETOUR — le magasin d'origine constate la
       quantité réellement rendue. La clôture n'intervient que lorsque
       la totalité du dû est restituée (retours partiels possibles). */
    function recevoirRetour(bs, code, qte) {
        var list = load();
        var ob = findObligation(list, bs, code);
        if (!ob) return { ok: false, message: 'Aucune obligation de retour pour cet article.' };
        qte = parseInt(qte, 10);
        if (isNaN(qte) || qte <= 0) return { ok: false, message: 'Quantité invalide.' };
        if (qte > ob.qteEnTransit) {
            return { ok: false, message: 'Quantité supérieure à celle expédiée (' + ob.qteEnTransit + ' unité(s)).' };
        }
        ob.qteRendue += qte;
        ob.qteEnTransit -= qte;
        ob.mouvements.push({ type: 'retour_recu', date: now(), par: currentUser(), qte: qte });
        if (ob.qteRendue >= ob.qteDue) {
            ob.mouvements.push({ type: 'cloture', date: now(), par: currentUser() });
        }
        save(list);
        return { ok: true, ob: ob };
    }

    /* --- Rendu : page « Suivi des retours » --- */

    var activeTab = 'tab1';
    var pendingAction = null;

    function initTabs() {
        var tabsContainer = document.querySelector('[data-retours-tabs]');
        if (!tabsContainer) return;

        var role = currentRole();
        var html = '';

        if (role === 'admin') {
            html = '<button class="mock-tab ' + (activeTab === 'tab1' ? 'active' : '') + '" data-tab="tab1" type="button">' +
                '    <i class="fa-solid fa-hourglass-half"></i> Retours en attente' +
                '</button>' +
                '<button class="mock-tab ' + (activeTab === 'tab2' ? 'active' : '') + '" data-tab="tab2" type="button">' +
                '    <i class="fa-solid fa-circle-check"></i> Retours effectués' +
                '</button>';
        } else {
            /* Personnel : deux sens du cycle */
            html = '<button class="mock-tab ' + (activeTab === 'tab1' ? 'active' : '') + '" data-tab="tab1" type="button">' +
                '    <i class="fa-solid fa-arrow-right-from-bracket"></i> Je dois rendre' +
                '</button>' +
                '<button class="mock-tab ' + (activeTab === 'tab2' ? 'active' : '') + '" data-tab="tab2" type="button">' +
                '    <i class="fa-solid fa-arrow-right-to-bracket"></i> On doit me rendre' +
                '</button>';
        }

        tabsContainer.innerHTML = html;

        tabsContainer.querySelectorAll('[data-tab]').forEach(function (tabBtn) {
            tabBtn.addEventListener('click', function () {
                activeTab = this.getAttribute('data-tab');
                initTabs();
                apply();
            });
        });
    }

    function buildList(role) {
        var all = obligations();
        if (role === 'admin') {
            return all.filter(function (o) {
                return activeTab === 'tab1' ? statutOf(o) !== 'cloture' : statutOf(o) === 'cloture';
            });
        }
        if (activeTab === 'tab1') {
            /* « Je dois rendre » : je suis le destinataire / responsable
               du retour (j'ai reçu l'article à rendre). */
            return all.filter(function (o) { return o.responsable === CURRENT_USER; });
        }
        /* « On doit me rendre » : je suis l'initiateur (j'ai envoyé
           l'article, il doit revenir vers moi). */
        return all.filter(function (o) { return o.initiateur === CURRENT_USER; });
    }

    function suiviHtml(o, st, role) {
        var label = labelFor(st, role);
        var badgeClass = STATUT_CLASS[st] || 'badge--info';
        var detail;
        if (st === 'cloture') {
            detail = 'Restitué : ' + o.qteRendue + '/' + o.qteDue;
        } else if (st === 'retour_expedie') {
            detail = 'Expédié : ' + o.qteEnTransit + (o.qteRendue > 0 ? ' · rendu : ' + o.qteRendue + '/' + o.qteDue : '');
        } else {
            detail = 'Dû : ' + o.qteDue + (o.qteRendue > 0 ? ' · rendu : ' + o.qteRendue : '');
        }
        return '<span class="badge-status ' + badgeClass + '">' + label + '</span>' +
            '<div class="cell-muted" style="font-size:0.72rem; margin-top:2px;">' + detail + '</div>';
    }

    function movementsHtml(o) {
        if (!o.mouvements || !o.mouvements.length) {
            return '<span class="cell-muted">Aucun mouvement enregistré pour ce retour.</span>';
        }
        return '<div class="timeline timeline--mini">' + o.mouvements.map(function (m) {
            var icon;
            var label;
            if (m.type === 'reception') { icon = 'fa-box-open'; label = 'Réception (contrôle à la réception)'; }
            else if (m.type === 'renvoi') { icon = 'fa-paper-plane'; label = 'Renvoi (expédition du retour)'; }
            else if (m.type === 'retour_recu') { icon = 'fa-circle-check'; label = 'Réception du retour'; }
            else if (m.type === 'cloture') { icon = 'fa-lock'; label = 'Clôture'; }
            else { icon = 'fa-circle'; label = m.type; }
            return '<div class="timeline-item">' +
                '<div class="timeline-item__title"><i class="fa-solid ' + icon + ' text-teal"></i> ' + label +
                (m.qte ? ' — <strong>' + m.qte + ' unité(s)</strong>' : '') + '</div>' +
                '<div class="timeline-item__meta">' + escapeHtml(m.par || '—') + ' · ' + escapeHtml(m.date || '—') + '</div>' +
                '</div>';
        }).join('') + '</div>';
    }

    function rowHtml(o, role, urlBS) {
        var st = statutOf(o);
        var persCol1;
        var persCol2;
        if (role === 'admin') {
            persCol1 = escapeHtml(o.initiateur) + ' <br><span class="cell-muted" style="font-size:0.75rem">' + escapeHtml(o.origine) + '</span>';
            persCol2 = escapeHtml(o.beneficiaire) + ' <br><span class="cell-muted" style="font-size:0.75rem">' + escapeHtml(o.destination) + '</span>';
        } else if (activeTab === 'tab1') {
            persCol1 = escapeHtml(o.initiateur);
            persCol2 = escapeHtml(o.origine);
        } else {
            persCol1 = escapeHtml(o.beneficiaire);
            persCol2 = escapeHtml(o.destination);
        }

        var actionHtml = '<a class="action-btn action-btn--view" href="' + urlBS + '" title="Voir le bon de sortie lié"><i class="fa-solid fa-eye"></i></a>' +
            '<button class="action-btn action-btn--info" type="button" data-history-toggle="' + escapeHtml(o.id) + '" title="Afficher l\'historique des mouvements de ce retour"><i class="fa-solid fa-clock-rotate-left"></i></button>';

        if (role !== 'admin') {
            if (activeTab === 'tab1' && (st === 'en_attente' || st === 'en_retard')) {
                var restant = o.qteDue - o.qteRendue - o.qteEnTransit;
                actionHtml += '<button class="action-btn action-btn--success" type="button" data-expedier-retour="' + escapeHtml(o.bs) + '" data-expedier-code="' + escapeHtml(o.code) + '" data-max="' + restant + '" title="Enregistrer le retour (expédier vers le magasin d\'origine)">' +
                    '    <i class="fa-solid fa-paper-plane"></i>' +
                    '</button>';
            } else if (activeTab === 'tab2' && st === 'retour_expedie') {
                actionHtml += '<button class="action-btn action-btn--success" type="button" data-recevoir-retour="' + escapeHtml(o.bs) + '" data-recevoir-code="' + escapeHtml(o.code) + '" data-max="' + o.qteEnTransit + '" title="Valider la réception du retour de cet article dans votre magasin">' +
                    '    <i class="fa-solid fa-check"></i>' +
                    '</button>';
            }
        }

        return '<tr>' +
            '    <td><a class="cell-link" href="' + urlBS + '">' + escapeHtml(o.bs) + '</a></td>' +
            '    <td class="mono">' + escapeHtml(o.code) + '</td>' +
            '    <td>' + escapeHtml(o.designation) + '</td>' +
            '    <td>' + o.qteDue + '</td>' +
            '    <td class="' + (st === 'en_retard' ? 'text-red' : '') + '">' + escapeHtml(o.dateRetourPrevue || '—') + '</td>' +
            '    <td>' + persCol1 + '</td>' +
            '    <td>' + persCol2 + '</td>' +
            '    <td>' + suiviHtml(o, st, role) + '</td>' +
            '    <td class="cell-actions">' + actionHtml + '</td>' +
            '</tr>' +
            '<tr class="is-hidden retour-history-row" data-history-row="' + escapeHtml(o.id) + '">' +
            '    <td colspan="9"><div class="retour-history">' + movementsHtml(o) + '</div></td>' +
            '</tr>';
    }

    function apply() {
        var root = document.querySelector('[data-retours]');
        if (!root) return;

        var role = currentRole();
        var tbody = root.querySelector('[data-retours-tbody]');
        var searchVal = (root.querySelector('[data-retours-search]').value || '').trim().toLowerCase();
        var statusFilter = root.querySelector('[data-retours-statut-select]').value;

        /* Configuration des en-têtes selon le rôle et l'onglet */
        var col1 = root.querySelector('[data-col-personne1]');
        var col2 = root.querySelector('[data-col-personne2]');
        if (col1 && col2) {
            if (role === 'admin') {
                col1.textContent = 'Initiateur / Source';
                col2.textContent = 'Bénéficiaire / Destinataire';
            } else {
                col1.textContent = (activeTab === 'tab1') ? 'Prêté par (Initiateur)' : 'Emprunté par (Bénéficiaire)';
                col2.textContent = (activeTab === 'tab1') ? 'Magasin d\'origine' : 'Magasin destinataire';
            }
        }

        /* 1. Liste des obligations pour l'onglet courant */
        var list = buildList(role);

        /* 2. KPIs */
        var kpiRetard = 0;
        var kpiAttente = 0;
        var kpiValides = 0;
        list.forEach(function (o) {
            var st = statutOf(o);
            if (st === 'en_retard') kpiRetard++;
            else if (st === 'en_attente' || st === 'retour_expedie') kpiAttente++;
            else if (st === 'cloture') kpiValides++;
        });

        var kpiRetardEl = root.querySelector('[data-kpi-retard]');
        var kpiAttenteEl = root.querySelector('[data-kpi-attente]');
        var kpiValidesEl = root.querySelector('[data-kpi-valides]');
        if (kpiRetardEl) kpiRetardEl.textContent = kpiRetard;
        if (kpiAttenteEl) kpiAttenteEl.textContent = kpiAttente;
        if (kpiValidesEl) kpiValidesEl.textContent = kpiValides;

        /* 3. Filtres recherche + statut */
        list = list.filter(function (o) {
            if (statusFilter !== 'tous' && statutOf(o) !== statusFilter) return false;
            if (searchVal) {
                var hay = (o.bs + ' ' + o.code + ' ' + o.designation + ' ' + o.initiateur + ' ' + o.beneficiaire + ' ' + o.origine + ' ' + o.destination + ' ' + o.responsable).toLowerCase();
                if (hay.indexOf(searchVal) === -1) return false;
            }
            return true;
        });

        var resultsEl = root.querySelector('[data-retours-results]');
        if (resultsEl) resultsEl.textContent = list.length + (list.length > 1 ? ' résultats' : ' résultat');

        if (!tbody) return;
        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center cell-muted">Aucun article à rendre ne correspond aux filtres.</td></tr>';
            return;
        }

        var urlBS = (role === 'admin') ? 'index.html?page=admin/bs-detail' : 'index.html?page=lambda/bs-detail';
        var html = '';
        list.forEach(function (o) { html += rowHtml(o, role, urlBS); });
        tbody.innerHTML = html;

        bindActions(tbody);
    }

    function bindActions(tbody) {
        /* Historique des mouvements (ligne dépliable sous la ligne) */
        tbody.querySelectorAll('[data-history-toggle]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var id = this.getAttribute('data-history-toggle');
                var row = tbody.querySelector('[data-history-row="' + id + '"]');
                if (row) row.classList.toggle('is-hidden');
            });
        });

        /* Renvoi (expédition du retour) */
        tbody.querySelectorAll('[data-expedier-retour]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                pendingAction = {
                    type: 'expedier',
                    bs: this.getAttribute('data-expedier-retour'),
                    code: this.getAttribute('data-expedier-code'),
                    max: parseInt(this.getAttribute('data-max'), 10)
                };
                showConfirmModal(
                    '<i class="fa-solid fa-paper-plane text-teal"></i> Enregistrer le retour',
                    'Expédier l\'article <strong>' + escapeHtml(pendingAction.code) + '</strong> (BS ' + escapeHtml(pendingAction.bs) + ') vers son magasin d\'origine ?',
                    { max: pendingAction.max, hint: 'Quantité à renvoyer — un retour partiel est possible.' }
                );
            });
        });

        /* Réception du retour (au magasin d'origine) */
        tbody.querySelectorAll('[data-recevoir-retour]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                pendingAction = {
                    type: 'recevoir',
                    bs: this.getAttribute('data-recevoir-retour'),
                    code: this.getAttribute('data-recevoir-code'),
                    max: parseInt(this.getAttribute('data-max'), 10)
                };
                showConfirmModal(
                    '<i class="fa-solid fa-circle-check text-teal"></i> Confirmer la réception',
                    'Valider la réception du retour de l\'article <strong>' + escapeHtml(pendingAction.code) + '</strong> (BS ' + escapeHtml(pendingAction.bs) + ') dans votre magasin ?',
                    { max: pendingAction.max, hint: 'Quantité réellement reçue au retour — saisissez la quantité constatée.' }
                );
            });
        });
    }

    /* --- Modale de confirmation (avec quantité pour retours partiels) --- */

    function showConfirmModal(title, message, opts) {
        var modal = document.querySelector('[data-modal="confirm-retour"]');
        if (!modal) return;
        var titleEl = modal.querySelector('[data-confirm-modal-title]');
        var messageEl = modal.querySelector('[data-confirm-modal-message]');
        var qtyWrap = modal.querySelector('[data-confirm-qty-wrap]');
        var qtyInput = modal.querySelector('[data-confirm-qty]');
        var qtyHint = modal.querySelector('[data-confirm-qty-hint]');
        var errEl = modal.querySelector('[data-confirm-modal-error]');
        if (titleEl) titleEl.innerHTML = title;
        if (messageEl) messageEl.innerHTML = message;
        if (errEl) {
            errEl.hidden = true;
            errEl.textContent = '';
        }
        if (qtyWrap && qtyInput) {
            var max = opts && opts.max ? parseInt(opts.max, 10) : 1;
            qtyWrap.hidden = false;
            qtyInput.min = 1;
            qtyInput.max = max;
            qtyInput.value = String(max);
            if (qtyHint) {
                qtyHint.textContent = (opts && opts.hint ? opts.hint + ' ' : '') + 'Maximum : ' + max + '.';
            }
        }
        modal.removeAttribute('hidden');
        document.body.classList.add('modal-open');
    }

    function closeConfirmModal() {
        var modal = document.querySelector('[data-modal="confirm-retour"]');
        if (modal) {
            modal.setAttribute('hidden', '');
            document.body.classList.remove('modal-open');
        }
        pendingAction = null;
    }

    function bootList(root) {
        if (root.getAttribute('data-retours-bound')) return true;
        root.setAttribute('data-retours-bound', '1');

        var searchInput = root.querySelector('[data-retours-search]');
        var selectFilter = root.querySelector('[data-retours-statut-select]');
        var resetBtn = root.querySelector('[data-retours-reset]');

        if (searchInput) searchInput.addEventListener('input', apply);
        if (selectFilter) selectFilter.addEventListener('change', apply);
        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                if (searchInput) searchInput.value = '';
                if (selectFilter) selectFilter.value = 'tous';
                apply();
            });
        }

        /* Fermeture de la modale : on réinitialise l'action en attente */
        root.querySelectorAll('[data-modal="confirm-retour"] [data-modal-close]').forEach(function (btn) {
            btn.addEventListener('click', closeConfirmModal);
        });

        var confirmBtn = root.querySelector('[data-confirm-modal-btn]');
        var qtyInput = root.querySelector('[data-confirm-qty]');
        var errEl = root.querySelector('[data-confirm-modal-error]');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function () {
                if (!pendingAction) return;

                var qty = qtyInput ? parseInt(qtyInput.value, 10) : pendingAction.max;
                if (isNaN(qty) || qty < 1 || (qtyInput && qty > parseInt(qtyInput.max, 10))) {
                    if (errEl) {
                        errEl.hidden = false;
                        errEl.textContent = 'Quantité invalide : saisissez une valeur entre 1 et ' + (qtyInput ? qtyInput.max : '—') + '.';
                    }
                    return;
                }

                var res;
                if (pendingAction.type === 'expedier') {
                    res = expedier(pendingAction.bs, pendingAction.code, qty);
                } else if (pendingAction.type === 'recevoir') {
                    res = recevoirRetour(pendingAction.bs, pendingAction.code, qty);
                }

                if (res && !res.ok) {
                    if (errEl) {
                        errEl.hidden = false;
                        errEl.textContent = res.message;
                    }
                    return;
                }

                closeConfirmModal();
                apply();
            });
        }

        initTabs();
        apply();
        return true;
    }

    /* --- Rendu : fiche détail d'un BS (« Suivi du retour ») --- */

    function bootDetail(refEl) {
        var section = refEl.closest('section');
        if (!section) return false;
        var tbody = section.querySelector('.table-mock tbody');
        if (!tbody) return false;

        if (tbody.getAttribute('data-retours-detail-bound')) return true;
        tbody.setAttribute('data-retours-detail-bound', '1');

        var bsNum = refEl.textContent.trim();
        var obs = obligations().filter(function (o) { return o.bs === bsNum; });

        /* Compteurs « articles à rendre » de la fiche */
        var nb = obs.length;
        var label = nb + (nb > 1 ? ' articles à rendre' : ' article à rendre');
        var chip = section.querySelector('[data-retours-chip]');
        if (chip) chip.innerHTML = '<i class="fa-solid fa-rotate-left"></i> ' + label;
        section.querySelectorAll('[data-retours-count]').forEach(function (c) { c.textContent = label; });

        var rows = tbody.querySelectorAll('tr');
        rows.forEach(function (row) {
            var codeCell = row.querySelector('.mono');
            if (!codeCell) return;
            var code = codeCell.textContent.trim();
            var ob = findObligation(obs, bsNum, code);
            var cells = row.querySelectorAll('td');
            var statusCell = cells[cells.length - 1];
            if (!statusCell) return;

            if (ob) {
                var st = statutOf(ob);
                statusCell.innerHTML = '<span class="badge-status ' + (STATUT_CLASS[st] || 'badge--info') + '">' +
                    (STATUT_LABEL[st] || st) + '</span>' +
                    '<div class="cell-muted" style="font-size:0.72rem; margin-top:2px;">Restitué : ' + ob.qteRendue + '/' + ob.qteDue + '</div>';
            } else {
                statusCell.innerHTML = '<span class="cell-muted">Non concerné</span>';
            }
        });
        return true;
    }

    function boot() {
        var retoursRoot = document.querySelector('[data-retours]');
        if (retoursRoot) {
            return bootList(retoursRoot);
        }

        var bsDetailRoot = document.querySelector('[data-bs-ref]');
        if (bsDetailRoot) {
            return bootDetail(bsDetailRoot);
        }

        return false;
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }

    var observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes.length) {
                boot();
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    /* API partagée : le module transit active les obligations à la
       réception ; le cycle (renvoi / réception du retour) reste piloté
       par cette page. */
    window.S2M = window.S2M || {};
    window.S2M.retours = {
        obligations: obligations,
        statutOf: statutOf,
        activateFromReception: activateFromReception,
        expedier: expedier,
        recevoirRetour: recevoirRetour
    };

})();