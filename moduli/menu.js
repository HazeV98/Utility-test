// menu.js

export function caricaMenu() {
    const menuHTML = `
        <div id="sidebar-overlay" class="sidebar-overlay" onclick="chiudiMenuLaterale()"></div>
        <div id="sidebar" class="sidebar">
            <div class="sidebar-header">
                <h3><i class="fa-solid fa-layer-group"></i> Menu</h3>
                <button style="background:none; border:none; color:white; font-size:24px; cursor:pointer; padding:0; line-height:1; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" onclick="chiudiMenuLaterale()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <a href="index.html" class="sidebar-link"><i class="fa-solid fa-house"></i> Home Page</a>
            <a href="calendario.html?oggi=true" class="sidebar-link"><i class="fa-solid fa-bullseye"></i> Oggi</a>
            <a href="calendario.html" class="sidebar-link"><i class="fa-solid fa-calendar-days"></i> Calendario</a>
            <a href="dati_calendario.html" class="sidebar-link"><i class="fa-solid fa-chart-simple"></i> Statistiche</a>
            <a href="rotazioni.html" class="sidebar-link"><i class="fa-solid fa-users"></i> Rotazioni</a>
            <a href="turni.html" class="sidebar-link"><i class="fa-solid fa-rotate"></i> Turni</a>
            <a href="bacheca_turni.html" class="sidebar-link"><i class="fa-solid fa-handshake-angle"></i> Bacheca Turni</a>
            <a href="barcadvisor.html" class="sidebar-link"><i class="fa-solid fa-ship"></i> BarcAdvisor</a>
            <a href="rubrica.html" class="sidebar-link"><i class="fa-solid fa-address-book"></i> Rubrica Colleghi</a>
            <a href="rotazione_ferie.html" class="sidebar-link"><i class="fa-solid fa-umbrella-beach"></i> Rotazione Ferie</a>
            <a href="orari.html" class="sidebar-link"><i class="fa-regular fa-clock"></i> Orari Navigazione</a>
            <a href="https://m.chebateo.it/" class="sidebar-link" target="_blank"><i class="fa-solid fa-water"></i> CheBateo</a>
            <a href="documenti.html" class="sidebar-link"><i class="fa-solid fa-file-lines"></i> Documenti</a>
            <a href="link.html" class="sidebar-link"><i class="fa-solid fa-link"></i> Link Utili</a>
            <a href="contatti.html" class="sidebar-link"><i class="fa-solid fa-id-card"></i> Contatti</a>
            <a href="buoni.html" class="sidebar-link"><i class="fa-solid fa-utensils"></i> Buoni Pasto</a>
            <a href="promemoria.html" class="sidebar-link"><i class="fa-solid fa-stopwatch"></i> Promemoria</a>
            <a href="dds.html" class="sidebar-link"><i class="fa-solid fa-box-archive"></i> Archivio DDS</a>
            <a href="https://spriss.avmspa.it/" class="sidebar-link" target="_blank"><i class="fa-solid fa-glass-water-droplet"></i> Spriss</a>
            <a href="report.html" class="sidebar-link"><i class="fa-solid fa-headset"></i> Segnalazioni</a>
            <a href="guida.html" class="sidebar-link"><i class="fa-solid fa-book"></i> Guida</a>
            
            <a href="admin.html" class="sidebar-link" id="menu-admin" style="display:none; color: var(--danger); font-weight: bold;"><i class="fa-solid fa-lock" style="color: var(--danger);"></i> Admin</a>
        </div>
    `;

    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = menuHTML;
        evidenziaLinkAttivo();
    }
}

// Spostiamo qui le funzioni di apertura/chiusura per alleggerire le pagine
window.apriMenuLaterale = () => { 
    document.getElementById('sidebar').classList.add('open'); 
    document.getElementById('sidebar-overlay').style.display = 'block'; 
};

window.chiudiMenuLaterale = () => { 
    document.getElementById('sidebar').classList.remove('open'); 
    document.getElementById('sidebar-overlay').style.display = 'none'; 
};

// Funzione automatica che riproduce il tuo esatto stile per il link della pagina corrente
function evidenziaLinkAttivo() {
    // Ottiene il nome del file attuale (es. "report.html")
    let currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // Rimuove eventuali parametri URL (es. "?oggi=true") per fare il confronto
    currentPath = currentPath.split('?')[0]; 

    const links = document.querySelectorAll('.sidebar-link');
    
    links.forEach(link => {
        let href = link.getAttribute('href').split('?')[0];
        
        if (href === currentPath) {
            link.style.backgroundColor = 'var(--primary-glow)';
            link.style.color = 'var(--info)';
            link.style.fontWeight = '700';
            link.style.borderLeft = '4px solid var(--info)';
            
            const icon = link.querySelector('i');
            if (icon) {
                icon.style.color = 'var(--info)';
            }
        }
    });
}
