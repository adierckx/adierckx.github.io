/*!
    * Start Bootstrap - SB Admin v7.0.7 (https://startbootstrap.com/template/sb-admin)
    * Copyright 2013-2023 Start Bootstrap
    * Licensed under MIT (https://github.com/StartBootstrap/startbootstrap-sb-admin/blob/master/LICENSE)
    */
    // 
// Scripts
// 

window.addEventListener('DOMContentLoaded', event => {

    // Toggle the side navigation
    const sidebarToggle = document.body.querySelector('#sidebarToggle');
    if (sidebarToggle) {
        // Uncomment Below to persist sidebar toggle between refreshes
        // if (localStorage.getItem('sb|sidebar-toggle') === 'true') {
        //     document.body.classList.toggle('sb-sidenav-toggled');
        // }
        sidebarToggle.addEventListener('click', event => {
            event.preventDefault();
            document.body.classList.toggle('sb-sidenav-toggled');
            localStorage.setItem('sb|sidebar-toggle', document.body.classList.contains('sb-sidenav-toggled'));
        });
    }
});

// Add event listeners for all triggers
document.querySelectorAll('.easter-egg-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
        // Get the associated Easter egg's ID
        const memeId = trigger.getAttribute('data-id');
        const meme = document.getElementById(memeId);
        
        // Toggle visibility of the selected meme
        if (meme) {
            meme.style.display = meme.style.display === 'none' ? 'block' : 'none';
        }
    });
});
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded'); // Debugging log

    fetch('/Includes/logo.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load logo');
            }
            return response.text();
        })
        .then(html => {
            const container = document.getElementById('logo-container');
            container.innerHTML = html;

            console.log('Logo injected:', container.innerHTML); // Debugging log

            // List of animation classes
            const animations = ['floating', 'wiggle', 'pulse', 'bounce', 'swing', 'flicker', 'colorWave'];

            // Pick a random animation
            const randomAnimation = animations[Math.floor(Math.random() * animations.length)];

            // Apply the animation class and random delays
            const letters = container.querySelectorAll('.logo-letter');
            if (letters.length === 0) {
                console.error('No .logo-letter elements found in logo.html');
            } else {
                letters.forEach(letter => {
                    letter.classList.add(randomAnimation);

                    /*// Add random delay
                    const randomDelay = Math.random() * 2;
                    letter.style.animationDelay = `${randomDelay}s`;**/
                });
                console.log(`Animation '${randomAnimation}' applied to letters`);
            }

            // Re-render MathJax for LaTeX
            if (window.MathJax) {
                console.log('Rendering LaTeX with MathJax...');
                MathJax.typesetPromise([container])
                    .then(() => console.log('MathJax rendering complete'))
                    .catch(err => console.error('MathJax rendering error:', err));
            } else {
                console.error('MathJax not found on the page');
            }
        })
        .catch(error => {
            console.error('Error loading logo:', error);
        });
});

