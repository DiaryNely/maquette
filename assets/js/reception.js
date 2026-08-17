/* ============================================================
   RECEPTION — signalement de la réception d'un BS (mockup S2M-WEB)

   La réception se signale là où le BS est déjà visible :
     - liste des BS, onglet « BS à recevoir » (personnel) : bouton
       « Réceptionner » sur chaque bon reçu ;
     - page Scan & Transit : bouton « Signaler la réception » après
       le scan du bon (agent de transit) ;
     - fiche détail d'un BS : carte « Réception de la marchandise ».
   L'administrateur suit en lecture seule : il consulte la liste
   (envoyés / à recevoir, tous magasins) sans jamais signaler.
   Les données des BS proviennent de bs-list.js (window.S2M.bsList).
   Persistance : localStorage (clé s2m.receptions.v1).
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 's2m.receptions.v1';

    /* Articles attendus de chaque BS (catalogue partagé en maquette) */
    var ARTICLES = {
        'BS-2026-0142': [
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 10 },
            { code: 'MAT-011', designation: 'Écran 24\" Dell P2422H', qte: 2 },
            { code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1 },
            { code: 'FOU-031', designation: 'Boîte de stylos à bille bleu (12)', qte: 5 }
        ],
        'BS-2026-0141': [
            { code: 'ART-110', designation: 'Carton de fournitures de bureau (lot)', qte: 8 },
            { code: 'FOU-040', designation: 'Boîte de classeurs A4 (24)', qte: 3 }
        ],
        'BS-2026-0140': [
            { code: 'MAT-020', designation: 'Écran 27\" Dell U2723QE', qte: 4 },
            { code: 'MAT-015', designation: 'Station d\'accueil USB-C Dell', qte: 3 },
            { code: 'ART-105', designation: 'Rame papier A3 80 g (paquet de 250)', qte: 6 }
        ],
        'BS-2026-0139': [
            { code: 'SEC-010', designation: 'Gilet haute visibilité', qte: 10 },
            { code: 'SEC-014', designation: 'Casque de chantier', qte: 5 },
            { code: 'SEC-021', designation: 'Extincteur 6 kg', qte: 2 }
        ],
        'BS-2026-0138': [
            { code: 'MAT-022', designation: 'Écran 22\" Dell E2222H', qte: 2 },
            { code: 'FOU-045', designation: 'Clavier + souris USB (lot)', qte: 3 },
            { code: 'MAT-030', designation: 'Onduleur 1000 VA', qte: 1 }
        ],
        'BS-2026-0137': [
            { code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1 },
            { code: 'MAT-011', designation: 'Écran 24\" Dell P2422H', qte: 2 },
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 3 }
        ],
        'BS-2026-0136': [
            { code: 'MOB-015', designation: 'Fauteuil de bureau', qte: 3 },
            { code: 'MOB-022', designation: 'Armoire métallique', qte: 1 },
            { code: 'MOB-010', designation: 'Table de réunion', qte: 1 }
        ],
        'BS-2026-0135': [
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 10 },
            { code: 'FOU-031', designation: 'Boîte de stylos à bille bleu (12)', qte: 5 },
            { code: 'FOU-040', designation: 'Boîte de classeurs A4 (24)', qte: 2 }
        ]
    };

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
            } catch (e) { /* données corrompues : on repart d'une liste vide */ }
        }
        return [];
    }

    function save(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
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

    /* Identité simulée du connecté, selon le portail */
    function currentUser() {
        return currentRole() === 'transit'
            ? 'Rabemananjara Solo (Transit)'
            : 'Rakotobe Hery (Personnel)';
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

    function articlesCount(bs) {
        var list = articlesOf(bs);
        return list.length ? list.length : '—';
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

    function record(bs, lignes) {
        var r = { bs: bs, date: now(), par: currentUser(), ts: Date.now(), lignes: lignes || [] };
        receptions.push(r);
        save(receptions);
        return r;
    }

    /* Total des quantités reçues d'une réception */
    function totalRecu(lignes) {
        return (lignes || []).reduce(function (sum, l) { return sum + (l.recu || 0); }, 0);
    }

    /* --- Modale de confirmation (partagée par la liste et le scan) --- */

    /* Table des articles avec saisie des quantités reçues ; les quantités
       attendues sont pré-remplies pour une confirmation rapide. */
    function fillReceptionArticles(modal, b) {
        var body = modal.querySelector('[data-modal-articles-body]');
        if (!body) return;
        var list = articlesOf(b.bs);
        if (!list.length) {
            body.innerHTML = '<tr><td colspan="4" class="cell-muted text-center py-2">Aucune ligne d\'article connue pour ce bon.</td></tr>';
            return;
        }
        body.innerHTML = list.map(function (a) {
            return '<tr>' +
                '<td class="mono">' + escapeHtml(a.code) + '</td>' +
                '<td>' + escapeHtml(a.designation) + '</td>' +
                '<td>' + a.qte + '</td>' +
                '<td><input type="number" class="form-control form-control-sm" style="width:84px;" min="0" value="' + a.qte + '" data-reception-qty data-code="' + escapeHtml(a.code) + '" data-expected="' + a.qte + '"></td>' +
                '</tr>';
        }).join('');
    }

    function fillReceptionModal(modal, b) {
        if (!modal || !b) return;
        modal.querySelector('[data-modal-bs]').textContent = b.bs;
        modal.querySelector('[data-modal-parcours]').textContent = b.destination;
        modal.querySelector('[data-modal-beneficiaire]').textContent = b.beneficiaire;
        modal.querySelector('[data-modal-motif]').textContent = b.motif;
        modal.querySelector('[data-modal-articles]').textContent = articlesCount(b.bs) + ' ligne(s)';
        modal.querySelector('[data-modal-retour]').innerHTML = b.retour
            ? '<span class="badge-status badge--encours"><i class="fa-solid fa-rotate-left"></i> À rendre</span>'
            : '<span class="badge-status badge--valide">Sans retour</span>';
        var error = modal.querySelector('[data-reception-error]');
        if (error) error.classList.add('is-hidden');
        fillReceptionArticles(modal, b);
    }

    /* Récupère les quantités saisies ; renvoie null si une quantité
       attendue n'est pas renseignée (message dans la modale). */
    function collectReceptionLignes(modal) {
        var inputs = modal.querySelectorAll('[data-reception-qty]');
        var firstEmpty = null;
        var lignes = Array.prototype.map.call(inputs, function (input) {
            var recu = parseInt(input.value, 10);
            if (isNaN(recu)) {
                if (!firstEmpty) firstEmpty = input;
                recu = 0;
            }
            return {
                code: input.getAttribute('data-code'),
                attendu: parseInt(input.getAttribute('data-expected'), 10),
                recu: recu
            };
        });
        if (firstEmpty) {
            var error = modal.querySelector('[data-reception-error]');
            if (error) error.classList.remove('is-hidden');
            firstEmpty.focus();
            return null;
        }
        var error = modal.querySelector('[data-reception-error]');
        if (error) error.classList.add('is-hidden');
        return lignes;
    }

    /* Câble les boutons [data-reception-signal] (remplissage de la modale)
       et la confirmation [data-reception-confirm] dans un périmètre donné. */
    function initSignalModal(scope, afterSignal) {
        var pendingBs = null;
        scope.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-reception-signal]');
            if (!btn) return;
            var ref = btn.getAttribute('data-reception-signal');
            var b = bsOf(ref);
            if (!b) return;
            pendingBs = ref;
            fillReceptionModal(scope.querySelector('[data-modal="reception"]'), b);
        });
        var confirmBtn = scope.querySelector('[data-reception-confirm]');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function () {
                var modal = scope.querySelector('[data-modal="reception"]');
                if (!modal || !pendingBs) return;
                var lignes = collectReceptionLignes(modal);
                if (!lignes) return;
                var bs = pendingBs;
                pendingBs = null;
                modal.hidden = true;
                document.body.classList.remove('modal-open');
                var r = record(bs, lignes);
                if (afterSignal) afterSignal(bs, r);
            });
        }
    }

    /* ============================================================
       FICHE DÉTAIL D'UN BS — carte « Réception de la marchandise »
       ============================================================ */
    function bootDetail() {
        var card = document.querySelector('[data-reception-card]');
        if (!card) return false;
        if (card.getAttribute('data-bound')) return true;
        card.setAttribute('data-bound', '1');

        var bs = (function () {
            var el = document.querySelector('[data-bs-ref]');
            return el ? el.textContent.trim() : 'BS-2026-0142';
        })();
        var role = currentRole();
        var signalBtn = card.querySelector('[data-reception-signal]');
        var chip = card.querySelector('[data-reception-chip]');
        var success = card.querySelector('[data-reception-success]');
        var successText = card.querySelector('[data-reception-success-text]');
        var status = document.querySelector('[data-bs-status]');
        var stepTransit = document.querySelector('[data-workflow-step="transit"]');
        var stepReception = document.querySelector('[data-workflow-step="reception"]');
        var actor = stepReception ? stepReception.querySelector('[data-workflow-actor]') : null;
        var currentChip = document.querySelector('[data-workflow-current]');
        var timeline = document.querySelector('[data-bs-timeline]');

        function render() {
            var r = receptionOf(bs);
            if (r) {
                if (signalBtn) signalBtn.classList.add('is-hidden');
                if (chip) chip.textContent = 'Réceptionné le ' + r.date;
                if (status) {
                    status.textContent = 'Réceptionné';
                    status.className = 'badge-status badge--info';
                }
                if (stepTransit) {
                    stepTransit.classList.add('workflow-step--done');
                    stepTransit.classList.remove('workflow-step--current');
                }
                if (stepReception) stepReception.classList.add('workflow-step--done');
                if (actor) actor.textContent = r.par.split(' (')[0];
                if (currentChip) currentChip.innerHTML = '<i class="fa-solid fa-box-open"></i> Étape courante : Réception effectuée';
                if (success && successText) {
                    successText.textContent = 'Réception signalée le ' + r.date + ' par ' + r.par +
                        ' — ' + totalRecu(r.lignes) + ' pièce(s) reçue(s). Le suivi des retours démarre à partir de cette date.';
                    success.classList.remove('is-hidden');
                }
                if (timeline && !card.getAttribute('data-timeline-added')) {
                    card.setAttribute('data-timeline-added', '1');
                    var li = document.createElement('li');
                    li.className = 'timeline-item';
                    li.innerHTML =
                        '<div class="timeline-item__title">Réception <span class="badge-status badge--info">Réceptionné</span></div>' +
                        '<div class="timeline-item__meta">' + escapeHtml(r.par) + ' · ' + escapeHtml(r.date) + '</div>' +
                        '<div class="timeline-item__desc">Marchandise réceptionnée au magasin de destination — suivi des retours engagé.</div>';
                    timeline.insertBefore(li, timeline.firstChild);
                }
            } else if (role === 'admin' && signalBtn) {
                /* l'administrateur suit la réception sans pouvoir la signaler */
                signalBtn.classList.add('is-hidden');
            }
        }

        /* La modale du détail est fixe (BS-2026-0142) : on pré-remplit la
           table des articles avec les quantités attendues. */
        var modal = document.querySelector('[data-modal="reception"]');
        var b = bsOf(bs);
        if (modal && b) fillReceptionArticles(modal, b);

        var confirmBtn = document.querySelector('[data-reception-confirm]');
        if (confirmBtn && modal) {
            confirmBtn.addEventListener('click', function () {
                var lignes = collectReceptionLignes(modal);
                if (!lignes) return;
                modal.hidden = true;
                document.body.classList.remove('modal-open');
                record(bs, lignes);
                render();
            });
        }

        render();
        return true;
    }

    /* ============================================================
       PAGE SCAN & TRANSIT — l'agent déclare la réception après le scan
       ============================================================ */
    function showScanReceptionSuccess(panel, r) {
        var prev = panel.querySelector('[data-reception-done]');
        if (prev) prev.parentNode.removeChild(prev);
        var div = document.createElement('div');
        div.setAttribute('data-reception-done', '1');
        div.className = 'alert-mock alert-mock--success mb-3';
        div.innerHTML = '<i class="fa-solid fa-box-open"></i>' +
            '<span>Réception <strong>signalée</strong> pour ' + escapeHtml(r.bs) + ' le ' + escapeHtml(r.date) +
            ' par ' + escapeHtml(r.par) + ' — ' + totalRecu(r.lignes) + ' pièce(s) reçue(s). Le suivi des retours démarre à partir de cette date.</span>';
        panel.insertBefore(div, panel.firstChild);
        var btn = panel.querySelector('[data-reception-signal]');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-mock--outline');
            btn.innerHTML = '<i class="fa-solid fa-box-open"></i> Réception signalée';
        }
    }

    function bootScan() {
        var panel = document.querySelector('[data-scan-panel]');
        if (!panel) return false;
        var section = panel.closest('section');
        if (section && section.getAttribute('data-bound')) return true;
        if (section) section.setAttribute('data-bound', '1');
        var scope = section || panel;
        initSignalModal(scope, function (bs, r) {
            showScanReceptionSuccess(panel, r);
        });
        return true;
    }

    /* ============================================================
       LISTE DES BS — onglet « BS à recevoir » (personnel)
       ============================================================ */
    function bootList() {
        var root = document.querySelector('[data-bslist]');
        if (!root) return false;
        if (root.getAttribute('data-reception-bound')) return true;
        root.setAttribute('data-reception-bound', '1');
        initSignalModal(root, function () {
            /* re-rend la liste : le statut du BS passe à « Réceptionné » */
            if (window.S2M && window.S2M.bsListRefresh) S2M.bsListRefresh();
        });
        return true;
    }

    /* Démarrage selon la page affichée */
    function tryBoot() {
        if (pageName() === 'bs-detail') return bootDetail();
        if (pageName() === 'transit') return bootScan();
        if (pageName() === 'bs-list') return bootList();
        return false;
    }

    if (!tryBoot()) {
        var timer = setInterval(function () {
            if (tryBoot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }

    /* La page est injectée de façon asynchrone par app.js : on relance
       le démarrage dès que du contenu arrive, même après le minuteur. */
    var bootObserver = new MutationObserver(function () {
        tryBoot();
    });
    bootObserver.observe(document.body, { childList: true, subtree: true });

    /* API partagée : la liste des BS reflète le statut réceptionné */
    window.S2M = window.S2M || {};
    window.S2M.receptions = {
        isReceptionne: isReceptionne,
        list: receptions
    };
})();
