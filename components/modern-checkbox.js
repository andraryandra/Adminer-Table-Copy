// Modern Checkbox Component
// Desain checkbox modern dengan animasi dan styling yang menarik

class ModernCheckbox {
  constructor(options = {}) {
    this.id = options.id || `checkbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.label = options.label || '';
    this.checked = options.checked || false;
    this.onChange = options.onChange || null;
    this.size = options.size || 'medium'; // small, medium, large
    this.color = options.color || 'green'; // green, blue, purple, red
    this.disabled = options.disabled || false;
  }

  // Generate HTML untuk checkbox
  render() {
    const sizeClasses = {
      small: { size: '16px', fontSize: '12px' },
      medium: { size: '20px', fontSize: '14px' },
      large: { size: '24px', fontSize: '16px' }
    };

    const colorClasses = {
      green: {
        checked: '#4CAF50',
        border: '#2e7d32',
        hover: '#81c784',
        shadow: 'rgba(76, 175, 80, 0.3)'
      },
      blue: {
        checked: '#2196F3',
        border: '#1565c0',
        hover: '#64b5f6',
        shadow: 'rgba(33, 150, 243, 0.3)'
      },
      purple: {
        checked: '#9c27b0',
        border: '#6a1b9a',
        hover: '#ba68c8',
        shadow: 'rgba(156, 39, 176, 0.3)'
      },
      red: {
        checked: '#f44336',
        border: '#c62828',
        hover: '#e57373',
        shadow: 'rgba(244, 67, 54, 0.3)'
      }
    };

    const size = sizeClasses[this.size];
    const colors = colorClasses[this.color];

    return `
      <div class="modern-checkbox-wrapper" data-checkbox-id="${this.id}">
        <label class="modern-checkbox-label" for="${this.id}" style="
          display: flex;
          align-items: center;
          cursor: ${this.disabled ? 'not-allowed' : 'pointer'};
          user-select: none;
          gap: 12px;
          padding: 8px;
          border-radius: 8px;
          transition: background 0.2s ease;
          opacity: ${this.disabled ? '0.6' : '1'};
        ">
          <div class="modern-checkbox-container" style="
            position: relative;
            width: ${size.size};
            height: ${size.size};
            flex-shrink: 0;
          ">
            <input 
              type="checkbox" 
              id="${this.id}" 
              class="modern-checkbox-input"
              ${this.checked ? 'checked' : ''}
              ${this.disabled ? 'disabled' : ''}
              style="
                position: absolute;
                opacity: 0;
                width: 0;
                height: 0;
                margin: 0;
                padding: 0;
              "
            />
            <div class="modern-checkbox-box" style="
              width: ${size.size};
              height: ${size.size};
              border: 2px solid ${this.checked ? colors.checked : '#2d3748'};
              border-radius: 6px;
              background: ${this.checked ? colors.checked : '#ffffff'};
              position: relative;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: ${this.checked ? `0 2px 8px ${colors.shadow}` : '0 1px 3px rgba(0,0,0,0.1)'};
              cursor: ${this.disabled ? 'not-allowed' : 'pointer'};
            ">
              ${this.checked ? `
                <svg class="modern-checkbox-checkmark" style="
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%) scale(1);
                  width: ${parseInt(size.size) * 0.6}px;
                  height: ${parseInt(size.size) * 0.6}px;
                  stroke: white;
                  stroke-width: 3;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                  fill: none;
                  animation: checkmarkDraw 0.3s ease-out;
                " viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              ` : ''}
            </div>
            ${this.label ? `
              <span class="modern-checkbox-label-text" style="
                font-size: ${size.fontSize};
                font-weight: 500;
                color: #2d3748;
                line-height: 1.4;
              ">${this.label}</span>
            ` : ''}
          </div>
        </label>
      </div>
    `;
  }

  // Attach event listeners setelah render
  attachEvents(container) {
    const checkbox = container.querySelector(`#${this.id}`);
    const wrapper = container.querySelector(`[data-checkbox-id="${this.id}"]`);
    const box = wrapper ? wrapper.querySelector('.modern-checkbox-box') : null;
    const label = container.querySelector(`label[for="${this.id}"]`);

    if (!checkbox || !box) return;

    // Color classes
    const colorClasses = {
      green: {
        checked: '#4CAF50',
        border: '#2e7d32',
        hover: '#81c784',
        shadow: 'rgba(76, 175, 80, 0.3)'
      },
      blue: {
        checked: '#2196F3',
        border: '#1565c0',
        hover: '#64b5f6',
        shadow: 'rgba(33, 150, 243, 0.3)'
      },
      purple: {
        checked: '#9c27b0',
        border: '#6a1b9a',
        hover: '#ba68c8',
        shadow: 'rgba(156, 39, 176, 0.3)'
      },
      red: {
        checked: '#f44336',
        border: '#c62828',
        hover: '#e57373',
        shadow: 'rgba(244, 67, 54, 0.3)'
      }
    };

    const colors = colorClasses[this.color] || colorClasses.green;

    // Hover effect
    if (label && !this.disabled) {
      label.addEventListener('mouseenter', () => {
        if (!checkbox.checked) {
          box.style.borderColor = colors.hover;
          box.style.transform = 'scale(1.05)';
          box.style.boxShadow = `0 4px 12px ${colors.shadow}`;
        }
      });

      label.addEventListener('mouseleave', () => {
        if (!checkbox.checked) {
          box.style.borderColor = '#2d3748';
          box.style.transform = 'scale(1)';
          box.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }
      });
    }

    // Change event
    checkbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;

      if (isChecked) {
        box.style.background = colors.checked;
        box.style.borderColor = colors.checked;
        box.style.boxShadow = `0 2px 8px ${colors.shadow}`;
        box.style.transform = 'scale(1.1)';
        
        // Add checkmark dengan animasi
        setTimeout(() => {
          box.style.transform = 'scale(1)';
        }, 150);

        // Create checkmark SVG
        if (!box.querySelector('.modern-checkbox-checkmark')) {
          const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('class', 'modern-checkbox-checkmark');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            width: ${parseInt(this.size === 'small' ? 16 : this.size === 'large' ? 24 : 20) * 0.6}px;
            height: ${parseInt(this.size === 'small' ? 16 : this.size === 'large' ? 24 : 20) * 0.6}px;
            stroke: white;
            stroke-width: 3;
            stroke-linecap: round;
            stroke-linejoin: round;
            fill: none;
            animation: checkmarkDraw 0.3s ease-out forwards;
          `;
          const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
          polyline.setAttribute('points', '20 6 9 17 4 12');
          svg.appendChild(polyline);
          box.appendChild(svg);
        }
      } else {
        box.style.background = '#ffffff';
        box.style.borderColor = '#2d3748';
        box.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        box.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
          box.style.transform = 'scale(1)';
          const checkmark = box.querySelector('.modern-checkbox-checkmark');
          if (checkmark) checkmark.remove();
        }, 150);
      }

      if (this.onChange) {
        this.onChange(isChecked, e);
      }
    });
  }

  // Static method untuk create dan attach langsung
  static create(container, options) {
    const checkbox = new ModernCheckbox(options);
    const html = checkbox.render();
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    if (container) {
      container.insertAdjacentHTML('beforeend', html);
      checkbox.attachEvents(container);
      return checkbox;
    }
    
    return null;
  }
}

// CSS Animation untuk checkmark
if (!document.getElementById('modern-checkbox-styles')) {
  const style = document.createElement('style');
  style.id = 'modern-checkbox-styles';
  style.textContent = `
    @keyframes checkmarkDraw {
      0% {
        transform: translate(-50%, -50%) scale(0) rotate(45deg);
        opacity: 0;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.2) rotate(45deg);
        opacity: 1;
      }
      100% {
        transform: translate(-50%, -50%) scale(1) rotate(0deg);
        opacity: 1;
      }
    }
    
    .modern-checkbox-wrapper {
      margin-bottom: 8px;
    }
    
    .modern-checkbox-label:hover .modern-checkbox-box {
      transition: all 0.2s ease;
    }
    
    .modern-checkbox-label:active .modern-checkbox-box {
      transform: scale(0.95) !important;
    }
  `;
  document.head.appendChild(style);
}

// Export untuk use di file lain
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModernCheckbox;
}
