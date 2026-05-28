// Story Progress Tracking
const updateProgress = () => {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrolled = window.scrollY;
    const progress = (scrolled / documentHeight) * 100;
    
    document.querySelector('.progress-bar').style.width = `${progress}%`;
};

// Nav scroll effect
const updateNav = () => {
    const nav = document.querySelector('.nav');
    if (window.scrollY > 50) {
        nav.classList.add('scrolled');
    } else {
        nav.classList.remove('scrolled');
    }
};

window.addEventListener('scroll', () => {
    updateProgress();
    updateNav();
});

// Chapter Visibility
const observeChapters = () => {
    const chapters = document.querySelectorAll('.chapter');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.2
    });
    
    chapters.forEach(chapter => observer.observe(chapter));
};

// Struggle Items Animation
const observeStruggleItems = () => {
    const items = document.querySelectorAll('.struggle-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.3
    });
    
    items.forEach(item => observer.observe(item));
};

// Magic Reveal Animation
const observeMagicItems = () => {
    const items = document.querySelectorAll('.magic-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.3
    });
    
    items.forEach(item => observer.observe(item));
};

// Interactive Demo Controls
const setupDemoControls = () => {
    const buttons = document.querySelectorAll('.demo-btn');
    const contents = document.querySelectorAll('.demo-content');
    
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const step = button.dataset.step;
            
            // Update buttons
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Update content
            contents.forEach(content => content.classList.remove('active'));
            document.querySelector(`[data-content="${step}"]`).classList.add('active');
        });
    });
};

// Auto-advance demo
const autoAdvanceDemo = () => {
    const buttons = document.querySelectorAll('.demo-btn');
    let currentStep = 0;
    const steps = ['upload', 'process', 'result'];
    
    const demoSection = document.querySelector('.chapter-3');
    let intervalId = null;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Start auto-advance when demo is visible
                intervalId = setInterval(() => {
                    currentStep = (currentStep + 1) % steps.length;
                    const button = document.querySelector(`[data-step="${steps[currentStep]}"]`);
                    if (button) button.click();
                }, 4000);
            } else {
                // Stop when not visible
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }
        });
    }, {
        threshold: 0.5
    });
    
    if (demoSection) {
        observer.observe(demoSection);
    }
};

// Prescription demo — replay messy handwriting on hover
const setupPrescriptionDemo = () => {
    const demo = document.getElementById('prescriptionDemo');
    const handwriting = document.getElementById('handwritingContent');
    if (!demo || !handwriting) return;

    const replayHandwriting = () => {
        handwriting.classList.remove('is-rewriting');
        void handwriting.offsetWidth;
        handwriting.classList.add('is-rewriting');
        window.setTimeout(() => handwriting.classList.remove('is-rewriting'), 900);
    };

    demo.addEventListener('mouseenter', replayHandwriting);
    demo.addEventListener('focusin', replayHandwriting);
};

// Smooth Scroll for Scroll Hint
const setupScrollHint = () => {
    const scrollHint = document.querySelector('.scroll-hint');
    if (!scrollHint) return;
    
    scrollHint.addEventListener('click', () => {
        const chapter2 = document.querySelector('.chapter-2');
        if (chapter2) {
            chapter2.scrollIntoView({ behavior: 'smooth' });
        }
    });
};

// Parallax Effect for Prescription Paper
const setupParallax = () => {
    const paper = document.querySelector('.prescription-paper');
    if (!paper) return;
    
    window.addEventListener('mousemove', (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        
        paper.style.transform = `rotateY(${x}deg) rotateX(${-y}deg)`;
    });
};

// Typing Effect for Chapter Titles
const typeWriter = (element, text, speed = 50) => {
    let i = 0;
    element.textContent = '';
    
    const type = () => {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    };
    
    type();
};

// Add hover effects to result actions
const setupResultActions = () => {
    const actions = document.querySelectorAll('.result-action');
    
    actions.forEach(action => {
        action.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Create ripple effect
            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.width = '20px';
            ripple.style.height = '20px';
            ripple.style.background = 'var(--primary)';
            ripple.style.borderRadius = '50%';
            ripple.style.opacity = '0.5';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s ease-out';
            
            action.style.position = 'relative';
            action.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
};

// Add CSS for ripple animation
const addRippleAnimation = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes ripple {
            to {
                transform: scale(4);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
};

// Easter egg: Konami code
const setupEasterEgg = () => {
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', (e) => {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                // Activate easter egg
                document.body.style.animation = 'rainbow 2s infinite';
                setTimeout(() => {
                    document.body.style.animation = '';
                }, 5000);
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes rainbow {
            0% { filter: hue-rotate(0deg); }
            100% { filter: hue-rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
};

// Demo video: fallback if /demo.mp4 is missing, plus a tiny time tag
const setupDemoVideo = () => {
    const video = document.getElementById('demoVideo');
    const fallback = document.getElementById('videoFallback');
    const timeTag = document.getElementById('videoTimeTag');
    if (!video) return;

    const showFallback = () => {
        if (!fallback) return;
        fallback.hidden = false;
        video.style.visibility = 'hidden';
    };

    // <source> error fires on the child element, not video itself
    const source = video.querySelector('source');
    if (source) source.addEventListener('error', showFallback);
    video.addEventListener('error', showFallback);

    // If metadata never loads in a reasonable window, assume missing
    let metaLoaded = false;
    video.addEventListener('loadedmetadata', () => { metaLoaded = true; });
    setTimeout(() => {
        if (!metaLoaded && (video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE || video.readyState === 0)) {
            showFallback();
        }
    }, 2500);

    if (timeTag) {
        const fmt = (s) => {
            const m = Math.floor(s / 60).toString().padStart(2, '0');
            const sec = Math.floor(s % 60).toString().padStart(2, '0');
            return `${m}:${sec}`;
        };
        video.addEventListener('timeupdate', () => {
            timeTag.textContent = fmt(video.currentTime || 0);
        });
    }
};

// Pill-shaped confetti burst from the CTA
const setupConfetti = () => {
    const btn = document.getElementById('ctaBtn');
    if (!btn) return;

    const colors = [
        ['#059669', '#6ee7b7'],
        ['#0d9488', '#5eead4'],
        ['#10b981', '#a7f3d0'],
        ['#f59e0b', '#fde68a'],
        ['#ef4444', '#fecaca']
    ];

    btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;

        for (let i = 0; i < 28; i++) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            const [a, b] = colors[i % colors.length];
            piece.style.background = `linear-gradient(90deg, ${a} 50%, ${b} 50%)`;
            piece.style.left = `${originX}px`;
            piece.style.top = `${originY}px`;
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.body.appendChild(piece);

            const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.4;
            const distance = 140 + Math.random() * 180;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance - 60; // bias slightly upward
            const rot = (Math.random() - 0.5) * 720;

            piece.animate(
                [
                    { transform: `translate(0, 0) rotate(0deg)`, opacity: 1 },
                    { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }
                ],
                { duration: 900 + Math.random() * 400, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'forwards' }
            );
            setTimeout(() => piece.remove(), 1400);
        }
    });
};

// Initialize everything
const init = () => {
    observeChapters();
    observeStruggleItems();
    observeMagicItems();
    setupDemoControls();
    autoAdvanceDemo();
    setupPrescriptionDemo();
    setupScrollHint();
    setupParallax();
    setupResultActions();
    addRippleAnimation();
    setupEasterEgg();
    setupDemoVideo();
    setupConfetti();
    
    // Initial updates
    updateProgress();
    updateNav();
    
    // Add smooth reveal on load
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.6s ease';
        document.body.style.opacity = '1';
    }, 100);
    
    console.log('🎭 Story mode activated');
    console.log('💡 Tip: Try the Konami code for a surprise!');
};

// Wait for DOM to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Add smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Performance optimization: Debounce scroll events
let scrollTimeout;
window.addEventListener('scroll', () => {
    if (scrollTimeout) {
        window.cancelAnimationFrame(scrollTimeout);
    }
    
    scrollTimeout = window.requestAnimationFrame(() => {
        updateProgress();
        updateNav();
    });
}, { passive: true });

console.log('✨ UnScribble Landing Page Loaded');
console.log('📖 Scroll to experience the story');
