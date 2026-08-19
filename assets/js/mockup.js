/* ============================================================
   MOCKUP — interactions de la maquette statique
   1. Marquage du lien actif dans le menu hamburger (data-page)
   2. Onglets [data-mock-tabs] / [data-mock-tab] / [data-mock-panel]
   ============================================================ */
(function () {
    'use strict';

    /* --- 1. Lien actif dans le menu hamburger --- */
    function openGroup(group) {
        if (!group) return;
        group.classList.add('open');
        var toggle = group.querySelector('.floating-menu-group__toggle');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
    }

    function markActive() {
        var menu = document.querySelector('.floating-menu-content');
        if (!menu) return false;

        // le nom de page peut être préfixé par le rôle simulé (ex. « lambda/bs-list »)
        var raw = new URLSearchParams(location.search).get('page') || 'bs-list';
        var page = raw.split('/').pop();
        var matched = false;
        var links = menu.querySelectorAll('.floating-menu-link[data-page]');
        for (var i = 0; i < links.length; i++) {
            if (links[i].getAttribute('data-page') === page) {
                links[i].classList.add('active');
                // déplie automatiquement le groupe de la page courante
                openGroup(links[i].closest('.floating-menu-group'));
                matched = true;
            }
        }

        // Pages de détail (non listées dans le menu) : on ouvre simplement
        // le groupe correspondant, sans surligner de lien.
        if (!matched) {
            var toggles = menu.querySelectorAll('.floating-menu-group__toggle[data-section]');
            for (var j = 0; j < toggles.length; j++) {
                if (page.indexOf(toggles[j].getAttribute('data-section')) === 0) {
                    openGroup(toggles[j].closest('.floating-menu-group'));
                    break;
                }
            }
        }
        return true;
    }

    /* Pré-remplissage du formulaire d'anomalie au moment de l'ouverture de la
       modale : le bouton d'ouverture peut porter data-bs / data-magasin
       (déclenché depuis un scan de transit par exemple). Le formulaire est
       réinitialisé à chaque ouverture. */
    function prefillAnomalieForm(opener) {
        var form = document.querySelector('[data-anomalie-form]');
        if (!form) return;

        // retour à l'état initial si une anomalie a déjà été créée
        var success = document.querySelector('[data-anomalie-success]');
        if (success) success.classList.add('is-hidden');
        form.classList.remove('is-hidden');
        form.reset();

        // le BS n'est pas choisi : il est déterminé par le contexte (contrôle en cours)
        var bs = opener && opener.getAttribute('data-bs');
        var bsField = form.querySelector('#ano-bs');
        if (bs && bsField) bsField.value = bs;

        var point = opener && (opener.getAttribute('data-magasin') || opener.getAttribute('data-point'));
        if (point) setSelectValue(form.querySelector('#ano-point'), point, point);
    }

    /* Sélectionne la valeur d'un select, en ajoutant l'option si absente */
    function setSelectValue(select, value, label) {
        if (!select) return;
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value === value) {
                select.value = value;
                return;
            }
        }
        var opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        select.appendChild(opt);
        select.value = value;
    }

    function boot() {
        return markActive();
    }

    if (!boot()) {
        var timer = setInterval(function () {
            if (boot()) clearInterval(timer);
        }, 100);
        setTimeout(function () { clearInterval(timer); }, 3000);
    }

    /* --- 2. Accordéon des groupes du menu hamburger --- */
    document.addEventListener('click', function (event) {
        var toggle = event.target.closest('.floating-menu-group__toggle');
        if (!toggle) return;

        var group = toggle.closest('.floating-menu-group');
        var content = group ? group.closest('.floating-menu-content') : null;
        if (!content) return;

        var willOpen = !group.classList.contains('open');

        // accordéon : un seul groupe ouvert à la fois
        var groups = content.querySelectorAll('.floating-menu-group');
        for (var i = 0; i < groups.length; i++) {
            groups[i].classList.remove('open');
            var t = groups[i].querySelector('.floating-menu-group__toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
        }

        if (willOpen) {
            group.classList.add('open');
            toggle.setAttribute('aria-expanded', 'true');
        }
    });

    /* --- 3. Soumission du formulaire de création d'anomalie --- */
    document.addEventListener('submit', function (event) {
        var form = event.target.closest('[data-anomalie-form]');
        if (!form) return;
        event.preventDefault();

        var success = document.querySelector('[data-anomalie-success]');
        if (!success) return;

        var code = form.getAttribute('data-next-code');
        var codeEl = success.querySelector('[data-anomalie-code]');
        if (code && codeEl) codeEl.textContent = code;

        var bsSelect = form.querySelector('#ano-bs');
        var bsEl = success.querySelector('[data-anomalie-bs]');
        if (bsSelect && bsEl && bsSelect.value) bsEl.textContent = bsSelect.value;

        form.classList.add('is-hidden');
        success.classList.remove('is-hidden');
    });

    /* --- 4. Onglets --- */
    document.addEventListener('click', function (event) {
        var tab = event.target.closest('[data-mock-tab]');
        if (!tab) return;

        var group = tab.closest('[data-mock-tabs]');
        if (!group) return;

        var target = tab.getAttribute('data-mock-tab');
        var tabs = group.querySelectorAll('[data-mock-tab]');
        // Les panneaux sont des frères de la barre d'onglets, pas des descendants
        var panels = document.querySelectorAll('[data-mock-panel]');

        for (var i = 0; i < tabs.length; i++) {
            tabs[i].classList.toggle('active', tabs[i] === tab);
        }
        for (var j = 0; j < panels.length; j++) {
            panels[j].classList.toggle('is-active', panels[j].getAttribute('data-mock-panel') === target);
        }
    });

    /* --- 5. Sélecteur de période des rapports --- */
    /* Report period selector: only one option can be active. */
    document.addEventListener('click', function (event) {
        var option = event.target.closest('[data-report-period]');
        if (!option) return;

        var selector = option.closest('.reports-period-switch');
        if (!selector) return;

        var period = option.getAttribute('data-report-period');
        selector.setAttribute('data-active', period);
        selector.querySelectorAll('[data-report-period]').forEach(function (item) {
            item.setAttribute('aria-pressed', item === option ? 'true' : 'false');
        });
    });

    /* --- 6. Modale générique --- */
    document.addEventListener('click', function (event) {
        var opener = event.target.closest('[data-modal-open]');
        if (opener) {
            var target = opener.getAttribute('data-modal-open');
            var modal = document.querySelector('[data-modal="' + target + '"]');
            if (modal) {
                // le contenu de la modale peut arriver après le boot :
                // on (re)rend le QR au moment de l'ouverture
                if (window.S2M && window.S2M.qr) window.S2M.qr.renderAll();
                // la modale d'anomalie est pré-remplie (BS / magasin) et réinitialisée
                if (target === 'anomalie') prefillAnomalieForm(opener);
                modal.hidden = false;
                document.body.classList.add('modal-open');
            }
            return;
        }

        if (event.target.closest('[data-modal-close]')) {
            var closeModal = event.target.closest('[data-modal]');
            if (closeModal) {
                closeModal.hidden = true;
                document.body.classList.remove('modal-open');
            }
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') return;
        var open = document.querySelector('[data-modal]:not([hidden])');
        if (open) {
            open.hidden = true;
            document.body.classList.remove('modal-open');
        }
    });

    /* --- 6. Bouton « Retour » : retour à la page précédente --- */
    document.addEventListener('click', function (event) {
        var back = event.target.closest('[data-go-back]');
        if (!back) return;
        event.preventDefault();
        history.back();
    });

    /* --- 7. Notifications : filtres cliquables + marquer comme lu --- */
    function notifCount(section) {
        var feed = section ? section.querySelector('[data-notif]') : null;
        if (!feed) return 0;
        return feed.querySelectorAll('.notif-item.unread').length;
    }

    function notifUpdateCount(section) {
        var countEl = section ? section.querySelector('[data-notif-count]') : null;
        if (!countEl) return;
        var nb = notifCount(section);
        countEl.textContent = nb + (nb > 1 ? ' non lues' : ' non lue');
    }

    /* filtres : Toutes / Non lues / Anomalies / Retards / Résolutions */
    document.addEventListener('click', function (event) {
        var chip = event.target.closest('[data-notif-filter]');
        if (!chip) return;

        var section = chip.closest('section');
        var feed = section ? section.querySelector('[data-notif]') : null;
        if (!feed) return;

        var filter = chip.getAttribute('data-notif-filter');
        section.querySelectorAll('[data-notif-filter]').forEach(function (c) {
            c.classList.toggle('chip--active', c === chip);
        });

        feed.querySelectorAll('.notif-item').forEach(function (item) {
            var show;
            if (filter === 'toutes') show = true;
            else if (filter === 'non-lues') show = item.classList.contains('unread');
            else show = item.getAttribute('data-notif-cat') === filter;
            item.classList.toggle('is-hidden', !show);
        });
    });

    /* clic sur une notification : marquée comme lue puis ouverture */
    document.addEventListener('click', function (event) {
        var item = event.target.closest('[data-notif-href]');
        if (!item) return;

        var section = item.closest('section');
        if (item.classList.contains('unread')) {
            item.classList.remove('unread');
            notifUpdateCount(section);
            // si le filtre « Non lues » est actif, la notification disparaît
            var active = section.querySelector('[data-notif-filter].chip--active');
            if (active && active.getAttribute('data-notif-filter') === 'non-lues') {
                item.classList.add('is-hidden');
            }
        }
        // reste dans le portail du rôle simulé (préfixe lambda/transit/admin)
        var href = item.getAttribute('data-notif-href');
        var name = href ? new URLSearchParams(href.split('?')[1] || '').get('page') : null;
        location.href = (window.S2M && window.S2M.route && name) ? window.S2M.route(name) : href;
    });

    /* tout marquer comme lu */
    document.addEventListener('click', function (event) {
        var btn = event.target.closest('[data-notif-mark-read]');
        if (!btn) return;

        var section = btn.closest('section');
        var feed = section ? section.querySelector('[data-notif]') : null;
        if (!feed) return;

        feed.querySelectorAll('.notif-item.unread').forEach(function (item) {
            item.classList.remove('unread');
        });
        notifUpdateCount(section);
        btn.setAttribute('disabled', 'disabled');

        // si le filtre « Non lues » est actif, tout disparaît
        var active = section.querySelector('[data-notif-filter].chip--active');
        if (active && active.getAttribute('data-notif-filter') === 'non-lues') {
            feed.querySelectorAll('.notif-item').forEach(function (item) {
                item.classList.add('is-hidden');
            });
        }
    });

    /* --- 8. Anomalie : concertation des entités responsables ---
       Chatbox entre les entités responsables. Chaque entité déclare
       « résolu » ou « abandonner » (data-party-vote) : le bouton fait
       répondre la prochaine entité encore en attente. Le chat permet
       d'échanger (data-chat-form). Le choix final (data-concert-final)
       ne s'active que lorsque toutes les entités ont voté à l'unanimité. */
    var PARTY_LABELS = {
        transit: 'Transit',
        securite: 'Sécurité',
        magasin: 'Magasin'
    };
    var PARTY_ICONS = {
        transit: 'fa-solid fa-truck',
        securite: 'fa-solid fa-shield-halved',
        magasin: 'fa-solid fa-store'
    };
    var PARTY_AVATAR = {
        transit: 'concert-chat__avatar--transit',
        securite: 'concert-chat__avatar--securite',
        magasin: 'concert-chat__avatar--magasin'
    };

    /* Trouve la prochaine entité en attente de décision */
    function nextAwaitingParty(card) {
        var parties = card.querySelectorAll('[data-party]');
        for (var i = 0; i < parties.length; i++) {
            if (!parties[i].getAttribute('data-party-voted')) return parties[i];
        }
        return null;
    }

    document.addEventListener('click', function (event) {
        var vote = event.target.closest('[data-party-vote]');
        if (!vote) return;
        var card = document.querySelector('[data-concert]');
        if (!card) return;

        var decision = vote.getAttribute('data-party-vote'); // 'resolu' | 'abandon'
        var party = nextAwaitingParty(card);
        if (!party) return;

        var key = party.getAttribute('data-party');
        var partyName = PARTY_LABELS[key] || 'Entité';

        // marque la position de cette entité (pastille dans l'en-tête du chat)
        party.setAttribute('data-party-voted', decision);
        var dot = party.querySelector('[data-party-status]');
        if (dot) {
            dot.className = 'concert-chat__dot ' + (decision === 'resolu' ? 'is-ok' : 'is-ko');
            dot.title = decision === 'resolu' ? 'Résolu' : 'Abandon';
        }

        // message dans la chatbox (bulle de l'entité qui vient de répondre)
        var chat = card.querySelector('[data-chat]');
        if (chat) {
            var msg = document.createElement('div');
            msg.className = 'concert-chat__msg';
            msg.innerHTML =
                '<span class="concert-chat__avatar ' + (PARTY_AVATAR[key] || '') + '"><i class="' + (PARTY_ICONS[key] || 'fa-solid fa-user') + '"></i></span>' +
                '<div class="concert-chat__content">' +
                    '<div class="concert-chat__meta">' + escapeHtml(partyName) + ' · à l\'instant</div>' +
                    '<div class="concert-chat__bubble">' +
                        (decision === 'resolu'
                            ? 'Je déclare le problème <strong>résolu</strong>.'
                            : 'Je décide d\'<strong>abandonner</strong> cette anomalie.') +
                    '</div>' +
                '</div>';
            chat.appendChild(msg);
            chat.scrollTop = chat.scrollHeight;
        }

        updateConcertDecision(card);
    });

    document.addEventListener('submit', function (event) {
        var form = event.target.closest('[data-chat-form]');
        if (!form) return;
        event.preventDefault();
        var card = form.closest('[data-concert]');
        if (!card) return;
        var input = form.querySelector('[data-chat-input]');
        var text = (input.value || '').trim();
        if (!text) { input.focus(); return; }

        var chat = card.querySelector('[data-chat]');
        if (chat) {
            var msg = document.createElement('div');
            msg.className = 'concert-chat__msg concert-chat__msg--me';
            msg.innerHTML =
                '<div class="concert-chat__content">' +
                    '<div class="concert-chat__meta">Vous (Sécurité) · à l\'instant</div>' +
                    '<div class="concert-chat__bubble">' + escapeHtml(text) + '</div>' +
                '</div>' +
                '<span class="concert-chat__avatar concert-chat__avatar--securite"><i class="fa-solid fa-shield-halved"></i></span>';
            chat.appendChild(msg);
            chat.scrollTop = chat.scrollHeight;
        }
        input.value = '';
    });

    document.addEventListener('click', function (event) {
        var final = event.target.closest('[data-concert-final]');
        if (!final) return;
        var card = final.closest('[data-concert]');
        if (!card) return;
        var decision = final.getAttribute('data-concert-final'); // 'resolu' | 'abandon'

        var result = card.querySelector('[data-concert-result]');
        if (result) {
            result.classList.remove('is-hidden');
            var span = result.querySelector('span');
            if (decision === 'resolu') {
                result.className = 'alert-mock alert-mock--success mb-0 mt-3';
                result.querySelector('i').className = 'fa-solid fa-circle-check';
                span.innerHTML = 'Anomalie <strong>déclarée résolue</strong> à l\'unanimité des entités responsables.';
            } else {
                result.className = 'alert-mock alert-mock--danger mb-0 mt-3';
                result.querySelector('i').className = 'fa-solid fa-flag';
                span.innerHTML = 'Anomalie <strong>abandonnée</strong> par décision unanime des entités responsables.';
            }
        }

        // désactive les deux boutons finaux
        card.querySelectorAll('[data-concert-final]').forEach(function (b) { b.disabled = true; });

        // met à jour le badge de l'anomalie (en-tête de page)
        var badge = document.querySelector('[data-anomalie-badge]');
        if (badge) {
            if (decision === 'resolu') {
                badge.className = 'badge-status badge--valide';
                badge.textContent = 'Résolue';
            } else {
                badge.className = 'badge-status badge--annule';
                badge.textContent = 'Abandonnée';
            }
        }
    });

    /* Active le choix final quand toutes les entités ont voté à l'unanimité */
    function updateConcertDecision(card) {
        var parties = card.querySelectorAll('[data-party]');
        var total = parties.length;
        if (!total) return;
        var resolu = 0, abandon = 0;
        parties.forEach(function (p) {
            var v = p.getAttribute('data-party-voted');
            if (v === 'resolu') resolu++;
            else if (v === 'abandon') abandon++;
        });
        var done = (resolu + abandon) === total;
        var btnResolu = card.querySelector('[data-concert-final="resolu"]');
        var btnAbandon = card.querySelector('[data-concert-final="abandon"]');
        if (!btnResolu || !btnAbandon) return;
        if (done && resolu === total) {
            btnResolu.disabled = false;
            btnAbandon.disabled = true;
        } else if (done && abandon === total) {
            btnResolu.disabled = true;
            btnAbandon.disabled = false;
        } else {
            btnResolu.disabled = true;
            btnAbandon.disabled = true;
        }
    }

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
    /* --- 9. Cellules tronquées cliquables ---
       Règle d'affichage compacte : les cellules textuelles des tableaux
       .table-mock sont réduites à une seule ligne ; un contenu trop long
       est tronqué avec « … » (texte normal, cliquable). Un clic déplie le
       contenu complet dans la cellule, un second clic le replie. Aucun
       bouton supplémentaire : la troncature est posée automatiquement. */
    var TRUNC_SKIP = 'input, select, textarea, button, a, label, img, svg, .badge-status, .chip, .switch, .form-control, .cell-actions, .avatar-mini, .btn-mock';

    /* Cellule tronquable : pas de contenu interactif ou riche (liens,
       badges, champs…), uniquement du texte éventuellement précédé
       d'une icône. Les matrices de configuration (admin) sont exclues. */
    function truncEligible(td) {
        if (td.closest('.matrix-mock')) return false;
        if (td.querySelector(TRUNC_SKIP)) return false;
        var kids = td.querySelectorAll('*');
        for (var i = 0; i < kids.length; i++) {
            var tag = kids[i].tagName;
            if (tag !== 'I' && tag !== 'SPAN') return false;
        }
        return true;
    }

    /* Enveloppe le contenu textuel d'une cellule dans un span tronquable.
       Les icônes éventuelles sont conservées à l'intérieur du span. */
    function wrapTruncCell(td) {
        if (td.getAttribute('data-trunc') === '1') return;
        td.setAttribute('data-trunc', '1');
        if (!truncEligible(td)) return;

        var hasText = false;
        var nodes = Array.prototype.slice.call(td.childNodes);
        for (var i = 0; i < nodes.length; i++) {
            if (nodes[i].nodeType === 3 && nodes[i].textContent.trim()) {
                hasText = true;
                break;
            }
        }
        if (!hasText) return;

        var span = document.createElement('span');
        span.className = 'cell-trunc';
        for (var j = 0; j < nodes.length; j++) {
            span.appendChild(nodes[j]);
        }
        td.appendChild(span);

        if (span.scrollWidth > span.clientWidth) span.classList.add('is-trunc');
    }

    function scanTrunc(root) {
        root = root || document;
        var tables = root.querySelectorAll('table.table-mock');
        for (var t = 0; t < tables.length; t++) {
            var tds = tables[t].querySelectorAll('tbody td');
            for (var i = 0; i < tds.length; i++) {
                wrapTruncCell(tds[i]);
            }
        }
        /* re-mesure des spans déjà en place : panneaux, modales et
           dropdowns <details> cachés au premier passage deviennent
           tronquables une fois affichés */
        var spans = root.querySelectorAll('.cell-trunc:not(.is-open)');
        for (var j = 0; j < spans.length; j++) {
            spans[j].classList.toggle('is-trunc', spans[j].scrollWidth > spans[j].clientWidth);
        }
    }

    /* les tableaux sont souvent rendus après le chargement de la page
       (bs-list, transit, admin) : on scanne dès qu'une cellule apparaît */
    var truncTimer = null;

    function scheduleTrunc() {
        if (truncTimer) return;
        truncTimer = requestAnimationFrame(function () {
            truncTimer = null;
            scanTrunc(document);
        });
    }

    var truncObserver = new MutationObserver(function (mutations) {
        var relevant = false;
        for (var m = 0; m < mutations.length && !relevant; m++) {
            var added = mutations[m].addedNodes;
            for (var i = 0; i < added.length; i++) {
                var n = added[i];
                if (n.nodeType !== 1) continue;
                if (n.matches && n.matches('table.table-mock, tbody, tr, td')) {
                    relevant = true;
                    break;
                }
                if (n.querySelector && n.querySelector('td')) {
                    relevant = true;
                    break;
                }
            }
        }
        if (relevant) scheduleTrunc();
    });
    truncObserver.observe(document.body, { childList: true, subtree: true });

    /* clic sur un contenu tronqué : déplier / replier dans la ligne */
    document.addEventListener('click', function (event) {
        var span = event.target.closest('.cell-trunc.is-trunc');
        if (!span) return;
        span.classList.toggle('is-open');
    });

    /* re-mesure quand un contenu caché devient visible : onglets, modales */
    document.addEventListener('click', function (event) {
        if (event.target.closest('[data-mock-tab]') || event.target.closest('[data-modal-open]')) {
            scheduleTrunc();
        }
    });

    /* dropdowns natifs <details> (historiques, transits enregistrés) */
    document.addEventListener('toggle', function (event) {
        if (event.target.matches && event.target.matches('details')) scheduleTrunc();
    });

    scanTrunc(document);
    window.S2M = window.S2M || {};
    window.S2M.refreshTrunc = scanTrunc;

    /* --- 10. Vue par rôle : l'administrateur ne participe pas à la
       concertation (chatbox entre les entités responsables) sur le détail
       d'une anomalie — il se limite au suivi (informations, historique,
       délai). La carte [data-concert] est masquée pour le rôle admin. */
    function currentRole() {
        var raw = new URLSearchParams(location.search).get('page') || '';
        return raw.split('/')[0] || null;
    }

    function applyRoleViews() {
        if (currentRole() !== 'admin') return;
        document.querySelectorAll('[data-concert]').forEach(function (card) {
            card.hidden = true;
        });
    }

    /* la page arrive asynchrone (app.js) : on ré-applique dès qu'un
       nœud est ajouté, puis à chaque mutation du contenu */
    var roleObserver = new MutationObserver(function () {
        applyRoleViews();
    });
    roleObserver.observe(document.body, { childList: true, subtree: true });
    applyRoleViews();
})();
