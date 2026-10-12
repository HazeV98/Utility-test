import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    sendPasswordResetEmail, 
    signInWithPopup, 
    signOut 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export function avviaMotoreAuth(auth, db, provider) {
    let currentAuthMode = 'login';

    window.switchAuthMode = () => { 
        currentAuthMode = currentAuthMode === 'login' ? 'register' : 'login'; 
        window.aggiornaUIAuth(); 
    };
    
    window.aggiornaUIAuth = () => {
        const isLogin = currentAuthMode === 'login';
        document.getElementById('authModalTitle').innerHTML = isLogin ? "<i class='fa-solid fa-cloud'></i> Accedi" : "<i class='fa-solid fa-user-plus'></i> Registrati";
        document.getElementById('btnEseguiAuth').innerHTML = isLogin ? "<i class='fa-solid fa-right-to-bracket'></i> Accedi" : "<i class='fa-solid fa-user-plus'></i> Registrati";
        document.getElementById('registerFields').style.display = isLogin ? "none" : "block";
        document.getElementById('authSwitchLink').innerText = isLogin ? "Non hai un account? Registrati qui" : "Hai già un account? Accedi qui";
        document.getElementById('forgotPasswordLink').style.display = isLogin ? "block" : "none";
    };

    window.eseguiAuth = async () => {
        const email = document.getElementById('emailInput').value.trim(); 
        const pwd = document.getElementById('passwordInput').value;
        const err = document.getElementById('authError'); 
        err.style.display = 'none';
        
        if (!email || !pwd) { 
            err.innerHTML = "<i class='fa-solid fa-circle-exclamation'></i> Dati mancanti."; 
            err.style.display = 'block'; 
            return; 
        }
        
        if (currentAuthMode === 'login') { 
            try { 
                await signInWithEmailAndPassword(auth, email, pwd); 
                window.chiudiModal('authModal'); 
            } catch (e) { 
                err.innerHTML = "<i class='fa-solid fa-circle-exclamation'></i> Email o Password errata."; 
                err.style.display = 'block'; 
            } 
        } else {
            const nome = document.getElementById('regNome').value.trim(); 
            const cognome = document.getElementById('regCognome').value.trim(); 
            const matricola = document.getElementById('regMatricola').value.trim();
            
            if (!nome || !cognome || !matricola) { 
                err.innerHTML = "<i class='fa-solid fa-circle-exclamation'></i> Campi obbligatori mancanti."; 
                err.style.display = 'block'; 
                return; 
            }
            
            if (!/^\d{4}$/.test(matricola)) { 
                err.innerHTML = "<i class='fa-solid fa-circle-exclamation'></i> La matricola deve essere composta da 4 cifre."; 
                err.style.display = 'block'; 
                return; 
            }
            
            const profilo = { 
                nome, 
                cognome, 
                matricola, 
                progressivo: document.getElementById('regProg').value.trim(), 
                email: email 
            };
            
            // Finché il profilo non è scritto, index.js non deve considerarlo incompleto
            window.profiloInRegistrazione = profilo;
            
            let res;
            try { 
                res = await createUserWithEmailAndPassword(auth, email, pwd); 
            } catch (e) { 
                window.profiloInRegistrazione = null;
                err.innerHTML = "<i class='fa-solid fa-circle-exclamation'></i> " + (
                    e.code === 'auth/email-already-in-use' ? "Email già registrata." :
                    e.code === 'auth/weak-password' ? "Password troppo debole (minimo 6 caratteri)." :
                    e.code === 'auth/invalid-email' ? "Indirizzo email non valido." :
                    "Errore durante la registrazione.");
                err.style.display = 'block'; 
                return;
            }
            
            try { 
                await setDoc(doc(db, "utenti", res.user.uid), profilo, { merge: true }); 
                window.currentUserData = { ...window.currentUserData, ...profilo };
                try { localStorage.setItem(`userDataCache_haze_${res.user.uid}`, JSON.stringify(window.currentUserData)); } catch (e2) {}
                window.profiloInRegistrazione = null;
            } catch (e) { 
                // Account creato ma profilo non salvato: si chiedono subito i dati (già precompilati)
                window.profiloInRegistrazione = null;
                window.chiudiModal('authModal');
                if (window.apriDatiObbligatori) window.apriDatiObbligatori(profilo);
                return;
            }
            window.chiudiModal('authModal');
        }
    };

    window.recuperaPassword = async () => {
        const email = document.getElementById('emailInput').value.trim();
        if (!email) { alert("Inserisci il tuo indirizzo email nel campo sopra per ricevere il link di ripristino."); return; }
        try { 
            await sendPasswordResetEmail(auth, email); 
            alert("Email di ripristino inviata! Controlla la tua casella di posta (anche nella cartella Spam)."); 
        } catch (error) { 
            alert("Si è verificato un errore. Verifica che l'indirizzo email sia corretto."); 
        }
    };

    window.loginGoogle = async () => { 
        try { await signInWithPopup(auth, provider); } catch(e) {} 
    };
    
    window.logout = () => signOut(auth);

    window.salvaDatiObbligatori = async () => {
        const n = document.getElementById('obbl-nome').value.trim(); 
        const c = document.getElementById('obbl-cognome').value.trim(); 
        const m = document.getElementById('obbl-matricola').value.trim();
        
        if (!n || !c || !m) { alert("Mancano dati obbligatori!"); return; }
        if (!/^\d{4}$/.test(m)) { alert("La matricola deve essere composta da 4 cifre."); return; }
        
        try {
            await setDoc(doc(db, "utenti", auth.currentUser.uid), { 
                nome: n, 
                cognome: c, 
                matricola: m, 
                progressivo: document.getElementById('obbl-prog').value.trim() 
            }, { merge: true }); 
        } catch (e) {
            alert("Impossibile salvare i dati. Controlla la connessione e riprova.");
            return;
        }
        
        location.reload(); 
    };

    window.salvaProfilo = async () => {
        const p = { 
            nome: document.getElementById('profileNome').value.trim(), 
            cognome: document.getElementById('profileCognome').value.trim(), 
            progressivo: document.getElementById('profileProgressivo').value.trim(), 
            matricola: document.getElementById('profileMatricola').value.trim(), 
            mansione: document.getElementById('profileMansione').value,
            soprannome: document.getElementById('profileSoprannome').value.trim(),
            telefono: document.getElementById('profileTelefono').value.trim()
        };
        
        if (!p.nome || !p.cognome || !p.matricola) { 
            alert("Errore: Impossibile salvare. Nome, Cognome e Matricola non possono essere vuoti."); 
            return; 
        }
        if (!/^\d{4}$/.test(p.matricola)) { alert("La matricola deve essere composta da 4 cifre."); return; }
        
        try {
            await setDoc(doc(db, "utenti", auth.currentUser.uid), p, { merge: true }); 
        } catch (e) {
            alert("Impossibile salvare. Controlla la connessione e riprova.");
            return;
        }
        
        // Aggiorna subito i dati in sessione e la cache locale
        window.currentUserData = { ...window.currentUserData, ...p };
        try { localStorage.setItem(`userDataCache_haze_${auth.currentUser.uid}`, JSON.stringify(window.currentUserData)); } catch (e) {}
        
        alert("Salvato con successo!"); 
        window.chiudiModal('profileModal');
    };
}
