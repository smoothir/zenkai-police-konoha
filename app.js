// ==========================================
// VARIABLES & STRUCTURES
// ==========================================
let ninjaJson = []; let casierJson = []; let bingoJson = [];
let villageJson = []; let clanJson = []; let missionJson = []; let activiteLog = [];
let editMode = { active: false, type: null, id: null };
let currentUser = null;

const defaultDate = new Date().toLocaleString('fr-FR');
const defaultNinjas = []; const defaultCasiers = []; const defaultBingo = [];
const defaultVillages = []; const defaultClans = []; const defaultMissions = [];
const defaultLog = [{ msg: "[Système] Bases de données Konoha vierges.", date: defaultDate }];

// ==========================================
// INITIALISATION ET GESTION DE CONNEXION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    checkLogin();
    loadFiles();
    setupDragAndDrop();
    setupCustomSelect();
    setInterval(updateClock, 1000); updateClock();
    initDashboard();
    renderAll();
});

function checkLogin() {
    currentUser = sessionStorage.getItem('rpUser');
    if (!currentUser) {
        document.getElementById('login-screen').style.display = 'flex';
    } else {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('agent-name').innerHTML = `<i class="fas fa-user-shield"></i> Agent : ${currentUser}`;
    }
}

function performLogin() {
    const nom = document.getElementById('login-nom').value.trim().toUpperCase();
    const prenom = document.getElementById('login-prenom').value.trim();
    if (nom && prenom) {
        currentUser = `${nom} ${prenom}`;
        sessionStorage.setItem('rpUser', currentUser);
        document.getElementById('login-screen').style.animation = "fadeOut 0.5s forwards";
        setTimeout(() => document.getElementById('login-screen').style.display = 'none', 500);
        document.getElementById('agent-name').innerHTML = `<i class="fas fa-user-shield"></i> Agent : ${currentUser}`;
        addAuditLog("Connexion au Terminal Central approuvée.");
    } else {
        alert("L'identification est obligatoire.");
    }
}

function logout() {
    addAuditLog("Déconnexion du système.");
    sessionStorage.removeItem('rpUser');
    location.reload();
}

function updateClock() {
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('fr-FR') + " | " + now.toLocaleTimeString('fr-FR');
}

// ==========================================
// GESTION FICHIERS LOCAUX
// ==========================================
function loadFiles() {
    ninjaJson = JSON.parse(localStorage.getItem('json_ninjas')) || defaultNinjas;
    casierJson = JSON.parse(localStorage.getItem('json_casiers')) || defaultCasiers;
    bingoJson = JSON.parse(localStorage.getItem('json_bingo')) || defaultBingo;
    villageJson = JSON.parse(localStorage.getItem('json_villages')) || defaultVillages;
    clanJson = JSON.parse(localStorage.getItem('json_clans')) || defaultClans;
    missionJson = JSON.parse(localStorage.getItem('json_missions')) || defaultMissions;
    activiteLog = JSON.parse(localStorage.getItem('json_logs')) || defaultLog;
}

function saveFiles() {
    localStorage.setItem('json_ninjas', JSON.stringify(ninjaJson));
    localStorage.setItem('json_casiers', JSON.stringify(casierJson));
    localStorage.setItem('json_bingo', JSON.stringify(bingoJson));
    localStorage.setItem('json_villages', JSON.stringify(villageJson));
    localStorage.setItem('json_clans', JSON.stringify(clanJson));
    localStorage.setItem('json_missions', JSON.stringify(missionJson));
    localStorage.setItem('json_logs', JSON.stringify(activiteLog));
}

function resetData() {
    if(confirm("ATTENTION : Effacer absolument toutes les archives locales ? Cette action est irréversible.")) {
        localStorage.clear(); location.reload();
    }
}

function syncBase() {
    showToast("Cryptage et synchronisation en cours...", "info");
    setTimeout(() => { showToast("Base de données synchronisée !", "success"); }, 2000);
}

function addAuditLog(message) {
    const agent = currentUser || "Système";
    activiteLog.unshift({ msg: `[${agent}] ${message}`, date: new Date().toLocaleString('fr-FR') });
    if(activiteLog.length > 50) activiteLog.pop();
    saveFiles(); updateDashboardLog();
}

// ==========================================
// CUSTOM SELECT
// ==========================================
function setupCustomSelect() {
    document.addEventListener('click', function(e) {
        const select = document.getElementById('chakra-select');
        if (select && !select.contains(e.target)) document.getElementById('chakra-options').classList.remove('show');
    });
    document.querySelectorAll('#chakra-options input[type="checkbox"]').forEach(cb => cb.addEventListener('change', updateSelectText));
}
function toggleDropdown(id) { document.getElementById(id).classList.toggle('show'); }
function updateSelectText() {
    const checked = document.querySelectorAll('#chakra-options input[type="checkbox"]:checked');
    const box = document.querySelector('#chakra-select .select-box');
    box.innerHTML = checked.length === 0 ? 'Sélectionner les natures... <span>▼</span>' : Array.from(checked).map(cb => cb.value).join(', ') + ' <span>▼</span>';
}

// ==========================================
// NAVIGATION & DASHBOARD
// ==========================================
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
    updateDashboardLog();
}

function updateDashboardLog() {
    document.getElementById('activity-list').innerHTML = activiteLog.slice(0, 6).map(a => `<li><span class="audit-date">[${a.date}]</span> ${a.msg}</li>`).join('');
}

// ==========================================
// DRAG & DROP IMAGES
// ==========================================
function setupDragAndDrop() {
    ['ninja', 'casier', 'bingo', 'village', 'clan'].forEach(type => {
        const zone = document.getElementById(`zone-${type}`);
        if(zone) {
            zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = "var(--police-blue)"; zone.style.background = "#fff"; });
            zone.addEventListener('dragleave', (e) => { e.preventDefault(); zone.style.borderColor = "var(--gold-dark)"; zone.style.background = "rgba(255,255,255,0.5)"; });
            zone.addEventListener('drop', (e) => { e.preventDefault(); zone.style.borderColor = "var(--gold-dark)"; zone.style.background = "rgba(255,255,255,0.5)"; if (e.dataTransfer.files[0]) processImageFile(e.dataTransfer.files[0], type); });
        }
    });
}
function handleFileSelect(event, type) { if (event.target.files[0]) processImageFile(event.target.files[0], type); }

function processImageFile(file, type) {
    if (!file.type.match('image.*')) return showToast("Fichier image invalide.", "error");
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = 400; canvas.height = img.height * (400 / img.width);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            document.getElementById(`preview-${type}`).src = base64; document.getElementById(`preview-${type}`).style.display = 'block';
            document.getElementById(`text-${type}`).style.display = 'none'; document.getElementById(`${type.charAt(0)}-img-base64`).value = base64;
        }; img.src = e.target.result;
    }; reader.readAsDataURL(file);
}

function clearImagePreview(type) {
    if(document.getElementById(`preview-${type}`)) {
        document.getElementById(`preview-${type}`).src = ""; document.getElementById(`preview-${type}`).style.display = 'none';
        document.getElementById(`text-${type}`).style.display = 'block'; document.getElementById(`${type.charAt(0)}-img-base64`).value = "";
    }
}

// ==========================================
// AFFICHAGE DES LISTES (READ)
// ==========================================
function getListByType(type) {
    switch(type) { case 'ninja': return ninjaJson; case 'casier': return casierJson; case 'bingo': return bingoJson; case 'village': return villageJson; case 'clan': return clanJson; case 'mission': return missionJson; default: return []; }
}
function renderAll() { ['ninja', 'casier', 'bingo', 'village', 'clan', 'mission'].forEach(filterData); }

function filterData(type) {
    const searchVal = document.getElementById(`search-${type}`).value.toLowerCase();
    let filterVal = document.getElementById(`filter-grade`) && type==='ninja' ? document.getElementById('filter-grade').value : "";
    let results = getListByType(type);

    if(searchVal) results = results.filter(i => ((i.nom||'') + ' ' + (i.prenom||'') + ' ' + (i.titre||'')).toLowerCase().includes(searchVal) || i.id.toLowerCase().includes(searchVal));
    if(filterVal) results = results.filter(i => i.grade === filterVal);

    const container = document.getElementById(`${type}-grid`) || document.getElementById(`${type}-list`);
    let html = "";

    results.forEach(item => {
        const imgSrc = item.img && item.img.startsWith('data:image') ? item.img : 'policekonoha.png';
        
        if(type === 'ninja') {
            const isDead = item.statut === 'Décédé'; const isMissing = item.statut === 'Déserteur' || item.statut === 'Disparu';
            const stamp = isDead ? `<div class="stamp-overlay stamp-red">DÉCÉDÉ</div>` : (isMissing ? `<div class="stamp-overlay stamp-black">${item.statut.toUpperCase()}</div>` : '');
            html += `<div class="card ${isDead || isMissing ? 'card-dead' : ''}" onclick="openDossier('ninja', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img">${stamp}</div><div class="card-content"><h3>${item.nom} ${item.prenom}</h3><span class="card-badge">${item.grade}</span></div></div>`;
        }
        else if(type === 'casier') { const color = item.gravite === "Sévère" ? "var(--accent-red)" : (item.gravite === "Modérée" ? "#d48b1c" : "#2e7d32"); html += `<div class="list-item" onclick="openDossier('casier', '${item.id}')" style="border-left-color:${color}"><img src="${imgSrc}" class="list-img"><div style="flex:1;"><h3>${item.nom} ${item.prenom}</h3><p style="color:var(--text-muted); margin-top:5px;">${item.faits}</p></div><span class="card-badge" style="background:${color};color:white;border:none">${item.gravite}</span></div>`; }
        else if(type === 'bingo') { html += `<div class="card bingo" onclick="openDossier('bingo', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img"></div><div class="card-content"><h3>${item.nom}</h3><span class="card-badge">Cible Rang ${item.rang}</span><p style="margin-top:10px; font-weight:bold; color:#ffcc00;">Prime: ${item.prime} ¥</p></div></div>`; }
        else if(type === 'village') { html += `<div class="card" onclick="openDossier('village', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img" style="object-fit:contain; padding:20px;"></div><div class="card-content"><h3>${item.nom}</h3><span class="card-badge">${item.chef}</span></div></div>`; }
        else if(type === 'clan') { html += `<div class="card" onclick="openDossier('clan', '${item.id}')"><div class="card-img-container"><img src="${imgSrc}" class="card-img" style="object-fit:contain; padding:20px;"></div><div class="card-content"><h3>Clan ${item.nom}</h3><span class="card-badge">Chef: ${item.chef}</span></div></div>`; }
        else if(type === 'mission') { html += `<div class="list-item" onclick="openDossier('mission', '${item.id}')" style="border-left-color:#8b5a2b"><div style="flex:1;"><h3>[Rang ${item.rang}] ${item.titre}</h3><p style="color:var(--text-muted); margin-top:5px;"><i class="fas fa-users"></i> Assignation : ${item.equipe}</p></div><span class="card-badge">${item.statut}</span></div>`; }
    });
    
    if(results.length === 0) html = `<p style="grid-column: 1/-1; text-align:center; font-style:italic; color:#888; font-size:1.2rem; margin-top:20px;">Aucune archive trouvée.</p>`;
    container.innerHTML = html;
}

// ==========================================
// OUVERTURE DOSSIER
// ==========================================
function openDossier(type, id) {
    const item = getListByType(type).find(i => i.id === id);
    const imgSrc = item.img && item.img.startsWith('data:image') ? item.img : 'policekonoha.png';
    document.getElementById('details-actions').innerHTML = `<button class="btn-edit" onclick="setupEdit('${type}', '${id}')"><i class="fas fa-pen"></i> Modifier</button><button class="btn-delete" onclick="deleteItem('${type}', '${id}')"><i class="fas fa-trash"></i> Supprimer</button>`;

    let html = ``;
    if(type !== 'mission') {
        const isDead = type === 'ninja' && item.statut === 'Décédé'; const isMissing = type === 'ninja' && (item.statut === 'Déserteur' || item.statut === 'Disparu');
        const stamp = isDead ? `<div class="stamp-overlay stamp-red" style="font-size:2.5rem; border-width:6px;">DÉCÉDÉ</div>` : (isMissing ? `<div class="stamp-overlay stamp-black" style="font-size:2.5rem; border-width:6px;">${item.statut.toUpperCase()}</div>` : '');
        html += `<div class="dossier-photo-col"><div class="dossier-photo-frame ${isDead||isMissing ? 'card-dead':''}"><img src="${imgSrc}" class="dossier-photo">${stamp}</div><div class="dossier-id">${item.id}</div>`;
        if(type === 'ninja') html += `<button class="btn-link" onclick="linkToCasier('${item.nom}', '${item.prenom}')"><i class="fas fa-gavel"></i> Consulter le Casier Judiciaire</button>`;
        html += `</div>`;
    }

    html += `<div class="dossier-info-col" style="${type==='mission' ? 'width:100%' : ''}"><div class="dossier-header"><h2 class="dossier-name">${item.nom ? item.nom + ' ' + (item.prenom||'') : item.titre}</h2>${type === 'ninja' ? `<span class="card-badge" style="background:var(--police-blue); color:var(--gold); font-size:1.2rem;">${item.grade}</span>` : ''}</div>`;
    
    if(type === 'ninja') html += `<div class="dossier-block"><h4><i class="fas fa-id-badge"></i> Identité Shinobi</h4><div class="data-grid"><p><strong>Statut Actuel:</strong> <span style="color:${item.statut==='En Vie'?'green':'red'}; font-weight:bold;">${item.statut}</span></p><p><strong>Âge:</strong> ${item.age} ans</p><p><strong>Clan:</strong> ${item.clan}</p><p><strong>Chakra:</strong> ${(item.natures && item.natures.length>0)?item.natures.join(' • '):"Inconnu"}</p></div></div><div class="dossier-block"><h4><i class="fas fa-crosshairs"></i> Évaluation Combative</h4><p><strong><span style="color:#2e7d32;">[+]</span> Atouts Tactiques :</strong> ${item.fort}</p><p style="margin-top:10px;"><strong><span style="color:#c62828;">[-]</span> Failles Identifiées :</strong> ${item.faible}</p></div><div class="dossier-block"><h4><i class="fas fa-clipboard-list"></i> Rapport du Commandement</h4><p>${item.notes}</p></div>`;
    if(type === 'casier') html += `<div class="dossier-block"><h4><i class="fas fa-balance-scale"></i> Statut Criminel</h4><p><strong>Faits Reprochés :</strong> ${item.faits}</p><p style="margin-top:10px;"><strong>Niveau de Menace :</strong> <span style="color:${item.gravite==='Sévère'?'red':(item.gravite==='Modérée'?'orange':'green')}; font-weight:bold;">${item.gravite}</span></p></div><div class="dossier-block"><h4><i class="fas fa-gavel"></i> Jugement Rendu</h4><p>${item.sanctions}</p></div><div class="dossier-block"><h4><i class="fas fa-clipboard"></i> Notes & Commentaires</h4><p>${item.notes}</p></div>`;
    if(type === 'bingo') html += `<div class="dossier-block" style="border-color:red; background:#2b1111;"><h4><i class="fas fa-skull-crossbones"></i> Ordre d'Élimination</h4><p><strong>Niveau de Menace :</strong> Classe ${item.rang}</p><p style="margin-top:10px; font-size:1.8rem; color:#ffcc00; font-family:'Cinzel'; text-align:center; padding:10px; border:1px dashed #ffcc00;">PRIME : ${item.prime} Ryōs</p></div><div class="dossier-block"><h4><i class="fas fa-exclamation-triangle"></i> Renseignements & Directives</h4><p>${item.notes}</p></div>`;
    if(type === 'village') html += `<div class="dossier-block"><h4><i class="fas fa-landmark"></i> Gouvernance</h4><p><strong>Dirigeant Actuel :</strong> ${item.chef}</p></div><div class="dossier-block"><h4><i class="fas fa-book"></i> Rapport Géopolitique</h4><p>${item.notes}</p></div>`;
    if(type === 'clan') html += `<div class="dossier-block"><h4><i class="fas fa-sitemap"></i> Hérédité</h4><p><strong>Patriarche/Matriarche :</strong> ${item.chef}</p><p style="margin-top:10px;"><strong>Kekkei Genkai :</strong> ${item.heredite}</p></div><div class="dossier-block"><h4><i class="fas fa-scroll"></i> Histoire de la Lignée</h4><p>${item.histoire}</p></div><div class="dossier-block"><h4>Notes Confidentielles</h4><p>${item.notes}</p></div>`;
    if(type === 'mission') html += `<div class="dossier-id" style="width:auto; display:inline-block; margin-bottom:20px;">Dossier N° ${item.id}</div><div class="dossier-block"><h4><i class="fas fa-sliders-h"></i> Paramètres de l'Opération</h4><div class="data-grid"><p><strong>Difficulté :</strong> Rang ${item.rang}</p><p><strong>Statut Actuel :</strong> ${item.statut}</p><p><strong>Escouade Assignée :</strong> ${item.equipe}</p></div></div><div class="dossier-block"><h4><i class="fas fa-bullseye"></i> Objectifs & Déroulement</h4><p>${item.desc}</p></div>`;

    document.getElementById('details-content').innerHTML = html + "</div>";
    document.getElementById('audit-log-display').innerHTML = `<i class="fas fa-lock"></i> <strong>Traçabilité Sécurisée :</strong> Document scellé le ${item.dateCreation} | Dernière modification enregistrée le ${item.dateModification}`;
    type === 'bingo' ? document.getElementById('details-container').classList.add('bingo-theme') : document.getElementById('details-container').classList.remove('bingo-theme');
    document.getElementById('modal-details').style.display = 'block';
}

function linkToCasier(nom, prenom) {
    document.getElementById('modal-details').style.display = 'none';
    switchTab('casiers'); document.getElementById('search-casier').value = (nom + " " + prenom).trim(); filterData('casier');
}

// ==========================================
// SUPPRESSION & EDITION
// ==========================================
function deleteItem(type, id) {
    if(!confirm("⚠️ AUTORISATION REQUISE : Êtes-vous sûr de vouloir purger définitivement cette archive ?")) return;
    const list = getListByType(type); const index = list.findIndex(i => i.id === id);
    if(index > -1) { list.splice(index, 1); addAuditLog(`Purge : L'archive [${id}] a été détruite.`); renderAll(); initDashboard(); closeModal('modal-details'); showToast("Archive purgée.", "success"); }
}

function setupEdit(type, id) {
    closeModal('modal-details');
    const item = getListByType(type).find(i => i.id === id);
    editMode = { active: true, type: type, id: id };
    document.getElementById(`title-${type}`).textContent = `Modification de l'Archive [${id}]`;

    if(type === 'ninja') { vSet('n-nom', item.nom); vSet('n-prenom', item.prenom); vSet('n-age', item.age); vSet('n-grade', item.grade); vSet('n-clan', item.clan); vSet('n-statut', item.statut || "En Vie"); vSet('n-fort', item.fort); vSet('n-faible', item.faible); vSet('n-notes', item.notes); document.querySelectorAll('#chakra-options input[type="checkbox"]').forEach(cb => cb.checked = (item.natures && item.natures.includes(cb.value))); updateSelectText(); }
    else if(type === 'casier') { vSet('c-nom', item.nom); vSet('c-prenom', item.prenom); vSet('c-faits', item.faits); vSet('c-gravite', item.gravite); vSet('c-sanctions', item.sanctions); vSet('c-notes', item.notes); }
    else if(type === 'bingo') { vSet('b-nom', item.nom); vSet('b-rang', item.rang); vSet('b-prime', item.prime); vSet('b-notes', item.notes); }
    else if(type === 'village') { vSet('v-nom', item.nom); vSet('v-chef', item.chef); vSet('v-notes', item.notes); }
    else if(type === 'clan') { vSet('cl-nom', item.nom); vSet('cl-chef', item.chef); vSet('cl-heredite', item.heredite); vSet('cl-histoire', item.histoire); vSet('cl-notes', item.notes); }
    else if(type === 'mission') { vSet('m-titre', item.titre); vSet('m-rang', item.rang); vSet('m-equipe', item.equipe); vSet('m-statut', item.statut); vSet('m-desc', item.desc); }

    if(type !== 'mission' && item.img) { document.getElementById(`preview-${type}`).src = item.img; document.getElementById(`preview-${type}`).style.display = 'block'; document.getElementById(`text-${type}`).style.display = 'none'; document.getElementById(`${type.charAt(0)}-img-base64`).value = item.img; }
    openModal(`modal-${type}`);
}
function vSet(id, value) { if(document.getElementById(id)) document.getElementById(id).value = value; }

// ==========================================
// SOUMISSION FORMULAIRES
// ==========================================
function openModal(id) { 
    const type = id.replace('modal-', '');
    if(!editMode.active) { 
        document.getElementById(`form-${type}`).reset(); clearImagePreview(type); 
        if(type === 'ninja') { document.querySelectorAll('#chakra-options input[type="checkbox"]').forEach(cb => cb.checked = false); updateSelectText(); }
        const titles = { ninja: 'Immatriculation Shinobi', casier: 'Inculpation Criminelle', bingo: 'Avis de Recherche', village: 'Fiche Diplomatique', clan: 'Registre Généalogique', mission: 'Ordre de Mission Tactique' };
        document.getElementById(`title-${type}`).textContent = titles[type]; 
    }
    document.getElementById(id).style.display = 'block'; 
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; editMode = { active: false, type: null, id: null }; }

function submitForm(e, type) {
    e.preventDefault();
    const v = (id) => document.getElementById(id) ? document.getElementById(id).value : "";
    const prefix = {ninja:'NJ', casier:'CJ', bingo:'BB', village:'VL', clan:'CL', mission:'MI'}[type];
    const itemId = editMode.active ? editMode.id : prefix + "-" + Math.floor(Math.random() * 9000 + 1000);
    const imgBase64 = type !== 'mission' ? document.getElementById(`${type.charAt(0)}-img-base64`).value : "";
    const currentDate = new Date().toLocaleString('fr-FR');
    let newItem = { id: itemId, dateModification: currentDate };

    if(type === 'ninja') { newItem = { ...newItem, nom: v('n-nom'), prenom: v('n-prenom'), age: v('n-age'), grade: v('n-grade'), clan: v('n-clan'), statut: v('n-statut'), natures: Array.from(document.querySelectorAll('#chakra-options input:checked')).map(cb => cb.value), fort: v('n-fort'), faible: v('n-faible'), notes: v('n-notes'), img: imgBase64 }; }
    else if(type === 'casier') { newItem = { ...newItem, nom: v('c-nom'), prenom: v('c-prenom'), faits: v('c-faits'), gravite: v('c-gravite'), sanctions: v('c-sanctions'), notes: v('c-notes'), img: imgBase64 }; }
    else if(type === 'bingo') { newItem = { ...newItem, nom: v('b-nom'), rang: v('b-rang'), prime: v('b-prime'), notes: v('b-notes'), img: imgBase64 }; }
    else if(type === 'village') { newItem = { ...newItem, nom: v('v-nom'), chef: v('v-chef'), notes: v('v-notes'), img: imgBase64 }; }
    else if(type === 'clan') { newItem = { ...newItem, nom: v('cl-nom'), chef: v('cl-chef'), heredite: v('cl-heredite'), histoire: v('cl-histoire'), notes: v('cl-notes'), img: imgBase64 }; }
    else if(type === 'mission') { newItem = { ...newItem, titre: v('m-titre'), rang: v('m-rang'), equipe: v('m-equipe'), statut: v('m-statut'), desc: v('m-desc') }; }

    const list = getListByType(type);
    if(editMode.active) {
        const index = list.findIndex(i => i.id === itemId); newItem.dateCreation = list[index].dateCreation; list[index] = newItem;
        addAuditLog(`Édition : L'archive [${itemId}] a été mise à jour.`); showToast("Archive scellée.", "success");
    } else {
        newItem.dateCreation = currentDate; list.unshift(newItem);
        addAuditLog(`Création : Nouveau dossier [${itemId}] enregistré.`); showToast("Dossier validé.", "success");
    }
    saveFiles(); closeModal(`modal-${type}`); initDashboard(); renderAll();
}

function showToast(msg, type="info") {
    const c = document.getElementById('toast-container'); const t = document.createElement('div'); t.className = `toast ${type==='error'?'error':''}`;
    t.innerHTML = `${type==='success'?'<i class="fas fa-check-circle"></i>':'<i class="fas fa-info-circle"></i>'} <span>${msg}</span>`;
    c.appendChild(t); setTimeout(() => { t.style.animation = 'fadeOut 0.4s forwards'; setTimeout(() => t.remove(), 400); }, 3500);
}
