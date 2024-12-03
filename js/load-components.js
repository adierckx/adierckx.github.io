document.addEventListener('DOMContentLoaded', () => {
    const loadComponent = (url, containerId) => {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${url}`);
                return response.text();
            })
            .then(html => {
                document.getElementById(containerId).innerHTML = html;

                // Re-render MathJax for LaTeX formatting
                if (window.MathJax) {
                    MathJax.typesetPromise([document.getElementById(containerId)]).catch(err => {
                        console.error('MathJax typesetting failed:', err);
                    });
                }
            })
            .catch(error => console.error(`Error loading ${url}:`, error));
    };

    // Load components
    loadComponent('/Includes/logo.html', 'logo-container');
    loadComponent('/Includes/menu.html', 'menu-container', initializeSidebarToggle);

    function initializeSidebarToggle() {
        const toggleButton = document.getElementById('sidebarToggle');
        const sidenav = document.querySelector('.sb-sidenav');
        const content = document.getElementById('layoutSidenav_content');

        if (toggleButton && sidenav) {
            toggleButton.addEventListener('click', () => {
                sidenav.classList.toggle('collapsed'); // Collapse the menu
                content.classList.toggle('expanded'); // Adjust content width
            });
        }
    }
});