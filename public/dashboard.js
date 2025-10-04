// Dashboard JavaScript functionality
let consultations = [];
let currentConsultationId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    // Navigation handling
    setupNavigation();
    
    // Form handling
    setupForms();
    
    // Load initial data
    loadConsultations();
    loadStatistics();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date_consultation').value = today;
}

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Show corresponding section
            const targetSection = this.getAttribute('data-section');
            const section = document.getElementById(targetSection);
            if (section) {
                section.classList.add('active');
            }
            
            // Load data for specific sections
            if (targetSection === 'consultations') {
                loadConsultations();
            } else if (targetSection === 'statistiques') {
                loadStatistics();
            }
        });
    });
    
    // Logout functionality
    document.getElementById('logoutBtn').addEventListener('click', async function() {
        try {
            const response = await fetch('/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            if (response.ok) {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
        }
    });
    
    // Refresh consultations button
    document.getElementById('refreshConsultations').addEventListener('click', function() {
        loadConsultations();
    });
}

function setupForms() {
    // New consultation form
    document.getElementById('consultationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveConsultation();
    });
    
    // Reset form button
    document.getElementById('resetForm').addEventListener('click', function() {
        document.getElementById('consultationForm').reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date_consultation').value = today;
    });
    
    // Edit form
    document.getElementById('editForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await updateConsultation();
    });
}

async function loadConsultations() {
    try {
        const response = await fetch('/api/consultations');
        if (response.ok) {
            consultations = await response.json();
            displayConsultations();
        } else {
            console.error('Erreur lors du chargement des consultations');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des consultations:', error);
    }
}

function displayConsultations() {
    const container = document.getElementById('consultationsList');
    
    if (consultations.length === 0) {
        container.innerHTML = `
            <div class="no-consultations">
                <i class="fas fa-clipboard-list" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>Aucune consultation enregistrée</h3>
                <p>Commencez par ajouter une nouvelle consultation.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = consultations.map(consultation => `
        <div class="consultation-item">
            <div class="consultation-header">
                <div class="consultation-title">
                    ${consultation.prenom_patient} ${consultation.nom_patient}
                </div>
                <div class="consultation-date">
                    ${formatDate(consultation.date_consultation)}
                </div>
            </div>
            
            <div class="consultation-info">
                <div class="info-item">
                    <span class="info-label">Âge</span>
                    <span class="info-value">${consultation.age} ans</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Motif</span>
                    <span class="info-value">${consultation.motif_consultation}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Examen clinique</span>
                    <span class="info-value">${consultation.examen_clinique || 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Examens complémentaires</span>
                    <span class="info-value">${consultation.examens_complementaires || 'Non renseigné'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Traitement</span>
                    <span class="info-value">${consultation.traitement || 'Non renseigné'}</span>
                </div>
            </div>
            
            <div class="consultation-actions">
                <button class="btn-edit" onclick="editConsultation(${consultation.id})">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button class="btn-delete" onclick="deleteConsultation(${consultation.id})">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

async function saveConsultation() {
    const form = document.getElementById('consultationForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/consultations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Reset form
                form.reset();
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('date_consultation').value = today;
                
                // Reload consultations
                loadConsultations();
                loadStatistics();
                
                // Show success message
                showMessage('Consultation enregistrée avec succès!', 'success');
            }
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur de connexion au serveur', 'error');
    }
}

async function editConsultation(id) {
    const consultation = consultations.find(c => c.id === id);
    if (!consultation) return;
    
    currentConsultationId = id;
    
    // Fill edit form
    document.getElementById('edit_id').value = consultation.id;
    document.getElementById('edit_date_consultation').value = consultation.date_consultation;
    document.getElementById('edit_nom_patient').value = consultation.nom_patient;
    document.getElementById('edit_prenom_patient').value = consultation.prenom_patient;
    document.getElementById('edit_age').value = consultation.age;
    document.getElementById('edit_motif_consultation').value = consultation.motif_consultation;
    document.getElementById('edit_examen_clinique').value = consultation.examen_clinique || '';
    document.getElementById('edit_examens_complementaires').value = consultation.examens_complementaires || '';
    document.getElementById('edit_traitement').value = consultation.traitement || '';
    
    // Show modal
    document.getElementById('editModal').style.display = 'block';
}

async function updateConsultation() {
    const form = document.getElementById('editForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch(`/api/consultations/${currentConsultationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                closeModal();
                loadConsultations();
                loadStatistics();
                showMessage('Consultation mise à jour avec succès!', 'success');
            }
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de la mise à jour', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour:', error);
        showMessage('Erreur de connexion au serveur', 'error');
    }
}

async function deleteConsultation(id) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette consultation ?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/consultations/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                loadConsultations();
                loadStatistics();
                showMessage('Consultation supprimée avec succès!', 'success');
            }
        } else {
            const error = await response.json();
            showMessage(error.error || 'Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        showMessage('Erreur de connexion au serveur', 'error');
    }
}

async function loadStatistics() {
    try {
        const response = await fetch('/api/consultations');
        if (response.ok) {
            const data = await response.json();
            updateStatistics(data);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

function updateStatistics(data) {
    const totalConsultations = data.length;
    const today = new Date().toISOString().split('T')[0];
    const consultationsToday = data.filter(c => c.date_consultation === today).length;
    
    let totalAge = 0;
    let validAges = 0;
    
    data.forEach(consultation => {
        if (consultation.age && consultation.age > 0) {
            totalAge += consultation.age;
            validAges++;
        }
    });
    
    const ageMoyen = validAges > 0 ? Math.round(totalAge / validAges) : 0;
    
    document.getElementById('totalConsultations').textContent = totalConsultations;
    document.getElementById('consultationsAujourdhui').textContent = consultationsToday;
    document.getElementById('ageMoyen').textContent = ageMoyen;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    currentConsultationId = null;
}

function showMessage(message, type) {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: #28a745;' : 'background: #dc3545;'}
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
        style.remove();
    }, 3000);
}

// Modal close functionality
document.addEventListener('click', function(e) {
    const modal = document.getElementById('editModal');
    const closeBtn = document.querySelector('.close');
    
    if (e.target === modal) {
        closeModal();
    }
    
    if (e.target === closeBtn) {
        closeModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});
