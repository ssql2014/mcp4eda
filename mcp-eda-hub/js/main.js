// Main JavaScript for MCP-EDA Hub
(function() {
    // State
    let filteredServers = [];
    let selectedCategories = new Set();
    let searchQuery = '';
    let sortBy = 'name';

    // DOM Elements
    const searchInput = document.getElementById('searchInput');
    const categoriesContainer = document.getElementById('categoriesContainer');
    const serversGrid = document.getElementById('serversGrid');
    const noResults = document.getElementById('noResults');
    const serverModal = document.getElementById('serverModal');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const clearFilters = document.getElementById('clearFilters');
    const sortSelect = document.getElementById('sortSelect');
    const serverCount = document.getElementById('serverCount');
    const categoryCount = document.getElementById('categoryCount');
    const contributorCount = document.getElementById('contributorCount');

    // Initialize
    function init() {
        // Set initial data
        filteredServers = [...window.mcpServersData.servers];
        
        // Update stats
        updateStats();
        
        // Render categories
        renderCategories();
        
        // Render servers
        renderServers();
        
        // Setup event listeners
        setupEventListeners();
    }

    // Update statistics
    function updateStats() {
        serverCount.textContent = window.mcpServersData.servers.length;
        categoryCount.textContent = window.mcpServersData.categories.length;
        
        // Count unique contributors
        const contributors = new Set(window.mcpServersData.servers.map(s => s.author));
        contributorCount.textContent = contributors.size;
    }

    // Render categories
    function renderCategories() {
        categoriesContainer.innerHTML = window.mcpServersData.categories
            .map(category => `
                <button class="category-tag" data-category="${category.id}">
                    ${category.name} (${category.count})
                </button>
            `)
            .join('');
    }

    // Render servers
    function renderServers() {
        if (filteredServers.length === 0) {
            serversGrid.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }

        serversGrid.style.display = 'grid';
        noResults.style.display = 'none';

        // Sort servers
        const sorted = [...filteredServers].sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'date':
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
                case 'category':
                    return a.category.localeCompare(b.category);
                default:
                    return 0;
            }
        });

        serversGrid.innerHTML = sorted
            .map(server => `
                <div class="server-card" data-server-id="${server.id}">
                    <div class="server-header">
                        <div>
                            <h4 class="server-title">${server.name}</h4>
                            <p class="server-author">by ${server.author}</p>
                        </div>
                        <span class="server-category">${server.category}</span>
                    </div>
                    <p class="server-description">${server.description}</p>
                    <div class="server-tags">
                        ${server.tags.map(tag => `<span class="server-tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `)
            .join('');
    }

    // Filter servers
    function filterServers() {
        filteredServers = window.mcpServersData.servers.filter(server => {
            // Category filter
            if (selectedCategories.size > 0) {
                const categoryId = server.category.toLowerCase().replace(/[\s\/]/g, '-');
                if (!selectedCategories.has(categoryId)) {
                    return false;
                }
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const searchableText = [
                    server.name,
                    server.description,
                    server.author,
                    server.category,
                    ...server.tags
                ].join(' ').toLowerCase();

                if (!searchableText.includes(query)) {
                    return false;
                }
            }

            return true;
        });

        renderServers();
    }

    // Show server modal
    function showServerModal(serverId) {
        const server = window.mcpServersData.servers.find(s => s.id === serverId);
        if (!server) return;

        modalBody.innerHTML = `
            <h2>${server.name}</h2>
            <p class="server-author">Created by ${server.author}</p>
            
            <div style="margin: 2rem 0;">
                <span class="server-category">${server.category}</span>
                <span style="margin-left: 1rem; color: var(--text-secondary);">
                    Added ${new Date(server.dateAdded).toLocaleDateString()}
                </span>
            </div>

            <h3>Description</h3>
            <p>${server.description}</p>

            <h3>Features</h3>
            <ul>
                ${server.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>

            <h3>Installation</h3>
            <div class="code-block">
                <button class="copy-button" onclick="copyToClipboard('${server.installCommand.replace(/'/g, "\\'")}')">Copy</button>
                <pre><code>${server.installCommand}</code></pre>
            </div>

            <h3>Claude Desktop Configuration</h3>
            <p>Add this to your Claude Desktop config file:</p>
            <div class="code-block">
                <button class="copy-button" onclick="copyToClipboard('${JSON.stringify(server.config).replace(/'/g, "\\'")}')">Copy</button>
                <pre><code>${JSON.stringify(server.config, null, 2)}</code></pre>
            </div>

            <h3>Links</h3>
            <p>
                <a href="${server.githubUrl}" target="_blank" class="btn btn-primary">
                    View on GitHub
                </a>
            </p>

            <h3>Tags</h3>
            <div class="server-tags">
                ${server.tags.map(tag => `<span class="server-tag">${tag}</span>`).join('')}
            </div>
        `;

        serverModal.classList.add('active');
    }

    // Setup event listeners
    function setupEventListeners() {
        // Search
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            filterServers();
        });

        // Categories
        categoriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('category-tag')) {
                const category = e.target.dataset.category;
                
                if (selectedCategories.has(category)) {
                    selectedCategories.delete(category);
                    e.target.classList.remove('active');
                } else {
                    selectedCategories.add(category);
                    e.target.classList.add('active');
                }
                
                filterServers();
            }
        });

        // Clear filters
        clearFilters.addEventListener('click', () => {
            selectedCategories.clear();
            document.querySelectorAll('.category-tag').forEach(tag => {
                tag.classList.remove('active');
            });
            filterServers();
        });

        // Sort
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            renderServers();
        });

        // Server cards
        serversGrid.addEventListener('click', (e) => {
            const card = e.target.closest('.server-card');
            if (card) {
                showServerModal(card.dataset.serverId);
            }
        });

        // Modal close
        modalClose.addEventListener('click', () => {
            serverModal.classList.remove('active');
        });

        // Close modal on background click
        serverModal.addEventListener('click', (e) => {
            if (e.target === serverModal) {
                serverModal.classList.remove('active');
            }
        });

        // Close modal on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && serverModal.classList.contains('active')) {
                serverModal.classList.remove('active');
            }
        });
    }

    // Copy to clipboard helper
    window.copyToClipboard = function(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Show feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    };

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();