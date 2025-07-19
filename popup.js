// Popup script for SnapHide extension
class SnapHidePopup {
  constructor() {
    this.currentTab = null;
    this.isActive = false;
    this.deletedElements = [];
    
    this.init();
  }

  async init() {
    // Get current tab
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    this.currentTab = tabs[0];
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Load initial data
    await this.loadPageInfo();
    await this.loadExtensionState();
    await this.loadDeletedElements();
  }

  setupEventListeners() {
    // Toggle button
    document.getElementById('toggleBtn').addEventListener('click', () => {
      this.toggleExtension();
    });

    // View library button
    document.getElementById('viewLibraryBtn').addEventListener('click', () => {
      this.openLibrary();
    });

    // Restore all button
    document.getElementById('restoreAllBtn').addEventListener('click', () => {
      this.restoreAllElements();
    });

    // Library modal
    document.getElementById('closeLibraryBtn').addEventListener('click', () => {
      this.closeLibrary();
    });

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // Close modal on background click
    document.getElementById('libraryModal').addEventListener('click', (e) => {
      if (e.target.id === 'libraryModal') {
        this.closeLibrary();
      }
    });

    // Handle restore button clicks (event delegation)
    document.getElementById('currentElements').addEventListener('click', (e) => {
      if (e.target.classList.contains('restore-btn')) {
        const elementId = e.target.getAttribute('data-element-id');
        this.restoreElement(elementId);
      }
    });
    
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });
  }

  async loadPageInfo() {
    if (!this.currentTab) return;

    document.getElementById('pageTitle').textContent = this.currentTab.title || 'Unknown Page';
    document.getElementById('pageUrl').textContent = this.getDisplayUrl(this.currentTab.url);
  }

  getDisplayUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname + urlObj.pathname;
    } catch {
      return url;
    }
  }

  async loadExtensionState() {
    if (!this.currentTab) return;
    
    try {
      // Get state from background script based on current tab
      const response = await chrome.runtime.sendMessage({
        type: 'GET_EXTENSION_STATE',
        tabId: this.currentTab.id
      });
      this.isActive = response.active || false;
      this.updateUI();
    } catch (error) {
      console.error('Error loading extension state:', error);
      this.isActive = false;
      this.updateUI();
    }
  }

  async loadDeletedElements() {
    if (!this.currentTab) return;

    try {
      const hostname = new URL(this.currentTab.url).hostname;
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DELETED_ELEMENTS',
        hostname: hostname
      });
      
      this.deletedElements = response.elements || [];
      document.getElementById('deletedCount').textContent = this.deletedElements.length;
    } catch (error) {
      console.error('Error loading deleted elements:', error);
    }
  }

  updateUI() {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const toggleBtn = document.getElementById('toggleBtn');
    const toggleText = document.getElementById('toggleText');

    if (this.isActive) {
      statusDot.classList.add('active');
      statusText.textContent = 'Active';
      toggleBtn.classList.add('active');
      toggleText.textContent = 'Deactivate';
    } else {
      statusDot.classList.remove('active');
      statusText.textContent = 'Inactive';
      toggleBtn.classList.remove('active');
      toggleText.textContent = 'Activate';
    }
  }

  async toggleExtension() {
    if (!this.currentTab) return;

    try {
      const newActiveState = !this.isActive;
      
      // Only send message to background script, which will handle content script communication
      await chrome.runtime.sendMessage({
        type: 'TOGGLE_SNAPHIDE',
        active: newActiveState,
        tabId: this.currentTab.id
      });

      this.isActive = newActiveState;
      this.updateUI();
      
      // Close popup if activating
      if (newActiveState) {
        window.close();
      }
      
    } catch (error) {
      console.error('Error toggling extension:', error);
    }
  }

  async openLibrary() {
    const modal = document.getElementById('libraryModal');
    modal.classList.add('show');
    
    // Load current site elements
    await this.loadCurrentSiteElements();
    
    // Load all websites
    await this.loadAllWebsites();
  }

  closeLibrary() {
    const modal = document.getElementById('libraryModal');
    modal.classList.remove('show');
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== `${tabName}Tab`);
    });
  }

  async loadCurrentSiteElements() {
    const container = document.getElementById('currentElements');
    
    if (this.deletedElements.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🫰</div>
          <div>No elements hidden on this page</div>
          <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
            Activate SnapHide and click on elements to hide them
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = this.deletedElements.map(element => {
      // Use descriptor built by content script for clarity
      const descriptor = element.descriptor || element.selector || (element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (element.className ? '.' + element.className.split(' ').filter(c => c).join('.') : ''));
      return `
      <div class="element-item" data-element-id="${element.id}">
        <div class="element-preview">${this.escapeHtml(descriptor)}</div>
        <div class="element-info">
          <div class="element-details">
            <div>Deleted: ${this.formatDate(element.deletedAt)}</div>
            <div>Size: ${element.position.width}×${element.position.height}px</div>
          </div>
          <button class="restore-btn" data-element-id="${element.id}">
            Restore
          </button>
        </div>
      </div>
      `;
    }).join('');
  }

  async loadAllWebsites() {
    const container = document.getElementById('allWebsites');
    container.innerHTML = '<div class="loading">Loading websites...</div>';

    try {
      const response = await chrome.runtime.sendMessage({type: 'GET_ALL_WEBSITES'});
      const websites = response.websites || {};
      
      if (Object.keys(websites).length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🌐</div>
            <div>No hidden elements found</div>
            <div style="font-size: 12px; opacity: 0.7; margin-top: 8px;">
              Visit websites and hide elements to see them here
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = Object.entries(websites).map(([hostname, elements]) => {
        // Friendly previews for first few hidden elements
        const previews = elements.slice(0, 3).map(el => {
          const tag = el.tagName.toLowerCase();
          const idPart = el.id ? '#' + el.id : '';
          const classPart = el.className ? '.' + el.className.split(' ').filter(c => c).join('.') : '';
          return `<div class="element-preview" style="margin-bottom: 4px; font-size: 11px;">
                    ${this.escapeHtml(tag + idPart + classPart)}
                  </div>`;
        }).join('');
        const moreText = elements.length > 3 ? `<div style="font-size: 11px; opacity: 0.7;">+${elements.length - 3} more</div>` : '';
        return `
        <div class="website-item">
          <div class="website-header">
            <div class="website-name">${hostname}</div>
            <div class="website-count">${elements.length} element${elements.length === 1 ? '' : 's'}</div>
          </div>
          <div class="website-elements">
            ${previews}
            ${moreText}
          </div>
        </div>
        `;
      }).join('');
    } catch (error) {
      console.error('Error loading websites:', error);
      container.innerHTML = '<div class="loading">Error loading websites</div>';
    }
  }

  async restoreElement(elementId) {
    if (!this.currentTab) return;

    try {
      const hostname = new URL(this.currentTab.url).hostname;
      
      // Send restore message to background
      await chrome.runtime.sendMessage({
        type: 'RESTORE_ELEMENT',
        elementId: elementId,
        hostname: hostname
      });

      // Send message to content script to restore visually
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'RESTORE_ELEMENT',
        elementId: elementId
      });

      // Reload deleted elements
      await this.loadDeletedElements();
      await this.loadCurrentSiteElements();
      
    } catch (error) {
      console.error('Error restoring element:', error);
    }
  }

  async restoreAllElements() {
    if (!this.currentTab || this.deletedElements.length === 0) return;

    try {
      const hostname = new URL(this.currentTab.url).hostname;
      
      // Restore all elements
      for (const element of this.deletedElements) {
        await chrome.runtime.sendMessage({
          type: 'RESTORE_ELEMENT',
          elementId: element.id,
          hostname: hostname
        });
      }

      // Send message to content script to refresh
      await chrome.tabs.sendMessage(this.currentTab.id, {
        type: 'RESTORE_ALL_ELEMENTS'
      });

      // Reload data
      await this.loadDeletedElements();
      await this.loadCurrentSiteElements();
      
    } catch (error) {
      console.error('Error restoring all elements:', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
}

// Initialize popup when DOM is loaded
var snapHidePopup;
document.addEventListener('DOMContentLoaded', () => {
  snapHidePopup = new SnapHidePopup();
  // Expose globally so restore buttons can call restoreElement
  window.snapHidePopup = snapHidePopup;
});
