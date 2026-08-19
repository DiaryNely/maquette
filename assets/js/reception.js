/* ============================================================
   RECEPTION — contrôle final des quantités à la réception
   (mockup S2M-WEB)

   Le colis est FERMÉ au transit : aucun contrôle de quantité ne se
   fait à cet endroit. C'est au moment de la réception (colis ouvert,
   au magasin du destinataire) que chaque article est identifié, que
   les quantités reçues sont contrôlées par rapport au BS, que les
   écarts (manquants / supplémentaires) sont gérés, et que la réception
   est validée définitivement — ce qui met à jour le statut du BS et le
   stock du magasin.

   Accès :
     - la page « Réception » est lancée directement pour un BS donné
       (lien « Réceptionner ce BS » depuis la fiche détail) : on procède
       au contrôle, pas de sélection de BS sur la page ;
     - fiche détail d'un BS : carte « Réception de la marchandise »
       (état + bouton d'accès à la réception).
   L'administrateur suit en lecture seule.

   Données des BS : bs-list.js (window.S2M.bsList) + catalogue PARTAGE
   (ARTICLES) exposé via articlesOf().
   Persistance : localStorage (clé s2m.receptions.v2) + s2m.stock.v1.
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 's2m.receptions.v2';
    var STOCK_KEY = 's2m.stock.v1';

    /* Catalogue partagé des articles attendus de chaque BS.
       - etat / rendre / dateRetour servent à la fiche détail et à la
         création des obligations de retour (à rendre). */
    var ARTICLES = {
        'BS-2026-0142': [
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 10, etat: 'Neuf',          rendre: false },
            { code: 'MAT-011', designation: 'Écran 24" Dell P2422H',            qte: 2,  etat: 'Bon état',        rendre: true,  dateRetour: '12/09/2026' },
            { code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1, etat: 'Neuf',       rendre: true,  dateRetour: '12/09/2026' },
            { code: 'FOU-031', designation: 'Boîte de stylos à bille bleu (12)', qte: 5, etat: 'Neuf',           rendre: false }
        ],
        'BS-2026-0141': [
            { code: 'ART-110', designation: 'Carton de fournitures de bureau (lot)', qte: 8, etat: 'Neuf', rendre: false },
            { code: 'FOU-040', designation: 'Boîte de classeurs A4 (24)',           qte: 3, etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0140': [
            { code: 'MAT-020', designation: 'Écran 27" Dell U2723QE',          qte: 4, etat: 'Neuf',     rendre: false },
            { code: 'MAT-015', designation: 'Station d\'accueil USB-C Dell',   qte: 3, etat: 'Neuf',     rendre: true,  dateRetour: '20/09/2026' },
            { code: 'ART-105', designation: 'Rame papier A3 80 g (paquet de 250)', qte: 6, etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0139': [
            { code: 'SEC-010', designation: 'Gilet haute visibilité', qte: 10, etat: 'Neuf', rendre: false },
            { code: 'SEC-014', designation: 'Casque de chantier',     qte: 5,  etat: 'Neuf', rendre: false },
            { code: 'SEC-021', designation: 'Extincteur 6 kg',          qte: 2,  etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0138': [
            { code: 'MAT-022', designation: 'Écran 22" Dell E2222H', qte: 2, etat: 'Neuf', rendre: false },
            { code: 'FOU-045', designation: 'Clavier + souris USB (lot)', qte: 3, etat: 'Neuf', rendre: false },
            { code: 'MAT-030', designation: 'Onduleur 1000 VA', qte: 1, etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0137': [
            { code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1, etat: 'Neuf', rendre: false },
            { code: 'MAT-011', designation: 'Écran 24" Dell P2422H',                    qte: 2, etat: 'Neuf', rendre: false },
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)',    qte: 3, etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0136': [
            { code: 'MOB-015', designation: 'Fauteuil de bureau',  qte: 3, etat: 'Neuf', rendre: false },
            { code: 'MOB-022', designation: 'Armoire métallique',  qte: 1, etat: 'Neuf', rendre: false },
            { code: 'MOB-010', designation: 'Table de réunion',     qte: 1, etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0135': [
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 10, etat: 'Neuf', rendre: false },
            { code: 'FOU-031', designation: 'Boîte de stylos à bille bleu (12)',    qte: 5,  etat: 'Neuf', rendre: false },
            { code: 'FOU-040', designation: 'Boîte de classeurs A4 (24)',           qte: 2,  etat: 'Neuf', rendre: false }
        ],
        'BS-2026-0134': [
            { code: 'MAT-045', designation: 'Marteau-piqueur pneumatique', qte: 2, etat: 'Bon état', rendre: true,  dateRetour: '20/09/2026' },
            { code: 'MAT-046', designation: 'Brouette de chantier 100 L',    qte: 3, etat: 'Neuf',      rendre: true,  dateRetour: '20/09/2026' },
            { code: 'SEC-010', designation: 'Gilet haute visibilité',        qte: 5, etat: 'Neuf',      rendre: false }
        ]
    };

    /* Stock de référence du magasin (pour la maquette). Chaque code reçu
       augmente le stock ; les articles supplémentaires sont créés. */
    var STOCK_SEED = {};
    (function () {
        var seen = {};
        Object.keys(ARTICLES).forEach(function (bs) {
            ARTICLES[bs].forEach(function (a) {
                if (!seen[a.code]) {
                    seen[a.code] = true;
                    STOCK_SEED[a.code] = (STOCK_SEED[a.code] || 0) + 150;
                }
            });
        });
    })();

    function articlesOf(bs) {
        return ARTICLES[bs] || [];
    }

    function load() {
        var raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
        if (raw) {
            try {
                var list = JSON.parse(raw);
                if (Array.isArray(list)) return list;
            } catch (e) { /* corrompu → repart d'une liste vide */ }
        }
        return [];
    }

    function save(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* indisponible */ }
    }

    function loadStock() {
        var raw = null;
        try { raw = localStorage.getItem(STOCK_KEY); } catch (e) { raw = null; }
        if (raw) {
            try {
                var m = JSON.parse(raw);
                if (m && typeof m === 'object') return m;
            } catch (e) { /* ignoré */ }
        }
        var copy = {};
        Object.keys(STOCK_SEED).forEach(function (k) { copy[k] = STOCK_SEED[k]; });
        saveStock(copy);
        return copy;
    }

    function saveStock(map) {
        try { localStorage.setItem(STOCK_KEY, JSON.stringify(map)); } catch (e) { /* ignoré */ }
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

    function currentRole() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/')[0] || null;
    }
    function pageName() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/').pop() || '';
    }
    function currentUser() {
        if (currentRole() === 'transit') return 'Rabemananjara Solo (Transit)';
        return 'Rakotobe Hery (Personnel)';
    }

    function bsList() {
        return (window.S2M && window.S2M.bsList) || [];
    }
    function bsOf(ref) {
        var list = bsList();
        for (var i = 0; i < list.length; i++) {
            if (list[i].bs === ref) return list[i];
        }
        return null;
    }

    /* --- Stock --- */

    var STOCK = loadStock();

    function stockOf(code) {
        return parseInt(STOCK[code], 10) || 0;
    }

    /* Applique le résultat de la réception au stock du magasin. */
    function applyStock(lignes, supplements) {
        var changes = [];
        (lignes || []).forEach(function (l) {
            var before = stockOf(l.code);
            STOCK[l.code] = (parseInt(STOCK[l.code], 10) || 0) + (parseInt(l.recu, 10) || 0);
            changes.push({ code: l.code, designation: l.designation, before: before, after: stockOf(l.code) });
        });
        (supplements || []).forEach(function (s) {
            var before = stockOf(s.code);
            STOCK[s.code] = (parseInt(STOCK[s.code], 10) || 0) + (parseInt(s.qte, 10) || 0);
            changes.push({ code: s.code, designation: s.designation, before: before, after: stockOf(s.code) });
        });
        saveStock(STOCK);
        return changes;
    }

    /* --- Persistance des réceptions --- */

    var receptions = load();

    function isReceptionne(bs) {
        return receptions.some(function (r) { return r.bs === bs; });
    }
    function receptionOf(bs) {
        var r = null;
        for (var i = receptions.length - 1; i >= 0; i--) {
            if (receptions[i].bs === bs) { r = receptions[i]; break; }
        }
        return r;
    }

    /* Conformité d'une ligne de réception par rapport au BS. */
    function ligneEcart(attends, recu) {
        var a = parseInt(attends, 10) || 0;
        var r = parseInt(recu, 10) || 0;
        if (r < a) return { type: 'manquant', qte: a - r };
        if (r > a) return { type: 'supplement', qte: r - a };
        return { type: 'ok' };
    }

    /* Enregistrement définitif d'une réception (contrôle des quantités).
       - lignes : [{ code, designation, attendu, recu, aRendre, dateRetour }]
       - supplements : [{ code, designation, qte }]
       Refusé si le BS est déjà réceptionné. */
    function record(bs, lignes, supplements) {
        if (isReceptionne(bs)) return null;
        var b = bsOf(bs) || {};

        var ecarts = { manquants: 0, supplementaires: 0, lignes: [] };
        (lignes || []).forEach(function (l) {
            var e = ligneEcart(l.attendu, l.recu);
            if (e.type === 'manquant' || e.type === 'supplement') {
                ecarts[e.type === 'manquant' ? 'manquants' : 'supplementaires'] += e.qte;
            }
            ecarts.lignes.push({ code: l.code, attendu: parseInt(l.attendu, 10) || 0, recu: parseInt(l.recu, 10) || 0, type: e.type });
        });
        (supplements || []).forEach(function (s) {
            ecarts.supplementaires += (parseInt(s.qte, 10) || 0);
        });
        var resultat = (ecarts.manquants === 0 && ecarts.supplementaires === 0) ? 'conforme' : 'ecarts';

        var r = {
            bs: bs,
            date: now(),
            par: currentUser(),
            ts: Date.now(),
            resultat: resultat,
            lignes: (lignes || []).map(function (l) {
                return { code: l.code, designation: l.designation, attendu: parseInt(l.attendu, 10) || 0,
                         recu: parseInt(l.recu, 10) || 0, aRendre: !!l.aRendre, dateRetour: l.dateRetour || '' };
            }),
            supplements: (supplements || []).map(function (s) {
                return { code: s.code, designation: s.designation, qte: parseInt(s.qte, 10) || 0 };
            }),
            ecarts: ecarts,
            stock: applyStock(lignes, supplements)
        };
        receptions.push(r);
        save(receptions);

        /* les articles « à rendre » réellement reçus créent / activent
           l'obligation de retour (le destinataire devient responsable) */
        if (window.S2M && window.S2M.retours) {
            S2M.retours.activateFromReception(bs, r.lignes);
        }
        return r;
    }

    function totalRecu(lignes) {
        return (lignes || []).reduce(function (sum, l) { return sum + (parseInt(l.recu, 10) || 0); }, 0);
    }

    /* --- Liste des BS à recevoir pour le magasin du connecté --- */
    function hasTransit(bs) {
        var tr = window.S2M && window.S2M.transits;
        return tr && typeof tr.forBs === 'function' && tr.forBs(bs).length > 0;
    }
    function bsAttendus() {
        var store = currentStore();
        return bsList().filter(function (b) {
            return b.destination === store && b.statut === 'En cours' && !isReceptionne(b.bs);
        });
    }

    function currentStore() {
        var people = (window.S2M && window.S2M.currentStore) || null;
        if (people) return people();
        return 'Magasin central';
    }

    /* --- Rendu : page Réception --- */

    function routeReception(bs) {
        var role = currentRole() || '';
        var prefix = role ? role + '/' : '';
        var q = new URLSearchParams();
        q.set('page', prefix + 'reception');
        q.set('bs', bs);
        return 'index.html?' + q.toString();
    }

    /* Articles de la carte de contrôle de réception (catalogue) */
    function renduLignesReception(bs) {
        var rows = [], supplements = true;
        var cat = articlesOf(bs);
        if (cat.length) {
            rows = cat.map(function (a) {
                return { code: a.code, designation: a.designation, attendu: a.qte, recu: a.qte, aRendre: !!a.rendre, dateRetour: a.dateRetour || '' };
            });
        }
        return { rows: rows, supplements: [] };
    }

    function renderReceptionForm(bs) {
        var box = document.querySelector('[data-rec-form]');
        if (!box) return;
        var b = bsOf(bs) || {};
        var info = renduLignesReception(bs);

        var map = [
            ['[data-rec-initiateur]', b.initiateur || '—'],
            ['[data-rec-beneficiaire]', b.beneficiaire || '—'],
            ['[data-rec-bs]', bs],
            ['[data-rec-retour]', b.retour ? 'Oui — article(s) à rendre au magasin d\'origine' : 'Aucun']
        ];
        map.forEach(function (m) { var el = document.querySelector(m[0]); if (el) el.textContent = m[1]; });

        var empty = document.querySelector('[data-rec-empty]');
        var fields = document.querySelector('[data-rec-fields]');
        if (empty) empty.classList.add('is-hidden');
        if (fields) fields.classList.remove('is-hidden');

        var tbody = box.querySelector('[data-rec-articles]');
        if (tbody) {
            tbody.innerHTML = info.rows.map(function (l, i) {
                return ligneFormHtml(l, i);
            }).join('');
        }
        renderSupplements();
        renderEcarts();
        refreshRecResult();
    }

    function ligneFormHtml(l, i) {
        return '<tr class="rec-line">' +
            '<td class="mono">' + escapeHtml(l.code) + '</td>' +
            '<td>' + escapeHtml(l.designation) + '</td>' +
            '<td class="text-center">' + (l.attendu || 0) + '</td>' +
            '<td><input type="number" class="form-control form-control-sm rec-qty" min="0" data-rec-qty data-rec-idx="' + i + '" value="' + (l.recu != null ? l.recu : l.attendu) + '"></td>' +
            '<td class="text-center rec-ecart">—</td>' +
            '</tr>';
    }

    /* Articles supplémentaires (reçus mais absents du BS) : on garde une
        rangée modèle et on ajoute / retire dynamiquement. */
    function renderSupplements() {
        var cont = document.querySelector('[data-rec-supplements]');
        if (!cont) return;
        var supp = currentSupplements();
        cont.innerHTML = supp.map(function (s) { return ligneSuppHtml(s); }).join('') +
            '<tr class="rec-supplement-add"><td colspan="5"><button class="btn-mock btn-mock--sm" type="button" data-rec-add-supp><i class="fa-solid fa-plus"></i> Ajouter un article reçu supplémentaire</button></td></tr>';
    }

    function ligneSuppHtml(s) {
        s = s || {};
        return '<tr class="rec-supplement-row">' +
            '<td><input type="text" class="form-control form-control-sm rec-code" placeholder="Code" value="' + escapeHtml(s.code || '') + '"></td>' +
            '<td><input type="text" class="form-control form-control-sm rec-designation" placeholder="Désignation" value="' + escapeHtml(s.designation || '') + '"></td>' +
            '<td colspan="2" class="text-center"><input type="number" class="form-control form-control-sm rec-qte" min="0" placeholder="Qté" value="' + escapeHtml(s.qte || '') + '"></td>' +
            '<td class="cell-actions"><button class="action-btn action-btn--danger" type="button" data-rec-suppr><i class="fa-solid fa-xmark"></i></button></td>' +
            '</tr>';
    }

    function renderEcarts() {
        var b = document.querySelector('[data-rec-ecarts]');
        if (!b) return;
        var rows = currentLignes();
        var missing = 0, extra = 0;
        rows.forEach(function (l) {
            var a = parseInt(l.attendu, 10) || 0;
            var r = parseInt(l.recu, 10) || 0;
            if (r < a) missing += (a - r);
            if (r > a) extra += (r - a);
        });
        var supp = currentSupplements();
        supp.forEach(function (s) { extra += (parseInt(s.qte, 10) || 0); });
        var html = '';
        if (missing || extra) {
            html += (missing ? '<span class="chip chip--sm badge--refuse">Manquants : ' + missing + '</span>' : '') +
                (extra ? '<span class="chip chip--sm badge--valide">Supplémentaires : ' + extra + '</span>' : '');
        } else {
            html = '<span class="chip chip--sm badge--valide">Conforme — aucun écart</span>';
        }
        b.innerHTML = html;
    }

    function ligneEcartCell(l) {
        var a = parseInt(l.attendu, 10) || 0;
        var r = parseInt(l.recu, 10) || 0;
        if (r < a) return '<span class="text-red">Manquant ' + (a - r) + '</span>';
        if (r > a) return '<span class="text-teal">En trop ' + (r - a) + '</span>';
        return '<span class="text-teal">OK</span>';
    }

    function currentLignes() {
        var box = document.querySelector('[data-rec-form]');
        if (!box) return [];
        var lignes = [];
        var cat = articlesOf(currentBs());
        box.querySelectorAll('[data-rec-qty]').forEach(function (input, i) {
            var code = cat[i] ? cat[i].code : '';
            var att = cat[i] ? cat[i].qte : 0;
            var recu = input.value.trim();
            lignes.push({ code: code, designation: cat[i] ? cat[i].designation : '', attendu: att, recu: recu !== '' ? recu : 0, aRendre: !!(cat[i] && cat[i].rendre), dateRetour: cat[i] ? (cat[i].dateRetour || '') : '' });
        });
        return lignes;
    }

    function currentSupplements() {
        var rows = [];
        document.querySelectorAll('.rec-supplement-row').forEach(function (tr) {
            var code = tr.querySelector('.rec-code').value.trim();
            var des = tr.querySelector('.rec-designation').value.trim();
            var qte = tr.querySelector('.rec-qte').value.trim();
            if (code || des || qte) rows.push({ code: code, designation: des, qte: qte });
        });
        return rows;
    }

    function refreshEcartCells() {
        var box = document.querySelector('[data-rec-form]');
        if (!box) return;
        var rows = currentLignes();
        box.querySelectorAll('.rec-line').forEach(function (tr, i) {
            var cell = tr.querySelector('.rec-ecart');
            if (cell) cell.innerHTML = ligneEcartCell(rows[i] || rows[0]);
        });
        renderEcarts();
    }

    function currentBs() {
        var bs = (new URLSearchParams(location.search).get('bs') || '').trim().toUpperCase();
        if (!bs) {
            var list = bsAttendus();
            bs = list.length ? list[0].bs : '';
        }
        return bs;
    }

    function refreshRecResult() {
        var btn = document.querySelector('[data-rec-validate]');
        var alertBox = document.querySelector('[data-rec-alert]');
        if (!btn) return;
        btn.disabled = isReceptionne(currentBs());
        if (alertBox) alertBox.classList.add('is-hidden');
    }

    /* --- Rendu : page de liste (bs-list "à recevoir") --- */

    /* --- Rendu : fiche détail (carte Réception) --- */

    function bootDetail() {
        var card = document.querySelector('[data-reception-card]');
        if (!card) return false;
        if (card.getAttribute('data-bound')) return true;
        card.setAttribute('data-bound', '1');

        var bs = (function () {
            /* le BS consulté vient d'abord de l'URL (?bs=…), puis de la
               fiche (data-bs-ref), comme le fait la carte validation. Le
               boot de validation.js met à jour data-bs-ref plus tard : on
               ne peut pas s'y fier à l'initialisation. */
            var q = new URLSearchParams(location.search).get('bs');
            if (q) return q.trim().toUpperCase();
            var el = document.querySelector('[data-bs-ref]');
            return el ? el.textContent.trim() : 'BS-2026-0142';
        })();
        var bsRefEl = document.querySelector('[data-bs-ref]');
        if (bsRefEl && bsRefEl.textContent.trim() !== bs) bsRefEl.textContent = bs;
        var role = currentRole();
        var status = card.querySelector('[data-reception-status]');
        var meta = card.querySelector('[data-reception-meta]');
        var ec = card.querySelector('[data-reception-ecarts]');
        var actions = card.querySelector('[data-reception-actions]');
        var signalBtn = card.querySelector('[data-reception-go]');
        var stepReception = document.querySelector('[data-workflow-step="reception"]');
        var chip = document.querySelector('[data-workflow-current]');
        var timeline = document.querySelector('[data-bs-timeline]');

        function render() {
            var r = receptionOf(bs);
            if (actions) actions.hidden = true;
            if (ec) ec.hidden = true;
            if (signalBtn) signalBtn.closest('div').classList.add('is-hidden');

            if (!r) {
                if (status) { status.textContent = 'À recevoir'; status.className = 'badge-status badge--encours'; }
                if (meta) meta.textContent = 'Le colis est arrivé au magasin du destinataire. Le contrôle des quantités se fait à la réception (colis ouvert).';
                if (signalBtn && role === 'lambda') {
                    signalBtn.closest('div').classList.remove('is-hidden');
                    signalBtn.href = routeReception(bs);
                    signalBtn.textContent = 'Réceptionner ce BS';
                }
            } else {
                if (status) {
                    status.textContent = r.resultat === 'conforme' ? 'Réceptionné' : 'Réceptionné avec écarts';
                    status.className = 'badge-status ' + (r.resultat === 'conforme' ? 'badge--valide' : 'badge--encours');
                }
                if (meta) {
                    var total = totalRecu(r.lignes);
                    meta.innerHTML = '<span class="cell-muted">Réceptionnée le ' + r.date + ' par ' + r.par +
                        ' — ' + total + ' pièce(s) reçue(s) ; ' +
                        (r.ecarts.manquants ? r.ecarts.manquants + ' manquante(s)' : '') +
                        (r.ecarts.manquants && r.ecarts.supplementaires ? ', ' : '') +
                        (r.ecarts.supplementaires ? r.ecarts.supplementaires + ' supplémentaire(s)' : '') +
                        (r.resultat === 'conforme' ? ' — conforme.' : ' — écarts constatés.');
                }
                if (ec) {
                    ec.hidden = !(r.ecarts.manquants || r.ecarts.supplementaires);
                    if (!ec.hidden) ec.textContent = 'Écarts : ' + r.ecarts.manquants + ' manquant(s), ' + r.ecarts.supplementaires + ' supplémentaire(s).';
                }
            }
            if (stepReception && r) {
                stepReception.classList.add('workflow-step--done');
                stepReception.classList.remove('workflow-step--current');
                var actor = stepReception.querySelector('[data-workflow-actor]');
                if (actor) actor.textContent = r.par.split(' (')[0];
                if (chip) chip.innerHTML = '<i class="fa-solid fa-box-open"></i> Étape courante : Réception effectuée';
            }
            if (timeline && r && !card.getAttribute('data-rec-timeline')) {
                card.setAttribute('data-rec-timeline', '1');
                var li = document.createElement('li');
                li.className = 'timeline-item timeline-item--info';
                li.innerHTML =
                    '<div class="timeline-item__title">Réception <span class="badge-status ' +
                    (r.resultat === 'conforme' ? 'badge--valide" >Validé' : 'badge--encours">Avec écarts') + '</span></div>' +
                    '<div class="timeline-item__meta">' + escapeHtml(r.par) + ' · ' + escapeHtml(r.date) + '</div>' +
                    '<div class="timeline-item__desc">Contrôle des quantités effectué à la réception — ' +
                    totalRecu(r.lignes) + ' pièce(s) reçue(s) ; ' +
                    (r.ecarts.manquants ? r.ecarts.manquants + ' manquante(s)' : '') +
                    (r.ecarts.supplementaires ? ' ' + r.ecarts.supplementaires + ' supplémentaire(s)' : '') +
                    '. Stock mis à jour.</div>';
                timeline.insertBefore(li, timeline.firstChild);
            }
        }
        render();
        return true;
    }

    /* --- Rendu : page Réception (formulaire de contrôle) --- */

    function bootReceptionPage() {
        var panel = document.querySelector('[data-rec-page]');
        if (!panel) return false;
        if (panel.getAttribute('data-bound')) return true;
        panel.setAttribute('data-bound', '1');

        var role = currentRole();
        if (role !== 'lambda') {
            var form = panel.querySelector('[data-rec-form]');
            if (form) form.classList.add('is-hidden');
            panel.querySelector('[data-rec-readonly]').classList.remove('is-hidden');
        }

        /* ajout / retrait d'articles supplémentaires */
        panel.addEventListener('click', function (event) {
            var add = event.target.closest('[data-rec-add-supp]');
            if (add) { renderSupplements(); var c = document.querySelector('[data-rec-supplements]'); if (c) { c.insertAdjacentHTML('beforeend', ligneSuppHtml()); } return; }
            var del = event.target.closest('[data-rec-suppr]');
            if (del) { var tr = del.closest('tr'); if (tr) tr.remove(); renderEcarts(); return; }
        });
        panel.addEventListener('input', function (event) {
            if (event.target.classList.contains('rec-qty') || event.target.classList.contains('rec-qte') ||
                event.target.classList.contains('rec-code') || event.target.classList.contains('rec-designation')) {
                refreshEcartCells();
            }
        });

        /* validation */
        var validateBtn = panel.querySelector('[data-rec-validate]');
        if (validateBtn) {
            validateBtn.addEventListener('click', function () {
                var bs = currentBs();
                if (!bs) { showRecAlert(panel, 'Aucun bon de sortie sélectionné.', 'danger'); return; }
                if (isReceptionne(bs)) { showRecAlert(panel, 'Ce BS a déjà été réceptionné.', 'danger'); return; }
                var lignes = currentLignes();
                var supp = currentSupplements();
                if (lignes.some(function (l) { return l.recu === '' || l.recu === null; })) {
                    showRecAlert(panel, 'Renseignez la quantité reçue pour chaque article du BS.', 'danger'); return;
                }
                showRecConfirm(bs, lignes, supp);
            });
        }

        var storeChip = panel.querySelector('[data-rec-store]');
        if (storeChip) storeChip.textContent = currentStore();

        var bs = currentBs();
        if (bs) renderReceptionForm(bs);
        refreshRecResult();
        return true;
    }

    function showRecAlert(panel, msg, kind) {
        var a = panel.querySelector('[data-rec-alert]');
        if (!a) return;
        a.className = 'alert-mock alert-mock--' + (kind === 'danger' ? 'danger' : 'success') + ' mb-3';
        a.innerHTML = '<i class="fa-solid ' + (kind === 'danger' ? 'fa-circle-xmark' : 'fa-circle-check') + '"></i><span>' + msg + '</span>';
        a.classList.remove('is-hidden');
    }

    function showRecConfirm(bs, lignes, supplements) {
        var modal = document.querySelector('[data-modal="reception-confirm"]');
        if (!modal) { doConfirm(bs, lignes, supplements); return; }
        var body = modal.querySelector('[data-confirm-body]');
        var manquant = 0, supplement = 0;
        lignes.forEach(function (l) { var e = ligneEcart(l.attendu, l.recu); if (e.type === 'manquant') manquant += e.qte; if (e.type === 'supplement') supplement += e.qte; });
        supplements.forEach(function (s) { supplement += parseInt(s.qte, 10) || 0; });
        var total = totalRecu(lignes) + supplements.reduce(function (s, x) { return s + (parseInt(x.qte, 10) || 0); }, 0);
        var resultat = (manquant === 0 && supplement === 0) ? 'conforme' : 'ecarts';
        if (body) body.innerHTML =
            '<p>Réception de <strong>' + escapeHtml(bs) + '</strong> : <strong>' + total + ' pièce(s)</strong> reçue(s) ; ' +
            (resultat === 'conforme' ? '<span class="badge-status badge--valide">Conforme — aucun écart</span>' :
                '<span class="badge-status badge--encours">Écarts : ' + manquant + ' manquant(s), ' + supplement + ' supplémentaire(s)</span>') +
            '. Valider la réception définitive ?</p>';
        modal.hidden = false;
        document.body.classList.add('modal-open');
        var confirmBtn = modal.querySelector('[data-confirm-yes]');
        if (confirmBtn) {
            var done = false;
            confirmBtn.onclick = function () {
                if (done) return;
                done = true;
                modal.hidden = true;
                document.body.classList.remove('modal-open');
                doConfirm(bs, lignes, supplements);
            };
        }
    }

    function doConfirm(bs, lignes, supplements) {
        var panel = document.querySelector('[data-rec-page]');
        var r = record(bs, lignes, supplements);
        if (!r) { showRecAlert(panel, 'Ce BS a déjà été réceptionné.', 'danger'); return; }
        showRecSuccess(panel, r);
        /* rafraîchit les vues dépendantes */
        if (window.S2M && window.S2M.bsListRefresh) S2M.bsListRefresh();
    }

    function showRecSuccess(panel, r) {
        var box = panel.querySelector('[data-rec-success]');
        if (!box) return;
        var lines = box.querySelector('[data-rec-success-body]') || box;
        lines.innerHTML = '';
        var cls = r.resultat === 'conforme' ? 'alert-mock--success' : 'alert-mock--warning';
        var title = r.resultat === 'conforme' ? 'Réception validée — conforme' : 'Réception validée — écarts constatés';
        box.innerHTML = '<div class="alert-mock ' + cls + ' mb-3"><i class="fa-solid fa-box-open"></i>' +
            '<span><strong>' + escapeHtml(r.bs) + '</strong> ' + title + ' par ' + escapeHtml(r.par) + ' le ' + escapeHtml(r.date) +
            ' — ' + totalRecu(r.lignes) + ' pièce(s) reçue(s).</span></div>' +
            stockDeltaHtml(r.stock) +
            '<div data-rec-success-body></div>';
        var btn = panel.querySelector('[data-rec-validate]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Réception effectuée'; }
    }

    function stockDeltaHtml(changes) {
        if (!changes || !changes.length) return '';
        var rows = changes.map(function (c) {
            return '<tr><td class="mono">' + escapeHtml(c.code) + '</td>' +
                '<td>' + escapeHtml(c.designation) + '</td>' +
                '<td class="text-center">' + c.before + '</td>' +
                '<td class="text-center text-teal">+' + (c.after - c.before) + '</td>' +
                '<td class="text-center">' + c.after + '</td></tr>';
        }).join('');
        return '<div class="table-mock-wrap mt-3"><table class="table-mock"><thead><tr>' +
            '<th>Article</th><th>Désignation</th><th>Stock avant</th><th>Qté reçue</th><th>Stock après</th></tr></thead>' +
            '<tbody>' + rows + '</tbody></table></div>';
    }

    /* --- Démarrage --- */

    function tryBoot() {
        if (pageName() === 'reception' && document.querySelector('[data-rec-page]')) return bootReceptionPage();
        return bootDetail();
    }

    if (!tryBoot()) {
        var timer = setInterval(function () {
            if (tryBoot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }
    var bootObserver = new MutationObserver(function () { tryBoot(); });
    bootObserver.observe(document.body, { childList: true, subtree: true });

    /* API partagée */
    window.S2M = window.S2M || {};
    window.S2M.receptions = {
        isReceptionne: isReceptionne,
        receptionOf: receptionOf,
        record: record,
        confirm: confirm,        /* rétro-compatibilité mineure (no-op si déjà reçu) */
        isConfirme: isReceptionne,
        confirmationOf: receptionOf,
        articlesOf: articlesOf,
        stockOf: stockOf,
        applyStock: applyStock,
        currentStore: function () { return currentStore(); },
        list: receptions
    };

    function confirm(bs) {
        return record(bs, (articlesOf(bs) || []).map(function (a) {
            return { code: a.code, designation: a.designation, attendu: a.qte, recu: a.qte, aRendre: !!a.rendre, dateRetour: a.dateRetour || '' };
        }), []);
    }
})();
