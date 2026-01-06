/**
 * CTA Button Text Rotator - Inline Version
 * Paste this script before </body> tag in your HTML
 * Rotates button text every 4 seconds
 */

(function() {
    'use strict';
    
    const ROTATION_INTERVAL = 4000; // 4 seconds
    
    // Customize these CTA messages
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

    function findButton() {
        // Try multiple selectors
        const selectors = [
            'a.btn[data-cursor-element-id="cursor-el-2254"]',
            'a.btn[href*="api2.cursor.sh/updates/download"]',
            'a[href*="darwin-arm64"]'
        ];

        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }

        // Fallback: find by text or href
        const allLinks = document.querySelectorAll('a.btn, a[class*="btn"]');
        for (const link of allLinks) {
            if (link.textContent.includes('Download for macOS') || 
                link.href.includes('api2.cursor.sh')) {
                return link;
            }
        }
        return null;
    }

    function initCTARotation() {
        const button = findButton();
        if (!button) {
            setTimeout(initCTARotation, 1000);
            return;
        }

        let currentIndex = 0;
        button.style.transition = 'opacity 0.3s ease-in-out';
        
        function rotateText() {
            button.style.opacity = '0.7';
            setTimeout(() => {
                currentIndex = (currentIndex + 1) % CTA_TEXTS.length;
                button.textContent = CTA_TEXTS[currentIndex];
                button.style.opacity = '1';
            }, 150);
        }

        setTimeout(() => {
            rotateText();
            setInterval(rotateText, ROTATION_INTERVAL);
        }, ROTATION_INTERVAL);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCTARotation);
    } else {
        initCTARotation();
    }
    
    setTimeout(initCTARotation, 500);
})();



















