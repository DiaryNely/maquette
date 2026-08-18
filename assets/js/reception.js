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

    /* Réception physique : constat article par article par l'agent de
       transit (quantités réellement reçues, § transit). */
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

    /* --- Confirmation du destinataire (Personnel lambda) ---
       Le constat physique est fait par l'agent de transit ; le destinataire
       confirme ensuite la réception du bon — une simple confirmation, sans
       ressaisie des quantités. C'est cette confirmation qui fait passer le
       BS à « Réceptionné » et déclenche la notification de réception. */

    var CONFIRM_STORAGE_KEY = 's2m.receptionConfirmations.v1';

    function loadConfirmations() {
        var raw = null;
        try { raw = localStorage.getItem(CONFIRM_STORAGE_KEY); } catch (e) { raw = null; }
        if (raw) {
            try {
                var list = JSON.parse(raw);
                if (Array.isArray(list)) return list;
            } catch (e) { /* données corrompues : liste vide */ }
        }
        return [];
    }

    function saveConfirmations(list) {
        try { localStorage.setItem(CONFIRM_STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
    }

    var confirmations = loadConfirmations();

    function isConfirme(bs) {
        return confirmations.some(function (c) { return c.bs === bs; });
    }

    function confirmationOf(bs) {
        var c = null;
        for (var i = confirmations.length - 1; i >= 0; i--) {
            if (confirmations[i].bs === bs) { c = confirmations[i]; break; }
        }
        return c;
    }

    function confirm(bs) {
        var c = { bs: bs, date: now(), par: currentUser(), ts: Date.now() };
        confirmations.push(c);
        saveConfirmations(confirmations);
        return c;
    }


    /* ============================================================
       FICHE DÉTAIL D'UN BS — carte « Réception de la marchandise »
       Réception en deux temps : constat physique (transit) puis
       confirmation du destinataire. La carte affiche l'état selon
       l'avancement ; le bouton est une simple confirmation, sans
       ressaisie des quantités.
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
            var r = receptionOf(bs);      // constat physique (transit)
            var c = confirmationOf(bs);   // confirmation du destinataire
            var confirmed = !!c;

            if (signalBtn) {
                if (role === 'admin' || role === 'transit') {
                    /* l'admin suit en lecture seule ; le constat physique se
                       fait sur la page Scan & Transit, pas depuis la fiche */
                    signalBtn.classList.add('is-hidden');
                } else if (!r) {
                    signalBtn.disabled = true;
                    signalBtn.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> En attente de réception par le transit';
                } else if (!c) {
                    signalBtn.disabled = false;
                    signalBtn.innerHTML = '<i class="fa-solid fa-box-open"></i> Confirmer la réception';
                } else {
                    signalBtn.classList.add('is-hidden');
                }
            }
            if (chip) {
                chip.textContent = confirmed
                    ? 'Réception confirmée le ' + c.date
                    : (r ? 'Réception constatée par le transit le ' + r.date : chip.textContent);
            }
            if (status && confirmed) {
                status.textContent = 'Réceptionné';
                status.className = 'badge-status badge--info';
            }
            if (stepTransit && r) {
                stepTransit.classList.add('workflow-step--done');
                stepTransit.classList.remove('workflow-step--current');
            }
            if (stepReception && confirmed) stepReception.classList.add('workflow-step--done');
            if (actor && c) actor.textContent = c.par.split(' (')[0];
            if (currentChip && confirmed) currentChip.innerHTML = '<i class="fa-solid fa-box-open"></i> Étape courante : Réception effectuée';
            if (success && successText && confirmed) {
                successText.textContent = 'Réception confirmée le ' + c.date + ' par ' + c.par +
                    ' — constat du transit le ' + (r ? r.date : '—') + ' (' + totalRecu(r.lignes) + ' pièce(s) reçue(s)). ' +
                    'Le suivi des retours démarre à partir de la date du constat.';
                success.classList.remove('is-hidden');
            }
            if (timeline && confirmed && !card.getAttribute('data-timeline-added')) {
                card.setAttribute('data-timeline-added', '1');
                var li = document.createElement('li');
                li.className = 'timeline-item';
                li.innerHTML =
                    '<div class="timeline-item__title">Réception <span class="badge-status badge--info">Confirmée</span></div>' +
                    '<div class="timeline-item__meta">' + escapeHtml(c.par) + ' · ' + escapeHtml(c.date) + '</div>' +
                    '<div class="timeline-item__desc">Réception physique constatée par le transit le ' +
                        escapeHtml(r ? r.date : '—') + ', confirmée par le destinataire — suivi des retours engagé.</div>';
                timeline.insertBefore(li, timeline.firstChild);
            }
        }

        /* Confirmation simple (destinataire) : aucune modale, aucune
           ressaisie de quantités — le constat a été fait par le transit. */
        if (signalBtn) {
            signalBtn.addEventListener('click', function () {
                if (!receptionOf(bs) || isConfirme(bs)) return;
                confirm(bs);
                render();
            });
        }

        render();
        return true;
    }

    /* ============================================================
       LISTE DES BS — onglet « BS à recevoir » (personnel)
       Confirmation simple du destinataire : le bouton n'est actif que
       si le constat physique a été enregistré par l'agent de transit.
       ============================================================ */
    function bootList() {
        var root = document.querySelector('[data-bslist]');
        if (!root) return false;
        if (root.getAttribute('data-reception-bound')) return true;
        root.setAttribute('data-reception-bound', '1');
        root.addEventListener('click', function (event) {
            var btn = event.target.closest('[data-reception-confirm]');
            if (!btn) return;
            var ref = btn.getAttribute('data-reception-confirm');
            if (!isReceptionne(ref) || isConfirme(ref)) return;
            confirm(ref);
            /* re-rend la liste : le statut du BS passe à « Réceptionné » */
            if (window.S2M && window.S2M.bsListRefresh) S2M.bsListRefresh();
        });
        return true;
    }

    /* Démarrage selon la page affichée (la réception physique du transit
       est gérée par transit.js sur la page Scan & Transit) */
    function tryBoot() {
        if (pageName() === 'bs-detail') return bootDetail();
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

    /* API partagée : la liste des BS reflète le statut réceptionné. record
       (constat physique) est utilisé par la page Scan & Transit ; confirm
       (confirmation du destinataire) par la liste des BS et la fiche détail. */
    window.S2M = window.S2M || {};
    window.S2M.receptions = {
        isReceptionne: isReceptionne,
        receptionOf: receptionOf,
        record: record,
        confirm: confirm,
        isConfirme: isConfirme,
        confirmationOf: confirmationOf,
        list: receptions
    };
})();
