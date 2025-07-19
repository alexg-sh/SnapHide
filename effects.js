// Provides Thanos-like dust disintegration effect for elements
// Uses react-turn-to-dust if available, otherwise falls back to a simple disintegration

class SnapHideEffects {
  /**
   * Disintegrate element into dust using turnToDust or fallback
   * @param {HTMLElement} element
   * @param {Object} options - options for turnToDust (e.g., particleCount)
   */
  static async createDustAnimation(element, options = {}) {
    if (typeof window.turnToDust === 'function') {
      return window.turnToDust(element, options);
    }
    return this.simpleDisintegrate(element, options);
  }

  /**
   * Enhanced dust animation with particle count support
   * @param {HTMLElement} element
   * @param {number} particleCount - number of particles to create
   */
  static async createAdvancedParticleSystem(element, particleCount = 50) {
    if (typeof window.turnToDust === 'function') {
      return window.turnToDust(element, { particleCount, duration: 800 });
    }
    return this.simpleDisintegrate(element, { duration: 800, particleCount });
  }

  /**
   * Alias for createAdvancedParticleSystem (backward compatibility)
   */
  static async createTurnToDustAnimation(element, particleCount = 50) {
    return this.createAdvancedParticleSystem(element, particleCount);
  }

  /**
   * Play snap sound effect
   */
  static createSnapSound() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.warn('Snap sound failed', e);
    }
  }

  /**
   * Alias for createSnapSound (backward compatibility)
   */
  static playSnapSound() {
    return this.createSnapSound();
  }

  /**
   * Subtle screen shake effect
   */
  static addScreenShake(intensity = 2, shakes = 10) {
    const body = document.body;
    const original = body.style.transform;
    let count = 0;
    const tick = () => {
      if (count++ >= shakes) {
        body.style.transform = original;
        return;
      }
      const x = (Math.random() - 0.5) * intensity;
      const y = (Math.random() - 0.5) * intensity;
      body.style.transform = `translate(${x}px,${y}px)`;
      requestAnimationFrame(tick);
    };
    tick();
  }

  /**
   * Alias for addScreenShake (backward compatibility)
   */
  static screenShake(intensity = 2, shakes = 10) {
    return this.addScreenShake(intensity, shakes);
  }

  /**
   * Basic disintegration fallback
   */
  static simpleDisintegrate(element, { duration = 800 } = {}) {
    const rect = element.getBoundingClientRect();
    const clone = element.cloneNode(true);
    Object.assign(clone.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: '0',
      zIndex: 999999,
      pointerEvents: 'none',
      transition: 'none',
    });
    document.body.appendChild(clone);
    element.style.opacity = '0';
    return new Promise(resolve => {
      const start = Date.now();
      const frame = () => {
        const t = (Date.now() - start) / duration;
        if (t >= 1) {
          clone.remove();
          resolve();
          return;
        }
        const progress = 1 - t;
        const blur = (1 - progress) * 10; // increased blur for visibility
        const scale = 1 + (1 - progress) * 0.5; // increased scale effect
        clone.style.filter = `blur(${blur}px)`;
        clone.style.transform = `scale(${scale})`;
        clone.style.opacity = `${progress}`;
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SnapHideEffects;
} else {
  window.SnapHideEffects = SnapHideEffects;
}
