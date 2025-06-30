// DOM Elements
const urlInput = document.getElementById('urlInput');
const addButton = document.getElementById('addButton');
const errorMessage = document.getElementById('errorMessage');
const websitesList = document.getElementById('websitesList');
const refreshIndicator = document.getElementById('refreshIndicator');

// API Base URL
const API_BASE = '/api/websites';

// State
let websites = [];
let isLoading = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load websites on page load
    loadWebsites();
    
    // Set up event listeners
    addButton.addEventListener('click', handleAddWebsite);
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleAddWebsite();
        }
    });
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadWebsites(true);
    }, 30000);
});

// Load all websites from the server
async function loadWebsites(isAutoRefresh = false) {
    try {
        if (!isAutoRefresh) {
            showLoading();
        } else {
            refreshIndicator.classList.remove('hidden');
        }
        
        const response = await fetch(API_BASE);
        if (!response.ok) throw new Error('Failed to fetch websites');
        
        websites = await response.json();
        renderWebsites();
        
    } catch (error) {
        console.error('Error loading websites:', error);
        showError('Failed to load websites. Please refresh the page.');
    } finally {
        if (!isAutoRefresh) {
            hideLoading();
        } else {
            setTimeout(() => {
                refreshIndicator.classList.add('hidden');
            }, 1000);
        }
    }
}

// Add a new website
async function handleAddWebsite() {
    const url = urlInput.value.trim();
    
    // Clear previous errors
    clearError();
    
    // Validate input
    if (!url) {
        showError('Please enter a URL');
        return;
    }
    
    // Basic URL validation
    try {
        new URL(url);
    } catch {
        showError('Please enter a valid URL (e.g., https://example.com)');
        return;
    }
    
    // Disable button during request
    addButton.disabled = true;
    addButton.textContent = 'Adding...';
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to add website');
        }
        
        // Clear input and reload websites
        urlInput.value = '';
        await loadWebsites();
        
    } catch (error) {
        console.error('Error adding website:', error);
        showError(error.message || 'Failed to add website. Please try again.');
    } finally {
        addButton.disabled = false;
        addButton.textContent = 'Add Website';
    }
}

// Remove a website
async function removeWebsite(id) {
    if (!confirm('Are you sure you want to remove this website from monitoring?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to remove website');
        
        // Remove from local state and re-render
        websites = websites.filter(w => w.id !== id);
        renderWebsites();
        
    } catch (error) {
        console.error('Error removing website:', error);
        showError('Failed to remove website. Please try again.');
    }
}

// Render the websites list
function renderWebsites() {
    if (websites.length === 0) {
        websitesList.innerHTML = `
            <div class="empty-state">
                <p>No websites added yet. Add your first website above to start monitoring!</p>
            </div>
        `;
        return;
    }
    
    websitesList.innerHTML = websites.map(website => {
        const statusClass = website.status.toLowerCase().replace('...', '');
        const lastCheckedText = website.lastChecked 
            ? `Last checked: ${formatDate(website.lastChecked)}`
            : 'Not checked yet';
        
        return `
            <div class="website-item">
                <div class="website-info">
                    <div class="website-url">${escapeHtml(website.url)}</div>
                    <div class="website-meta">
                        <span>${lastCheckedText}</span>
                        <span>Added: ${formatDate(website.addedAt)}</span>
                    </div>
                </div>
                <span class="status-badge ${statusClass}">
                    <span class="status-indicator ${statusClass}"></span>
                    ${website.status}
                </span>
                <button class="btn btn-danger" onclick="removeWebsite('${website.id}')">
                    Remove
                </button>
            </div>
        `;
    }).join('');
}

// Utility Functions

// Format date for display
function formatDate(dateString) {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    
    return date.toLocaleString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
}

// Clear error message
function clearError() {
    errorMessage.textContent = '';
}

// Show loading state
function showLoading() {
    websitesList.classList.add('loading');
}

// Hide loading state
function hideLoading() {
    websitesList.classList.remove('loading');
}