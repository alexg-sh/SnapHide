// Background service worker
class SnapHideManager {
  constructor() {
    this.isActive = false;
    this.setupListeners();
  }

  setupListeners() {
    // Handle extension icon click
    chrome.action.onClicked.addListener((tab) => {
      this.toggleExtension(tab);
    });

    // Handle messages from content script and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Update icon based on active state
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.updateIcon(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete') {
        this.updateIcon(tabId);
      }
    });
  }

  async toggleExtension(tab) {
    try {
      // Get current state for this tab
      const result = await chrome.storage.local.get([`active_${tab.id}`]);
      const isActive = !result[`active_${tab.id}`];
      
      // Store new state
      await chrome.storage.local.set({[`active_${tab.id}`]: isActive});
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_SNAPHIDE',
          active: isActive
        });
      } catch (error) {
        console.log('Content script not ready, will be handled on load');
      }

      // Update icon
      await this.updateIcon(tab.id);
      
    } catch (error) {
      console.error('Error toggling SnapHide:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.type) {
        case 'TOGGLE_SNAPHIDE':
          if (request.tabId) {
            // From popup
            const tab = await chrome.tabs.get(request.tabId);
            await this.toggleExtensionFromPopup(tab, request.active);
          } else if (request.fromContentScript && sender.tab) {
            // From content script (like Escape key)
            await this.toggleExtensionFromPopup(sender.tab, request.active);
          }
          sendResponse({success: true});
          break;
          
        case 'GET_DELETED_ELEMENTS':
          const elements = await this.getDeletedElements(request.hostname);
          sendResponse({elements});
          break;
          
        case 'SAVE_DELETED_ELEMENT': {
          const elementId = await this.saveDeletedElement(request.element, request.hostname);
          sendResponse({success: true, elementId});
          break;
        }
          
        case 'RESTORE_ELEMENT':
          await this.restoreElement(request.elementId, request.hostname);
          sendResponse({success: true});
          break;
          
        case 'GET_ALL_WEBSITES':
          const websites = await this.getAllWebsites();
          sendResponse({websites});
          break;
          
        case 'GET_EXTENSION_STATE':
          // Handle requests from popup (no tab context) vs content script (has tab context)
          let tabId;
          if (request.tabId) {
            tabId = request.tabId; // From popup
          } else if (sender.tab?.id) {
            tabId = sender.tab.id; // From content script
          } else {
            // Fallback - get active tab
            const tabs = await chrome.tabs.query({active: true, currentWindow: true});
            tabId = tabs[0]?.id;
          }
          
          if (tabId) {
            const result = await chrome.storage.local.get([`active_${tabId}`]);
            sendResponse({active: !!result[`active_${tabId}`]});
          } else {
            sendResponse({active: false});
          }
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({error: error.message});
    }
  }

  async toggleExtensionFromPopup(tab, isActive) {
    try {
      // Store new state
      await chrome.storage.local.set({[`active_${tab.id}`]: isActive});
      
      // Send message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_SNAPHIDE',
          active: isActive
        });
        console.log(`SnapHide ${isActive ? 'activated' : 'deactivated'} for tab ${tab.id}`);
      } catch (error) {
        console.log('Content script not ready, will be handled on load');
      }

      // Update icon
      await this.updateIcon(tab.id);
      
    } catch (error) {
      console.error('Error toggling SnapHide from popup:', error);
    }
  }

  async saveDeletedElement(element, hostname) {
    const storageKey = `deleted_${hostname}`;
    const result = await chrome.storage.local.get([storageKey]);
    const elements = result[storageKey] || [];
    
    // Add timestamp and unique ID
    element.id = `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    element.deletedAt = new Date().toISOString();
    
    elements.push(element);
    
    await chrome.storage.local.set({[storageKey]: elements});
    console.log(`Saved element for ${hostname}:`, element.id, 'Total elements:', elements.length);
    return element.id;
  }

  async getDeletedElements(hostname) {
    const storageKey = `deleted_${hostname}`;
    const result = await chrome.storage.local.get([storageKey]);
    const elements = result[storageKey] || [];
    console.log(`Retrieved ${elements.length} deleted elements for ${hostname}`);
    return elements;
  }

  async restoreElement(elementId, hostname) {
    const storageKey = `deleted_${hostname}`;
    const result = await chrome.storage.local.get([storageKey]);
    const elements = result[storageKey] || [];
    
    const elementIndex = elements.findIndex(el => el.id === elementId);
    if (elementIndex !== -1) {
      elements.splice(elementIndex, 1);
      await chrome.storage.local.set({[storageKey]: elements});
    }
  }

  async getAllWebsites() {
    const result = await chrome.storage.local.get();
    const websites = {};
    
    Object.keys(result).forEach(key => {
      if (key.startsWith('deleted_')) {
        const hostname = key.replace('deleted_', '');
        websites[hostname] = result[key];
      }
    });
    
    return websites;
  }

  async updateIcon(tabId) {
    try {
      const result = await chrome.storage.local.get([`active_${tabId}`]);
      const isActive = !!result[`active_${tabId}`];
      
      // Use the same snap.png icon for both active and inactive states
      const iconPath = {
        "16": "icons/snap.png",
        "48": "icons/snap.png",
        "128": "icons/snap.png"
      };
      
      await chrome.action.setIcon({
        path: iconPath,
        tabId: tabId
      });
      
      await chrome.action.setTitle({
        title: isActive ? "SnapHide - Active (Click to deactivate)" : "SnapHide - Click to activate",
        tabId: tabId
      });
      
    } catch (error) {
      console.error('Error updating icon:', error);
    }
  }
}

// Initialize the background manager
new SnapHideManager();
