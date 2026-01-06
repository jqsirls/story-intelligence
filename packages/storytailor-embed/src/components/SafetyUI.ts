/**
 * Safety UI
 * Tier 2/3 therapeutic responses and crisis support
 */

export interface TherapeuticResponse {
  type: 'big-feelings' | 'concerning-cues';
  emotion: string;
  message: string;
  actions: Array<{
    label: string;
    action: string;
  }>;
}

export class SafetyUI {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Show Tier 2 therapeutic response (big feelings)
   */
  showBigFeelingsResponse(emotion: string, onAction: (action: string) => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'st-therapeutic-overlay tier-2';
    overlay.innerHTML = `
      <div class="st-therapeutic-card">
        <div class="st-therapeutic-header">
          <span class="st-emotion-icon">💙</span>
          <h3>I notice you're feeling ${emotion}</h3>
        </div>
        
        <div class="st-therapeutic-message">
          <p>That's okay. Big feelings are normal. Let's take a moment together.</p>
        </div>
        
        <div class="st-therapeutic-actions">
          <button class="st-btn st-btn-calm" data-action="breathing-exercise">
            🌬️ Take 3 Deep Breaths
          </button>
          <button class="st-btn st-btn-calm" data-action="continue-conversation">
            💬 Talk About It
          </button>
          <button class="st-btn st-btn-calm" data-action="therapeutic-story">
            📖 Create a Story About It
          </button>
        </div>
        
        <button class="st-link-btn" data-action="close">
          I'm okay, continue
        </button>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      if (action) {
        onAction(action);
        if (action === 'close') overlay.remove();
      }
    });

    document.body.appendChild(overlay);
  }

  /**
   * Show Tier 3 crisis support (concerning cues)
   */
  showCrisisSupport(emotion: string, onAction: (action: string) => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'st-therapeutic-overlay tier-3';
    overlay.innerHTML = `
      <div class="st-crisis-card">
        <div class="st-crisis-header">
          <span class="st-crisis-icon">🤗</span>
          <h3>I'm here with you</h3>
        </div>
        
        <div class="st-crisis-message">
          <p>Let's get a grown-up to help. You're not alone.</p>
        </div>
        
        <div class="st-crisis-resources">
          <div class="st-resource-primary">
            <button class="st-btn st-btn-urgent" data-action="notify-parent">
              👨‍👩‍👧 Get My Parent
            </button>
            <p class="st-resource-note">We'll let them know right away</p>
          </div>
          
          <div class="st-resource-secondary">
            <h4>Need Help Right Now?</h4>
            <div class="st-crisis-hotline">
              <span class="st-hotline-icon">📞</span>
              <div>
                <div class="st-hotline-name">Crisis Text Line</div>
                <div class="st-hotline-number">Text HOME to 741741</div>
              </div>
            </div>
            <div class="st-crisis-hotline">
              <span class="st-hotline-icon">📞</span>
              <div>
                <div class="st-hotline-name">National Suicide Prevention</div>
                <div class="st-hotline-number">Call or text 988</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="st-crisis-note">
          <p>💙 Your safety is most important. A grown-up can help.</p>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.getAttribute('data-action');
      if (action) {
        onAction(action);
      }
    });

    document.body.appendChild(overlay);
    
    // Auto-notify parent for Tier 3
    setTimeout(() => {
      onAction('auto-notify-parent');
    }, 1000);
  }

  /**
   * Show breathing exercise
   */
  showBreathingExercise(onComplete: () => void): void {
    const overlay = document.createElement('div');
    overlay.className = 'st-breathing-overlay';
    overlay.innerHTML = `
      <div class="st-breathing-exercise">
        <h3>Let's Breathe Together</h3>
        <div class="st-breathing-circle">
          <div class="st-breathing-text">Breathe In</div>
        </div>
        <div class="st-breathing-instruction">
          <p>Smell a flower... 🌸</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Breathing animation cycle (4 seconds in, 4 seconds out)
    let cycle = 0;
    const maxCycles = 3;
    
    const breathe = () => {
      const circle = overlay.querySelector('.st-breathing-circle') as HTMLElement;
      const text = overlay.querySelector('.st-breathing-text') as HTMLElement;
      const instruction = overlay.querySelector('.st-breathing-instruction p') as HTMLElement;

      // Breathe in
      circle.style.transform = 'scale(1.5)';
      text.textContent = 'Breathe In';
      instruction.textContent = 'Smell a flower... 🌸';

      setTimeout(() => {
        // Breathe out
        circle.style.transform = 'scale(1)';
        text.textContent = 'Breathe Out';
        instruction.textContent = 'Blow a feather... 🪶';

        cycle++;
        if (cycle < maxCycles) {
          setTimeout(breathe, 4000);
        } else {
          setTimeout(() => {
            overlay.remove();
            onComplete();
          }, 4000);
        }
      }, 4000);
    };

    setTimeout(breathe, 1000);
  }

  /**
   * Destroy component
   */
  destroy(): void {
    // Remove any active overlays
    document.querySelectorAll('.st-therapeutic-overlay, .st-breathing-overlay').forEach(el => el.remove());
  }
}

