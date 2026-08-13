async function inclure(selector, fichier) {
    const reponse = await fetch(fichier);
    if (!reponse.ok) throw new Error(`Impossible de charger ${fichier}`);
    document.querySelector(selector).innerHTML = await reponse.text();
}

async function chargerMenus() {
    const emplacements = document.querySelectorAll('[data-menu]');

    await Promise.all(Array.from(emplacements, async emplacement => {
        const fichier = emplacement.dataset.menu;
        // cache-busting : le navigateur garde parfois menu.html en cache
        const reponse = await fetch(fichier + '?v=4');
        if (!reponse.ok) throw new Error(`Impossible de charger ${fichier}`);
        emplacement.outerHTML = await reponse.text();
    }));
}

async function chargerPage() {
    const page = new URLSearchParams(location.search).get('page') || 'bs-list';

    if (!/^[a-z0-9-]+$/i.test(page)) throw new Error('Nom de page invalide');

    await inclure('#contenu', `pages/${page}.html`);
    await chargerMenus();
}

Promise.all([
    inclure('#site-header', 'header.html'),
    inclure('#site-footer', 'footer.html'),
    chargerPage()
]).catch(() => {
    document.querySelector('#contenu').innerHTML = '<h1>Page introuvable</h1><p>Le contenu demandé est indisponible.</p>';
});
