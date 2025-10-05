const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'cabinet-pediatrie-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Database setup
const db = new sqlite3.Database('consultations.db');

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Consultations table
    db.run(`CREATE TABLE IF NOT EXISTS consultations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date_consultation DATE NOT NULL,
        nom_patient TEXT NOT NULL,
        prenom_patient TEXT NOT NULL,
        age INTEGER NOT NULL,
        motif_consultation TEXT NOT NULL,
        examen_clinique TEXT,
        examens_complementaires TEXT,
        traitement TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default doctor user
    const hashedPassword = bcrypt.hashSync('doctor', 10);
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['doctor', hashedPassword]);
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        
        if (!user || !bcrypt.compareSync(password, user.password)) {
            return res.status(401).json({ error: 'Nom d\'utilisateur ou mot de passe incorrect' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({ success: true, redirect: '/dashboard' });
    });
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/consultations', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }
    
    db.all('SELECT * FROM consultations ORDER BY date_consultation DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        res.json(rows);
    });
});

app.post('/api/consultations', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const { date_consultation, nom_patient, prenom_patient, age, motif_consultation, examen_clinique, examens_complementaires, traitement } = req.body;
    
    db.run(`INSERT INTO consultations (date_consultation, nom_patient, prenom_patient, age, motif_consultation, examen_clinique, examens_complementaires, traitement) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [date_consultation, nom_patient, prenom_patient, age, motif_consultation, examen_clinique, examens_complementaires, traitement],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de l\'ajout de la consultation' });
            }
            res.json({ id: this.lastID, success: true });
        });
});

app.put('/api/consultations/:id', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const { id } = req.params;
    const { date_consultation, nom_patient, prenom_patient, age, motif_consultation, examen_clinique, examens_complementaires, traitement } = req.body;
    
    db.run(`UPDATE consultations SET 
            date_consultation = ?, nom_patient = ?, prenom_patient = ?, age = ?, 
            motif_consultation = ?, examen_clinique = ?, examens_complementaires = ?, traitement = ?
            WHERE id = ?`,
        [date_consultation, nom_patient, prenom_patient, age, motif_consultation, examen_clinique, examens_complementaires, traitement, id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erreur lors de la mise à jour' });
            }
            res.json({ success: true });
        });
});

app.delete('/api/consultations/:id', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Non autorisé' });
    }
    
    const { id } = req.params;
    
    db.run('DELETE FROM consultations WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erreur lors de la suppression' });
        }
        res.json({ success: true });
    });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Télécharger l'application desktop
app.get('/telecharger', (req, res) => {
    const filePath = path.join(__dirname, 'CabinetPediatre.exe');
    res.download(filePath, 'CabinetPediatre.exe', (err) => {
        if (err) {
            return res.status(404).send('Fichier introuvable');
        }
    });
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
