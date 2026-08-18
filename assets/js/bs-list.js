/* ============================================================
   BS-LIST — liste des bons de sortie (mockup S2M-WEB)

   La page « Liste des BS » est organisée en deux sous-menus,
   comme l'espace administration :
     - « BS envoyés »   : bons partis du magasin de la personne
                          connectée ;
     - « BS à recevoir »: bons dont la destination est ce magasin,
                          avec un filtre « à rendre ou non ».
   La personne connectée est fixe en maquette (PEOPLE[0]) — elle
   viendra de la vraie session utilisateur dans la version réelle.
   ============================================================ */
(function () {
    'use strict';

    var PEOPLE = [
        { name: 'Rakotobe Hery',        store: 'Magasin central' },
        { name: 'Razafindratsima Vola', store: 'Magasin central' },
        { name: 'Rabemananjara Solo',   store: 'Plateforme logistique' },
        { name: 'Andrianarivo Tovo',    store: 'Poste de contrôle' },
        { name: 'Randria Jean',         store: 'Siège - Administration S2M' },
        { name: 'Rasoanirina Miora',    store: 'Siège - Administration S2M' }
    ];

    /* Données de démo — retour = true si des articles du bon doivent
       revenir au magasin d'origine (matériel à rendre). */
    var BS = [
        { bs: 'BS-2026-0142', date: '12/08/2026', initiateur: 'Rakotobe Hery',        beneficiaire: 'Rasoanirina Miora',  origine: 'Magasin central', destination: 'Siège - Administration S2M', motif: 'Équipement informatique', statut: 'En cours', retour: true },
        { bs: 'BS-2026-0141', date: '11/08/2026', initiateur: 'Razafindratsima Vola', beneficiaire: 'Rabeharisoa Andry',  origine: 'Entrepôt S2M',     destination: 'Magasin central',           motif: 'Réapprovisionnement',   statut: 'Clôturé',  retour: false },
        { bs: 'BS-2026-0140', date: '10/08/2026', initiateur: 'Rakotobe Hery',        beneficiaire: 'Ranarivelo Tsiky',   origine: 'Magasin central', destination: 'Entrepôt S2M',               motif: 'Fournitures de bureau', statut: 'Validé',   retour: false },
        { bs: 'BS-2026-0139', date: '09/08/2026', initiateur: 'Andrianarivo Tovo',    beneficiaire: 'Rasoanirina Miora',  origine: 'Magasin central', destination: 'Siège - Administration S2M', motif: 'Matériel de sécurité',  statut: 'Refusé',   retour: false },
        { bs: 'BS-2026-0138', date: '08/08/2026', initiateur: 'Rabenjanahary Mamy',   beneficiaire: 'Razafindrakoto Lova', origine: 'Siège - Administration S2M', destination: 'Magasin central', motif: 'Retour de matériel',   statut: 'Soumis',   retour: true },
        { bs: 'BS-2026-0137', date: '07/08/2026', initiateur: 'Rakotobe Hery',        beneficiaire: 'Rasoanirina Miora',  origine: 'Magasin central', destination: 'Siège - Administration S2M', motif: 'Équipement informatique', statut: 'Brouillon', retour: true },
        { bs: 'BS-2026-0136', date: '06/08/2026', initiateur: 'Razafindratsima Vola', beneficiaire: 'Rabeharisoa Andry',  origine: 'Entrepôt S2M',     destination: 'Magasin central',           motif: 'Équipement mobilier',   statut: 'Annulé',   retour: false },
        { bs: 'BS-2026-0135', date: '05/08/2026', initiateur: 'Rakotomalala Njato',   beneficiaire: 'Rasolofoniaina Fanja', origine: 'Magasin central', destination: 'Entrepôt S2M',              motif: 'Consommables atelier',  statut: 'Clôturé',  retour: false }
    ];

    var STATUTS = ['Brouillon', 'Soumis', 'En cours', 'Validé', 'Refusé', 'Annulé', 'Clôturé'];

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    var STATUT_CLASS = {
        'Brouillon': 'badge--brouillon',
        'Soumis':    'badge--soumis',
        'En cours':  'badge--encours',
        'Validé':      'badge--valide',
        'Refusé':      'badge--refuse',
        'Annulé':      'badge--annule',
        'Clôturé':     'badge--cloture',
        'Réceptionné': 'badge--info'
    };

    function badgeStatut(s) {
        return '<span class="badge-status ' + (STATUT_CLASS[s] || 'badge--info') + '">' + escapeHtml(s) + '</span>';
    }

    /* Retour attendu : amber = à rendre, teal = sans retour */
    function badgeRetour(retour) {
        return retour
            ? '<span class="badge-status badge--encours"><i class="fa-solid fa-rotate-left"></i> À rendre</span>'
            : '<span class="badge-status badge--valide">Sans retour</span>';
    }

    function actions(b, tab) {
        var html = '<a class="action-btn action-btn--view" href="index.html?page=bs-detail" title="Voir le détail"><i class="fa-solid fa-eye"></i></a>';
        if (b.statut === 'Brouillon') {
            html += '<a class="action-btn action-btn--edit" href="index.html?page=bs-create" title="Modifier"><i class="fa-solid fa-pen"></i></a>' +
                    '<button class="action-btn action-btn--danger" type="button" title="Annuler ce brouillon"><i class="fa-solid fa-xmark"></i></button>';
        }
        if (tab === 'recevoir' && currentRole() !== 'admin') {
            var receptions = window.S2M && window.S2M.receptions;
            if (receptions && receptions.isConfirme(b.bs)) {
                html = '<button class="action-btn action-btn--success" type="button" disabled title="Réception confirmée par le destinataire"><i class="fa-solid fa-box-open"></i></button>' + html;
            } else if (receptions && receptions.isReceptionne(b.bs)) {
                html = '<button class="action-btn action-btn--success" type="button" data-reception-confirm="' + escapeHtml(b.bs) + '" title="Confirmer la réception"><i class="fa-solid fa-box-open"></i></button>' + html;
            } else {
                html = '<button class="action-btn action-btn--success" type="button" disabled title="En attente de réception par le transit"><i class="fa-solid fa-hourglass-half"></i></button>' + html;
            }
        }
        return html;
    }

    /* Chaque ligne affiche le nom de l'initiateur ainsi que les
       magasins initiateur et bénéficiaire du bon. */
    function rowHtml(b, tab) {
        return '<tr>' +
            '<td><a class="cell-link" href="index.html?page=bs-detail">' + escapeHtml(b.bs) + '</a></td>' +
            '<td>' + escapeHtml(b.date) + '</td>' +
            '<td>' + escapeHtml(b.initiateur) + '</td>' +
            '<td class="cell-muted">' + escapeHtml(b.origine) + '</td>' +
            '<td>' + escapeHtml(b.beneficiaire) + '</td>' +
            '<td class="cell-muted">' + escapeHtml(b.destination) + '</td>' +
            '<td>' + escapeHtml(b.motif) + '</td>' +
            '<td>' + badgeStatut(b.statut) + '</td>' +
            '<td class="cell-actions">' + actions(b, tab) + '</td>' +
        '</tr>';
    }

    function renderPanel(tab, rows, total) {
        var root = document.querySelector('[data-bslist]');
        if (!root) return;
        var tbody = root.querySelector('[data-bslist-body][data-tab="' + tab + '"]');
        if (!tbody) return;

        var store = currentStore();
        var admin = currentRole() === 'admin';
        if (!rows.length) {
            var msg = tab === 'envoyes'
                ? (admin ? 'Aucun BS envoyé.' : 'Aucun BS envoyé par <strong>' + escapeHtml(store) + '</strong>')
                : (admin ? 'Aucun BS à recevoir.' : 'Aucun BS à recevoir pour <strong>' + escapeHtml(store) + '</strong>');
            tbody.innerHTML = '<tr><td colspan="10" class="cell-muted text-center py-3">' + msg + '.</td></tr>';
        } else {
            tbody.innerHTML = rows.map(function (b) { return rowHtml(b, tab); }).join('');
        }

        var res = root.querySelector('[data-bslist-results][data-tab="' + tab + '"]');
        if (res) {
            var nb = rows.length;
            res.textContent = nb + (nb > 1 ? ' résultat(s)' : ' résultat') +
                ' / ' + total + (total > 1 ? ' bons' : ' bon') + (admin ? ' au total' : ' pour ce magasin');
        }
        var count = root.querySelector('[data-bslist-count][data-tab="' + tab + '"]');
        if (count) count.textContent = total;
    }

    /* Personne connectée : fixe en maquette ; remplacée par la
       session utilisateur dans la version réelle. */
    function currentPerson() { return PEOPLE[0]; }

    function currentStore() { return currentPerson().store; }

    function currentRole() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/')[0] || null;
    }

    function filterList(list, tab) {
        var root = document.querySelector('[data-bslist]');
        var panel = root.querySelector('[data-mock-panel="' + tab + '"]');
        var q = (panel.querySelector('[data-bslist-search]').value || '').trim().toLowerCase();
        var st = panel.querySelector('[data-bslist-statut]').value;
        var rt = panel.querySelector('[data-bslist-retour]').value;
        return list.filter(function (b) {
            if (q) {
                var hay = (b.bs + ' ' + b.initiateur + ' ' + b.beneficiaire + ' ' + b.motif).toLowerCase();
                if (hay.indexOf(q) === -1) return false;
            }
            if (st && b.statut !== st) return false;
            if (rt === 'a-rendre' && !b.retour) return false;
            if (rt === 'sans-retour' && b.retour) return false;
            return true;
        });
    }

    /* Un BS dont la réception a été signalée (localStorage, module
       reception.js) passe au statut « Réceptionné » dans la liste. */
    function apply() {
        var root = document.querySelector('[data-bslist]');
        if (!root) return;
        var store = currentStore();

        if (window.S2M && window.S2M.receptions) {
            BS.forEach(function (b) {
                /* le statut « Réceptionné » n'est posé qu'à la confirmation
                   du destinataire (le constat du transit ne suffit pas) */
                if (S2M.receptions.isConfirme(b.bs)) b.statut = 'Réceptionné';
            });
        }

        var admin = currentRole() === 'admin';

        /* L'administrateur consulte une liste unique de tous les BS (tous
           magasins) : les onglets « envoyés / à recevoir » sont masqués. */
        if (admin) {
            var tabs = root.querySelector('.mock-tabs');
            if (tabs) tabs.classList.add('is-hidden');
            var envPanel = root.querySelector('[data-mock-panel="envoyes"]');
            if (envPanel) envPanel.classList.add('is-active');
            var recPanel = root.querySelector('[data-mock-panel="recevoir"]');
            if (recPanel) recPanel.classList.remove('is-active');
            renderPanel('envoyes', filterList(BS, 'envoyes'), BS.length);
            
            var actions = root.querySelector('.mock-page-head__actions');
            if (actions) actions.classList.add('is-hidden');
            return;
        }

        var env = BS.filter(function (b) { return b.origine === store; });
        var rec = BS.filter(function (b) { return b.destination === store; });

        renderPanel('envoyes', filterList(env, 'envoyes'), env.length);
        renderPanel('recevoir', filterList(rec, 'recevoir'), rec.length);

        var chip = root.querySelector('[data-bslist-store]');
        if (chip) chip.textContent = 'Mon magasin : ' + store;
    }

    function boot() {
        var root = document.querySelector('[data-bslist]');
        if (!root) return false;

        root.querySelectorAll('[data-bslist-panel]').forEach(function (panel) {
            if (panel.getAttribute('data-bound')) return;
            panel.setAttribute('data-bound', '1');
            panel.addEventListener('input', apply);
            panel.addEventListener('change', apply);
            var reset = panel.querySelector('[data-bslist-reset]');
            if (reset) {
                reset.addEventListener('click', function () {
                    var search = panel.querySelector('[data-bslist-search]');
                    var statut = panel.querySelector('[data-bslist-statut]');
                    var retour = panel.querySelector('[data-bslist-retour]');
                    if (search) search.value = '';
                    if (statut) statut.value = '';
                    if (retour) retour.value = 'tous';
                    apply();
                });
            }
        });

        apply();
        return true;
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 4000);
    }

    /* Données partagées : le module réception (et la liste) consomment
       la même liste de BS et le magasin de l'utilisateur connecté. */
    window.S2M = window.S2M || {};
    window.S2M.bsList = BS;
    window.S2M.currentStore = currentStore;
    window.S2M.bsListRefresh = apply;
})();
