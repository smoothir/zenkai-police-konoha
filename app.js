const sbUrl = 'https://ekjqgxkrmggojpjmsplk.supabase.co'; 
const sbKey = 'sb_publishable_WMPw10bY6UFE8vZQsemdGg_SnqO4Ejk';  
const supabaseClient = window.supabase.createClient(sbUrl, sbKey);

let ninjaJson = []; let casierJson = []; let bingoJson = [];
let villageJson = []; let clanJson = []; let missionJson = [];
let enqueteJson = []; let renseignementJson = []; let judiciaireJson = []; let recrutementJson = []; 
let activiteLog = [];
let editMode = { active: false, type: null, id: null };
let currentUser = null;

const defaultDate = new Date().toLocaleString('fr-FR');
const defaultLog = [{ msg: "[Système] Archives Konoha vierges.", date: defaultDate }];

document.addEventListener('DOMContentLoaded', () => {
    createSakura();
    checkLogin(); 
    setupDragAndDrop();
    setupCustomSelect();
    setInterval(updateClock, 1000); updateClock();
    loadFiles(); // Le chargement Cloud va lancer l'affichage automatiquement
});

// ANIMATION SAKURA
function createSakura() {
    const container = document.getElementById('sakura-container');
    if(!container) return;
    for(let i=0; i<40; i++) {
        let petal = document.createElement('div');
        petal.className = 'petal';
        petal.style.left = Math.random() * 100 + 'vw';
        petal.style.animationDuration = (Math.random() * 3 + 3) + 's';
        petal.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(petal);
    }
}

// ==========================================
// AUTHENTIFICATION DISCORD VIA SUPABASE
// ==========================================
async function checkLogin() {
    const { data: { session } } = await supabaseClient.auth.getSession(); // <-- MODIFICATION ICI
    
    if (!session) { 
        document.getElementById('login-screen').style.display = 'flex'; 
    } else { 
        currentUser = session.user.user_metadata.custom_claims?.global_name || session.user.user_metadata.full_name || session.user.user_metadata.name || "Agent Inconnu";
        document.getElementById('login-screen').style.display = 'none'; 
        document.getElementById('agent-name').innerHTML = `<i class="fas fa-user-shield"></i> Agent : ${currentUser}`; 
    }

    supabaseClient.auth.onAuthStateChange((event, session) => { // <-- MODIFICATION ICI
        if (event === 'SIGNED_IN') {
            currentUser = session.user.user_metadata.custom_claims?.global_name || session.user.user_metadata.full_name || session.user.user_metadata.name || "Agent Inconnu";
            document.getElementById('login-screen').style.animation = "fadeOut 0.5s forwards";
            setTimeout(() => document.getElementById('login-screen').style.display = 'none', 500);
            document.getElementById('agent-name').innerHTML = `<i class="fas fa-user-shield"></i> Agent : ${currentUser}`;
            addAuditLog("Connexion via Discord approuvée.");
        }
    });
}

async function performLogin() {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({ 
        provider: 'discord',
        options: {
            // Force le retour sur la bonne page GitHub Pages
            redirectTo: 'https://smoothir.github.io/zenkai-police-konoha/'
        }
    });
    if (error) {
        showToast("Erreur d'authentification avec Discord.", "error");
        console.error(error);
    }
}

async function logout() { 
    addAuditLog("Déconnexion des serveurs.");
    await supabaseClient.auth.signOut(); // <-- MODIFICATION ICI
    location.reload(); 
}

function updateClock() { document.getElementById('current-date').textContent = new Date().toLocaleDateString('fr-FR') + " | " + new Date().toLocaleTimeString('fr-FR'); }

// ==========================================
// GESTION BASE DE DONNÉES CLOUD (SUPABASE)
// ==========================================
async function loadFiles() {
    // 1. On télécharge les données depuis Supabase
    const { data, error } = await supabaseClient.from('konoha_archives').select('*');
    
    if (error) {
        showToast("Erreur de connexion Cloud.", "error");
        console.error(error);
    } else if (data && data.length > 0) {
        // 2. On trie les données dans les bons dossiers
        data.forEach(row => {
            if(row.id === 'ninjas') ninjaJson = row.donnees;
            if(row.id === 'casiers') casierJson = row.donnees;
            if(row.id === 'bingo') bingoJson = row.donnees;
            if(row.id === 'villages') villageJson = row.donnees;
            if(row.id === 'clans') clanJson = row.donnees;
            if(row.id === 'missions') missionJson = row.donnees;
            if(row.id === 'enquetes') enqueteJson = row.donnees;
            if(row.id === 'renseignements') renseignementJson = row.donnees;
            if(row.id === 'judiciaires') judiciaireJson = row.donnees;
            if(row.id === 'recrutements') recrutementJson = row.donnees;
            if(row.id === 'logs') activiteLog = row.donnees;
        });
    }
    // 3. On affiche tout à l'écran une fois le téléchargement terminé
    initDashboard();
    renderAll();
}

async function saveFiles() {
    // On prépare les valises avec tous les dossiers actuels
    const archives = [
        { id: 'ninjas', categorie: 'registre', donnees: ninjaJson },
        { id: 'casiers', categorie: 'judiciaire', donnees: casierJson },
        { id: 'bingo', categorie: 'bingo', donnees: bingoJson },
        { id: 'villages', categorie: 'atlas', donnees: villageJson },
        { id: 'clans', categorie: 'clans', donnees: clanJson },
        { id: 'missions', categorie: 'missions', donnees: missionJson },
        { id: 'enquetes', categorie: 'enquetes', donnees: enqueteJson },
        { id: 'renseignements', categorie: 'renseignements', donnees: renseignementJson },
        { id: 'judiciaires', categorie: 'cour', donnees: judiciaireJson },
        { id: 'recrutements', categorie: 'academie', donnees: recrutementJson },
        { id: 'logs', categorie: 'systeme', donnees: activiteLog }
    ];

    // On envoie tout d'un coup sur Supabase
    const { error } = await supabaseClient.from('konoha_archives').upsert(archives);
    if (error) console.error("Erreur de sauvegarde Cloud:", error);
}

function syncBase() { 
    // Le bouton Sync. retélécharge désormais la base Cloud en direct !
    loadFiles(); 
    showToast("Base synchronisée avec le Cloud !", "success"); 
}

async function resetData() { 
    if(confirm("Purger toute la base Cloud ? Irréversible.")) { 
        await supabaseClient.from('konoha_archives').delete().neq('id', '0'); // Vide Supabase
        location.reload(); 
    } 
}

function addAuditLog(msg) { 
    const agent = currentUser || "Système"; 
    activiteLog.unshift({ msg: `[${agent}] ${msg}`, date: new Date().toLocaleString('fr-FR') }); 
    if(activiteLog.length > 50) activiteLog.pop(); 
    saveFiles(); updateDashboardLog(); 
}

// MENU
function toggleSubmenu(id) { document.getElementById(id).classList.toggle('open'); }

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(l => l.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

function initDashboard() {
    document.getElementById('stat-ninjas').textContent = ninjaJson.length;
    document.getElementById('stat-casiers').textContent = casierJson.length;
    document.getElementById('stat-missions').textContent = missionJson.length;
    if(document.getElementById('stat-enquetes')) document.getElementById('stat-enquetes').textContent = enqueteJson.length;
    updateDashboardLog();
}
function updateDashboardLog() { document.getElementById('activity-list').innerHTML = activiteLog.slice(0, 6).map(a => `<li><span class="audit-date">[${a.date}]</span> ${a.msg}</li>`).join(''); }

// ==========================================
// CHAKRA & IMAGES
// ==========================================
function setupCustomSelect() {
    document.addEventListener('click', e => { const sel = document.getElementById('chakra-select'); if (sel && !sel.contains(e.target)) { const opts = document.getElementById('chakra-options'); if(opts) opts.classList.remove('show'); } });
    document.querySelectorAll('#chakra-options input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateSelectText));
}
function toggleDropdown(id) { const el = document.getElementById(id); if(el) el.classList.toggle('show'); }
function updateSelectText() {
    const checked = document.querySelectorAll('#chakra-options input[type="checkbox"]:checked');
    const box = document.querySelector('#chakra-select .select-box');
    if(box) box.innerHTML = checked.length === 0 ? 'Sélectionner... <span>▼</span>' : Array.from(checked).map(cb => cb.value).join(', ') + ' <span>▼</span>';
}

function handleMultipleFiles(e) {
    const files = e.target.files; const container = document.getElementById('m-preview-container');
    if(container.children.length + files.length > 3) { showToast("Max 3 images !", "error"); return; }
    for(let i=0; i<files.length; i++) {
        if(container.children.length >= 3) break;
        const reader = new FileReader();
        reader.onload = ev => {
            const img = document.createElement('img'); img.src = ev.target.result; img.className = 'mission-thumb';
            img.onclick = function() { this.remove(); };
            container.appendChild(img);
        }; reader.readAsDataURL(files[i]);
    }
}

function setupDragAndDrop() {
    ['ninja', 'casier', 'bingo', 'village', 'clan', 'renseignement', 'recrutement'].forEach(type => {
        const zone = document.getElementById(`zone-${type}`);
        if(zone) { zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = "var(--police-blue)"; }); zone.addEventListener('dragleave', e => { e.preventDefault(); zone.style.borderColor = "var(--gold-dark)"; }); zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = "var(--gold-dark)"; if (e.dataTransfer.files[0]) processImageFile(e.dataTransfer.files[0], type); }); }
    });
}
function handleFileSelect(event, type) { if (event.target.files[0]) processImageFile(event.target.files[0], type); }
function processImageFile(file, type) {
    if (!file.type.match('image.*')) return showToast("Fichier invalide.", "error");
    const reader = new FileReader();
    reader.onload = e => {
        const img = new Image(); img.onload = () => {
            const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = img.height * (300 / img.width);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const b64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById(`preview-${type}`).src = b64; document.getElementById(`preview-${type}`).style.display = 'block'; document.getElementById(`text-${type}`).style.display = 'none'; document.getElementById(`${type.charAt(0)}-img-base64`).value = b64;
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}
function clearImagePreview(type) {
    if(type==='mission') { document.getElementById('m-preview-container').innerHTML = ""; return; }
    if(type==='enquete' || type==='judiciaire') return;
    if(document.getElementById(`preview-${type}`)) { document.getElementById(`preview-${type}`).src = ""; document.getElementById(`preview-${type}`).style.display = 'none'; document.getElementById(`text-${type}`).style.display = 'block'; document.getElementById(`${type.charAt(0)}-img-base64`).value = ""; }
}

// ==========================================
// AFFICHAGE (READ)
// ==========================================
function getListByType(type) { 
    switch(type) { 
        case 'ninja': return ninjaJson; case 'casier': return casierJson; case 'bingo': return bingoJson; case 'village': return villageJson; case 'clan': return clanJson; case 'mission': return missionJson; 
        case 'enquete': return enqueteJson; case 'renseignement': return renseignementJson; case 'judiciaire': return judiciaireJson; case 'recrutement': return recrutementJson;
        default: return []; 
    } 
}
function getItemName(item) {
    if (item.nom && item.prenom) return `${item.prenom} ${item.nom}`;
    if (item.nom) return item.nom; if (item.titre) return item.titre; if (item.sujet) return item.sujet; if (item.affaire) return item.affaire; return item.id;
}

function renderAll() { ['ninja', 'casier', 'bingo', 'village', 'clan', 'mission', 'enquete', 'renseignement', 'judiciaire', 'recrutement'].forEach(filterData); }

function filterData(type) {
    const searchElem = document.getElementById(`search-${type}`);
    const searchVal = searchElem ? searchElem.value.toLowerCase() : "";
    let filterVal = document.getElementById(`filter-grade`) && type==='ninja' ? document.getElementById('filter-grade').value : "";
    let results = getListByType(type);

    if(searchVal) results = results.filter(i => getItemName(i).toLowerCase().includes(searchVal) || i.id.toLowerCase().includes(searchVal));
    if(filterVal && type==='ninja') results = results.filter(i => i.grade === filterVal);

    const container = document.getElementById(`${type}-grid`) || document.getElementById(`${type}-list`); let html = "";

    results.forEach(item => {
        const imgSrc = item.img && item.img.startsWith('data:image') ? item.img : 'https://r2.fivemanage.com/y6F8XOoj6raoMaOk41fDy/policekonoha.png';
        const itemName = getItemName(item);

        if(type === 'ninja') {
            const isDead = item.statut === 'Décédé'; const isMissing = item.statut === 'Déserteur' || item.statut === 'Disparu';
            const stamp = isDead ? `<div class="stamp-overlay stamp-red">DÉCÉDÉ</div>` : (isMissing ? `<div class="stamp-overlay stamp-black">${item.statut.toUpperCase()}</div>` : '');
            html += `<div class="card ${isDead||isMissing?'card-dead':''}" onclick="openDossier('ninja', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img">${stamp}</div><div class="card-content"><h3>${itemName}</h3><span class="card-badge">${item.grade}</span></div></div>`;
        }
        else if(type === 'casier') { const color = item.gravite === "Sévère" ? "var(--accent-red)" : (item.gravite === "Modérée" ? "#d48b1c" : "#2e7d32"); html += `<div class="list-item" onclick="openDossier('casier', '${item.id}')" style="border-left-color:${color}"><img src="${imgSrc}" class="list-img"><div style="flex:1;"><h3>${itemName}</h3><p style="color:var(--text-muted); font-size:0.85rem;">${item.faits}</p></div><span class="card-badge" style="background:${color};color:white;border:none">${item.gravite}</span></div>`; }
        else if(type === 'bingo') { html += `<div class="card bingo" onclick="openDossier('bingo', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img"></div><div class="card-content"><h3>${itemName}</h3><span class="card-badge">Cible ${item.rang}</span><p style="margin-top:5px; font-weight:bold; color:#ffcc00; font-size:0.9rem;">${item.prime} ¥</p></div></div>`; }
        else if(type === 'village') { html += `<div class="card" onclick="openDossier('village', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img" style="object-fit:contain; padding:20px;"></div><div class="card-content"><h3>${itemName}</h3><span class="card-badge">${item.chef}</span></div></div>`; }
        else if(type === 'clan') { html += `<div class="card" onclick="openDossier('clan', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img" style="object-fit:contain; padding:20px;"></div><div class="card-content"><h3>Clan ${itemName}</h3><span class="card-badge">${item.chef}</span></div></div>`; }
        else if(type === 'mission') { html += `<div class="list-item" onclick="openDossier('mission', '${item.id}')" style="border-left-color:#8b5a2b"><div style="flex:1;"><h3>[Rang ${item.rang}] ${itemName}</h3><p style="color:var(--text-muted); font-size:0.85rem;"><i class="fas fa-users"></i> ${item.equipe}</p></div><span class="card-badge">${item.statut}</span></div>`; }
        else if(type === 'enquete') { html += `<div class="list-item" onclick="openDossier('enquete', '${item.id}')" style="border-left-color:#162438"><div style="flex:1;"><h3>Affaire: ${itemName}</h3><p style="color:var(--text-muted); font-size:0.85rem;">Suspect(s): ${item.cibles}</p></div><span class="card-badge">${item.statut}</span></div>`; }
        else if(type === 'renseignement') { html += `<div class="card" onclick="openDossier('renseignement', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img"></div><div class="card-content"><h3>${itemName}</h3><span class="card-badge">${item.categorie}</span></div></div>`; }
        else if(type === 'judiciaire') { html += `<div class="list-item" onclick="openDossier('judiciaire', '${item.id}')" style="border-left-color:#8c7348"><div style="flex:1;"><h3>${itemName}</h3><p style="color:var(--text-muted); font-size:0.85rem;">Accusé: ${item.accuse}</p></div><span class="card-badge">${item.verdict}</span></div>`; }
        else if(type === 'recrutement') { 
            let statusClass = "status-encours";
            if(item.statut === "Accepté") statusClass = "status-accepte";
            if(item.statut === "Refusé") statusClass = "status-refuse";
            
            html += `<div class="recrutement-row">
                <div class="rec-actions">
                    <button class="btn-edit" onclick="setupEdit('recrutement', '${item.id}')" title="Modifier"><i class="fas fa-pen"></i></button>
                    <button class="btn-delete" onclick="deleteItem('recrutement', '${item.id}')" title="Supprimer"><i class="fas fa-trash"></i></button>
                </div>
                <div class="recrutement-col">
                    <h4><i class="fas fa-id-badge"></i> Profil Candidat</h4>
                    <p><strong>Nom:</strong> ${itemName}</p>
                    <p><strong>Âge:</strong> ${item.age || '--'} ans</p>
                    <p><strong>Chakra:</strong> ${item.chakra || 'Non renseigné'}</p>
                    <p><strong>Agent en charge:</strong> ${item.agent || '--'}</p>
                    <p style="margin-top:10px;"><strong>Statut:</strong> <span class="rec-status ${statusClass}">${item.statut || 'En cours'}</span></p>
                </div>
                <div class="recrutement-col">
                    <h4><i class="fas fa-comment-dots"></i> Avis du recruteur</h4>
                    <p>${formatLinks(item.avis) || 'Aucun avis rédigé.'}</p>
                </div>
                <div class="recrutement-col">
                    <h4><i class="fas fa-folder-open"></i> Autres Informations</h4>
                    <p>${formatLinks(item.desc) || 'Aucune information supplémentaire.'}</p>
                </div>
            </div>`; 
        }
    });
    if(results.length === 0) html = `<p style="grid-column: 1/-1; text-align:center; font-style:italic; color:#888; margin-top:10px;">Aucun résultat.</p>`;
    if(container) container.innerHTML = html;
}

// OUVERTURE DOSSIER & FORUM
function openDossier(type, id) {
    // Ne pas ouvrir la modale pour le recrutement car tout est déjà sur la ligne (sauf si on édite/supprime)
    if(type === 'recrutement') return;

    const item = getListByType(type).find(i => i.id === id);
    const imgSrc = item.img && item.img.startsWith('data:image') ? item.img : 'https://r2.fivemanage.com/y6F8XOoj6raoMaOk41fDy/policekonoha.png';
    const itemName = getItemName(item);

    document.getElementById('details-actions').innerHTML = `<button class="btn-edit" onclick="setupEdit('${type}', '${id}')"><i class="fas fa-pen"></i> Modifier</button><button class="btn-delete" onclick="deleteItem('${type}', '${id}')"><i class="fas fa-trash"></i> Supprimer</button>`;

    let html = ``;
    if(['ninja', 'casier', 'bingo', 'village', 'clan', 'renseignement'].includes(type)) {
        const isDead = type === 'ninja' && item.statut === 'Décédé'; const isMissing = type === 'ninja' && (item.statut === 'Déserteur' || item.statut === 'Disparu');
        const stamp = isDead ? `<div class="stamp-overlay stamp-red" style="font-size:2rem; border-width:4px;">DÉCÉDÉ</div>` : (isMissing ? `<div class="stamp-overlay stamp-black" style="font-size:2rem; border-width:4px;">${item.statut.toUpperCase()}</div>` : '');
        html += `<div class="dossier-photo-col"><div class="dossier-photo-frame"><img src="${imgSrc}" class="dossier-photo">${stamp}</div><div class="dossier-id">${item.id}</div>`;
        if(type === 'ninja') html += `<button class="btn-link" onclick="linkToCasier('${item.nom}', '${item.prenom}')"><i class="fas fa-gavel"></i> Casier Judiciaire</button>`;
        html += `</div>`;
    }

    const needsFullWidth = ['mission', 'enquete', 'judiciaire'].includes(type);
    html += `<div class="dossier-info-col" style="${needsFullWidth ? 'width:100%' : ''}"><div class="dossier-header"><h2 class="dossier-name">${itemName}</h2>${type === 'ninja' ? `<span class="card-badge" style="background:var(--police-blue); color:var(--gold);">${item.grade}</span>` : ''}</div>`;
    
    if(type === 'ninja') html += `<div class="dossier-block"><h4>Identité</h4><div class="data-grid"><p><strong>Statut:</strong> <span style="color:${item.statut==='En Vie'?'green':'red'}; font-weight:bold;">${item.statut}</span></p><p><strong>Âge:</strong> ${item.age}</p><p><strong>Clan:</strong> ${item.clan}</p><p><strong>Chakra:</strong> ${(item.natures && item.natures.length>0)?item.natures.join(', '):"Inconnu"}</p></div></div><div class="dossier-block"><h4>Profil</h4><p><strong>Fort:</strong> ${item.fort}</p><p><strong>Faible:</strong> ${item.faible}</p></div><div class="dossier-block"><h4>Notes</h4><p>${formatLinks(item.notes)}</p></div>`;
    if(type === 'casier') html += `<div class="dossier-block"><h4>Délit</h4><p><strong>Faits :</strong> ${formatLinks(item.faits)}</p><p><strong>Gravite :</strong> <span style="color:${item.gravite==='Sévère'?'red':(item.gravite==='Modérée'?'orange':'green')}; font-weight:bold;">${item.gravite}</span></p></div><div class="dossier-block"><h4>Jugement</h4><p>${item.sanctions}</p></div><div class="dossier-block"><h4>Notes</h4><p>${formatLinks(item.notes)}</p></div>`;
    if(type === 'bingo') html += `<div class="dossier-block" style="border-color:red; background:#2b1111;"><h4>Prime & Rang</h4><p>Classe ${item.rang} - <span style="color:#ffcc00;">${item.prime} ¥</span></p></div><div class="dossier-block"><h4>Directives</h4><p>${formatLinks(item.notes)}</p></div>`;
    if(type === 'village') html += `<div class="dossier-block"><h4>Infos</h4><p><strong>Chef:</strong> ${item.chef}</p><p>${formatLinks(item.notes)}</p></div>`;
    if(type === 'clan') html += `<div class="dossier-block"><h4>Infos</h4><p><strong>Chef:</strong> ${item.chef}</p><p><strong>Kekkei Genkai:</strong> ${item.heredite}</p></div><div class="dossier-block"><h4>Histoire</h4><p>${formatLinks(item.histoire)}</p><p>${formatLinks(item.notes)}</p></div>`;
    if(type === 'mission') {
        html += `<div class="dossier-id" style="width:auto; display:inline-block; margin-bottom:15px;">N° ${item.id}</div><div class="dossier-block"><h4>Détails</h4><div class="data-grid"><p><strong>Rang:</strong> ${item.rang}</p><p><strong>Statut:</strong> ${item.statut}</p><p><strong>Équipe:</strong> ${formatLinks(item.equipe)}</p></div></div>`;
        if(item.liens) html += `<div class="dossier-block"><h4>Lien / Doc</h4><a href="${item.liens}" target="_blank" style="color:var(--police-blue); font-weight:bold;">${item.liens}</a></div>`;
        html += `<div class="dossier-block"><h4>Objectifs</h4><p>${formatLinks(item.desc)}</p></div>`;
        if(item.images && item.images.length > 0) { html += `<div class="dossier-block"><h4>Preuves Visuelles</h4><div class="multi-preview">` + item.images.map(img => `<img src="${img}" class="mission-thumb" style="width:80px;height:80px;cursor:default;">`).join('') + `</div></div>`; }
    }
    if(type === 'enquete') html += `<div class="dossier-id" style="width:auto; display:inline-block; margin-bottom:15px;">N° ${item.id}</div><div class="dossier-block"><h4>Infos Enquête</h4><div class="data-grid"><p><strong>Statut:</strong> ${item.statut}</p><p><strong>Cibles/Suspects:</strong> ${formatLinks(item.cibles)}</p></div></div><div class="dossier-block"><h4>Description</h4><p>${formatLinks(item.desc)}</p></div>`;
    if(type === 'renseignement') html += `<div class="dossier-block"><h4>Origine</h4><p><strong>Catégorie :</strong> ${item.categorie}</p><p><strong>Fiabilité :</strong> ${item.fiabilite}</p></div><div class="dossier-block"><h4>Rapport complet</h4><p>${formatLinks(item.desc)}</p></div>`;
    if(type === 'judiciaire') html += `<div class="dossier-id" style="width:auto; display:inline-block; margin-bottom:15px;">N° ${item.id}</div><div class="dossier-block"><h4>Procédure</h4><div class="data-grid"><p><strong>Accusé(s):</strong> ${formatLinks(item.accuse)}</p><p><strong>Magistrat:</strong> ${formatLinks(item.juge)}</p><p><strong>Verdict:</strong> ${item.verdict}</p></div></div><div class="dossier-block"><h4>Détails de l'affaire</h4><p>${formatLinks(item.desc)}</p></div>`;

    // FORUM / SUIVI
    let suivisHtml = `<div class="dossier-block"><h4><i class="fas fa-comments"></i> Journal d'Évolution (Notes & Rapports)</h4><div class="thread-container">`;
    if(item.suivis && item.suivis.length > 0) {
        item.suivis.forEach(s => { suivisHtml += `<div class="thread-message"><span class="thread-meta">${s.date} - <strong>${s.agent}</strong></span><p>${formatLinks(s.texte)}</p></div>`; });
    } else { suivisHtml += `<p style="font-style:italic; color:#888; margin-bottom:10px;">Aucune note supplémentaire pour le moment.</p>`; }
    suivisHtml += `</div><div class="thread-input-box"><textarea id="new-suivi-text" placeholder="Ajouter une nouvelle information, rapport ou mise à jour au dossier..."></textarea><button class="btn-submit" onclick="addSuivi('${type}', '${item.id}')" style="padding:10px; font-size:0.9rem;"><i class="fas fa-plus"></i> Ajouter l'information</button></div></div>`;
    html += suivisHtml;

    document.getElementById('details-content').innerHTML = html + "</div>";
    document.getElementById('audit-log-display').innerHTML = `Créé: ${item.dateCreation} | Modifié: ${item.dateModification}`;
    type === 'bingo' ? document.getElementById('details-container').classList.add('bingo-theme') : document.getElementById('details-container').classList.remove('bingo-theme');
    document.getElementById('modal-details').style.display = 'block';
}

function addSuivi(type, id) {
    const texte = document.getElementById('new-suivi-text').value.trim();
    if(!texte) return showToast("La note est vide.", "error");
    const list = getListByType(type); const index = list.findIndex(i => i.id === id);
    if(index > -1) {
        if(!list[index].suivis) list[index].suivis = [];
        list[index].suivis.push({ texte: texte, date: new Date().toLocaleString('fr-FR'), agent: currentUser || "Agent Anonyme" });
        list[index].dateModification = new Date().toLocaleString('fr-FR');
        saveFiles(); openDossier(type, id); showToast("Note ajoutée.", "success");
    }
}

function linkToCasier(nom, prenom) { closeModal('modal-details'); switchTab('casiers'); document.getElementById('search-casier').value = (nom + " " + prenom).trim(); filterData('casier'); }

function deleteItem(type, id) {
    if(!confirm("Purger définitivement cette archive ?")) return;
    const list = getListByType(type); const index = list.findIndex(i => i.id === id);
    if(index > -1) { 
        const itemName = getItemName(list[index]);
        list.splice(index, 1); 
        addAuditLog(`Purge : L'archive [${itemName}] a été détruite.`); 
        renderAll(); initDashboard(); closeModal('modal-details'); showToast("Purgé.", "success"); 
    }
}

// ==========================================
// FORMULAIRES (EDITION / CREATION)
// ==========================================
function setupEdit(type, id) {
    closeModal('modal-details');
    const item = getListByType(type).find(i => i.id === id);
    editMode = { active: true, type: type, id: id };
    
    if(document.getElementById(`title-${type}`)) document.getElementById(`title-${type}`).textContent = `Modification [${id}]`;

    if(type === 'ninja') { 
        vSet('n-nom', item.nom); vSet('n-prenom', item.prenom); vSet('n-age', item.age); vSet('n-grade', item.grade); vSet('n-clan', item.clan); vSet('n-statut', item.statut || "En Vie"); vSet('n-fort', item.fort); vSet('n-faible', item.faible); vSet('n-notes', item.notes); 
        document.querySelectorAll('#chakra-options input[type="checkbox"]').forEach(cb => { cb.checked = (item.natures && item.natures.includes(cb.value)); }); 
    }
    else if(type === 'casier') { vSet('c-nom', item.nom); vSet('c-prenom', item.prenom); vSet('c-faits', item.faits); vSet('c-gravite', item.gravite); vSet('c-sanctions', item.sanctions); vSet('c-notes', item.notes); }
    else if(type === 'bingo') { vSet('b-nom', item.nom); vSet('b-rang', item.rang); vSet('b-prime', item.prime); vSet('b-notes', item.notes); }
    else if(type === 'village') { vSet('v-nom', item.nom); vSet('v-chef', item.chef); vSet('v-relation', item.relation); vSet('v-notes', item.notes); }
    else if(type === 'clan') { vSet('cl-nom', item.nom); vSet('cl-chef', item.chef); vSet('cl-heredite', item.heredite); vSet('cl-histoire', item.histoire); vSet('cl-notes', item.notes); }
    else if(type === 'mission') { vSet('m-titre', item.titre); vSet('m-rang', item.rang); vSet('m-equipe', item.equipe); vSet('m-statut', item.statut); vSet('m-liens', item.liens||''); vSet('m-desc', item.desc); document.getElementById('m-preview-container').innerHTML = (item.images||[]).map(img => `<img src="${img}" class="mission-thumb" onclick="this.remove()">`).join(''); }
    else if(type === 'enquete') { vSet('e-titre', item.titre); vSet('e-statut', item.statut); vSet('e-cibles', item.cibles); vSet('e-desc', item.desc); }
    else if(type === 'renseignement') { vSet('r-sujet', item.sujet); vSet('r-categorie', item.categorie); vSet('r-fiabilite', item.fiabilite); vSet('r-desc', item.desc); }
    else if(type === 'judiciaire') { vSet('j-affaire', item.affaire); vSet('j-verdict', item.verdict); vSet('j-accuse', item.accuse); vSet('j-juge', item.juge); vSet('j-desc', item.desc); }
    else if(type === 'recrutement') { vSet('rec-nom', item.nom); vSet('rec-prenom', item.prenom); vSet('rec-age', item.age); vSet('rec-chakra', item.chakra); vSet('rec-agent', item.agent); vSet('rec-statut', item.statut); vSet('rec-avis', item.avis); vSet('rec-desc', item.desc); }

    if(!['mission', 'enquete', 'judiciaire'].includes(type) && item.img) { document.getElementById(`preview-${type}`).src = item.img; document.getElementById(`preview-${type}`).style.display = 'block'; document.getElementById(`text-${type}`).style.display = 'none'; document.getElementById(`${type.charAt(0)}-img-base64`).value = item.img; }
    openModal(`modal-${type}`);
}
function vSet(id, value) { if(document.getElementById(id)) document.getElementById(id).value = value; }

function openModal(id) { 
    const type = id.replace('modal-', '');
    if(!editMode.active) { 
        if(document.getElementById(`form-${type}`)) document.getElementById(`form-${type}`).reset(); 
        clearImagePreview(type); 
        if(type === 'ninja') { document.querySelectorAll('#chakra-options input[type="checkbox"]').forEach(cb => cb.checked = false); }
        const titles = { ninja: 'Immatriculation Shinobi', casier: 'Inculpation Criminelle', bingo: 'Avis de Recherche', village: 'Fiche Diplomatique', clan: 'Registre Généalogique', mission: 'Ordre de Mission', enquete: "Ouverture d'Enquête", renseignement: "Fiche Renseignement", judiciaire: "Dossier de Cour", recrutement: "Dossier Candidat" };
        if(document.getElementById(`title-${type}`)) document.getElementById(`title-${type}`).textContent = titles[type]; 
    }
    document.getElementById(id).style.display = 'block'; 
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; editMode = { active: false, type: null, id: null }; }

function submitForm(e, type) {
    e.preventDefault();
    try {
        const v = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
        const prefix = {ninja:'NJ', casier:'CJ', bingo:'BB', village:'VL', clan:'CL', mission:'MI', enquete:'EQ', renseignement:'RS', judiciaire:'JU', recrutement:'RC'}[type];
        const itemId = editMode.active ? editMode.id : prefix + "-" + Math.floor(Math.random() * 9000 + 1000);
        const currentDate = new Date().toLocaleString('fr-FR');
        let newItem = { id: itemId, dateModification: currentDate };

        if(type === 'mission') {
            const imgs = Array.from(document.querySelectorAll('#m-preview-container img')).map(img => img.src);
            newItem = { ...newItem, titre: v('m-titre'), rang: v('m-rang'), equipe: v('m-equipe'), statut: v('m-statut'), liens: v('m-liens'), desc: v('m-desc'), images: imgs };
        } else if (['enquete', 'judiciaire'].includes(type)) {
            if(type === 'enquete') newItem = { ...newItem, titre: v('e-titre'), statut: v('e-statut'), cibles: v('e-cibles'), desc: v('e-desc') };
            if(type === 'judiciaire') newItem = { ...newItem, affaire: v('j-affaire'), verdict: v('j-verdict'), accuse: v('j-accuse'), juge: v('j-juge'), desc: v('j-desc') };
        } else {
            const imgElem = document.getElementById(`${type.charAt(0)}-img-base64`);
            const imgBase64 = imgElem ? imgElem.value : (type==='recrutement' ? document.getElementById('rec-img-base64').value : "");
            
            if(type === 'ninja') { newItem = { ...newItem, nom: v('n-nom'), prenom: v('n-prenom'), age: v('n-age'), grade: v('n-grade'), clan: v('n-clan'), statut: v('n-statut'), natures: Array.from(document.querySelectorAll('#chakra-options input:checked')).map(cb => cb.value), fort: v('n-fort'), faible: v('n-faible'), notes: v('n-notes'), img: imgBase64 }; }
            else if(type === 'casier') { newItem = { ...newItem, nom: v('c-nom'), prenom: v('c-prenom'), faits: v('c-faits'), gravite: v('c-gravite'), sanctions: v('c-sanctions'), notes: v('c-notes'), img: imgBase64 }; }
            else if(type === 'bingo') { newItem = { ...newItem, nom: v('b-nom'), rang: v('b-rang'), prime: v('b-prime'), notes: v('b-notes'), img: imgBase64 }; }
            else if(type === 'village') { newItem = { ...newItem, nom: v('v-nom'), chef: v('v-chef'), notes: v('v-notes'), img: imgBase64 }; }
            else if(type === 'clan') { newItem = { ...newItem, nom: v('cl-nom'), chef: v('cl-chef'), heredite: v('cl-heredite'), histoire: v('cl-histoire'), notes: v('cl-notes'), img: imgBase64 }; }
            else if(type === 'renseignement') { newItem = { ...newItem, sujet: v('r-sujet'), categorie: v('r-categorie'), fiabilite: v('r-fiabilite'), desc: v('r-desc'), img: imgBase64 }; }
            else if(type === 'recrutement') { newItem = { ...newItem, nom: v('rec-nom'), prenom: v('rec-prenom'), age: v('rec-age'), chakra: v('rec-chakra'), agent: v('rec-agent'), statut: v('rec-statut'), avis: v('rec-avis'), desc: v('rec-desc'), img: imgBase64 }; }
        }

        const list = getListByType(type);
        const itemName = getItemName(newItem);

        if(editMode.active) {
            const index = list.findIndex(i => i.id === itemId); 
            newItem.dateCreation = list[index].dateCreation; 
            newItem.suivis = list[index].suivis || [];
            list[index] = newItem; 
            addAuditLog(`Édition : L'archive [${itemName}] a été mise à jour.`); 
            showToast("Scellé.", "success"); 
        } 
        else { 
            newItem.dateCreation = currentDate; 
            newItem.suivis = [];
            list.unshift(newItem); 
            addAuditLog(`Création : Nouveau dossier pour [${itemName}].`); 
            showToast("Validé.", "success"); 
        }
        
        saveFiles(); closeModal(`modal-${type}`); initDashboard(); renderAll();
    } catch (err) {
        showToast("Erreur système: " + err.message, "error");
        console.error(err);
    }
}

function showToast(msg, type="info") {
    const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type==='error'?'error':''}`;
    t.innerHTML = `${type==='success'?'<i class="fas fa-check-circle"></i>':'<i class="fas fa-info-circle"></i>'} <span>${msg}</span>`;
    c.appendChild(t); setTimeout(() => { t.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ==========================================
// IMPORT / EXPORT (SAUVEGARDE PC)
// ==========================================
function exportData() {
    saveFiles(); 
    const allData = { ninjaJson, casierJson, bingoJson, villageJson, clanJson, missionJson, enqueteJson, renseignementJson, judiciaireJson, recrutementJson, activiteLog };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allData));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `Archives_Police_Konoha_${new Date().toLocaleDateString('fr-FR').replace(/\//g,'-')}.json`);
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    document.body.removeChild(dlAnchorElem);
    addAuditLog("Exportation manuelle de la base de données.");
    showToast("Base de données téléchargée sur votre PC.", "success");
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData.ninjaJson !== undefined) {
                ninjaJson = importedData.ninjaJson; casierJson = importedData.casierJson; bingoJson = importedData.bingoJson;
                villageJson = importedData.villageJson; clanJson = importedData.clanJson; missionJson = importedData.missionJson;
                enqueteJson = importedData.enqueteJson; renseignementJson = importedData.renseignementJson; 
                judiciaireJson = importedData.judiciaireJson; recrutementJson = importedData.recrutementJson;
                activiteLog = importedData.activiteLog;
                saveFiles();
                alert("Importation réussie ! Le système va redémarrer.");
                location.reload();
            } else { showToast("Fichier de sauvegarde non reconnu.", "error"); }
        } catch(err) { showToast("Erreur lors de la lecture du fichier.", "error"); }
    };
    reader.readAsText(file);
}

// ==========================================
// SYSTÈME D'HYPERLIENS DYNAMIQUES
// ==========================================
function formatLinks(text) {
    if (!text) return "";
    const regex = /([A-Z]{2}-\d{4})/g;
    return text.replace(regex, `<span class="hyperlink" onclick="openDossierFromLink('$1')"><i class="fas fa-link"></i> $1</span>`);
}

function openDossierFromLink(matricule) {
    const prefix = matricule.substring(0, 2);
    const map = { 'NJ':'ninja', 'CJ':'casier', 'BB':'bingo', 'VL':'village', 'CL':'clan', 'MI':'mission', 'EQ':'enquete', 'RS':'renseignement', 'JU':'judiciaire', 'RC':'recrutement' };
    const type = map[prefix];
    
    if(type) {
        closeModal('modal-details');
        setTimeout(() => openDossier(type, matricule), 300);
    } else {
        showToast("Matricule introuvable dans la base.", "error");
    }
}
