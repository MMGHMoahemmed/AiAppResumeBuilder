// --- START OF FILE settings.js ---

// Function to load settings into the form
async function loadSettingsForm() {
    const userProfile = await getSetting('userProfile'); // Use Dexie helper
    if (userProfile) {
        document.getElementById('setting-first-name').value = userProfile.firstName || '';
        document.getElementById('setting-last-name').value = userProfile.lastName || '';
        document.getElementById('setting-address').value = userProfile.address || '';
        document.getElementById('setting-phone').value = userProfile.phone || '';
        document.getElementById('setting-email').value = userProfile.email || '';
         // Load other fields...
         // Handle photo loading if you store it here (complex, maybe skip for now)
    }

    // Load API Key (keep existing logic)
    const savedKey = await getSetting(GEMINI_API_KEY_STORAGE_KEY); // Use Dexie helper
    const apiKeyInput = document.getElementById('gemini-api-key');
     if (apiKeyInput && savedKey) {
        apiKeyInput.value = savedKey;
        // You might want to check/validate the key status here too
        updateApiKeyStatus("API Key loaded.", false);
    } else if (apiKeyInput) {
         updateApiKeyStatus("API Key not set.", true);
    }
}

// Function to save user profile settings
async function saveUserProfile() {
    const profile = {
        firstName: document.getElementById('setting-first-name').value.trim(),
        lastName: document.getElementById('setting-last-name').value.trim(),
        address: document.getElementById('setting-address').value.trim(),
        phone: document.getElementById('setting-phone').value.trim(),
        email: document.getElementById('setting-email').value.trim(),
        // Collect other fields...
        // Handle photo saving if needed
    };
    const success = await saveSetting('userProfile', profile); // Use Dexie helper
    if (success) {
        alert("Profile updated successfully!"); // Simple feedback
    } else {
        alert("Failed to update profile.");
    }
}

 // Function to save API Key (modified to use Dexie)
 async function saveApiKeySetting() {
     const apiKeyInput = document.getElementById('gemini-api-key');
     const key = apiKeyInput?.value?.trim();
     if (key) {
        const success = await saveSetting(GEMINI_API_KEY_STORAGE_KEY, key); // Use Dexie helper
        if (success) {
             updateApiKeyStatus(translations[currentLang]?.api_key_saved || "API Key saved.", false);
             console.log("API Key saved to Dexie.");
        } else {
            updateApiKeyStatus("Failed to save API Key.", true);
        }
     } else {
         updateApiKeyStatus("API Key cannot be empty.", true);
     }
 }

// Helper function to update API key status message (keep existing logic)
function updateApiKeyStatus(message, isError = false) {
    const statusEl = document.getElementById('api-key-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isError ? 'text-danger ms-2' : 'text-success ms-2';
        setTimeout(() => {
            if (statusEl.textContent === message) {
                statusEl.textContent = '';
                statusEl.className = 'text-muted ms-2';
            }
        }, 5000);
    }
}


// Helper to update status message in UI (modified for persistence and clarity)
function _updateApiKeyStatusUI(message, type = 'info', persistent = false) {
    const statusEl = document.getElementById('api-key-status');
    if (statusEl) {
        statusEl.textContent = message;
        if (type === 'success') statusEl.className = 'text-success ms-2';
        else if (type === 'error') statusEl.className = 'text-danger ms-2';
        else if (type === 'warning') statusEl.className = 'text-warning ms-2';
        else statusEl.className = 'text-muted ms-2'; // Default to muted/info

        if (!persistent) {
            setTimeout(() => {
                if (statusEl.textContent === message) { // Only clear if message hasn't changed
                    statusEl.textContent = '';
                    statusEl.className = 'text-muted ms-2';
                }
            }, 7000);
        }
    }
}


/**
 * Displays the current API key status by checking user-set key and public key usage.
 */
async function displayApiKeyStatus() {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const publicApiKeyInfoEl = document.getElementById('public-api-key-info');

    if (typeof getSetting !== 'function') {
        _updateApiKeyStatusUI(translations[currentLang]?.error_dexie_unavailable_critical || "Error: Cannot access settings.", 'error', true);
        if (publicApiKeyInfoEl) publicApiKeyInfoEl.style.display = 'none';
        return;
    }

    const userApiKey = await getSetting(GEMINI_API_KEY_STORAGE_KEY);
    if (apiKeyInput) {
        apiKeyInput.value = userApiKey || '';
    }

    if (userApiKey) {
        _updateApiKeyStatusUI(
            translations[currentLang]?.api_key_user_set || "Your API Key is set and will be used for AI features.",
            'success', true
        );
        if (publicApiKeyInfoEl) publicApiKeyInfoEl.style.display = 'none';
    } else {
        // No user API key, check public key status
        if (!PUBLIC_GEMINI_API_KEY || PUBLIC_GEMINI_API_KEY === 'YOUR_REAL_PUBLIC_API_KEY_HERE_REPLACE_ME') {
            _updateApiKeyStatusUI(
                translations[currentLang]?.public_api_dev_config_issue || "Public API key not configured by developer. Please add your own key.",
                'error', true
            );
            if (publicApiKeyInfoEl) {
                 publicApiKeyInfoEl.textContent = translations[currentLang]?.public_api_dev_config_issue_detail || "The developer has not configured a public API key. To use AI features, please obtain your own Gemini API key from Google AI Studio and add it above.";
                 publicApiKeyInfoEl.className = 'alert alert-danger mt-2';
                 publicApiKeyInfoEl.style.display = 'block';
            }
            return;
        }

        let usageCount = await getSetting(PUBLIC_API_KEY_USAGE_COUNT_KEY) || 0;
        usageCount = parseInt(usageCount);
        const remainingUses = PUBLIC_API_KEY_USAGE_LIMIT - usageCount;

        if (remainingUses > 0) {
            const statusMsg = (translations[currentLang]?.public_api_status_remaining ||
                `Using public demo API key. ${remainingUses} uses remaining out of ${PUBLIC_API_KEY_USAGE_LIMIT}. Add your own key for unlimited use.`)
                .replace('${remainingUses}', remainingUses)
                .replace('${PUBLIC_API_KEY_USAGE_LIMIT}', PUBLIC_API_KEY_USAGE_LIMIT);
            _updateApiKeyStatusUI(statusMsg, 'info', true);

            if (publicApiKeyInfoEl) {
                publicApiKeyInfoEl.textContent = (translations[currentLang]?.settings_api_key_public_info ||
                    `The application provides a limited number of free AI uses (${PUBLIC_API_KEY_USAGE_LIMIT} total) via a public key. For unlimited access, please add your own Gemini API Key. Current public key usage: ${usageCount}/${PUBLIC_API_KEY_USAGE_LIMIT} uses.`)
                    .replace(/\$\{usageCount\}/g, usageCount)
                    .replace(/\$\{PUBLIC_API_KEY_USAGE_LIMIT\}/g, PUBLIC_API_KEY_USAGE_LIMIT);
                publicApiKeyInfoEl.className = 'alert alert-info mt-2';
                publicApiKeyInfoEl.style.display = 'block';
            }
        } else {
            const limitMsg = (translations[currentLang]?.public_api_status_limit_reached ||
                `Public demo API key limit reached (${usageCount}/${PUBLIC_API_KEY_USAGE_LIMIT}). Please add your own API key.`)
                .replace('${usageCount}', usageCount)
                .replace('${PUBLIC_API_KEY_USAGE_LIMIT}', PUBLIC_API_KEY_USAGE_LIMIT);
            _updateApiKeyStatusUI(limitMsg, 'warning', true);

            if (publicApiKeyInfoEl) {
                publicApiKeyInfoEl.textContent = (translations[currentLang]?.settings_api_key__public_limit_met || // Note: Typo in original, corrected key
                    `The public API key limit (${PUBLIC_API_KEY_USAGE_LIMIT} uses) has been reached. Please add your own Gemini API Key to continue using AI features.`)
                    .replace('${PUBLIC_API_KEY_USAGE_LIMIT}', PUBLIC_API_KEY_USAGE_LIMIT);
                publicApiKeyInfoEl.className = 'alert alert-warning mt-2';
                publicApiKeyInfoEl.style.display = 'block';
            }
        }
    }
}




// --- *** REFACTOR Export Data Handler *** ---
async function handleExportData() {
    const exportButton = document.getElementById('export-data-btn');
    const fileNameInput = document.getElementById('export-file-name');
    if (!exportButton || !fileNameInput) return;

    // --- Button loading state (keep as before) ---
    const originalButtonContent = exportButton.innerHTML;
    exportButton.disabled = true;
    const exportStartKey = 'settings_notify_export_start'; // Updated key
    exportButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[exportStartKey] || 'Exporting...'}`;

    try {
        // *** Fetch ALL applications ***
        const allApplications = await getAllApplications(); // Use refactored Dexie helper

        if (!allApplications || allApplications.length === 0) {
            showNotification(translations[currentLang]?.settings_notify_export_no_data || "No application data found.", 'warning'); // Updated key
            // Reset button immediately if nothing to export
            exportButton.disabled = false;
            const exportBtnKey = 'settings_button_export_data';
            exportButton.innerHTML = translations[currentLang]?.[exportBtnKey] || 'Export Data File';
            return; // Exit early
        }

        // *** Prepare data for export (array of applications) ***
        const exportData = {
            exportDate: new Date().toISOString(),
            applicationData: allApplications, // Embed the array directly
            // settingsData: await db.settings.toArray() // Optionally include settings
        };

        // --- JSON creation and download (keep as before) ---
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        let filename = fileNameInput.value.trim();
        if (!filename) {
            const defaultFnKey = 'settings_default_export_filename'; // Updated key
            filename = translations[currentLang]?.[defaultFnKey] || 'ai_app_builder_export';
        }
        filename = filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        filename += `_${new Date().toISOString().split('T')[0]}.json`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification(translations[currentLang]?.settings_notify_export_success || "Application data exported.", 'success'); // Updated key
        fileNameInput.value = '';

    } catch (error) {
        console.error("Error exporting application data:", error);
        showNotification(translations[currentLang]?.settings_notify_export_fail || "Export failed.", 'danger'); // Updated key
    } finally {
        // --- Restore button state (keep as before) ---
        exportButton.disabled = false;
        const exportBtnKey = 'settings_button_export_data';
        exportButton.innerHTML = originalButtonContent; // Restore exact original content
    }
}

// --- *** REFACTOR Import Data Handler *** ---
async function handleImportData() {
    const importButton = document.getElementById('import-data-btn');
    const fileInput = document.getElementById('import-file-input');
    if (!importButton || !fileInput) return;

    const file = fileInput.files?.[0];
    if (!file || !file.type.includes('json')) {
        showNotification(translations[currentLang]?.settings_notify_import_select_file || "Please select JSON.", 'warning');
        return;
    }

    // --- Button loading state (keep as before) ---
    const originalButtonText = importButton.innerHTML;
    importButton.disabled = true;
    const readingKey = 'settings_notify_import_reading';
    importButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[readingKey] || 'Reading...'}`;

    const reader = new FileReader();
    reader.onload = async (event) => {
        const savingKey = 'settings_notify_import_saving'; // Updated key context
        importButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[savingKey] || 'Importing...'}`;
        try {
            const fileContent = event.target.result;
            const importedData = JSON.parse(fileContent);

            // --- Validation (Expect applicationData array) ---
            if (!importedData || typeof importedData !== 'object' || !Array.isArray(importedData.applicationData)) { // Check for applicationData
                throw new Error(translations[currentLang]?.settings_notify_import_invalid_data || "Invalid data format.");
            }

            const applicationsToImport = importedData.applicationData; // Get the array

            if (applicationsToImport.length === 0) {
                 showNotification(translations[currentLang]?.settings_notify_export_no_data || "No application data in file.", 'info');
                 // Reset button immediately
                 importButton.disabled = false;
                 const importBtnKey = 'settings_button_import_data';
                 importButton.innerHTML = originalButtonText; // Restore exact original content
                 fileInput.value = null;
                 return; // Exit early
            }

            // --- Prepare for bulkAdd (Process each Application) ---
            const now = new Date();
            const preparedApplications = applicationsToImport.map(app => {
                 const { id, ...appWithoutId } = app; // Remove existing ID

                 // Update timestamps, ensure name, ensure nested structures
                 appWithoutId.createdAt = appWithoutId.createdAt || now;
                 appWithoutId.updatedAt = now;
                 if (!appWithoutId.name) {
                     appWithoutId.name = `Imported App ${now.toLocaleTimeString()}`;
                 }
                 appWithoutId.resumeData = appWithoutId.resumeData || {};
                 appWithoutId.coverLetterData = appWithoutId.coverLetterData || {};
                 appWithoutId.aiTrainerData = appWithoutId.aiTrainerData || {};
                 // Could add deeper validation/defaulting for nested parts here if needed

                 return appWithoutId;
            });

            // *** Perform bulk add on APPLICATIONS table ***
            await db.applications.bulkAdd(preparedApplications);

             // Optionally import settings (keep as before)
             if (Array.isArray(importedData.settingsData)) {
                 const preparedSettings = importedData.settingsData.map(setting => ({ key: setting.key, value: setting.value }));
                 await db.settings.bulkPut(preparedSettings);
             }

            showNotification(translations[currentLang]?.settings_notify_import_success || "Applications imported!", 'success'); // Updated key

        } catch (error) {
             // --- Error handling (keep as before) ---
            console.error("Error importing data:", error);
            if (error instanceof SyntaxError) {
                 showNotification(translations[currentLang]?.settings_notify_import_parsing_error || "Error parsing JSON.", 'danger');
            } else {
                 showNotification(`${translations[currentLang]?.settings_notify_import_fail || "Import failed."} ${error.message}`, 'danger'); // Updated key
            }
        } finally {
             // --- Restore button state (keep as before) ---
             importButton.disabled = false;
             const importBtnKey = 'settings_button_import_data';
             importButton.innerHTML = originalButtonText; // Restore exact original content
             fileInput.value = null;
        }
    };
    // --- reader.onerror and reader.readAsText (keep as before) ---
    reader.onerror = (event) => { /* ... */ };
    reader.readAsText(file);
}

// --- *** REFACTOR Delete Data Handler *** ---
async function handleDeleteData() {
    const deleteButton = document.getElementById('delete-data-btn');
    if (!deleteButton || deleteButton.disabled) return;

    const confirmKey = 'settings_notify_delete_confirm'; // Updated key context
    if (!confirm(translations[currentLang]?.[confirmKey] || "Delete ALL application and settings data?")) {
        return;
    }

    // --- Button loading state (keep as before) ---
    const originalButtonText = deleteButton.innerHTML;
    deleteButton.disabled = true;
    const deletingKey = 'settings_notify_delete_deleting';
    deleteButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[deletingKey] || 'Deleting...'}`;

    try {
        // *** Clear APPLICATIONS table ***
        await db.applications.clear();
        // *** Keep clearing settings if desired ***
        await db.settings.clear();

        showNotification(translations[currentLang]?.settings_notify_delete_success || "All data deleted. Reloading...", 'success'); // Updated key

        // Reload page (keep as before)
        setTimeout(() => { window.location.reload(); }, 2000);

    } catch (error) {
        // --- Error handling and button restore (keep as before) ---
        console.error("Error deleting data:", error);
        showNotification(translations[currentLang]?.settings_notify_delete_fail || "Failed to delete data.", 'danger');
        deleteButton.disabled = false;
        const deleteBtnKey = 'settings_button_delete_data';
        deleteButton.innerHTML = originalButtonText; // Restore exact original content
    }
}


// --- initSettingsPage (No changes needed, just ensure listeners call refactored handlers) ---
function initSettingsPage() {
    console.log("Initializing Settings page...");
    loadSettingsForm(); // Personal info, API key
    document.getElementById('update-profile-btn')?.addEventListener('click', saveUserProfile);
    document.getElementById('save-api-key-btn')?.addEventListener('click', saveApiKeySetting);
    // Listeners for refactored handlers
    document.getElementById('export-data-btn')?.addEventListener('click', handleExportData);
    document.getElementById('import-data-btn')?.addEventListener('click', handleImportData);
    document.getElementById('delete-data-btn')?.addEventListener('click', handleDeleteData);
    // Delete confirm checkbox listener (keep as before)
    const deleteCheckbox = document.getElementById('delete-confirm-checkbox');
    const deleteButton = document.getElementById('delete-data-btn');
    if (deleteCheckbox && deleteButton) {
        deleteCheckbox.addEventListener('change', () => {
            deleteButton.disabled = !deleteCheckbox.checked;
        });
        // Ensure initial state is correct
        deleteButton.disabled = !deleteCheckbox.checked;
    }
}



// Expose displayApiKeyStatus globally if aiAPI.js needs to call it directly
window.displayApiKeyStatus = displayApiKeyStatus;
// --- END OF FILE settings.js ---





