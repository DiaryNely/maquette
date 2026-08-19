/* ============================================================
   VALIDATION — décisions de la Direction sur les BS (mockup S2M-WEB)

   La Direction est l'étape de validation des demandes de bon de
   sortie (workflow « Demandeur → Direction → suite ») :
     - liste des BS « en attente de validation » (statut Soumis) ;
     - consultation du détail du BS (fiche partagée, rendue
       cohérente avec le bon consulté via ?bs=…) ;
     - validation : le BS passe automatiquement à « Validé » et
       poursuit le workflow ;
     - refus : motif obligatoire, le BS passe à « Refusé » et ne
       poursuit pas le workflow.
   Chaque décision enregistre l'utilisateur (Direction), la date,
   la décision et le motif de refus. Les statuts « Validé » /
   « Refusé » sont reflétés dans la liste des BS (bs-list.js).
   Persistance : localStorage (clé s2m.validations.v1).
   ============================================================ */
(function () {
    'use strict';

    var STORAGE_KEY = 's2m.validations.v1';

    var DIRECTEUR = 'Randriamahefa Vero (Direction)';

    /* Décisions initiales de la maquette : historique des BS déjà
       traités par la Direction (démo). Alimentent la liste et la
       fiche détail, sans écraser les statuts déjà avancés. */
    function seed() {
        return [
            { bs: 'BS-2026-0142', decision: 'valide', motif: '', decideur: DIRECTEUR, date: '13/08/2026 à 08:40', ts: Date.UTC(2026, 7, 13, 8, 40) },
            { bs: 'BS-2026-0140', decision: 'valide', motif: '', decideur: DIRECTEUR, date: '11/08/2026 à 10:05', ts: Date.UTC(2026, 7, 11, 10, 5) },
            { bs: 'BS-2026-0139', decision: 'refuse', motif: 'Budget non alloué pour ce matériel de sécurité — veuillez consulter la comptabilité avant de re-soumettre.', decideur: DIRECTEUR, date: '10/08/2026 à 16:30', ts: Date.UTC(2026, 7, 10, 16, 30) }
        ];
    }

    function load() {
        var raw = null;
        try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { raw = null; }
        if (raw) {
            try {
                var list = JSON.parse(raw);
                if (Array.isArray(list)) return list;
            } catch (e) { /* données corrompues : on repart de la démo */ }
        }
        var seeded = seed();
        save(seeded);
        return seeded;
    }

    function save(list) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch (e) { /* stockage indisponible */ }
    }

    var decisions = load();

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
        return currentRole() === 'direction' ? DIRECTEUR : 'Rakotobe Hery (Personnel)';
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

    function decisionOf(bs) {
        var d = null;
        for (var i = decisions.length - 1; i >= 0; i--) {
            if (decisions[i].bs === bs) { d = decisions[i]; break; }
        }
        return d;
    }

    /* Statut effectif : une décision de la Direction fait sortir le BS
       de « Soumis » (en attente) vers « Validé » / « Refusé ». Les
       statuts déjà avancés (En cours, Réceptionné…) ne sont pas écrasés. */
    function statutEffectif(b) {
        var d = decisionOf(b.bs);
        if (d && b.statut === 'Soumis') {
            return d.decision === 'valide' ? 'Validé' : 'Refusé';
        }
        return b.statut;
    }

    /* Décision de la Direction. La décision est enregistrée avec
       l'utilisateur, la date, la décision et le motif (refus). Le BS
       « Soumis » passe automatiquement au statut correspondant. */
    function decide(bs, decision, motif) {
        if (decisionOf(bs)) return null; // déjà traité : pas de sur-écriture
        var r = {
            bs: bs,
            decision: decision === 'valide' ? 'valide' : 'refuse',
            motif: decision === 'valide' ? '' : String(motif || '').trim(),
            decideur: currentUser(),
            date: now(),
            ts: Date.now()
        };
        decisions.push(r);
        save(decisions);
        var b = bsOf(bs);
        if (b && b.statut === 'Soumis') {
            b.statut = r.decision === 'valide' ? 'Validé' : 'Refusé';
        }
        return r;
    }

    function enAttente(b) {
        return b.statut === 'Soumis' && !decisionOf(b.bs);
    }

    /* File de validation : les BS en attente + ceux déjà décidés */
    function queue() {
        return bsList().filter(function (b) {
            return enAttente(b) || decisionOf(b.bs);
        });
    }

    function badgeClass(s) {
        var map = {
            'Brouillon': 'badge--brouillon',
            'Soumis':    'badge--soumis',
            'En cours':  'badge--encours',
            'Validé':    'badge--valide',
            'Refusé':    'badge--refuse',
            'Annulé':    'badge--annule',
            'Clôturé':   'badge--cloture',
            'Réceptionné': 'badge--info'
        };
        return map[s] || 'badge--info';
    }

    function badgeHtml(s) {
        return '<span class="badge-status ' + badgeClass(s) + '">' + escapeHtml(s) + '</span>';
    }

    /* ============================================================
       LISTE « VALIDATION DES BS » (portail Direction)
       ============================================================ */
    function rowHtml(b, row) {
        var decided = !!row.decision;
        var decisionCell;
        if (!decided) {
            decisionCell = '<span class="badge-status badge--soumis">En attente de validation</span>';
        } else if (row.decision.decision === 'valide') {
            decisionCell = '<span class="badge-status badge--valide">Validé</span>';
        } else {
            decisionCell = '<span class="badge-status badge--refuse">Refusé</span>' +
                '<div class="cell-muted" style="font-size:0.72rem; margin-top:2px;">' + escapeHtml(row.decision.motif) + '</div>';
        }

        var html = '<tr>' +
            '<td><a class="cell-link" href="' + detailHref(b.bs) + '">' + escapeHtml(b.bs) + '</a></td>' +
            '<td>' + escapeHtml(b.date) + '</td>' +
            '<td>' + escapeHtml(b.initiateur) + '</td>' +
            '<td class="cell-muted">' + escapeHtml(b.origine) + '</td>' +
            '<td>' + escapeHtml(b.beneficiaire) + '</td>' +
            '<td class="cell-muted">' + escapeHtml(b.destination) + '</td>' +
            '<td>' + escapeHtml(b.motif) + '</td>' +
            '<td>' + decisionCell + '</td>' +
            '<td class="cell-actions">' +
                '<a class="action-btn action-btn--view" href="' + detailHref(b.bs) + '" title="Voir le détail du BS"><i class="fa-solid fa-eye"></i></a>' +
                (decided ? '' :
                    '<button class="action-btn action-btn--success" type="button" data-val-valider="' + escapeHtml(b.bs) + '" title="Valider le BS — poursuite du workflow"><i class="fa-solid fa-check"></i></button>' +
                    '<button class="action-btn action-btn--danger" type="button" data-val-refuser="' + escapeHtml(b.bs) + '" title="Refuser le BS (motif obligatoire)"><i class="fa-solid fa-ban"></i></button>') +
            '</td>' +
        '</tr>';
        return html;
    }

    function detailHref(bs) {
        return (window.S2M && window.S2M.route)
            ? window.S2M.route('bs-detail', { bs: bs })
            : 'index.html?page=bs-detail&bs=' + encodeURIComponent(bs);
    }

    function listPanel() {
        return document.querySelector('[data-validations]');
    }

    /* Onglet actif du portail Direction : en attente / validés / refusés */
    var activeTab = 'attente';

    function filterList() {
        var panel = listPanel();
        var q = ((panel.querySelector('[data-val-search]').value || '')).trim().toLowerCase();
        return queue().map(function (b) {
            return { b: b, decision: decisionOf(b.bs), attente: enAttente(b) };
        }).filter(function (row) {
            if (q) {
                var hay = (row.b.bs + ' ' + row.b.initiateur + ' ' + row.b.beneficiaire + ' ' + row.b.motif).toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            if (activeTab === 'attente') return row.attente;
            if (activeTab === 'valides') return row.decision && row.decision.decision === 'valide';
            if (activeTab === 'refuses') return row.decision && row.decision.decision === 'refuse';
            return true;
        });
    }

    function apply() {
        var panel = listPanel();
        if (!panel) return;

        var rows = filterList();
        var tbody = panel.querySelector('[data-val-body]');
        if (tbody) {
            tbody.innerHTML = rows.length
                ? rows.map(function (r) { return rowHtml(r.b, r); }).join('')
                : '<tr><td colspan="9" class="cell-muted text-center py-3">Aucun bon de sortie dans cet onglet.</td></tr>';
        }

        var attente = queue().filter(function (b) { return enAttente(b); }).length;
        var valides = decisions.filter(function (d) { return d.decision === 'valide'; }).length;
        var refuses = decisions.filter(function (d) { return d.decision === 'refuse'; }).length;

        var kpis = [
            ['[data-kpi-attente]', attente],
            ['[data-kpi-valides]', valides],
            ['[data-kpi-refuses]', refuses],
            ['[data-kpi-total]', attente + valides + refuses]
        ];
        kpis.forEach(function (k) {
            var el = panel.querySelector(k[0]);
            if (el) el.textContent = k[1];
        });

        var counts = [
            ['[data-val-count="attente"]', attente],
            ['[data-val-count="valides"]', valides],
            ['[data-val-count="refuses"]', refuses]
        ];
        counts.forEach(function (c) {
            var el = panel.querySelector(c[0]);
            if (el) el.textContent = c[1];
        });

        var res = panel.querySelector('[data-val-results]');
        if (res) {
            var nb = rows.length;
            res.textContent = nb + (nb > 1 ? ' résultat(s)' : ' résultat');
        }
    }

    function showAlert(panel, msg, type) {
        var alert = document.createElement('div');
        alert.className = 'alert-mock ' + (type === 'danger' ? 'alert-mock--danger' : 'alert-mock--success') + ' mb-3';
        alert.innerHTML = '<i class="fa-solid ' + (type === 'danger' ? 'fa-flag' : 'fa-circle-check') + '"></i><span>' + msg + '</span>';
        panel.insertBefore(alert, panel.firstChild);
        setTimeout(function () { if (alert.parentNode) alert.parentNode.removeChild(alert); }, 4200);
    }

    /* --- Modale de décision (liste Direction) --- */
    var pending = { bs: null, decision: null };

    function openModal(bs, decision) {
        var panel = listPanel();
        if (!panel) return;
        var modal = panel.querySelector('[data-modal="validation"]');
        if (!modal) return;
        pending.bs = bs;
        pending.decision = decision;

        var titre = modal.querySelector('[data-val-modal-title]');
        var message = modal.querySelector('[data-val-modal-message]');
        var motifWrap = modal.querySelector('[data-val-motif-wrap]');
        var motif = modal.querySelector('[data-val-motif]');
        var btn = modal.querySelector('[data-val-modal-btn]');
        var error = modal.querySelector('[data-val-modal-error]');
        if (error) error.hidden = true;
        if (motif) motif.value = '';

        var b = bsOf(bs);
        var label = (b ? b.bs + ' — ' + b.motif : bs);
        if (decision === 'valide') {
            if (titre) titre.textContent = 'Valider le bon de sortie';
            if (message) message.textContent = 'Valider « ' + label + ' » ? Le BS passera automatiquement à l\'étape suivante du workflow.';
            if (motifWrap) motifWrap.hidden = true;
            if (btn) { btn.textContent = 'Valider le BS'; btn.classList.remove('btn-mock--danger'); }
        } else {
            if (titre) titre.textContent = 'Refuser le bon de sortie';
            if (message) message.textContent = 'Refuser « ' + label + ' » ? Le BS sera bloqué et ne poursuivra pas le workflow.';
            if (motifWrap) motifWrap.hidden = false;
            if (btn) { btn.textContent = 'Refuser le BS'; btn.classList.add('btn-mock--danger'); }
        }
        modal.hidden = false;
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        var modal = listPanel() ? listPanel().querySelector('[data-modal="validation"]') : null;
        if (!modal) {
            modal = document.querySelector('[data-modal="validation"]');
        }
        if (modal) {
            modal.hidden = true;
            document.body.classList.remove('modal-open');
        }
        pending.bs = null;
        pending.decision = null;
    }

    function confirmDecision() {
        var panel = listPanel();
        if (!panel) return;
        var modal = panel.querySelector('[data-modal="validation"]');
        var motif = modal ? modal.querySelector('[data-val-motif]') : null;
        var error = modal ? modal.querySelector('[data-val-modal-error]') : null;

        if (pending.decision === 'refuse') {
            var value = (motif ? motif.value : '').trim();
            if (!value) {
                if (error) {
                    error.textContent = 'Le motif du refus est obligatoire.';
                    error.hidden = false;
                }
                return;
            }
        }

        var r = decide(pending.bs, pending.decision, motif ? motif.value : '');
        if (!r) return;
        if (error) error.hidden = true;

        closeModal();
        var label = r.decision === 'valide' ? 'validé' : 'refusé';
        var extra = r.decision === 'valide'
            ? ' le BS poursuit le workflow (étape suivante : Responsable).'
            : ' le BS ne poursuit pas le workflow.';
        showAlert(panel, '<strong>' + escapeHtml(r.bs) + '</strong> ' + label + ' par ' +
            escapeHtml(r.decideur) + ' le ' + escapeHtml(r.date) + ' — ' + extra);
        if (window.S2M && window.S2M.bsListRefresh) S2M.bsListRefresh();
        apply();
    }

    function bootList() {
        var panel = listPanel();
        if (!panel) return false;
        if (panel.getAttribute('data-bound')) return true;
        panel.setAttribute('data-bound', '1');

        panel.addEventListener('input', apply);
        panel.addEventListener('change', apply);
        panel.querySelectorAll('[data-val-tab]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                activeTab = btn.getAttribute('data-val-tab');
                panel.querySelectorAll('[data-val-tab]').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                apply();
            });
        });
        var reset = panel.querySelector('[data-val-reset]');
        if (reset) {
            reset.addEventListener('click', function () {
                var search = panel.querySelector('[data-val-search]');
                if (search) search.value = '';
                apply();
            });
        }
        panel.addEventListener('click', function (event) {
            var valider = event.target.closest('[data-val-valider]');
            if (valider) { openModal(valider.getAttribute('data-val-valider'), 'valide'); return; }
            var refuser = event.target.closest('[data-val-refuser]');
            if (refuser) { openModal(refuser.getAttribute('data-val-refuser'), 'refuse'); return; }
            var confirm = event.target.closest('[data-val-modal-btn]');
            if (confirm) { confirmDecision(); return; }
            var close = event.target.closest('[data-val-modal-close]');
            if (close) { closeModal(); return; }
        });

        apply();
        return true;
    }

    /* ============================================================
       FICHE DÉTAIL D'UN BS — carte « Validation par la Direction »
       La fiche est partagée entre les rôles : le BS consulté est
       déduit du paramètre ?bs= (ou du BS de démonstration affiché).
       La Direction agit (valider / refuser) ; les autres rôles
       consultent la décision en lecture seule.
       ============================================================ */
    function queryBs() {
        return new URLSearchParams(location.search).get('bs') || null;
    }

    function bootDetail() {
        var card = document.querySelector('[data-validation-card]');
        if (!card) return false;
        if (card.getAttribute('data-bound')) return true;
        card.setAttribute('data-bound', '1');

        var bsRefEl = document.querySelector('[data-bs-ref]');
        var defaultBs = bsRefEl ? bsRefEl.textContent.trim() : 'BS-2026-0142';
        var bs = queryBs() || defaultBs;
        var b = bsOf(bs);

        /* --- Cohérence de la fiche avec le BS consulté --- */
        if (bsRefEl && bsRefEl.textContent.trim() !== bs) bsRefEl.textContent = bs;
        var qr = document.querySelector('[data-qr]');
        if (qr && qr.getAttribute('data-qr') !== bs) qr.setAttribute('data-qr', bs);

        var status = document.querySelector('[data-bs-status]');
        if (status && b) {
            status.textContent = statutEffectif(b);
            status.className = 'badge-status ' + badgeClass(statutEffectif(b));
        }

        if (b && queryBs()) {
            var map = [
                ['[data-bs-initiateur]', b.initiateur],
                ['[data-bs-beneficiaire]', b.beneficiaire],
                ['[data-bs-origine]', b.origine],
                ['[data-bs-destination]', b.destination],
                ['[data-bs-motif]', b.motif],
                ['[data-bs-date]', b.date]
            ];
            map.forEach(function (m) {
                var el = document.querySelector(m[0]);
                if (el) el.textContent = m[1];
            });
            var created = document.querySelector('[data-bs-created]');
            if (created) created.textContent = 'Créé le ' + b.date;
        }

        /* --- Articles : catalogue partagé quand le bon n'est pas le
           bon de démonstration affiché en dur --- */
        var articlesBody = document.querySelector('[data-bs-articles-body]');
        var catalogue = (window.S2M && window.S2M.receptions && window.S2M.receptions.articlesOf) || null;
        if (articlesBody && catalogue && queryBs() && bs !== defaultBs && catalogue(bs).length) {
            articlesBody.innerHTML = catalogue(bs).map(function (a) {
                var type = a.code.indexOf('ART') === 0 ? 'Article'
                    : a.code.indexOf('MAT') === 0 ? 'Info'
                    : a.code.indexOf('FOU') === 0 ? 'Fourniture'
                    : a.code.indexOf('SEC') === 0 ? 'Sécurité'
                    : a.code.indexOf('MOB') === 0 ? 'Mobilier' : 'Article';
                return '<tr>' +
                    '<td><span class="chip">' + escapeHtml(type) + '</span></td>' +
                    '<td class="mono">' + escapeHtml(a.code) + '</td>' +
                    '<td>' + escapeHtml(a.designation) + '</td>' +
                    '<td>pce</td>' +
                    '<td>' + escapeHtml(String(a.qte)) + '</td>' +
                    '<td>Neuf</td>' +
                    '<td><i class="fa-solid fa-xmark text-red"></i></td>' +
                    '<td class="cell-muted">—</td>' +
                    '<td><span class="cell-muted">Non concerné</span></td>' +
                '</tr>';
            }).join('');
        }

        /* --- Carte de validation --- */
        var statusBadge = card.querySelector('[data-validation-status]');
        var meta = card.querySelector('[data-validation-meta]');
        var motifLine = card.querySelector('[data-validation-motif]');
        var actions = card.querySelector('[data-validation-actions]');
        var role = currentRole();

        function render() {
            var d = decisionOf(bs);
            var eff = b ? statutEffectif(b) : null;

            if (actions) actions.hidden = true;
            if (motifLine) motifLine.hidden = true;

            if (!d) {
                if (statusBadge) {
                    statusBadge.textContent = 'En attente de validation';
                    statusBadge.className = 'badge-status badge--soumis';
                }
                if (meta) meta.textContent = 'Le bon attend la validation de la Direction (' + (b ? b.initiateur : 'demandeur') + ').';
                if (actions && role === 'direction') actions.hidden = false;
            } else if (d.decision === 'valide') {
                if (statusBadge) {
                    statusBadge.textContent = 'Validé';
                    statusBadge.className = 'badge-status badge--valide';
                }
                if (meta) meta.textContent = 'Validé par ' + d.decideur + ' le ' + d.date + ' — le BS poursuit le workflow.';
            } else {
                if (statusBadge) {
                    statusBadge.textContent = 'Refusé';
                    statusBadge.className = 'badge-status badge--refuse';
                }
                if (meta) meta.textContent = 'Refusé par ' + d.decideur + ' le ' + d.date + ' — le BS ne poursuit pas le workflow.';
                if (motifLine && d.motif) {
                    motifLine.textContent = 'Motif : ' + d.motif;
                    motifLine.hidden = false;
                }
            }

            /* workflow : étape Direction */
            var step = document.querySelector('[data-workflow-step="direction"]');
            if (step) {
                step.classList.remove('workflow-step--done', 'workflow-step--current', 'workflow-step--rejected');
                if (!d) step.classList.add('workflow-step--current');
                else if (d.decision === 'valide') step.classList.add('workflow-step--done');
                else step.classList.add('workflow-step--rejected');
            }
            var chip = document.querySelector('[data-workflow-current]');
            if (chip) {
                if (d && d.decision === 'refuse') {
                    chip.innerHTML = '<i class="fa-solid fa-ban"></i> Workflow bloqué — BS refusé par la Direction';
                } else if (!d && eff === 'Soumis') {
                    chip.innerHTML = '<i class="fa-solid fa-user-tie"></i> Étape courante : Validation Direction';
                } else if (queryBs() && bs !== defaultBs && d && d.decision === 'valide') {
                    chip.innerHTML = '<i class="fa-solid fa-user-check"></i> Étape courante : Responsable (suite du workflow)';
                } else if (queryBs() && bs !== defaultBs && !d) {
                    chip.innerHTML = '<i class="fa-solid fa-bolt"></i> Étape courante : Validation Direction';
                }
            }

            /* chronologie : la décision s'insère en tête */
            var timeline = document.querySelector('[data-bs-timeline]');
            if (timeline && d && !card.getAttribute('data-timeline-added')) {
                card.setAttribute('data-timeline-added', '1');
                var li = document.createElement('li');
                li.className = 'timeline-item' + (d.decision === 'refuse' ? ' timeline-item--warn' : '');
                li.innerHTML =
                    '<div class="timeline-item__title">Validation Direction <span class="badge-status ' +
                        (d.decision === 'valide' ? 'badge--valide">Validé' : 'badge--refuse">Refusé') + '</span></div>' +
                    '<div class="timeline-item__meta">' + escapeHtml(d.decideur) + ' · ' + escapeHtml(d.date) + '</div>' +
                    '<div class="timeline-item__desc">' +
                        (d.decision === 'valide'
                            ? 'Bon validé — le workflow poursuit vers l\'étape suivante.'
                            : 'Bon refusé — motif : ' + escapeHtml(d.motif)) +
                    '</div>';
                timeline.insertBefore(li, timeline.firstChild);
            }
        }

        /* Actions de la Direction (boutons de la carte) */
        card.querySelectorAll('[data-val-open]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (decisionOf(bs)) return;
                var decision = btn.getAttribute('data-val-open');
                var panel = card;
                var modal = document.querySelector('[data-modal="validation"]');
                if (!modal) return;
                pending.bs = bs;
                pending.decision = decision;

                var titre = modal.querySelector('[data-val-modal-title]');
                var message = modal.querySelector('[data-val-modal-message]');
                var motifWrap = modal.querySelector('[data-val-motif-wrap]');
                var motifInput = modal.querySelector('[data-val-motif]');
                var modalBtn = modal.querySelector('[data-val-modal-btn]');
                var error = modal.querySelector('[data-val-modal-error]');
                if (error) error.hidden = true;
                if (motifInput) motifInput.value = '';

                var label = bs + ' — ' + (b ? b.motif : '');
                if (decision === 'valide') {
                    if (titre) titre.textContent = 'Valider le bon de sortie';
                    if (message) message.textContent = 'Valider « ' + label + ' » ? Le BS passera automatiquement à l\'étape suivante du workflow.';
                    if (motifWrap) motifWrap.hidden = true;
                    if (modalBtn) { modalBtn.textContent = 'Valider le BS'; modalBtn.classList.remove('btn-mock--danger'); }
                } else {
                    if (titre) titre.textContent = 'Refuser le bon de sortie';
                    if (message) message.textContent = 'Refuser « ' + label + ' » ? Le BS sera bloqué et ne poursuivra pas le workflow.';
                    if (motifWrap) motifWrap.hidden = false;
                    if (modalBtn) { modalBtn.textContent = 'Refuser le BS'; modalBtn.classList.add('btn-mock--danger'); }
                }
                modal.hidden = false;
                document.body.classList.add('modal-open');
            });
        });

        /* Confirmation dans la modale de la fiche détail */
        var modalBtn = document.querySelector('[data-modal="validation"] [data-val-modal-btn]');
        if (modalBtn) {
            modalBtn.addEventListener('click', function () {
                if (!pending.bs || pending.bs !== bs) return;
                var modal = document.querySelector('[data-modal="validation"]');
                var motifInput = modal ? modal.querySelector('[data-val-motif]') : null;
                var error = modal ? modal.querySelector('[data-val-modal-error]') : null;
                if (pending.decision === 'refuse') {
                    var value = (motifInput ? motifInput.value : '').trim();
                    if (!value) {
                        if (error) { error.textContent = 'Le motif du refus est obligatoire.'; error.hidden = false; }
                        return;
                    }
                }
                var r = decide(bs, pending.decision, motifInput ? motifInput.value : '');
                if (!r) return;
                if (error) error.hidden = true;
                if (modal) { modal.hidden = true; document.body.classList.remove('modal-open'); }
                pending.bs = null;
                pending.decision = null;
                render();
                if (status) {
                    status.textContent = statutEffectif(b);
                    status.className = 'badge-status ' + badgeClass(statutEffectif(b));
                }
                if (window.S2M && window.S2M.bsListRefresh) S2M.bsListRefresh();
                var alert = document.createElement('div');
                alert.className = 'alert-mock ' + (r.decision === 'refuse' ? 'alert-mock--danger' : 'alert-mock--success') + ' mb-3';
                alert.innerHTML = '<i class="fa-solid fa-circle-check"></i><span><strong>' + escapeHtml(r.bs) + '</strong> ' +
                    (r.decision === 'valide' ? 'validé' : 'refusé') + ' par ' + escapeHtml(r.decideur) + ' le ' + escapeHtml(r.date) + '.</span>';
                var head = document.querySelector('.mock-page-head');
                if (head) { head.insertAdjacentElement('afterend', alert); }
                setTimeout(function () { if (alert.parentNode) alert.parentNode.removeChild(alert); }, 4200);
            });
        }

        render();
        return true;
    }

    /* ============================================================
       DÉMARRAGE selon la page affichée
       ============================================================ */
    function tryBoot() {
        if (pageName() === 'validations') return bootList();
        if (pageName() === 'bs-detail') return bootDetail();
        return false;
    }

    if (!tryBoot()) {
        var timer = setInterval(function () {
            if (tryBoot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }

    var bootObserver = new MutationObserver(function () {
        tryBoot();
    });
    bootObserver.observe(document.body, { childList: true, subtree: true });

    /* API partagée : la liste des BS (bs-list.js) reflète les décisions
       de la Direction sur les BS « Soumis ». decide() est utilisé par
       le portail Direction ; les autres rôles consultent en lecture. */
    window.S2M = window.S2M || {};
    window.S2M.validations = {
        decisionOf: decisionOf,
        decide: decide,
        statutEffectif: statutEffectif,
        enAttente: enAttente,
        liste: function () { return decisions.slice(); },
        currentUser: currentUser
    };
})();