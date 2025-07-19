// Content script for SnapHide extension with advanced dust disintegration
class SnapHideContent {
  constructor() {
    this.isActive = false;
    this.hoveredElement = null;
    this.overlay = null;
    this.deletedElements = new Set();
    this.deletedSelectors = [];
    this.hostname = window.location.hostname;
    
    this.init();
  }

  async init() {
    // First priority: Load and hide deleted elements immediately
    await this.loadDeletedElements();
    this.applyHiddenStyles();
    
    // Check if extension is active for this tab
    try {
      const response = await chrome.runtime.sendMessage({type: 'GET_EXTENSION_STATE'});
      this.isActive = response.active;
    } catch (error) {
      console.error('Error getting extension state:', error);
      this.isActive = false;
    }
    
    // Setup mutation observer to catch dynamically loaded elements
    this.setupMutationObserver();
    
    // Setup event listeners (for messages only)
    this.setupEventListeners();
    
    // Create overlay
    this.createOverlay();
    
    if (this.isActive) {
      this.activate();
    }
  }

  setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
    });

    // Bind event handlers to maintain 'this' context
    this.boundHandleMouseOver = this.handleMouseOver.bind(this);
    this.boundHandleMouseOut = this.handleMouseOut.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleContextMenu = this.handleContextMenu.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
  }

  setupMutationObserver() {
    // Observer to catch dynamically added elements that should be hidden
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkAndHideNewElement(node);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkAndHideNewElement(element) {
    // Check if this new element matches any deleted selectors
    this.deletedSelectors.forEach(selector => {
      try {
        if (element.matches && element.matches(selector)) {
          element.style.setProperty('display', 'none', 'important');
          element.setAttribute('data-snaphide-deleted', 'true');
        }
        // Also check children
        const children = element.querySelectorAll(selector);
        children.forEach(child => {
          child.style.setProperty('display', 'none', 'important');
          child.setAttribute('data-snaphide-deleted', 'true');
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });
  }

  handleMessage(request, sender, sendResponse) {
    console.log('Content script received message:', request.type, request.active);
    switch (request.type) {
      case 'TOGGLE_SNAPHIDE':
        this.isActive = request.active;
        if (this.isActive) {
          this.activate();
        } else {
          this.deactivate();
        }
        console.log(`SnapHide content script ${this.isActive ? 'activated' : 'deactivated'}`);
        sendResponse({success: true});
        break;
        
      case 'RESTORE_ELEMENT':
        this.restoreElementById(request.elementId);
        sendResponse({success: true});
        break;
        
      case 'RESTORE_ALL_ELEMENTS':
        this.restoreAllElements();
        sendResponse({success: true});
        break;
    }
  }

  activate() {
    this.isActive = true;
    document.body.style.cursor = 'crosshair';
    this.showActivationMessage();
    this.addEventListeners();
  }

  deactivate() {
    this.isActive = false;
    document.body.style.cursor = '';
    this.hideOverlay();
    this.hideActivationMessage();
    this.removeEventListeners();
  }

  addEventListeners() {
    // Mouse events for element highlighting
    document.addEventListener('mouseover', this.boundHandleMouseOver);
    document.addEventListener('mouseout', this.boundHandleMouseOut);
    document.addEventListener('click', this.boundHandleClick, true); // Use capture to prevent default
    
    // Prevent context menu when active
    document.addEventListener('contextmenu', this.boundHandleContextMenu);
    
    // Handle escape key to deactivate
    document.addEventListener('keydown', this.boundHandleKeyDown);
  }

  removeEventListeners() {
    // Remove mouse events for element highlighting
    document.removeEventListener('mouseover', this.boundHandleMouseOver);
    document.removeEventListener('mouseout', this.boundHandleMouseOut);
    document.removeEventListener('click', this.boundHandleClick, true);
    
    // Remove context menu prevention
    document.removeEventListener('contextmenu', this.boundHandleContextMenu);
    
    // Remove escape key handler
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    
    // Reset hovered element and hide overlay
    this.hoveredElement = null;
    this.hideOverlay();
  }

  handleMouseOver(event) {
    if (this.isExtensionElement(event.target)) return;
    
    event.stopPropagation();
    this.hoveredElement = event.target;
    this.showOverlay(event.target);
  }

  handleMouseOut(event) {
    if (this.isExtensionElement(event.target)) return;
    
    this.hoveredElement = null;
    this.hideOverlay();
  }

  handleClick(event) {
    if (this.isExtensionElement(event.target)) return;
    
    // PREVENT ALL DEFAULT BEHAVIORS - THIS IS CRITICAL
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    if (this.hoveredElement) {
      this.snapElement(this.hoveredElement);
    }
    
    return false; // Extra prevention
  }

  handleContextMenu(event) {
    if (!this.isExtensionElement(event.target)) {
      event.preventDefault();
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') {
      // Send message to background to deactivate
      chrome.runtime.sendMessage({
        type: 'TOGGLE_SNAPHIDE',
        active: false,
        fromContentScript: true
      });
    }
  }

  showActivationMessage() {
    // Remove existing message
    const existing = document.querySelector('#snaphide-activation-message');
    if (existing) existing.remove();

    const message = document.createElement('div');
    message.id = 'snaphide-activation-message';
    message.className = 'snaphide-activation-message';
    message.innerHTML = `
      <div class="snaphide-message-content">
        <span class="snaphide-icon">🫰</span>
        <span>SnapHide Active</span>
      </div>
    `;
    document.body.appendChild(message);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      if (message.parentNode) {
        message.classList.add('snaphide-fade-out');
        setTimeout(() => message.remove(), 400);
      }
    }, 2000);
  }

  hideActivationMessage() {
    const message = document.querySelector('#snaphide-activation-message');
    if (message) {
      message.remove();
    }
  }

  createOverlay() {
    // Remove existing overlay if any
    const existingOverlay = document.querySelector('.snaphide-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    this.overlay = document.createElement('div');
    this.overlay.className = 'snaphide-overlay';
    this.overlay.style.display = 'none';
    document.body.appendChild(this.overlay);
  }

  isExtensionElement(element) {
    return element.closest('.snaphide-overlay') || 
           element.closest('#snaphide-activation-message') ||
           element.classList.contains('snaphide-particle') ||
           element.classList.contains('snaphide-dust-particle') ||
           element.id === 'snaphide-activation-message';
  }

  showOverlay(element) {
    if (!this.overlay) return;
    
    const rect = element.getBoundingClientRect();
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    this.overlay.style.display = 'block';
    this.overlay.style.left = (rect.left + scrollLeft) + 'px';
    this.overlay.style.top = (rect.top + scrollTop) + 'px';
    this.overlay.style.width = rect.width + 'px';
    this.overlay.style.height = rect.height + 'px';
    
    // Add element info: show name attribute, ID, or first class, otherwise tag name
    const tagName = element.tagName.toLowerCase();
    const nameAttrVal = element.getAttribute('name');
    const idVal = element.id || '';
    const classList = element.className && typeof element.className === 'string'
      ? element.className.split(' ').filter(c => c.trim())
      : [];
    const firstClass = classList.length ? classList[0] : '';
    const descriptor = nameAttrVal || idVal || firstClass || tagName;
    this.overlay.innerHTML = `
      <div class="snaphide-overlay-info">
        <span class="snaphide-element-selector">${descriptor}</span>
        <span class="snaphide-click-hint">Click to turn to dust! ✨💨</span>
      </div>
    `;
  }

  hideOverlay() {
    if (this.overlay) {
      this.overlay.style.display = 'none';
    }
  }

  async snapElement(element) {
    if (!element || this.deletedElements.has(element)) return;

    // Save element data before deletion
    const elementId = await this.saveElementData(element);
    
    // Add to deleted elements set
    this.deletedElements.add(element);
    
    // Hide overlay
    this.hideOverlay();
    
    // Create advanced dust disintegration animation
    await this.createDustDisintegrationAnimation(element);
    
    // IMMEDIATELY hide the element with !important
    element.style.setProperty('display', 'none', 'important');
    element.style.setProperty('visibility', 'hidden', 'important');
    element.style.setProperty('opacity', '0', 'important');
    element.setAttribute('data-snaphide-deleted', 'true');
    element.setAttribute('data-snaphide-id', elementId);
    
    // Update the styles to ensure persistent hiding
    this.applyHiddenStyles();
  }

  async createDustDisintegrationAnimation(element) {
    const rect = element.getBoundingClientRect();
    // Calculate particle count based on element size (minimum 40, maximum 100)
    const particleCount = Math.min(100, Math.max(40, Math.floor(rect.width * rect.height / 500)));
    
    // Add sound effect and screen shake
    if (window.SnapHideEffects) {
      SnapHideEffects.createSnapSound();
      SnapHideEffects.addScreenShake();
    }
    
    // Use the new enhanced turn-to-dust animation system
    if (window.SnapHideEffects) {
      await SnapHideEffects.createTurnToDustAnimation(element, particleCount);
    } else {
      // Fallback to basic particle system
      await this.createBasicParticleAnimation(element, particleCount);
    }
  }

  async createBasicParticleAnimation(element, particleCount) {
    const rect = element.getBoundingClientRect();
    
    // Create particle container
    const container = document.createElement('div');
    container.className = 'snaphide-particle-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';
    document.body.appendChild(container);

    // Create dust-like particles with realistic colors
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const particle = this.createDustParticle(rect);
      container.appendChild(particle);
      particles.push(particle);
    }

    // Animate particles with random side-biased directions
    const animationPromises = particles.map((particle, index) => {
      // Random direction biased to sides (left or right)
      const angle = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * (Math.PI * 0.5);
      return this.animateDustParticle(particle, rect, index, angle);
    });
    
    // Wait for all animations to complete
    await Promise.all(animationPromises);
    
    // Clean up
    container.remove();
  }

  createDustParticle(elementRect) {
    const particle = document.createElement('div');
    particle.className = 'snaphide-dust-particle';
    
    const size = Math.random() * 20 + 10; // 10-30px particles (more visible)
    const particleType = Math.random();
    
    // Random position within element bounds
    const startX = elementRect.left + Math.random() * elementRect.width;
    const startY = elementRect.top + Math.random() * elementRect.height;
    
    // Enhanced dust colors with more variety
    const dustColors = [
      '#8B4513', '#A0522D', '#CD853F', '#D2B48C', '#DEB887',
      '#696969', '#778899', '#A9A9A9', '#BC8F8F', '#F5DEB3',
      '#F4A460', '#DAA520', '#B8860B', '#CD853F', '#D2691E',
      '#8FBC8F', '#9ACD32', '#6B8E23', // Some earthy greens
      '#483D8B', '#6A5ACD', '#9370DB'  // Some magical purples
    ];
    
    const color = dustColors[Math.floor(Math.random() * dustColors.length)];
    
    // Different particle shapes for more distinction
    let particleShape = '';
    if (particleType < 0.6) {
      particleShape = '50%'; // Round particles
    } else if (particleType < 0.8) {
      particleShape = '0'; // Square particles
    } else {
      particleShape = '20%'; // Slightly rounded particles
    }
    
    particle.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border-radius: ${particleShape};
      pointer-events: none;
      z-index: 999999;
      opacity: ${0.8 + Math.random() * 0.2};
      box-shadow: 0 0 ${size * 3}px ${color}88, inset 0 0 ${size * 2}px ${color}55;
      transform: rotate(${Math.random() * 360}deg);
    `;
    
    // Add some particles with special effects
    if (Math.random() < 0.2) {
      particle.style.background = `radial-gradient(circle, ${color}, transparent)`;
    }
    
    return particle;
  }

  animateDustParticle(particle, elementRect, index, baseAngle = 0) {
    return new Promise(resolve => {
      const startX = parseFloat(particle.style.left);
      const startY = parseFloat(particle.style.top);
      
      // Unified direction for all particles
      const angle = baseAngle;
      // Increased velocity for more spread
      const velocity = Math.random() * 400 + 200;
      const gravity = 20;
      const airResistance = 0.95;
      
      let velocityX = Math.cos(angle) * velocity;
      let velocityY = Math.sin(angle) * velocity;
      
      const duration = 1500 + Math.random() * 1000; // Longer duration for better spread
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const t = elapsed / 1000;
        
        // Apply enhanced physics
        velocityY += gravity * 0.016;
        velocityX *= airResistance;
        velocityY *= airResistance;
        
        // Add subtle turbulence
        const turbulence = Math.sin(elapsed * 0.005 + index) * 5;
        velocityX += (Math.random() - 0.5) * 5 * 0.016 + turbulence * 0.016;
        velocityY += (Math.random() - 0.5) * 5 * 0.016;
        
        const currentX = startX + velocityX * t;
        const currentY = startY + velocityY * t;
        const opacity = (1 - Math.pow(progress, 0.8)) * 0.9; // Slower fade
        const scale = 1 - progress * 0.3; // Less shrinking
        const rotation = progress * 360 * (Math.random() > 0.5 ? 1 : -1); // Full rotation
        
        particle.style.left = currentX + 'px';
        particle.style.top = currentY + 'px';
        particle.style.opacity = Math.max(0, opacity);
        particle.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  async saveElementData(element) {
    const rect = element.getBoundingClientRect();
    const selector = this.generateSelector(element);
    
    // Compute human-friendly descriptor: name attribute, ID, first class, or tag name
    const tagNameDesc = element.tagName.toLowerCase();
    const nameAttrDesc = element.getAttribute('name');
    const idDesc = element.id || '';
    const classListDesc = element.className && typeof element.className === 'string'
      ? element.className.split(' ').filter(c => c.trim())
      : [];
    const firstClassDesc = classListDesc.length ? classListDesc[0] : '';
    const descriptor = nameAttrDesc || idDesc || firstClassDesc || tagNameDesc;
    const elementData = {
      tagName: element.tagName,
      className: element.className,
      id: element.id,
      innerHTML: element.innerHTML,
      outerHTML: element.outerHTML,
      selector: selector,
      descriptor: descriptor,
       position: {
         top: rect.top + window.scrollY,
         left: rect.left + window.scrollX,
         width: rect.width,
         height: rect.height
      },
      styles: window.getComputedStyle(element).cssText,
      url: window.location.href,
      title: document.title
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_DELETED_ELEMENT',
        element: elementData,
        hostname: this.hostname
      });
      const elementId = response.elementId;
      // Add to our local selector list for immediate and future hiding
      this.deletedSelectors.push(selector);
      console.log('Saved element with selector:', selector, 'id:', elementId);
      return elementId;
    } catch (error) {
      console.error('Error saving deleted element:', error);
      // Fallback: generate a local ID
      return await this.getElementId(element);
    }
  }

  async getElementId(element) {
    return `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateSelector(element) {
    // Generate a unique CSS selector for the element
    if (element.id) {
      return `#${element.id}`;
    }
    
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.nodeName.toLowerCase();
      
      if (current.className && typeof current.className === 'string') {
        const classes = current.className.split(' ').filter(c => c && c.trim()).join('.');
        if (classes) {
          selector += '.' + classes;
        }
      }
      
      // Add nth-child if needed for uniqueness
      const parent = current.parentNode;
      if (parent && parent !== document) {
        const siblings = Array.from(parent.children).filter(sibling => 
          sibling.nodeName === current.nodeName
        );
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentNode;
      
      // Stop at body or if we have enough specificity
      if (current === document.body || path.length > 5) {
        break;
      }
    }
    
    return path.join(' > ');
  }

  async loadDeletedElements() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DELETED_ELEMENTS',
        hostname: this.hostname
      });
      
      if (response.elements) {
        console.log('Loaded deleted elements:', response.elements.length);
        response.elements.forEach(elementData => {
          // Add to our selector list
          this.deletedSelectors.push(elementData.selector);
        });
      }
    } catch (error) {
      console.error('Error loading deleted elements:', error);
    }
  }

  applyHiddenStyles() {
    // Remove existing style if any
    const existingStyle = document.getElementById('snaphide-hidden-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    if (this.deletedSelectors.length === 0) return;

    // Create CSS to hide all deleted elements
    const style = document.createElement('style');
    style.id = 'snaphide-hidden-styles';
    style.textContent = this.deletedSelectors.map(selector => {
      return `${selector} { display: none !important; visibility: hidden !important; opacity: 0 !important; }`;
    }).join('\n');
    
    document.head.appendChild(style);
    console.log('Applied hidden styles for', this.deletedSelectors.length, 'selectors');
    
    // Also hide elements directly
    this.deletedSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.style.setProperty('display', 'none', 'important');
          element.style.setProperty('visibility', 'hidden', 'important');
          element.style.setProperty('opacity', '0', 'important');
          element.setAttribute('data-snaphide-deleted', 'true');
        });
      } catch (e) {
        console.warn('Invalid selector:', selector);
      }
    });
  }

  restoreElementById(elementId) {
    const element = document.querySelector(`[data-snaphide-id="${elementId}"]`);
    if (element) {
      // Remove inline hiding styles and attributes
      element.style.display = '';
      element.style.visibility = '';
      element.style.opacity = '';
      element.removeAttribute('data-snaphide-deleted');
      element.removeAttribute('data-snaphide-id');
      this.deletedElements.delete(element);
      
      // Remove this element's selector from hidden list
      try {
        const sel = this.generateSelector(element);
        this.deletedSelectors = this.deletedSelectors.filter(s => s !== sel);
      } catch (e) {
        console.warn('Failed to compute selector for restored element', e);
      }
      // Reapply hidden styles without this selector
      this.applyHiddenStyles();
      
      // Add restore animation
      this.createRestoreAnimation(element);
    }
  }

  restoreAllElements() {
    const deletedElements = document.querySelectorAll('[data-snaphide-deleted="true"]');
    deletedElements.forEach(element => {
      element.style.display = '';
      element.style.visibility = '';
      element.style.opacity = '';
      element.removeAttribute('data-snaphide-deleted');
      element.removeAttribute('data-snaphide-id');
      this.deletedElements.delete(element);
      
      // Add restore animation with delay
      setTimeout(() => {
        this.createRestoreAnimation(element);
      }, Math.random() * 500);
    });
    
    // Clear the deleted selectors and update styles
    this.deletedSelectors = [];
    this.applyHiddenStyles();
  }

  createRestoreAnimation(element) {
    // Magical dust restoration effect
    element.style.opacity = '0';
    element.style.transform = 'scale(0.8)';
    element.style.filter = 'blur(2px)';
    element.style.transition = 'opacity 0.8s ease, transform 0.8s ease, filter 0.8s ease';
    
    requestAnimationFrame(() => {
      element.style.opacity = '';
      element.style.transform = '';
      element.style.filter = '';
      
      // Clean up after animation
      setTimeout(() => {
        element.style.transition = '';
      }, 800);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new SnapHideContent();
  });
} else {
  new SnapHideContent();
}
