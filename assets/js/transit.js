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

    /* Filtre de recherche par numéro de BS (barre du dropdown Transits) */
    var allFilter = '';

    function renderAllTable(container) {
        if (!container) return;
        var tbody = container.querySelector('tbody') || container;
        var limit = parseInt(container.getAttribute('data-limit') || '0', 10);
        var list = load().slice();
        if (allFilter) {
            var q = normalize(allFilter);
            list = list.filter(function (t) {
                return normalize(t.bs).indexOf(q) !== -1 ||
                    normalize(t.magasin).indexOf(q) !== -1 ||
                    normalize(t.agent).indexOf(q) !== -1;
            });
        }
        list.sort(function (a, b) { return (b.arrivee || '').localeCompare(a.arrivee || ''); });
        if (limit > 0) list = list.slice(0, limit);

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="cell-muted text-center">' +
                (allFilter ? 'Aucun transit ne correspond à la recherche <strong>' + escapeHtml(allFilter) + '</strong>.'
                    : 'Aucun transit enregistré pour le moment.') +
                '</td></tr>';
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

    /* Rafraîchit le KPI « passages en attente de contrôle » */
    function refreshKpi() {
        var kpi = document.querySelector('[data-kpi-pending]');
        if (kpi) {
            kpi.textContent = load().filter(function (t) { return t.resultat === 'a-controle'; }).length;
        }
    }

    /* Carte « contrôle en cours » : premier passage à contrôler */
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

        // nouvelle saisie : on masque la confirmation précédente
        var okPrev = card.querySelector('[data-c-ok]');
        if (okPrev) okPrev.classList.add('is-hidden');

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
        if (form) {
            // remplacement propre du handler à chaque rendu
            if (form._txHandler) form.removeEventListener('submit', form._txHandler);
            form._txHandler = function (e) {
                e.preventDefault();
                var resultat = form.querySelector('#transit-controle').value;
                var note = form.querySelector('#transit-note').value;
                var updated = validate(t.id,
                    resultat.indexOf('Non conforme') === 0 ? 'non-conforme' : 'conforme',
                    note);
                if (!updated) return;
                var ok = card.querySelector('[data-c-ok]');
                if (ok) {
                    ok.classList.remove('is-hidden');
                    var span = ok.querySelector('span');
                    var agent = escapeHtml(t.agent);
                    if (resultat.indexOf('Non conforme') === 0) {
                        ok.className = 'alert-mock alert-mock--danger mb-3';
                        span.innerHTML = 'Contrôle <strong>non conforme</strong> signalé par <strong>' + agent +
                            '</strong> — le BS est bloqué jusqu\'à résolution de l\'anomalie.';
                    } else {
                        ok.className = 'alert-mock alert-mock--success mb-3';
                        span.innerHTML = 'Passage validé par <strong>' + agent +
                            '</strong> — le matériel a bien transité dans ce secteur, le contrôle est enregistré.';
                    }
                }
                // refresh des listes, du KPI, puis passage au contrôle suivant
                document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
                document.querySelectorAll('[data-transits-bs]').forEach(renderBsTable);
                document.querySelectorAll('[data-bs-parcours]').forEach(renderParcours);
                refreshKpi();
                renderControle(card);
            };
            form.addEventListener('submit', form._txHandler);
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

    /* --- Flux du scan --- */

    var PERSONNEL = (window.S2M && window.S2M.personnel) || [];

    function normalize(s) {
        return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    /* Recherche du personnel par magasin, comme sur la page de création :
       on saisit un nom, des suggestions filtrent par le magasin sélectionné
       (plusieurs personnes peuvent porter le même nom). */
    function initPersonnelSearch(root, magSel, defaultName) {
        if (!root || !magSel) return null;
        var input = root.querySelector('[data-scan-agent]');
        var list = root.querySelector('[data-scan-personnel-list]');
        var hint = document.querySelector('[data-scan-personnel-hint]');
        if (!input || !list || !hint) return null;

        var results = [];

        function peopleOfStore() {
            return PERSONNEL.filter(function (p) { return p.magasin === magSel.value; });
        }

        function render(query) {
            var q = normalize(query);
            results = peopleOfStore().filter(function (p) {
                return !q || normalize(p.nom + ' ' + p.matricule + ' ' + p.role).indexOf(q) !== -1;
            });
            if (!results.length) {
                list.innerHTML = '<li class="personnel-search__empty">' +
                    'Aucun agent trouvé pour <strong>' + escapeHtml(magSel.value) + '</strong>.</li>';
                list.hidden = false;
                return;
            }
            list.innerHTML = results.map(function (p) {
                return '<li class="personnel-search__item" role="option" tabindex="-1">' +
                    '<span><strong>' + escapeHtml(p.nom) + '</strong> <span class="text-muted2">· ' + escapeHtml(p.role) + '</span></span>' +
                    '<span class="text-muted2" style="white-space:nowrap;">' + escapeHtml(p.matricule) + ' · ' + escapeHtml(p.magasin) + '</span>' +
                    '</li>';
            }).join('');
            list.hidden = false;
        }

        function choose(p) {
            input.value = p.nom;
            list.hidden = true;
            hint.innerHTML = '<i class="fa-solid fa-circle-check text-teal"></i> ' +
                escapeHtml(p.nom) + ' — ' + escapeHtml(p.matricule) + ' · ' + escapeHtml(p.role) + ' · ' + escapeHtml(p.magasin);
        }

        function resetSelection() {
            input.value = '';
            hint.textContent = 'Plusieurs personnes peuvent porter le même nom — choisissez dans les suggestions.';
            list.hidden = true;
        }

        /* pré-sélection par défaut (agent habituel du magasin) */
        var people = peopleOfStore();
        var def = null;
        for (var i = 0; i < people.length; i++) {
            if (people[i].nom === defaultName) { def = people[i]; break; }
        }
        if (!def && people.length) def = people[0];
        if (def) choose(def);

        magSel.addEventListener('change', function () {
            resetSelection();
            var p = peopleOfStore();
            if (p.length) choose(p[0]);
        });
        input.addEventListener('focus', function () { render(input.value); });
        input.addEventListener('input', function () { render(input.value); });
        input.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') { list.hidden = true; return; }
            var items = list.querySelectorAll('.personnel-search__item');
            if (!items.length) return;
            var idx = Array.prototype.indexOf.call(items, document.activeElement);
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                items[(idx + 1) % items.length].focus();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                items[(idx - 1 + items.length) % items.length].focus();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                var active = document.activeElement;
                if (active && active.classList.contains('personnel-search__item')) {
                    choose(results[Array.prototype.indexOf.call(items, active)]);
                }
            }
        });
        list.addEventListener('click', function (event) {
            var item = event.target.closest('.personnel-search__item');
            if (!item) return;
            choose(results[Array.prototype.indexOf.call(list.querySelectorAll('.personnel-search__item'), item)]);
        });
        document.addEventListener('click', function (event) {
            if (list.hidden) return;
            if (!event.target.closest('[data-scan-personnel]')) list.hidden = true;
        });

        return input;
    }

    function initScan() {
        var form = document.querySelector('[data-scan-form]');
        var panel = document.querySelector('[data-scan-panel]');
        if (!form || !panel) return;

        var bsInput = form.querySelector('[data-scan-bs]');
        var magSel = form.querySelector('[data-scan-magasin]');
        var personRoot = form.querySelector('[data-scan-personnel]');

        fillSelect(magSel, MAGASINS, magSel.getAttribute('data-default') || 'Plateforme logistique');
        var agentInput = initPersonnelSearch(personRoot, magSel, 'Rabemananjara Solo');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var bs = (bsInput.value || '').trim().toUpperCase();
            if (!bs) {
                showAlert(panel, 'Saisissez la référence du BS à scanner (ex. BS-2026-0142).', 'danger');
                return;
            }
            var agent = agentInput ? agentInput.value.trim() : '';
            if (!agent) agent = 'Rabemananjara Solo';
            var r = create(bs, magSel.value, agent);
            renderScanPanel(panel, r);
            refreshKpi();
            document.querySelectorAll('[data-controle-card]').forEach(renderControle);
            // le parcours affiché suit le dernier BS scanné (au lieu de rester sur BS-2026-0142)
            document.querySelectorAll('[data-transits-bs]').forEach(function (el) {
                el.setAttribute('data-bs', bs);
                renderBsTable(el);
            });
            var parcoursTitle = document.querySelector('[data-parcours-title]');
            if (parcoursTitle) parcoursTitle.textContent = bs;
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
            '<p class="cell-muted mb-0" style="font-size:0.82rem;">' +
                '<i class="fa-solid fa-circle-info text-teal"></i> ' +
                'Ce passage est en attente de contrôle : effectuez la validation ou signalez une anomalie dans la carte ' +
                '<strong>« Contrôle en cours »</strong> ci-dessous (premier passage en attente).' +
            '</p>';
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

        /* Filtre du dropdown Transits par numéro de BS */
        var search = document.querySelector('[data-transits-search]');
        if (search) {
            search.addEventListener('input', function () {
                allFilter = search.value.trim();
                document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
            });
            var clear = document.querySelector('[data-transits-search-clear]');
            if (clear) {
                clear.addEventListener('click', function () {
                    search.value = '';
                    allFilter = '';
                    document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
                });
            }
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
