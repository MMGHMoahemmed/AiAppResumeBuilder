// --- START OF FILE config.js ---

    // --- State ---
    let currentLang = 'ar'; // Default language, will be set on init

        // --- Constants ---
    const GEMINI_API_KEY_STORAGE_KEY = 'geminiApiKey';

    // --- Public API Key Configuration ---
    // IMPORTANT: Replace 'YOUR_REAL_PUBLIC_API_KEY_HERE_REPLACE_ME' with your actual public Gemini API key.
    // SECURE THIS KEY IN GOOGLE CLOUD CONSOLE WITH QUOTAS AND HTTP REFERRER RESTRICTIONS
    // to prevent abuse and unexpected charges. This client-side limit is a soft limit.
    const PUBLIC_GEMINI_API_KEY = 'AIzaSyCl5na7UrgJfn4r-dhw2fvwy7uGWodLA9k';
    const PUBLIC_API_KEY_USAGE_LIMIT = 20; // Max uses for the public key (client-side limit)
    const PUBLIC_API_KEY_USAGE_COUNT_KEY = 'publicApiKeyUsageCount'; // Dexie key for storing the count


    const pageId = document.body.id;

// --- END OF FILE config.js ---

