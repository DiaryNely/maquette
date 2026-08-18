/* ============================================================
   APP — chargement des pages de la maquette S2M-WEB

   Routage : la page est passée en paramètre d'URL.
     - « index.html?page=login »            → sélection de l'utilisateur simulé
     - « index.html?page=lambda/bs-list »   → portail « Personnel »
     - « index.html?page=transit/transit »  → portail « Scan & Transit »
     - « index.html?page=admin/bs-list »    → portail « Administrateur »
   Le premier segment (« lambda », « transit », « admin ») détermine le
   rôle simulé : menu injecté, utilisateur affiché dans le header et
   préfixe appliqué à tous les liens internes.
   Les pages du dossier du rôle sont chargées si elles existent, sinon
   on retombe sur la page partagée correspondante (pages/<nom>.html).
   ============================================================ */
async function inclure(selector, fichier) {
    const reponse = await fetch(fichier);
    if (!reponse.ok) throw new Error(`Impossible de charger ${fichier}`);
    document.querySelector(selector).innerHTML = await reponse.text();
}

/* Utilisateurs simulés pour chaque rôle (header) */
const USERS = {
    lambda:  { name: 'Rakotobe Hery',              desc: 'Personnel | Magasin central' },
    transit: { name: 'Rabemananjara Solo',         desc: 'Transit | Plateforme logistique' },
    admin:   { name: 'Administrateur - Automat SI', desc: 'Responsable informatique | Siège - Administration S2M' }
};

/* Pages accessibles par rôle simulé (null = tout, rôle administrateur) */
const ROLE_PAGES = {
    lambda:  ['bs-list', 'bs-create', 'bs-detail', 'notifications', 'anomalie-detail', 'retours'],
    transit: ['transit', 'bs-detail', 'anomalie-detail', 'notifications'],
    admin:   null
};

let role = null;

/* Page d'accueil du portail d'un rôle */
function roleHome(r) {
    return 'index.html?page=' + (r === 'transit' ? 'transit/transit' : r + '/bs-list');
}

/* Affiche l'utilisateur du rôle simulé dans le header */
function applyUser() {
    const u = USERS[role];
    if (!u) return;
    const nameEl = document.querySelector('[data-header-name]');
    const descEl = document.querySelector('[data-header-desc]');
    if (nameEl) nameEl.textContent = u.name;
    if (descEl) descEl.textContent = u.desc;
}

/* Préfixe les liens internes (index.html?page=X) avec le rôle courant */
function rewriteLinks(root) {
    if (!role) return;
    const links = root.querySelectorAll('a[href^="index.html?page="]');
    for (const a of links) {
        const q = a.getAttribute('href').split('?')[1] || '';
        const params = new URLSearchParams(q);
        const page = params.get('page');
        if (page && page.indexOf('/') === -1) {
            params.set('page', role + '/' + page);
            a.setAttribute('href', 'index.html?' + params.toString());
        }
    }
}

async function chargerMenus() {
    // le menu dépend du rôle simulé, pas de la page elle-même
    const fichier = role ? `pages/${role}/menu.html` : 'menu.html';
    const emplacements = document.querySelectorAll('[data-menu]');

    await Promise.all(Array.from(emplacements, async emplacement => {
        // cache-busting : le navigateur garde parfois menu.html en cache
        const reponse = await fetch(fichier + '?v=5');
        if (!reponse.ok) return;
        emplacement.outerHTML = await reponse.text();
    }));
}

async function chargerPage() {
    const raw = new URLSearchParams(location.search).get('page') || 'login';
    if (!/^[a-z0-9/-]+$/i.test(raw)) throw new Error('Nom de page invalide');

    const parts = raw.split('/');
    role = parts.length > 1 ? parts[0] : null;
    const name = role ? parts[1] : raw;

    // garde d'accès : le rôle ne voit que ses pages autorisées
    const allowed = role ? ROLE_PAGES[role] : null;
    if (allowed && allowed.indexOf(name) === -1) {
        location.replace(roleHome(role));
        return;
    }

    // on tente d'abord la page du dossier du rôle, puis la page partagée
    // (cache-busting : le navigateur garde parfois les pages en cache)
    const stamp = '?v=' + Date.now();
    let fichier = role ? `pages/${role}/${name}.html` : `pages/${name}.html`;
    let reponse = await fetch(fichier + stamp);
    if (!reponse.ok && role) {
        fichier = `pages/${name}.html`;
        reponse = await fetch(fichier + stamp);
    }
    if (!reponse.ok) throw new Error('Page introuvable');

    document.querySelector('#contenu').innerHTML = await reponse.text();

    // tous les liens internes restent dans le portail du rôle simulé,
    // y compris ceux générés dynamiquement après le chargement
    const contenu = document.querySelector('#contenu');
    rewriteLinks(contenu);
    const observateur = new MutationObserver(() => rewriteLinks(contenu));
    observateur.observe(contenu, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href']
    });

    await chargerMenus();
}

/* API partagée : lien interne préfixé par le rôle simulé */
window.S2M = window.S2M || {};
window.S2M.route = function (page, params) {
    const q = new URLSearchParams();
    q.set('page', (role ? role + '/' : '') + page);
    if (params) {
        for (const k in params) {
            if (Object.prototype.hasOwnProperty.call(params, k)) q.set(k, params[k]);
        }
    }
    return 'index.html?' + q.toString();
};

Promise.all([
    inclure('#site-header', 'header.html?v=2'),
    inclure('#site-footer', 'footer.html?v=2'),
    chargerPage()
]).then(applyUser).catch(() => {
    document.querySelector('#contenu').innerHTML = '<h1>Page introuvable</h1><p>Le contenu demandé est indisponible.</p>';
});
