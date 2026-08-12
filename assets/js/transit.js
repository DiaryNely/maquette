/* ============================================================
   TRANSIT — gestion dynamique des transits (mockup S2M-WEB)

   Nouveau modèle : le parcours d'un BS n'est plus planifié à
   l'avance. Quand un bon de sortie arrive dans un magasin, on
   scanne son QR code : c'est à ce moment-là qu'un transit est
   créé pour ce BS à cet endroit. Chaque scan dans un autre
   magasin ajoute un passage — le parcours se construit au fil
   des événements, sans itinéraire prédéfini.

   Persistance : localStorage (clé s2m.transits.v1) pour que la
   démo fonctionne de bout en bout (scan → création → suivi).
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 's2m.transits.v1';

    var MAGASINS = [
        'Barrière de sortie',
        'Plateforme logistique',
        'Magasin central',
        'Entrepôt S2M',
        'Poste de contrôle',
        'Siège - Administration S2M'
    ];

    var AGENTS = [
        'Rakotobe Hery',
        'Rabemananjara Solo',
        'Andrianarivo Tovo',
        'Randria Jean',
        'Rasoanirina Miora'
    ];

    /* Données de démo — transits déjà enregistrés par scan
       resultat : 'a-controle' | 'conforme' | 'non-conforme' */
    var SEED = [
        { id: 'TR-2026-0102', bs: 'BS-2026-0142', magasin: 'Plateforme logistique', agent: 'Rabemananjara Solo', arrivee: '14/08/2026 à 14:20', resultat: 'a-controle', note: '', anomalie: null },
        { id: 'TR-2026-0101', bs: 'BS-2026-0142', magasin: 'Barrière de sortie', agent: 'Rakotobe Hery', arrivee: '14/08/2026 à 13:05', resultat: 'conforme', note: '', anomalie: null },
        { id: 'TR-2026-0098', bs: 'BS-2026-0141', magasin: 'Poste de contrôle', agent: 'Rabemananjara Solo', arrivee: '13/08/2026 à 16:40', resultat: 'conforme', note: '', anomalie: null },
        { id: 'TR-2026-0099', bs: 'BS-2026-0140', magasin: 'Poste de contrôle', agent: 'Rabemananjara Solo', arrivee: '12/08/2026 à 11:08', resultat: 'conforme', note: '', anomalie: null },
        { id: 'TR-2026-0097', bs: 'BS-2026-0140', magasin: 'Plateforme logistique', agent: 'Rabemananjara Solo', arrivee: '11/08/2026 à 16:45', resultat: 'conforme', note: '', anomalie: null },
        { id: 'TR-2026-0096', bs: 'BS-2026-0140', magasin: 'Barrière de sortie', agent: 'Rakotobe Hery', arrivee: '11/08/2026 à 10:12', resultat: 'conforme', note: '', anomalie: null },
        { id: 'TR-2026-0092', bs: 'BS-2026-0139', magasin: 'Plateforme logistique', agent: 'Rabemananjara Solo', arrivee: '12/08/2026 à 10:15', resultat: 'non-conforme', note: '', anomalie: 'ANO-2026-014' },
        { id: 'TR-2026-0088', bs: 'BS-2026-0135', magasin: 'Barrière de sortie', agent: 'Andrianarivo Tovo', arrivee: '05/08/2026 à 08:50', resultat: 'conforme', note: '', anomalie: null }
    ];

    /* --- Persistance --- */

    function load() {
        var raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
        if (raw) {
            try { return JSON.parse(raw); } catch (e) { /* données corrompues : on repart du seed */ }
        }
        var list = SEED.slice();
        save(list);
        return list;
    }

    function save(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
    }

    /* --- Utilitaires --- */

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function now() {
        var d = new Date();
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() +
            ' à ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    function nextId(list) {
        var max = 1000;
        for (var i = 0; i < list.length; i++) {
            var m = /(\d+)$/.exec(list[i].id || '');
            if (m) max = Math.max(max, parseInt(m[1], 10));
        }
        return 'TR-2026-' + String(max + 1).padStart(4, '0');
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function badge(resultat) {
        if (resultat === 'conforme') return '<span class="badge-status badge--valide">Conforme</span>';
        if (resultat === 'non-conforme') return '<span class="badge-status badge--refuse">Non conforme</span>';
        return '<span class="badge-status badge--encours">À contrôler</span>';
    }

    /* --- API --- */

    function all() { return load(); }

    function forBs(bs) {
        return load().filter(function (t) { return t.bs === bs; });
    }

    function find(bs, magasin) {
        var list = load();
        for (var i = 0; i < list.length; i++) {
            if (list[i].bs === bs && list[i].magasin === magasin) return list[i];
        }
        return null;
    }

    /* Crée le transit d'un BS dans un magasin (après scan du QR).
       Si un transit existe déjà pour ce BS à ce magasin, on le renvoie. */
    function create(bs, magasin, agent) {
        var existing = find(bs, magasin);
        if (existing) return { transit: existing, created: false };

        var list = load();
        var t = {
            id: nextId(list),
            bs: bs,
            magasin: magasin,
            agent: agent,
            arrivee: now(),
            resultat: 'a-controle',
            note: '',
            anomalie: null
        };
        list.unshift(t);
        save(list);
        return { transit: t, created: true };
    }

    function validate(id, resultat, note) {
        var list = load();
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                list[i].resultat = resultat;
                if (note != null) list[i].note = note;
                save(list);
                return list[i];
            }
        }
        return null;
    }

    function reset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
        return load();
    }

    /* --- Rendu --- */

    function renderAllTable(container) {
        if (!container) return;
        var tbody = container.querySelector('tbody') || container;
        var limit = parseInt(container.getAttribute('data-limit') || '0', 10);
        var list = load().slice();
        list.sort(function (a, b) { return (b.arrivee || '').localeCompare(a.arrivee || ''); });
        if (limit > 0) list = list.slice(0, limit);

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="cell-muted text-center">Aucun transit enregistré pour le moment.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(function (t) {
            return '<tr>' +
                '<td><a class="cell-link" href="index.html?page=bs-detail">' + escapeHtml(t.bs) + '</a></td>' +
                '<td>' + escapeHtml(t.magasin) + '</td>' +
                '<td>' + escapeHtml(t.agent) + '</td>' +
                '<td>' + escapeHtml(t.arrivee) + '</td>' +
                '<td>' + badge(t.resultat) + '</td>' +
                '<td>' + (t.anomalie
                    ? '<a class="cell-link" href="index.html?page=anomalie-detail">' + escapeHtml(t.anomalie) + '</a>'
                    : '<span class="cell-muted">—</span>') + '</td>' +
                '</tr>';
        }).join('');
    }

    /* Table des passages d'un BS (ordre chronologique), numérotés */
    function renderBsTable(container) {
        if (!container) return;
        var bs = container.getAttribute('data-bs') || '';
        var tbody = container.querySelector('tbody') || container;
        var list = forBs(bs);
        list.sort(function (a, b) { return (a.arrivee || '').localeCompare(b.arrivee || ''); });

        var count = container.getAttribute('data-count-el') ?
            document.querySelector(container.getAttribute('data-count-el')) : null;
        if (count) {
            count.textContent = list.length + (list.length > 1 ? ' passages enregistrés' : ' passage enregistré');
        }

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="cell-muted text-center">' +
                'Aucun passage enregistré — le premier scan du QR dans un magasin créera le transit.</td></tr>';
            return;
        }
        tbody.innerHTML = list.map(function (t, i) {
            var last = i === list.length - 1;
            return '<tr' + (last ? ' style="background:var(--m-bg-soft);"' : '') + '>' +
                '<td><span class="chip' + (last ? ' chip--active' : '') + '">Passage ' + (i + 1) + '</span></td>' +
                '<td>' + escapeHtml(t.magasin) + '</td>' +
                '<td>' + escapeHtml(t.agent) + '</td>' +
                '<td>' + escapeHtml(t.arrivee) + '</td>' +
                '<td>' + badge(t.resultat) + '</td>' +
                '</tr>';
        }).join('');
    }

    /* Parcours d'un BS (sidebar) : origine → passages → destination */
    function renderParcours(container) {
        if (!container) return;
        var bs = container.getAttribute('data-bs') || '';
        var origin = container.getAttribute('data-origin');
        var destination = container.getAttribute('data-destination');
        var list = forBs(bs);
        list.sort(function (a, b) { return (a.arrivee || '').localeCompare(b.arrivee || ''); });

        var html = '';
        if (origin) {
            html += '<li class="d-flex justify-content-between py-1">' +
                '<span class="cell-muted">' + escapeHtml(origin) + '</span>' +
                '<span class="badge-status badge--valide">Sorti</span></li>';
        }
        list.forEach(function (t) {
            html += '<li class="d-flex justify-content-between py-1">' +
                '<span class="cell-muted">' + escapeHtml(t.magasin) + '</span>' +
                badge(t.resultat) + '</li>';
        });
        if (destination) {
            html += '<li class="d-flex justify-content-between py-1">' +
                '<span class="cell-muted">' + escapeHtml(destination) + '</span>' +
                '<span class="badge-status badge--brouillon">À venir</span></li>';
        }
        container.innerHTML = html ||
            '<li class="cell-muted py-1">Aucun passage enregistré pour ce BS.</li>';
    }

    /* Carte « contrôle en cours » (transit.html) : premier passage à contrôler */
    function renderControle(card) {
        if (!card) return;
        var list = load().filter(function (t) { return t.resultat === 'a-controle'; });
        var empty = card.querySelector('[data-c-empty]');
        var content = card.querySelector('[data-c-content]');
        if (!list.length) {
            if (empty) empty.classList.remove('is-hidden');
            if (content) content.classList.add('is-hidden');
            return;
        }
        if (empty) empty.classList.add('is-hidden');
        if (content) content.classList.remove('is-hidden');

        var t = list[0];
        var map = {
            '[data-c-bs]': t.bs,
            '[data-c-magasin]': t.magasin,
            '[data-c-agent]': t.agent,
            '[data-c-date]': t.arrivee
        };
        for (var sel in map) {
            if (!Object.prototype.hasOwnProperty.call(map, sel)) continue;
            var el = card.querySelector(sel);
            if (el) el.textContent = map[sel];
        }
        var badgeEl = card.querySelector('[data-c-badge]');
        if (badgeEl) badgeEl.innerHTML = badge(t.resultat);

        var anom = card.querySelector('[data-c-anomalie]');
        if (anom) {
            anom.setAttribute('href', 'index.html?page=anomalie-create&bs=' +
                encodeURIComponent(t.bs) + '&magasin=' + encodeURIComponent(t.magasin));
        }

        var form = card.querySelector('[data-controle-form]');
        if (form && !form.getAttribute('data-bound')) {
            form.setAttribute('data-bound', '1');
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var resultat = form.querySelector('#transit-controle').value;
                var note = form.querySelector('#transit-note').value;
                var updated = validate(t.id,
                    resultat.indexOf('Non conforme') === 0 ? 'non-conforme' : 'conforme',
                    note);
                if (updated) {
                    var b = card.querySelector('[data-c-badge]');
                    if (b) b.innerHTML = badge(updated.resultat);
                    var ok = card.querySelector('[data-c-ok]');
                    if (ok) ok.classList.remove('is-hidden');
                    // refresh des listes affichées sur la page
                    document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
                    document.querySelectorAll('[data-transits-bs]').forEach(renderBsTable);
                    document.querySelectorAll('[data-bs-parcours]').forEach(renderParcours);
                }
            });
        }
    }

    function fillSelect(select, options, selected) {
        if (!select) return;
        select.innerHTML = options.map(function (o) {
            return '<option value="' + escapeHtml(o) + '"' +
                (o === selected ? ' selected' : '') + '>' + escapeHtml(o) + '</option>';
        }).join('');
    }

    function showAlert(container, msg, kind) {
        var alert = document.createElement('div');
        alert.className = 'alert-mock alert-mock--' + (kind === 'danger' ? 'danger' : 'success') + ' mb-3';
        alert.innerHTML = '<i class="fa-solid ' + (kind === 'danger' ? 'fa-circle-xmark' : 'fa-circle-info') + '"></i>' +
            '<span>' + escapeHtml(msg) + '</span>';
        container.insertBefore(alert, container.firstChild);
    }

    /* --- Flux du scan (pages/scan.html) --- */

    function initScan() {
        var form = document.querySelector('[data-scan-form]');
        var panel = document.querySelector('[data-scan-panel]');
        if (!form || !panel) return;

        var bsInput = form.querySelector('[data-scan-bs]');
        var magSel = form.querySelector('[data-scan-magasin]');
        var agentSel = form.querySelector('[data-scan-agent]');

        fillSelect(magSel, MAGASINS, magSel.getAttribute('data-default') || 'Plateforme logistique');
        fillSelect(agentSel, AGENTS, agentSel.getAttribute('data-default') || 'Rabemananjara Solo');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var bs = (bsInput.value || '').trim().toUpperCase();
            if (!bs) {
                showAlert(panel, 'Saisissez la référence du BS à scanner (ex. BS-2026-0142).', 'danger');
                return;
            }
            var r = create(bs, magSel.value, agentSel.value);
            renderScanPanel(panel, r);
        });
    }

    function renderScanPanel(panel, r) {
        var t = r.transit;
        panel.innerHTML =
            '<div class="alert-mock ' + (r.created ? 'alert-mock--success' : 'alert-mock--info') + ' mb-3">' +
                '<i class="fa-solid ' + (r.created ? 'fa-circle-check' : 'fa-circle-info') + '"></i>' +
                '<span>' + (r.created
                    ? 'Transit <strong>' + escapeHtml(t.id) + '</strong> créé au magasin <strong>' + escapeHtml(t.magasin) + '</strong> — le parcours du BS s\'enrichit d\'un passage.'
                    : 'Un transit existe déjà pour ce BS à ce magasin : <strong>' + escapeHtml(t.id) + '</strong>. Vous pouvez contrôler ou valider son passage.') +
                '</span></div>' +
            '<div class="info-grid mb-3">' +
                '<div class="info-grid__item"><label>BS</label><div class="value mono">' + escapeHtml(t.bs) + '</div></div>' +
                '<div class="info-grid__item"><label>Magasin</label><div class="value">' + escapeHtml(t.magasin) + '</div></div>' +
                '<div class="info-grid__item"><label>Agent</label><div class="value">' + escapeHtml(t.agent) + '</div></div>' +
                '<div class="info-grid__item"><label>Arrivée enregistrée</label><div class="value">' + escapeHtml(t.arrivee) + '</div></div>' +
                '<div class="info-grid__item"><label>Statut</label><div class="value" data-tx-badge>' + badge(t.resultat) + '</div></div>' +
            '</div>' +
            '<div class="form-group">' +
                '<label for="scan-resultat">Résultat du contrôle</label>' +
                '<select class="form-control" id="scan-resultat">' +
                    '<option value="conforme">Conforme — colis identifié, scellé et complet</option>' +
                    '<option value="non-conforme">Non conforme — anomalie détectée</option>' +
                '</select>' +
            '</div>' +
            '<div class="form-group">' +
                '<label for="scan-note">Note de contrôle (facultatif)</label>' +
                '<textarea class="form-control" id="scan-note" rows="2" placeholder="État du colis, observations…"></textarea>' +
            '</div>' +
            '<div class="d-flex flex-wrap" style="gap:10px;">' +
                '<button class="btn-mock" type="button" data-tx-validate><i class="fa-solid fa-circle-check"></i> Valider le passage</button>' +
                '<a href="index.html?page=anomalie-create&bs=' + encodeURIComponent(t.bs) +
                    '&magasin=' + encodeURIComponent(t.magasin) +
                    '" class="btn-mock btn-mock--danger"><i class="fa-solid fa-triangle-exclamation"></i> Déclarer une anomalie</a>' +
            '</div>';

        var validateBtn = panel.querySelector('[data-tx-validate]');
        validateBtn.addEventListener('click', function () {
            var resultat = panel.querySelector('#scan-resultat').value;
            var note = panel.querySelector('#scan-note').value;
            var updated = validate(t.id, resultat, note);
            if (!updated) return;
            var badgeEl = panel.querySelector('[data-tx-badge]');
            if (badgeEl) badgeEl.innerHTML = badge(updated.resultat);
            validateBtn.setAttribute('disabled', 'disabled');
            var alert = panel.querySelector('.alert-mock');
            if (alert) {
                alert.className = 'alert-mock alert-mock--' + (resultat === 'conforme' ? 'success' : 'danger') + ' mb-3';
                alert.innerHTML = '<i class="fa-solid ' + (resultat === 'conforme' ? 'fa-circle-check' : 'fa-triangle-exclamation') + '"></i>' +
                    '<span>' + (resultat === 'conforme'
                        ? 'Passage validé : le colis est conforme, le BS peut poursuivre son parcours.'
                        : 'Passage non conforme : le BS est bloqué jusqu\'à résolution de l\'anomalie.') + '</span>';
            }
        });
    }

    /* --- Boot --- */

    function boot() {
        var found = false;
        document.querySelectorAll('[data-transits-table]').forEach(function (el) {
            renderAllTable(el);
            found = true;
        });
        document.querySelectorAll('[data-transits-bs]').forEach(function (el) {
            renderBsTable(el);
            found = true;
        });
        document.querySelectorAll('[data-bs-parcours]').forEach(function (el) {
            renderParcours(el);
            found = true;
        });
        document.querySelectorAll('[data-controle-card]').forEach(function (el) {
            renderControle(el);
            found = true;
        });
        var kpiPending = document.querySelector('[data-kpi-pending]');
        if (kpiPending) {
            kpiPending.textContent = load().filter(function (t) { return t.resultat === 'a-controle'; }).length;
        }
        initScan();
        return found;
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }

    /* API publique */
    window.S2M = window.S2M || {};
    window.S2M.transits = {
        MAGASINS: MAGASINS,
        AGENTS: AGENTS,
        all: all,
        forBs: forBs,
        find: find,
        create: create,
        validate: validate,
        reset: reset,
        badge: badge,
        escapeHtml: escapeHtml
    };
})();
