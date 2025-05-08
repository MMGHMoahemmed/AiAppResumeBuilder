// --- START OF FILE main.js ---


function updateNavbarLinks() {
    const urlParams = new URLSearchParams(window.location.search);
    const applicationId = urlParams.get('applicationId'); // Get ID from current URL

    // --- Define the links to update and their base URLs ---
    // Ensure these href values exactly match the ones in your HTML navbar
    const targetLinksConfig = [
        { currentHref: "./ResumeBuilder.html", newHrefBase: "./ResumeBuilder.html" },
        { currentHref: "./AiCoverLetter.html", newHrefBase: "./AiCoverLetter.html" },
        { currentHref: "./AiJobTrainer.html", newHrefBase: "./AiJobTrainer.html" }
        // Add more links here if needed in the future
    ];

    // Find the navbar menu container
    const navbarMenu = document.getElementById('navbar-menu');
    if (!navbarMenu) {
        console.warn("Navbar menu (#navbar-menu) not found. Cannot update links.");
        return;
    }

    targetLinksConfig.forEach(config => {
        // Find the link element using its current href attribute
        const linkElement = navbarMenu.querySelector(`a[href="${config.currentHref}"]`);

        if (linkElement) {
            let newHref = config.newHrefBase; // Start with the base URL

            if (applicationId) {
                // If an applicationId exists, append it
                newHref += `?applicationId=${applicationId}`;
            }
            // else: leave the href as the base URL

            // Only update if the href needs changing
            // Use new URL() to compare absolute URLs correctly
            const absoluteNewHref = new URL(newHref, window.location.href).href;
            if (linkElement.href !== absoluteNewHref) {
                console.log(`Updating navbar link: ${config.currentHref} -> ${newHref}`);
                linkElement.href = newHref;
            }
        } else {
            console.warn(`Navbar link with href="${config.currentHref}" not found.`);
        }
    });
}

// --- Make the function globally accessible if needed ---
// This allows calling it from other scripts like resumeBuilder.js
window.updateNavbarLinks = updateNavbarLinks;






document.addEventListener('DOMContentLoaded', () => {

    // --- Initialization ---
    initThemeSwitcher(); // From themeAndLanguage.js
    initLanguageSwitcher(); // From themeAndLanguage.js
    updateNavbarLinks();      // 3. Update links based on initial URL

    
    // Call page-specific initializers
    // Call page-specific initializers
    if (typeof initResumeBuilder === 'function' && document.querySelector('.builder-container')) { initResumeBuilder(); }
    if (typeof initCoverLetterPage === 'function' && document.getElementById('cover-letter-preview')) { initCoverLetterPage(); } // Use correct function name if changed
    if (typeof initAiJobTrainer === 'function' && document.getElementById('display-job-description-trainer')) { initAiJobTrainer(); }
    if (typeof initMyApplicationsPage === 'function' && document.getElementById('resume-list-container')) { initMyApplicationsPage(); } // Use correct function name if changed
    if (typeof initSettingsPage === 'function' && document.getElementById('pills-Personal-Info')) { initSettingsPage(); } // Check element ID

   // Remove generic initEventListeners() call if it exists here





// ... showNotification ...


});


// In main.js (or wherever showNotification is defined)

function showNotification(message, type = 'info', duration = 3000) { // Add duration parameter
    const container = document.getElementById('notification-container');
    const template = document.getElementById('notification-template');
    if (!container || !template) {
        console.error("Notification container or template not found.");
        return;
    }

    const clone = template.content.cloneNode(true);
    const toastElement = clone.querySelector('.toast');
    const toastBody = clone.querySelector('.toast-body');
    const toastTitle = clone.querySelector('.toast-title');
    const toastTime = clone.querySelector('.toast-time');
    const toastIcon = clone.querySelector('.toast-icon');

    toastBody.textContent = message;
    toastElement.dataset.bsDelay = duration; // Use the duration parameter

    // Customize appearance based on type
    let iconHtml = '';
    let titleText = 'Notification';
    toastElement.classList.remove('bg-success-lt', 'bg-danger-lt', 'bg-warning-lt', 'bg-info-lt'); // Clear previous

    switch (type) {
        case 'success':
            toastElement.classList.add('bg-success-lt');
            iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-circle-check text-success" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M9 12l2 2l4 -4" /></svg>';
            titleText = 'Success';
            break;
        case 'danger':
            toastElement.classList.add('bg-danger-lt');
             iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alert-circle text-danger" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>';
            titleText = 'Error';
            break;
        case 'warning':
            toastElement.classList.add('bg-warning-lt');
            iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-alert-triangle text-warning" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 9v4" /><path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" /><path d="M12 16h.01" /></svg>';
            titleText = 'Warning';
            break;
        case 'info':
        default:
             toastElement.classList.add('bg-info-lt');
             iconHtml = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-info-circle text-info" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></svg>';
            titleText = 'Information';
            break;
    }

    if(toastIcon) toastIcon.innerHTML = iconHtml;
    if(toastTitle) toastTitle.textContent = titleText;
    // Update time text if needed (or remove if not desired)
    // if(toastTime) toastTime.textContent = 'Just now'; // Or format current time

    container.appendChild(clone);
    const toastInstance = new bootstrap.Toast(container.lastElementChild);
    toastInstance.show();

    // Optional: Remove toast from DOM after it's hidden
    container.lastElementChild.addEventListener('hidden.bs.toast', (e) => {
        e.target.remove();
    });
}
// --- END OF FILE main.js ---