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
document.querySelectorAll('.logo-letter').forEach(letter => {
    const randomDelay = Math.random() * 2; // Random delay between 0-2 seconds
    letter.style.animationDelay = `${randomDelay}s`;
});
