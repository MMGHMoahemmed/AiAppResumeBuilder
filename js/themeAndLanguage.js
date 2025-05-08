    // --- Theme Switching ---
    const themeLocalStorageKey = 'bsTheme';
    const body = document.body;

    const setTheme = (theme) => {
        if (theme !== 'light' && theme !== 'dark') return;
        body.setAttribute('data-bs-theme', theme);
        localStorage.setItem(themeLocalStorageKey, theme);
        console.log(`Theme set to: ${theme}`);
        // CSS handles button visibility
    };

    const loadTheme = () => {
        const storedTheme = localStorage.getItem(themeLocalStorageKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        let initialTheme = 'light';
        if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark')) {
            initialTheme = storedTheme;
        } else if (prefersDark) {
            initialTheme = 'dark';
        }
        setTheme(initialTheme);
    };

    const initThemeSwitcher = () => {
        const lightModeButton = document.getElementById('light_mode');
        const darkModeButton = document.getElementById('dark_mode');

        if (lightModeButton) {
            lightModeButton.addEventListener('click', (event) => {
                event.preventDefault();
                setTheme('light');
            });
        }
        if (darkModeButton) {
            darkModeButton.addEventListener('click', (event) => {
                event.preventDefault();
                setTheme('dark');
            });
        }
        loadTheme(); // Load theme initially
    };



    // --- Language Switching ---
    function translatePage(lang) {
        if (!translations[lang]) return; // Exit if language not found
        currentLang = lang;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.getAttribute('data-translate');
            const translation = translations[lang][key];

            if (translation !== undefined) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    // Only update placeholder if it exists or if the element doesn't have a value
                     if (el.placeholder !== undefined || !el.value) {
                        el.placeholder = translation;
                     }
                } else if (el.tagName === 'BUTTON' && el.getAttribute('title')) {
                     // Update tooltips/titles if needed (like on theme buttons)
                     el.title = translation;
                     // Update Bootstrap tooltip if initialized
                     const tooltipInstance = bootstrap.Tooltip.getInstance(el);
                     if (tooltipInstance) {
                         tooltipInstance.setContent({ '.tooltip-inner': translation });
                     }
                }
                 else {
                    el.textContent = translation;
                }
            } else {
                console.warn(`Translation key "${key}" not found for language "${lang}".`);
            }
        });


        if (pageId === 'page-ai-job-trainer') {
            if (outputLanguageSelect) {
                outputLanguageSelect.value = lang; // Set dropdown to match UI language
            }
        }


        // After translating, update the preview to reflect any placeholder changes
        if (typeof updatePreview === 'function') { // Check if builder function exists
            updatePreview();
        }
    }

    const initLanguageSwitcher = () => {
        // Determine initial language (e.g., from browser, localStorage, or default)
        const storedLang = localStorage.getItem('resumeBuilderLang'); // Example storage
        let initialLang = storedLang || navigator.language.split('-')[0] || 'en';
        if (!translations[initialLang]) {
            initialLang = 'en'; // Fallback to English if browser lang not supported
        }

        document.querySelectorAll('.lang-switch').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = e.target.getAttribute('data-lang');
                translatePage(lang);
                localStorage.setItem('resumeBuilderLang', lang); // Save preference
                // Optional: Close dropdown
                const dropdown = e.target.closest('.dropdown-menu');
                if (dropdown && bootstrap.Dropdown.getInstance(dropdown.previousElementSibling)) {
                     bootstrap.Dropdown.getInstance(dropdown.previousElementSibling).hide();
                }
            });
        });

        translatePage(initialLang); // Initial translation
    };    