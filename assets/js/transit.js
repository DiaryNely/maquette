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

    /* Données de démo — détails des bons de sortie scannés (initiateur,
       bénéficiaire, parcours et articles attendus). La quantité reçue est
       saisie par l'agent pendant le contrôle. */
    var DEFAULT_DETAIL = {
        initiateur: 'Rakotobe Hery',
        beneficiaire: 'Rasoanirina Miora',
        parcours: 'Magasin central → Siège - Administration S2M',
        retour: '2 articles (retour avant le 12/09/2026)',
        articles: [
            { code: 'ART-102', designation: 'Rame papier A4 80 g (paquet de 500)', qte: 10, etat: 'Neuf', rendre: false },
            { code: 'MAT-011', designation: 'Écran 24\" Dell P2422H', qte: 2, etat: 'Bon état', rendre: true },
            { code: 'MAT-008', designation: 'Ordinateur portable Dell Latitude 5440', qte: 1, etat: 'Neuf', rendre: true },
            { code: 'FOU-031', designation: 'Boîte de stylos à bille bleu (12)', qte: 5, etat: 'Neuf', rendre: false }
        ]
    };

    var BS_DETAILS = {
        'BS-2026-0142': DEFAULT_DETAIL,
        'BS-2026-0141': {
            initiateur: 'Razafindratsima Vola',
            beneficiaire: 'Rabeharisoa Andry',
            parcours: 'Entrepôt S2M → Magasin central',
            retour: 'Aucun article à rendre',
            articles: [
                { code: 'ART-110', designation: 'Carton de fournitures de bureau (lot)', qte: 8, etat: 'Neuf', rendre: false },
                { code: 'FOU-040', designation: 'Boîte de classeurs A4 (24)', qte: 3, etat: 'Neuf', rendre: false }
            ]
        },
        'BS-2026-0140': {
            initiateur: 'Rakotobe Hery',
            beneficiaire: 'Ranarivelo Tsiky',
            parcours: 'Magasin central → Entrepôt S2M',
            retour: '1 article (retour avant le 20/09/2026)',
            articles: [
                { code: 'MAT-020', designation: 'Écran 27\" Dell U2723QE', qte: 4, etat: 'Neuf', rendre: false },
                { code: 'MAT-015', designation: 'Station d\'accueil USB-C Dell', qte: 3, etat: 'Neuf', rendre: true },
                { code: 'ART-105', designation: 'Rame papier A3 80 g (paquet de 250)', qte: 6, etat: 'Neuf', rendre: false }
            ]
        }
    };

    function detailsOf(bs) {
        return BS_DETAILS[bs] || DEFAULT_DETAIL;
    }

    /* Trajet connu de chaque bon suivi : magasin initiateur → magasin
       destinataire. Sert à la colonne « Trajet » de la vue admin. */
    var BS_PARCOURS = {
        'BS-2026-0142': 'Magasin central → Siège - Administration S2M',
        'BS-2026-0141': 'Entrepôt S2M → Magasin central',
        'BS-2026-0140': 'Magasin central → Entrepôt S2M',
        'BS-2026-0139': 'Magasin central → Siège - Administration S2M',
        'BS-2026-0135': 'Magasin central → Entrepôt S2M'
    };

    /* « Magasin central → Entrepôt S2M » à partir du parcours ; accepte
       les flèches « → » et « -> » pour être tolérant sur les données. */
    function trajetOf(bs) {
        var s = BS_PARCOURS[bs] || detailsOf(bs).parcours || '';
        var parts = String(s).split(/\s*(?:→|->|>)\s*/);
        if (parts.length >= 2 && parts[0] && parts[1]) {
            return parts[0] + ' → ' + parts[1];
        }
        return s || '—';
    }

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

    /* Table récapitulative des transits groupés par BS (vue admin) :
       une ligne par bon de sortie, avec son dernier passage, son trajet
       (magasin initiateur → magasin destinataire), la conformité et
       l'anomalie éventuelle. Un clic sur un BS affiche le détail de son
       parcours dans la table data-transits-bs. */
    function renderBsSummary(container) {
        if (!container) return;
        var tbody = container.querySelector('tbody') || container;
        var list = load().slice();

        // groupement par BS, en gardant le dernier passage (le plus récent)
        var groups = {};
        list.forEach(function (t) {
            (groups[t.bs] = groups[t.bs] || []).push(t);
        });
        var bsList = Object.keys(groups).map(function (bs) {
            var passages = groups[bs].slice().sort(function (a, b) {
                return (b.arrivee || '').localeCompare(a.arrivee || '');
            });
            return {
                bs: bs,
                passages: passages.length,
                dernier: passages[0],
                anomalie: passages.some(function (p) { return p.anomalie; })
                    ? passages.map(function (p) { return p.anomalie; }).filter(Boolean)[0]
                    : null
            };
        });

        if (allFilter) {
            var q = normalize(allFilter);
            bsList = bsList.filter(function (r) {
                return normalize(r.bs).indexOf(q) !== -1 ||
                    normalize(r.dernier.magasin).indexOf(q) !== -1;
            });
        }

        bsList.sort(function (a, b) {
            return (b.dernier.arrivee || '').localeCompare(a.dernier.arrivee || '');
        });

        var count = document.querySelector('[data-bs-count]');
        if (!count) count = document.querySelector('#transit-bs-count');
        if (count) {
            count.textContent = bsList.length + (bsList.length > 1 ? ' bons suivis' : ' bon suivi');
        }

        if (!bsList.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="cell-muted text-center">' +
                (allFilter ? 'Aucun bon de sortie ne correspond à la recherche <strong>' + escapeHtml(allFilter) + '</strong>.'
                    : 'Aucun transit enregistré pour le moment.') +
                '</td></tr>';
            return;
        }
        tbody.innerHTML = bsList.map(function (r) {
            return '<tr>' +
                '<td class="mono cell-strong">' + escapeHtml(r.bs) + '</td>' +
                '<td>' + escapeHtml(r.dernier.magasin) + '</td>' +
                '<td>' + escapeHtml(trajetOf(r.bs)) + '</td>' +
                '<td>' + badge(r.dernier.resultat) + '</td>' +
                '<td>' + (r.anomalie
                    ? '<a class="cell-link" href="index.html?page=anomalie-detail">' + escapeHtml(r.anomalie) + '</a>'
                    : '<span class="cell-muted">—</span>') + '</td>' +
                '<td class="cell-actions"><button class="btn-mock btn-mock--outline btn-mock--sm" type="button" data-bs-select="' + escapeHtml(r.bs) + '" data-modal-open="parcours"><i class="fa-solid fa-route"></i> Voir le parcours</button></td>' +
                '</tr>';
        }).join('');
    }

    /* Remplit le détail du parcours d'un BS dans la table de la modale
       data-transits-bs. La modale est ouverte par le bouton « Voir le
       parcours » (data-modal-open="parcours", géré par mockup.js). */
    function selectBsDetail(bs) {
        var title = document.querySelector('[data-parcours-title]');
        if (title) title.textContent = bs;
        document.querySelectorAll('[data-transits-bs]').forEach(function (el) {
            el.setAttribute('data-bs', bs);
            renderBsTable(el);
        });
    }

    /* Table des passages d'un BS (ordre chronologique), numérotés.
       Sans data-bs (aucun bon sélectionné), la table reste vide. */
    function renderBsTable(container) {
        if (!container) return;
        var bs = container.getAttribute('data-bs') || '';
        var tbody = container.querySelector('tbody') || container;

        var count = container.getAttribute('data-count-el') ?
            document.querySelector(container.getAttribute('data-count-el')) : null;

        if (!bs) {
            if (count) count.textContent = '—';
            tbody.innerHTML = '<tr><td colspan="5" class="cell-muted text-center">' +
                'Sélectionnez un bon de sortie dans la liste ci-dessus pour afficher son parcours.</td></tr>';
            return;
        }

        var list = forBs(bs);
        list.sort(function (a, b) { return (a.arrivee || '').localeCompare(b.arrivee || ''); });

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

    /* Carte « 2. Détails du bon » : remplit le titre, le badge, la grille
       d'informations et la table des articles. Chaque ligne indique si
       l'article doit être réceptionné (« À recevoir »), porte la saisie de la
       quantité réellement reçue et une case « Reçu » pour confirmer sa
       réception — deux validations distinctes (passage / réception). */
    function renderDetails(bs) {
        var card = document.querySelector('[data-detail-bs]');
        if (!card) return;

        // le détail n'apparaît qu'après un scan (état initial : placeholder)
        var empty = document.querySelector('[data-detail-empty]');
        if (empty) empty.classList.add('is-hidden');
        var body = document.querySelector('[data-detail-body]');
        if (body) body.classList.remove('is-hidden');

        var d = detailsOf(bs);

        var bsEl = card;
        bsEl.textContent = bs;

        var badgeEl = document.querySelector('[data-detail-badge]');
        if (badgeEl) {
            var t = find(bs, 'Plateforme logistique');
            badgeEl.innerHTML = t ? badge(t.resultat) : '<span class="badge-status badge--encours">En cours</span>';
        }

        var map = {
            '[data-d-initiateur]': d.initiateur,
            '[data-d-beneficiaire]': d.beneficiaire,
            '[data-d-parcours]': d.parcours,
            '[data-d-workflow]': 'Étape courante : Transit',
            '[data-d-rendre]': d.retour
        };
        for (var sel in map) {
            if (!Object.prototype.hasOwnProperty.call(map, sel)) continue;
            var el = document.querySelector(sel);
            if (el) el.textContent = map[sel];
        }

        var total = 0;
        d.articles.forEach(function (a) { total += a.qte; });
        var artEl = document.querySelector('[data-d-articles]');
        if (artEl) {
            artEl.textContent = total + ' pièces / ' + d.articles.length + ' lignes';
        }

        var tbody = document.querySelector('[data-articles-body]');
        if (tbody) {
            tbody.innerHTML = d.articles.map(function (a) {
                var aRecevoir = a.aRecevoir !== false;
                return '<tr>' +
                    '<td class="mono">' + escapeHtml(a.code) + '</td>' +
                    '<td>' + escapeHtml(a.designation) + '</td>' +
                    '<td>' + a.qte + '</td>' +
                    '<td>' + escapeHtml(a.etat) + '</td>' +
                    '<td>' + (a.rendre
                        ? '<i class="fa-solid fa-check text-teal"></i>'
                        : '<i class="fa-solid fa-xmark text-red"></i>') + '</td>' +
                    '<td>' + (aRecevoir
                        ? '<i class="fa-solid fa-check text-teal"></i>'
                        : '<i class="fa-solid fa-xmark text-red"></i>') + '</td>' +
                    '<td><input type="number" class="form-control form-control-sm" style="width:84px;" min="0" data-qty data-expected="' + a.qte + '" data-code="' + escapeHtml(a.code) + '"></td>' +
                    '<td>' + (aRecevoir
                        ? '<div class="custom-control custom-checkbox mb-0" style="white-space:nowrap;">' +
                            '<input type="checkbox" class="custom-control-input" id="receive-ok-' + escapeHtml(a.code) + '" data-receive-ok data-code="' + escapeHtml(a.code) + '">' +
                            '<label class="custom-control-label" for="receive-ok-' + escapeHtml(a.code) + '">Reçu</label>' +
                          '</div>'
                        : '<span class="cell-muted">—</span>') + '</td>' +
                    '</tr>';
            }).join('');

            /* Cocher « Reçu » exige une quantité reçue valide sur la ligne :
               sinon on décoche et on demande la saisie. */
            tbody.querySelectorAll('[data-receive-ok]').forEach(function (cb) {
                cb.addEventListener('change', function () {
                    if (!cb.checked) return;
                    var qty = cb.closest('tr').querySelector('[data-qty]');
                    if (qty && (qty.value.trim() === '' || isNaN(parseInt(qty.value, 10)))) {
                        cb.checked = false;
                        qty.focus();
                    }
                });
            });
        }
    }

    /* Vérifie les quantités saisies : si toutes correspondent aux quantités
       attendues, le passage est conforme ; sinon il est non conforme et le
       BS reste bloqué (invitation à déclarer une anomalie). */
    function confirmPassage(t, panel) {
        var mismatches = [];
        document.querySelectorAll('[data-qty]').forEach(function (input) {
            var expected = parseInt(input.getAttribute('data-expected'), 10);
            var received = parseInt(input.value, 10);
            if (isNaN(received) || received !== expected) {
                mismatches.push({
                    code: input.getAttribute('data-code'),
                    expected: expected,
                    received: isNaN(received) ? 0 : received
                });
            }
        });

        var conforme = mismatches.length === 0;
        var updated = validate(t.id, conforme ? 'conforme' : 'non-conforme', '');
        if (!updated) return;

        var res = panel.querySelector('[data-confirm-result]');
        if (res) {
            if (conforme) {
                res.className = 'alert-mock alert-mock--success';
                res.innerHTML = '<i class="fa-solid fa-circle-check"></i>' +
                    '<span>Passage <strong>conforme</strong> — toutes les quantités reçues correspondent au bon de sortie.</span>';
            } else {
                res.className = 'alert-mock alert-mock--danger';
                res.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>' +
                    '<span>Contrôle <strong>non conforme</strong> — écart de quantité sur : ' +
                    mismatches.map(function (m) {
                        return '<strong>' + escapeHtml(m.code) + '</strong> (attendu ' + m.expected + ', reçu ' + m.received + ')';
                    }).join(', ') +
                    '. Déclarez une anomalie pour poursuivre.</span>';
            }
        }

        // le bouton de confirmation est désactivé après validation
        var btn = panel.querySelector('[data-confirm-passage]');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-mock--outline');
            btn.innerHTML = '<i class="fa-solid ' + (conforme ? 'fa-circle-check' : 'fa-circle-xmark') + '"></i> ' +
                (conforme ? 'Passage confirmé' : 'Passage bloqué');
        }

        // rafraîchit le badge (sans réinitialiser la table : les quantités
        // saisies et les confirmations de réception par ligne sont conservées)
        var badgeEl = document.querySelector('[data-detail-badge]');
        if (badgeEl) badgeEl.innerHTML = badge(updated.resultat);
        refreshKpi();
        document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
    }

    /* « Confirmer la réception » : validation distincte du passage. Pour
       chaque article confirmé (case « Reçu »), la quantité réellement reçue
       est enregistrée ; la réception n'est terminée que lorsque chaque ligne
       à recevoir est confirmée avec sa quantité. */
    function confirmReception(t, panel) {
        var receptions = window.S2M && window.S2M.receptions;
        if (!receptions || receptions.isReceptionne(t.bs)) return;

        var notConfirmed = [];
        var badQty = [];
        var lignes = [];

        document.querySelectorAll('[data-articles-body] [data-receive-ok]').forEach(function (cb) {
            var tr = cb.closest('tr');
            var input = tr.querySelector('[data-qty]');
            var code = cb.getAttribute('data-code');
            var attendu = parseInt(input.getAttribute('data-expected'), 10);
            if (!cb.checked) {
                notConfirmed.push(code);
                lignes.push({ code: code, attendu: attendu, recu: 0 });
                return;
            }
            var recu = parseInt(input.value, 10);
            if (isNaN(recu) || recu < 0) {
                badQty.push(code);
                lignes.push({ code: code, attendu: attendu, recu: isNaN(recu) ? 0 : recu });
                return;
            }
            lignes.push({ code: code, attendu: attendu, recu: recu });
        });

        if (notConfirmed.length || badQty.length) {
            var parts = [];
            if (notConfirmed.length) parts.push('confirmez la réception de chaque article (case « Reçu »)');
            if (badQty.length) parts.push('renseignez la quantité reçue pour ' + badQty.map(escapeHtml).join(', '));
            var res = panel.querySelector('[data-confirm-result]');
            if (res) {
                res.className = 'alert-mock alert-mock--danger';
                res.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>' +
                    '<span>' + escapeHtml(parts.join(' et ')) + ' avant de valider.</span>';
            }
            return;
        }

        var r = receptions.record(t.bs, lignes);
        showReceptionSuccess(panel, r);
    }

    function receptionTotal(lignes) {
        return (lignes || []).reduce(function (sum, l) { return sum + (l.recu || 0); }, 0);
    }

    /* Bandeau après l'enregistrement du constat de réception (transit) :
       le bon passe « en attente de confirmation du destinataire ». */
    function showReceptionSuccess(panel, r) {
        var prev = panel.querySelector('[data-reception-done]');
        if (prev) prev.parentNode.removeChild(prev);
        var div = document.createElement('div');
        div.setAttribute('data-reception-done', '1');
        div.className = 'alert-mock alert-mock--success mb-3';
        div.innerHTML = '<i class="fa-solid fa-box-open"></i>' +
            '<span>Constat de réception <strong>enregistré</strong> pour ' + escapeHtml(r.bs) + ' le ' + escapeHtml(r.date) +
            ' par ' + escapeHtml(r.par) + ' — ' + receptionTotal(r.lignes) + ' pièce(s) reçue(s). ' +
            'Le bon est <strong>en attente de confirmation du destinataire</strong> ; le suivi des retours démarre à partir de cette date.</span>';
        panel.insertBefore(div, panel.firstChild);
        var btn = panel.querySelector('[data-confirm-reception]');
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-mock--outline');
            btn.innerHTML = '<i class="fa-solid fa-box-open"></i> Constat enregistré';
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

        /* Magasin et agent ne sont plus choisis dans la page : on utilise
           ceux de l'utilisateur connecté (rôle Scan & Transit). Les champs
           restent optionnels pour d'éventuelles variantes de la page. */
        var magasin = 'Plateforme logistique';
        var agent = 'Rabemananjara Solo';
        if (magSel) {
            fillSelect(magSel, MAGASINS, magSel.getAttribute('data-default') || 'Plateforme logistique');
            var agentInput = initPersonnelSearch(personRoot, magSel, agent);
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var bs = (bsInput.value || '').trim().toUpperCase();
            if (!bs) {
                showAlert(panel, 'Saisissez la référence du BS à scanner (ex. BS-2026-0142).', 'danger');
                return;
            }
            if (magSel) magasin = magSel.value;
            if (agentInput && agentInput.value.trim()) agent = agentInput.value.trim();
            var r = create(bs, magasin, agent);
            renderScanPanel(panel, r);
            refreshKpi();
            document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
        });
    }

    function renderScanPanel(panel, r) {
        var t = r.transit;
        // la carte détail affiche les informations et les articles du BS scanné
        renderDetails(t.bs);
        panel.innerHTML =
            '<div class="alert-mock ' + (r.created ? 'alert-mock--success' : 'alert-mock--info') + ' mb-3">' +
                '<i class="fa-solid ' + (r.created ? 'fa-circle-check' : 'fa-circle-info') + '"></i>' +
                '<span>' + (r.created
                    ? 'Transit <strong>' + escapeHtml(t.id) + '</strong> créé au magasin <strong>' + escapeHtml(t.magasin) + '</strong> — vérifiez les quantités reçues, puis confirmez le passage et la réception.'
                    : 'Un transit existe déjà pour ce BS à ce magasin : <strong>' + escapeHtml(t.id) + '</strong>. Vérifiez les quantités reçues, puis confirmez le passage et la réception.') +
                '</span></div>' +
            '<div class="d-flex flex-wrap" style="gap:10px;">' +
                '<button class="btn-mock" type="button" data-confirm-passage><i class="fa-solid fa-circle-check"></i> Confirmer le passage</button>' +
                receptionButtonHtml(t.bs) +
                '<button class="btn-mock btn-mock--danger" type="button" data-modal-open="anomalie" data-bs="' + escapeHtml(t.bs) + '" data-magasin="' + escapeHtml(t.magasin) + '"><i class="fa-solid fa-triangle-exclamation"></i> Déclarer une anomalie</button>' +
            '</div>' +
            '<div data-confirm-result class="mt-3"></div>' +
            '<p class="cell-muted mt-3 mb-0" style="font-size:0.82rem;">' +
                '<i class="fa-solid fa-circle-info text-teal"></i> ' +
                'Deux validations distinctes : « Confirmer le passage » contrôle les quantités par rapport au bon ; ' +
                '« Confirmer la réception » enregistre, article par article, la quantité réellement reçue. ' +
                'Chaque passage est horodaté et rattaché à l\'agent. Un écart de quantité rend le passage non conforme et bloque le BS jusqu\'à résolution de l\'anomalie.' +
            '</p>';

        var btn = panel.querySelector('[data-confirm-passage]');
        if (btn) {
            btn.addEventListener('click', function () {
                confirmPassage(t, panel);
            });
        }
        var recvBtn = panel.querySelector('[data-confirm-reception]');
        if (recvBtn) {
            recvBtn.addEventListener('click', function () {
                confirmReception(t, panel);
            });
        }
    }

    /* Bouton « Confirmer la réception » après le scan : enregistre le constat
       physique (quantité réellement reçue pour chaque article confirmé, case
       « Reçu » de la table du détail, persistance gérée par reception.js).
       Désactivé si le constat est déjà enregistré. */
    function receptionButtonHtml(bs) {
        if (!window.S2M || !window.S2M.receptions) return '';
        var done = S2M.receptions.isReceptionne(bs);
        return done
            ? '<button class="btn-mock btn-mock--outline" type="button" disabled><i class="fa-solid fa-box-open"></i> Constat déjà enregistré</button>'
            : '<button class="btn-mock btn-mock--outline" type="button" data-confirm-reception><i class="fa-solid fa-box-open"></i> Confirmer la réception</button>';
    }

    /* --- Boot --- */

    function boot() {
        var found = false;
        document.querySelectorAll('[data-transits-table]').forEach(function (el) {
            renderAllTable(el);
            found = true;
        });
        document.querySelectorAll('[data-bs-summary]').forEach(function (el) {
            renderBsSummary(el);
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
        var kpiPending = document.querySelector('[data-kpi-pending]');
        if (kpiPending) {
            kpiPending.textContent = load().filter(function (t) { return t.resultat === 'a-controle'; }).length;
        }

        /* Filtre de recherche par numéro de BS (liste par BS + dropdown Transits) */
        var search = document.querySelector('[data-transits-search]');
        if (search) {
            search.addEventListener('input', function () {
                allFilter = search.value.trim();
                document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
                document.querySelectorAll('[data-bs-summary]').forEach(renderBsSummary);
            });
            var clear = document.querySelector('[data-transits-search-clear]');
            if (clear) {
                clear.addEventListener('click', function () {
                    search.value = '';
                    allFilter = '';
                    document.querySelectorAll('[data-transits-table]').forEach(renderAllTable);
                    document.querySelectorAll('[data-bs-summary]').forEach(renderBsSummary);
                });
            }
        }

        /* Clic sur « Voir le parcours » (liste admin) → détail du BS */
        document.querySelectorAll('[data-bs-summary]').forEach(function (el) {
            el.addEventListener('click', function (event) {
                var btn = event.target.closest('[data-bs-select]');
                if (!btn) return;
                selectBsDetail(btn.getAttribute('data-bs-select'));
            });
        });

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
