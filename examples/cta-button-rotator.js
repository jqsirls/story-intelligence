/**
 * CTA Button Text Rotator
 * Rotates button text every 4 seconds for dynamic call-to-action
 */

(function() {
    'use strict';

    // Configuration
    const ROTATION_INTERVAL = 4000; // 4 seconds in milliseconds
    
    // CTA text variations - customize these to your needs
    const CTA_TEXTS = [
        'Download for macOS ⤓',
        'Get Started Free →',
        'Try It Now ✨',
        'Start Creating Stories 🚀',
        'Join Thousands of Users 👥',
        'Download Now ⬇️',
        'Begin Your Journey 🌟',
        'Start Free Trial 💫'
    ];

    /**
     * Find the button element using multiple selectors
     */
    function findButton() {
        // Try multiple selectors to find the button
        const selectors = [
            'a.btn[data-cursor-element-id="cursor-el-2254"]',
            'a.btn[href*="api2.cursor.sh/updates/download"]',
            'a.btn:contains("Download for macOS")',
            '.btn',
            'a[href*="darwin-arm64"]'
        ];

        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element && element.textContent.includes('Download')) {
                    return element;
                }
            } catch (e) {
                // Continue to next selector
            }
        }

        // Fallback: find by text content
        const allLinks = document.querySelectorAll('a.btn, a[class*="btn"]');
        for (const link of allLinks) {
            if (link.textContent.includes('Download for macOS') || 
                link.href.includes('api2.cursor.sh')) {
                return link;
            }
        }

        return null;
    }

    /**
     * Initialize the text rotation
     */
    function initCTARotation() {
        const button = findButton();
        
        if (!button) {
            console.warn('CTA Button Rotator: Button not found. Retrying in 1 second...');
            // Retry after DOM is fully loaded
            setTimeout(initCTARotation, 1000);
            return;
        }

        let currentIndex = 0;
        const originalText = button.textContent.trim();

        // Add smooth transition effect
        button.style.transition = 'opacity 0.3s ease-in-out';
        
        /**
         * Rotate to next CTA text
         */
        function rotateText() {
            // Fade out
            button.style.opacity = '0.7';
            
            setTimeout(() => {
                // Update text
                currentIndex = (currentIndex + 1) % CTA_TEXTS.length;
                button.textContent = CTA_TEXTS[currentIndex];
                
                // Fade in
                button.style.opacity = '1';
            }, 150);
        }

        // Start rotation immediately, then every 4 seconds
        setTimeout(() => {
            rotateText();
            setInterval(rotateText, ROTATION_INTERVAL);
        }, ROTATION_INTERVAL);

        console.log('CTA Button Rotator: Initialized successfully');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCTARotation);
    } else {
        // DOM already loaded
        initCTARotation();
    }

    // Also try after a short delay to catch dynamically loaded content
    setTimeout(initCTARotation, 500);
})();











