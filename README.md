# SnapHide Chrome Extension

A Chrome extension that allows you to permanently hide page elements with a spectacular Thanos snap animation effect. Elements disintegrate into particles and fly away, and remain hidden permanently across browser sessions.

## ✨ What It Does

SnapHide lets you remove annoying elements from websites (ads, popups, unwanted content) with a satisfying snap animation. Once you delete an element, it stays gone forever - even after refreshing the page or restarting your browser.

## 🎯 Key Features

- **🫰 Thanos Snap Animation**: Elements disintegrate into particles with realistic physics
- **💾 Permanent Storage**: Deleted elements stay hidden using Chrome's local storage
- **🎯 Smart Targeting**: Hover to highlight, click to snap away
- **📚 Element Library**: Manage all hidden elements organized by website
- **🔄 One-Click Restore**: Bring back elements individually or all at once
- **⚡ High Performance**: Lightweight with adaptive particle count

## 🚀 Quick Setup

### Installation
1. **Download**: Clone or download this repository
2. **Open Chrome Extensions**: Navigate to `chrome://extensions/`
3. **Enable Developer Mode**: Toggle the switch in the top right
4. **Load Extension**: Click "Load unpacked" and select the SnapHide folder
5. **Done**: The SnapHide icon appears in your browser toolbar

### Usage
1. **Activate**: Click the SnapHide icon to enable targeting mode
2. **Target**: Hover over any element to see it highlighted
3. **Snap**: Click the highlighted element to make it disappear forever
4. **Manage**: Use the popup to view your library and restore elements

## 🎮 Controls

- **Click Extension Icon**: Toggle SnapHide on/off
- **Hover Elements**: Highlights targetable elements
- **Click Elements**: Snaps them away permanently
- **Escape Key**: Deactivate SnapHide mode
- **Popup Library**: Manage and restore deleted elements

## 🔧 How It Works

### Architecture
- **Manifest V3** compatible Chrome extension
- **Background Service Worker** manages state and storage
- **Content Script** handles page interaction and animations
- **Popup Interface** provides controls and element library

### Storage System
Elements are stored using Chrome's local storage API with the following structure:
```javascript
{
  id: "unique_identifier",
  tagName: "DIV",
  className: "example-class",
  selector: "div.example-class:nth-child(2)",
  position: { top, left, width, height },
  deletedAt: "2025-07-18T...",
  url: "https://example.com",
  title: "Page Title"
}
```

### Persistent Hiding
- **CSS Injection**: Automatically injects `display: none !important` styles
- **Mutation Observer**: Catches dynamically loaded content
- **Storage Sync**: Elements remain hidden across sessions
- **Site-Specific**: Organized by hostname for easy management

## 🛠️ Development

### File Structure
```
SnapHide/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js           # Service worker for state management
├── content.js             # Main content script for page interaction
├── content.css            # Styles for page overlays and animations
├── effects.js             # Advanced particle effects and sound
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality and library management
├── popup.css              # Popup styling
├── icons/                 # Extension icons (16px, 48px, 128px)
└── README.md              # This documentation
```

### Key Components

#### Background Service Worker
- Manages extension state across tabs
- Handles Chrome storage operations
- Coordinates between popup and content scripts
- Updates extension icon based on active state

#### Content Script
- Injected into every page
- Handles element selection and highlighting
- Creates snap animations and particle effects
- Manages persistent element hiding and restoration

#### Popup Interface
- Extension control panel
- Element library organized by website
- Statistics and restoration controls
- Responsive design

### Testing & Debugging

#### Installation for Development
1. Clone this repository
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the SnapHide folder

#### Console Debugging
```javascript
// Check content script status
console.log('SnapHide:', window.snapHideContent?.isActive);

// View stored elements
chrome.storage.local.get(null, console.log);

// Debug deleted selectors
document.querySelector('#snaphide-hidden-styles').textContent;
```

#### Common Issues & Solutions

**Elements Not Staying Hidden:**
- Check browser console for storage errors
- Verify content script is loading properly
- Ensure mutation observer is working

**Animation Performance:**
- Particle count adapts to element size (15-50 particles)
- Uses `requestAnimationFrame` for smooth 60fps
- GPU acceleration via CSS transforms

**Click Events Interfering:**
- Uses event capture with `preventDefault()`
- `stopImmediatePropagation()` prevents other handlers
- Returns `false` for extra prevention

## 🌐 Browser Compatibility

- **Chrome 88+** (Manifest V3 support required)
- **Edge 88+** (Chromium-based)

## 🔒 Privacy

- **Local Storage Only**: All data stays in your browser
- **No External Servers**: No data sent anywhere
- **No Tracking**: No analytics or user monitoring
- **Open Source**: Full transparency

## 📝 License

MIT License - feel free to use and modify as needed.

---

**Note**: This extension modifies page content locally. Hidden elements are restored when you clear browser data or manually restore them via the popup library.
- **Content Script** handles page interaction and animations
- **Chrome Storage API** ensures permanent element hiding
- **CSS Injection** provides reliable element hiding

### Storage System
Elements are stored permanently using Chrome's storage API:
```javascript
{
  id: "unique_identifier",
  tagName: "DIV", 
  selector: "div.annoying-ad",
  url: "https://example.com",
  deletedAt: "2025-07-18T...",
  // ... additional metadata
}
```

### Persistence Strategy
1. **CSS Injection**: Immediately hides elements via injected CSS rules
2. **DOM Attributes**: Marks elements with data attributes for reliability
3. **Storage Sync**: Saves to Chrome storage for cross-session persistence
4. **Mutation Observer**: Catches dynamically loaded content

## 📁 Project Structure

```
SnapHide/
├── manifest.json          # Extension configuration (Manifest V3)
├── background.js           # Service worker for state management  
├── content.js             # Main content script for page interaction
├── content.css            # Styles for overlays and animations
├── effects.js             # Advanced particle effects and sound
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality and library
├── popup.css              # Popup styling
├── icons/                 # Extension icons (16px, 48px, 128px)
└── README.md              # This file
```

## 🛠️ Development

### Testing
1. Load extension in developer mode at `chrome://extensions/`
2. Navigate to any website (news sites work great for testing)
3. Activate SnapHide and test element hiding/restoration
4. Check popup library functionality
5. Test persistence by refreshing pages

### Debugging
```javascript
// Check extension state in console
console.log('SnapHide Active:', window.snapHideContent?.isActive);

// View stored elements
chrome.storage.local.get(null, console.log);

// Check for errors
chrome.runtime.lastError
```

### Performance Notes
- **Adaptive Particles**: 15-50 particles based on element size
- **Memory Efficient**: Particles cleaned up after animations  
- **60fps Animations**: Using requestAnimationFrame
- **Minimal DOM Impact**: Efficient selectors and caching

## 🔒 Privacy

- **Local Storage Only**: All data stays in your browser
- **No External Servers**: Zero data transmission
- **No Tracking**: No analytics or monitoring
- **User Controlled**: Complete control over your data

## 🌟 Use Cases

- **Remove Ads**: Hide persistent advertising elements
- **Clean Layout**: Remove distracting page elements
- **Focus Mode**: Hide social media widgets and sidebars
- **Accessibility**: Remove problematic or flashing content
- **Productivity**: Eliminate time-wasting page elements

## ⚖️ Browser Compatibility

- **Chrome 88+** (Manifest V3 support required)
- **Edge 88+** (Chromium-based versions)
- **Storage Quota**: Respects Chrome's storage limits
- **Performance**: Optimized for modern browsers

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Elements reappear | Check if storage permissions are enabled |
| No snap animation | Verify effects.js is loaded correctly |
| Extension won't activate | Reload extension in chrome://extensions |
| Poor performance | Test on simpler pages first |
| Storage not working | Check Chrome storage quota |

## 📄 License

MIT License - feel free to use and modify as needed.

## 🎬 Credits

- Particle animation inspired by Marvel's Thanos snap effect
- Built with modern Web APIs and Chrome Extension APIs
- Designed for performance and user experience

---

**⚠️ Note**: This extension permanently modifies your view of websites. Hidden elements persist across sessions. Always test on non-critical websites first. Use the restore functionality if you accidentally hide important content.
