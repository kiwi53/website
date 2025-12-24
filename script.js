// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form submission handler
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const formData = new FormData(this);
        
        // Show success message
        alert('Thank you for your message! We will get back to you soon.');
        
        // Reset form
        this.reset();
    });
}

// Add active class to navigation on scroll
window.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-links a');
    
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (scrollY >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe service cards
document.querySelectorAll('.service-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Main menu cards behavior
const mainCards = document.getElementById('main-cards');
if (mainCards) {
    mainCards.addEventListener('click', (e) => {
        const btn = e.target.closest('.menu-card');
        if (!btn || btn.getAttribute('aria-disabled') === 'true') return;
        const href = btn.dataset.href;
        const isExternal = btn.dataset.external === 'true';
        if (href) {
            if (isExternal) {
                window.open(href, '_blank');
            } else {
                window.location.href = href;
            }
        }
    });
    // keyboard support
    mainCards.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            const btn = e.target.closest('.menu-card');
            if (btn && btn.getAttribute('aria-disabled') !== 'true') {
                const href = btn.dataset.href;
                const isExternal = btn.dataset.external === 'true';
                if (href) {
                    if (isExternal) {
                        window.open(href, '_blank');
                    } else {
                        window.location.href = href;
                    }
                }
            }
        }
    });
}
// Macro and Server placeholder handlers (Game Launcher now navigates to its own page)
const macroBtn = document.getElementById('macro-btn');
const serverBtn = document.getElementById('server-btn');

if (macroBtn) {
    macroBtn.addEventListener('click', function() {
        alert('Macro feature coming soon.');
    });
}
if (serverBtn) {
    serverBtn.addEventListener('click', function() {
        alert('Server controls coming soon.');
    });
}
