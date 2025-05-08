// --- START OF FILE myResumes.js ---

// Rename DOM Elements variables
const appListContainer = document.getElementById('resume-list-container'); // Keep old ID or update HTML ID too
const appCardTemplate = document.getElementById('application-card-template'); // Use new template ID

// --- NEW: Edit Info Modal Elements ---
const editInfoModalElement = document.getElementById('modal-edit-app-info');
const editInfoModalSaveBtn = document.getElementById('modal-edit-save-btn');
const editAppNameInput = document.getElementById('edit-application-name');
const editAppJobDescInput = document.getElementById('edit-application-jobdesc');
const editAppLanguageSelect = document.getElementById('edit-application-language');
const editAppIdInput = document.getElementById('edit-application-id');
const editModalError = document.getElementById('modal-edit-error');
let editInfoModalInstance = null; // To hold the modal object 


// Create Modal Elements (Update selectors)
const createModalElement = document.getElementById('modal-create-application'); // New ID
const createModalSaveBtn = document.getElementById('modal-create-save-btn');
const newAppNameInput = document.getElementById('new-application-name');     // New ID
const newAppJobDescInput = document.getElementById('new-application-jobdesc'); // New ID
const createModalError = document.getElementById('modal-create-error');
let createModalInstance = null;


const newAppLanguageSelect = document.getElementById('new-application-language'); // Get language select

// Sidebar Filter Elements

const filterLangEn = document.querySelector('input[name="form-type[]"][value="en"]');
const filterLangAr = document.querySelector('input[name="form-type[]"][value="ar"]');



// (NEW) Filter Elements
const filterForm = document.getElementById('filter-form');
const searchInput = document.getElementById('filter-search-name');
const filterLangCheckboxes = document.querySelectorAll('.filter-lang'); // Use class
const filterDateRadios = document.querySelectorAll('.filter-date');     // Use class
const clearFiltersBtn = document.getElementById('clear-filters-btn');

// (NEW) Single Import Elements
const importSingleBtn = document.getElementById('import-single-resume-btn');
const importSingleFileInput = document.getElementById('single-resume-import-input');

let allFetchedApplications = []; // Cache applications

const nameEl = clone.querySelector('.application-name a');
const avatarEl = clone.querySelector('.avatar');


// --- Render List (MODIFIED) ---
function renderApplicationList(applications) {
    if (!appListContainer || !appCardTemplate) return;
    appListContainer.innerHTML = '';

    if (!applications || applications.length === 0) {
        // ... (keep existing empty list handling) ...
        const msgKey = 'myapplications_no_applications';
        const createLinkKey = 'myapplications_create_link';
        const msg = translations[currentLang]?.[msgKey] || "You haven't created any applications yet.";
        const createLink = translations[currentLang]?.[createLinkKey] || "Create one now!";
        appListContainer.innerHTML = `<div class="col-12"><div class="card card-body text-center text-muted">${msg} <a href="#" data-bs-toggle="modal" data-bs-target="#modal-create-application">${createLink}</a></div></div>`;
        return;
    }

    applications.forEach(app => {
        const clone = appCardTemplate.content.firstElementChild.cloneNode(true);
        const applicationId = app.id;

        clone.dataset.applicationId = applicationId;
        const nameEl = clone.querySelector('.application-name a');
        const roleEl = clone.querySelector('.application-role');
        const langBadge = clone.querySelector('.application-language span');
        const updatedEl = clone.querySelector('.application-updated');
        // --- NEW: Dropdown Item Selectors ---
        const editInfoBtn = clone.querySelector('.edit-app-info-btn');
        const editResumeBtn = clone.querySelector('.edit-resume-content-btn');
        const editCoverLetterBtn = clone.querySelector('.edit-cover-letter-btn');
        const editJobTrainerBtn = clone.querySelector('.edit-job-trainer-btn');
        // --- End Dropdown Item Selectors ---
        const avatarEl = clone.querySelector('.avatar');
        const deleteBtn = clone.querySelector('.delete-application-btn');
        const duplicateBtn = clone.querySelector('.duplicate-application-btn');
        const exportBtn = clone.querySelector('.export-application-btn');
        const downloadPdfBtn = clone.querySelector('.download-resume-pdf-btn');

        // Translate static template parts (including new dropdown items)
        clone.querySelectorAll('[data-translate]').forEach(el => {
             const key = el.getAttribute('data-translate');
             const translation = translations[currentLang]?.[key];
             if (translation !== undefined) {
                // Attempt to only update text nodes to preserve icons etc.
                let targetNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
                if (targetNode) {
                    targetNode.textContent = ` ${translation} `; // Add spacing maybe
                } else if (el.childNodes.length === 1 && el.firstChild.nodeType === Node.TEXT_NODE) {
                    el.textContent = translation; // Fallback for simple text elements
                } else if (el.tagName === 'BUTTON' || el.tagName === 'A') {
                    // Fallback specifically for buttons/links - might replace icons
                     // console.warn(`Could not find text node in translatable element:`, el);
                     // Maybe find a specific span inside? e.g., el.querySelector('span').textContent = translation;
                } else {
                     el.textContent = translation; // General fallback
                }
            }
        });

        // Populate card from application data (Keep existing logic)
        if (nameEl) {
            nameEl.textContent = app.applicationName || (translations[currentLang]?.myapplications_untitled || 'Untitled Application');
             nameEl.href = `./ResumeBuilder.html?applicationId=${applicationId}`; // Default link for name click
        }
        if (roleEl) { roleEl.textContent = app.resumeData?.personalInfo?.role || ''; }
        if (langBadge) {
            const langCode = app.resumeData?.settings?.language || 'en';
            const langTextKey = langCode === 'ar' ? 'lang_arabic' : 'lang_english';
            const langText = translations[currentLang]?.[langTextKey] || (langCode === 'ar' ? 'Arabic' : 'English');
            langBadge.textContent = langText;
            langBadge.className = `badge ${langCode === 'ar' ? 'bg-info' : 'bg-green'}`;
        }
        if (updatedEl) {
            const updatedLabel = translations[currentLang]?.myapplications_card_label_updated || 'Updated';
            updatedEl.textContent = `${updatedLabel}: ${app.updatedAt ? new Date(app.updatedAt).toLocaleDateString('en-GB') : '-'}`;
        }
        if (avatarEl) {
            if (app.resumeData?.personalInfo?.photo) {
                avatarEl.style.backgroundImage = `url(${app.resumeData.personalInfo.photo})`;
                avatarEl.textContent = ''; avatarEl.classList.remove('avatar-placeholder');
            } else {
                const appName = app.applicationName || 'A';
                avatarEl.textContent = appName?.match(/\b(\w)/g)?.join('').substring(0, 2).toUpperCase() || '?';
                avatarEl.style.backgroundImage = ''; avatarEl.classList.add('avatar-placeholder');
            }
        }

        // --- Set HREF for Dropdown Links ---
        if (editResumeBtn) { editResumeBtn.href = `./ResumeBuilder.html?applicationId=${applicationId}`; }
        if (editCoverLetterBtn) { editCoverLetterBtn.href = `./AiCoverLetter.html?applicationId=${applicationId}`; }
        if (editJobTrainerBtn) { editJobTrainerBtn.href = `./AiJobTrainer.html?applicationId=${applicationId}`; }

        // --- Add Listener for Edit Info Button ---
        if (editInfoBtn && editInfoModalInstance) {
            editInfoBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                console.log(`Edit Info clicked for App ID: ${applicationId}`);
                // Fetch fresh data before showing modal
                const appData = await getApplication(applicationId);
                if (appData) {
                    editAppIdInput.value = appData.id;
                    editAppNameInput.value = appData.applicationName || '';
                    editAppJobDescInput.value = appData.jobDescription || '';
                    editAppLanguageSelect.value = appData.resumeData?.settings?.language || 'en';
                    editModalError.style.display = 'none'; // Clear previous errors
                    editInfoModalInstance.show();
                } else {
                    showNotification("Error: Could not load application data for editing.", 'danger');
                }
            });
        } else if (editInfoBtn && !editInfoModalInstance) {
            console.error("Edit Info Modal Instance not initialized!");
        }

        // Other Action Listeners (Duplicate, Delete, Export, Download PDF - keep existing)
        duplicateBtn?.addEventListener('click', (e) => { e.preventDefault(); handleDuplicateApplication(applicationId); });
        deleteBtn?.addEventListener('click', (e) => { e.preventDefault(); handleDeleteApplication(applicationId); });
        exportBtn?.addEventListener('click', (e) => { e.preventDefault(); handleExportApplication(applicationId); });
        downloadPdfBtn?.addEventListener('click', (e) => { e.preventDefault(); handleDownloadResumePdf(applicationId); });

        appListContainer.appendChild(clone);
    });
    // Translate elements that were added dynamically if needed (e.g., the empty message)
    // translatePage(currentLang); // Called after loadAndRender in init now
}
// --- Action Handlers (Refactored) ---
async function handleDuplicateApplication(id) { // Renamed, uses duplicateApplication
    if (!confirm(translations[currentLang]?.myapplications_confirm_duplicate || `Duplicate this application?`)) return;
    console.log(`Duplicating application ID: ${id}`);
    const newId = await duplicateApplication(id); // Use refactored Dexie helper
    if (newId) {
        showNotification(translations[currentLang]?.myapplications_notify_duplicate_success || "Application duplicated!", 'success');
        await loadAndRenderApplications(); // Refresh list
    } else {
        showNotification(translations[currentLang]?.myapplications_notify_duplicate_fail || "Failed to duplicate.", 'danger');
    }
}

async function handleDeleteApplication(id) { // Renamed, uses deleteApplication
    if (!confirm(translations[currentLang]?.myapplications_confirm_delete || `Delete this application permanently?`)) return;
    console.log(`Deleting application ID: ${id}`);
    const success = await deleteApplication(id); // Use refactored Dexie helper
    if (success) {
        showNotification(translations[currentLang]?.myapplications_notify_delete_success || "Application deleted!", 'success');
        appListContainer.querySelector(`.application-card-item[data-application-id="${id}"]`)?.remove();
        if (appListContainer.children.length === 0) {
            renderApplicationList([]); // Show empty message if needed
        }
    } else {
        showNotification(translations[currentLang]?.myapplications_notify_delete_fail || "Failed to delete.", 'danger');
    }
}

async function handleExportApplication(id) { // New handler for single app export
     console.log(`Exporting application ID as JSON: ${id}`);
     const appData = await getApplication(id); // Use refactored Dexie helper
     if (appData) {
        const exportData = { ...appData };
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        // --- UPDATE: Use applicationName for filename ---
        const filename = (appData.applicationName || `application_${id}`).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.href = url;
        a.download = `${filename}_application.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification(translations[currentLang]?.myapplications_notify_export_success || "Application exported.", 'info');
     } else {
        showNotification(translations[currentLang]?.myapplications_notify_export_fail || "Could not find application data.", 'warning');
    }
}

function handleDownloadResumePdf(id) { // New handler specifically for resume PDF
    // Redirect to builder with action flag
     showNotification(translations[currentLang]?.myapplications_notify_pdf_redirect || `Generating Resume PDF...`, 'info');
     window.location.href = `./ResumeBuilder.html?applicationId=${id}&action=downloadResume`; // Need builder logic to handle this
}


// --- Create New Application Logic (Keep existing) ---
async function handleCreateNewApplication() {
    const name = newAppNameInput.value.trim();
    const jobDesc = newAppJobDescInput.value.trim();
    const language = newAppLanguageSelect.value; // Get language from correct ID

    if (!name) {
        createModalError.textContent = translations[currentLang]?.myapplications_modal_error_name || "Please enter an application name.";
        createModalError.style.display = 'block';
        newAppNameInput.focus();
        return;
    }
    createModalError.style.display = 'none';

    createModalSaveBtn.disabled = true;
    const creatingText = translations[currentLang]?.myresumes_create_loading || 'Creating...';
    createModalSaveBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${creatingText}`;

    const now = new Date();
    const newApplicationData = {
        applicationName: name,
        jobDescription: jobDesc,
        companyName: '',
        hiringManager: '',
        resumeData: {
            personalInfo: { },
            settings: { language: language, themeColor: '#206bc4', fontFamily: "'Inter', sans-serif", fontSize: '10pt', documentSize: 'A4' },
            workExperience: [], education: [], skills: [], trainings: [],
            projects: [], certifications: [], awards: [], publications: [],
            volunteering: [], languages: [], interests: [], socialMedia: [],
            references: [], customSections: []
        },
        coverLetterData: { content: '' },
        aiTrainerData: { behavioral: [], technical: [], situational: [] },
        createdAt: now,
        updatedAt: now
    };

    try {
        const newId = await saveApplication(newApplicationData);
        if (newId) {
            showNotification(translations[currentLang]?.myapplications_notify_create_success || "Application created!", 'success');
            if (createModalInstance) createModalInstance.hide();
            window.location.href = `./ResumeBuilder.html?applicationId=${newId}`;
        } else {
            throw new Error("Failed to save new application.");
        }
    } catch (error) {
        console.error("Error creating new application:", error);
        createModalError.textContent = translations[currentLang]?.myapplications_modal_error_save || "Error saving application.";
        createModalError.style.display = 'block';
        createModalSaveBtn.disabled = false;
        createModalSaveBtn.innerHTML = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
    }
}

// --- Single Application Import Handler (Keep existing) ---
async function handleSingleApplicationImport(file) {
    if (!file || !file.type.includes('json')) {
        showNotification(translations[currentLang]?.myapplications_notify_single_import_select || "Please select a valid JSON file.", 'warning');
        return;
    }
    showNotification(translations[currentLang]?.myapplications_notify_single_import_reading || "Reading application file...", 'info');
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const fileContent = event.target.result;
            const importedAppData = JSON.parse(fileContent);

             if (!importedAppData || typeof importedAppData !== 'object' || Array.isArray(importedAppData) || !importedAppData.applicationName) {
                throw new Error(translations[currentLang]?.myapplications_notify_single_import_invalid || "Invalid application data format (missing applicationName).");
           }

            const now = new Date();
            const { id, ...appWithoutId } = importedAppData;

            appWithoutId.createdAt = appWithoutId.createdAt || now;
            appWithoutId.updatedAt = now;
            appWithoutId.resumeData = appWithoutId.resumeData || {};
            appWithoutId.coverLetterData = appWithoutId.coverLetterData || {};
            appWithoutId.aiTrainerData = appWithoutId.aiTrainerData || {};

            showNotification(translations[currentLang]?.myapplications_notify_single_import_saving || "Importing application...", 'info');
            const newId = await saveApplication(appWithoutId);

            if (newId) {
                showNotification(translations[currentLang]?.myapplications_notify_single_import_success || "Application imported!", 'success');
                allFetchedApplications = []; // Clear cache
                await loadAndRenderApplications(getFilterFunction()); // Refresh list with current filters
            } else {
                throw new Error("Failed to save imported application.");
            }
        } catch (error) {
            console.error("Error importing single application:", error);
            let errorMsg = translations[currentLang]?.myapplications_notify_single_import_fail || "Failed to import application.";
            if (error instanceof SyntaxError) {
                 errorMsg = translations[currentLang]?.myapplications_notify_single_import_parse_error || "Error parsing file.";
            } else if (error.message.includes("Invalid application data format")) {
                 errorMsg = error.message; // Use the specific error message
            }
             showNotification(errorMsg, 'danger');
        } finally {
            if (importSingleFileInput) importSingleFileInput.value = null;
        }
    };
    reader.onerror = (event) => {
        console.error("File reading error:", event.target.error);
        showNotification("Error reading file.", 'danger');
        if (importSingleFileInput) importSingleFileInput.value = null;
    };
    reader.readAsText(file);
}

// --- Load and Render (Keep existing structure) ---
async function loadAndRenderApplications(filterFn = null) {
    // Show loading indicator (optional)
    appListContainer.innerHTML = `<div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div><p class="mt-2" data-translate="myresumes_loading">${translations[currentLang]?.myresumes_loading || 'Loading...'}</p></div>`;

    try {
        // Fetch only if cache is empty OR if not filtering (to ensure fresh data on initial load/clear)
        if (allFetchedApplications.length === 0 || !filterFn) {
            console.log("Fetching all applications from DB...");
            allFetchedApplications = await getAllApplications();
        } else {
            console.log("Using cached applications for filtering.");
        }

        let appsToRender = allFetchedApplications;
        if (typeof filterFn === 'function') {
            console.log("Applying filter function...");
            appsToRender = allFetchedApplications.filter(filterFn);
            console.log(`Filtered ${allFetchedApplications.length} down to ${appsToRender.length}`);
        } else {
             console.log(`Rendering all ${appsToRender.length} applications.`);
        }

        renderApplicationList(appsToRender); // Render the list
        // translatePage(currentLang); // Translate elements within the cards - RENDER DOES THIS NOW

    } catch (error) {
        console.error("Error loading applications:", error);
        const errorKey = 'myapplications_error_loading';
        appListContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">${translations[currentLang]?.[errorKey] || 'Error loading applications.'}</div></div>`;
    }
}

// --- Filtering Logic (REVISED) ---
function getFilterFunction() {
    console.log("getFilterFunction called");
    const searchTerm = searchInput.value.trim().toLowerCase();
    // Ensure we get the value from the currently checked radio button
    const dateFilterRadio = document.querySelector('.filter-date:checked');
    const dateFilter = dateFilterRadio ? dateFilterRadio.value : 'all'; // Get value or default to 'all'

    const checkedLangs = Array.from(filterLangCheckboxes)
                            .filter(cb => cb.checked)
                            .map(cb => cb.value);

   const hasActiveFilter = searchTerm || dateFilter !== 'all' || (checkedLangs.length > 0 && checkedLangs.length < filterLangCheckboxes.length);

    if (!hasActiveFilter) {
        console.log("No active filters.");
        return null; // Return null if no filters are active
    }

    console.log("Filtering with:", { searchTerm, dateFilter, checkedLangs });

    // --- Date Range Calculation ---
    // Use a fresh Date object for baseline calculations
    const now = new Date();

    // Calculate start of today (local time)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Calculate start of the current week (assuming Monday is the first day)
    const currentDayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    // Calculate days to subtract to get to the previous/current Monday
    const diffToMonday = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const weekStart = new Date(todayStart); // Clone start of today
    weekStart.setDate(todayStart.getDate() + diffToMonday); // Adjust date to Monday

    // Calculate start of the current month (local time)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    // Log calculated date boundaries for debugging (optional)
    // console.log("Date Boundaries (Local Time):", {
    //     todayStart: todayStart.toISOString(),
    //     weekStart: weekStart.toISOString(),
    //     monthStart: monthStart.toISOString()
    // });
    // --- End Date Range Calculation ---

    return (app) => {
        let nameMatch = true;
        let langMatch = true;
        let dateMatch = true;

        // Name Filter
        if (searchTerm) {
            // Ensure applicationName exists before calling toLowerCase
            nameMatch = app.applicationName?.toLowerCase().includes(searchTerm) ?? false;
        }

        // Language Filter
        if (checkedLangs.length > 0 && checkedLangs.length < filterLangCheckboxes.length) {
            const appLang = app.resumeData?.settings?.language || 'en'; // Default to 'en' if undefined
            langMatch = checkedLangs.includes(appLang);
        } else if (checkedLangs.length === 0) {
            // If NO languages are checked, nothing should match
            langMatch = false;
        }
        // If all languages are checked, langMatch remains true

        // Date Filter
        if (dateFilter !== 'all') {
            // IMPORTANT: Check if app.updatedAt exists and is valid
            const updatedAtTimestamp = app.updatedAt;
            if (!updatedAtTimestamp || typeof updatedAtTimestamp !== 'number') {
                 // Treat items with missing/invalid update dates as non-matching when filtering by date
                 console.warn(`App ID ${app.id} has missing or invalid 'updatedAt':`, updatedAtTimestamp);
                 dateMatch = false;
            } else {
                const updatedAt = new Date(updatedAtTimestamp); // Create Date object (in local time)

                if (isNaN(updatedAt.getTime())) { // Double-check if the created date is valid
                     console.warn(`App ID ${app.id} 'updatedAt' resulted in invalid Date object.`);
                    dateMatch = false;
                } else {
                     // Perform comparisons using timestamps for accuracy
                    const updatedAtTime = updatedAt.getTime();
                    const todayStartTime = todayStart.getTime();
                    const weekStartTime = weekStart.getTime();
                    const monthStartTime = monthStart.getTime();

                    // console.log(`App ID ${app.id} - Comparing Date: ${updatedAt.toISOString()} (${updatedAtTime})`); // Debug log

                    if (dateFilter === 'today') {
                        // Check if updatedAt is on or after the start of today
                        dateMatch = updatedAtTime >= todayStartTime;
                        // console.log(` -> Today Filter: ${updatedAtTime} >= ${todayStartTime}? ${dateMatch}`);
                    } else if (dateFilter === 'last_week') {
                        // Check if updatedAt is on or after the start of the current week (Monday)
                        dateMatch = updatedAtTime >= weekStartTime;
                        // console.log(` -> Week Filter: ${updatedAtTime} >= ${weekStartTime}? ${dateMatch}`);
                    } else if (dateFilter === 'this_month') {
                        // Check if updatedAt is on or after the start of the current month
                        dateMatch = updatedAtTime >= monthStartTime;
                        // console.log(` -> Month Filter: ${updatedAtTime} >= ${monthStartTime}? ${dateMatch}`);
                    }
                }
            }
        }

        const result = nameMatch && langMatch && dateMatch;
        // console.log(`App ID ${app.id} (${app.applicationName}): name=${nameMatch}, lang=${langMatch}, date=${dateMatch} -> Result: ${result}`);
        return result;
    };
}



// --- *** NEW: Edit Info Modal Save Handler *** ---
async function handleSaveEditInfo() {
    const appId = parseInt(editAppIdInput.value);
    const newName = editAppNameInput.value.trim();
    const newJobDesc = editAppJobDescInput.value.trim();
    const newLang = editAppLanguageSelect.value;

    if (!appId) {
        editModalError.textContent = "Error: Application ID missing.";
        editModalError.style.display = 'block';
        return;
    }
    if (!newName) {
        editModalError.textContent = translations[currentLang]?.myapplications_modal_error_name || "Please enter an application name.";
        editModalError.style.display = 'block';
        editAppNameInput.focus();
        return;
    }
    editModalError.style.display = 'none';

    // Set loading state
    editInfoModalSaveBtn.disabled = true;
    const savingText = translations[currentLang]?.myapplications_notify_saving || 'Saving...'; // Reuse saving key
    editInfoModalSaveBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${savingText}`;

    try {
        // Fetch the existing application data
        const existingAppData = await getApplication(appId);
        if (!existingAppData) {
            throw new Error("Application data could not be found for saving.");
        }

        // Update the fields
        existingAppData.applicationName = newName;
        existingAppData.jobDescription = newJobDesc;
        // Ensure nested objects exist before setting
        if (!existingAppData.resumeData) existingAppData.resumeData = {};
        if (!existingAppData.resumeData.settings) existingAppData.resumeData.settings = {};
        existingAppData.resumeData.settings.language = newLang;
        // Sync resume name if desired
        if (!existingAppData.resumeData.personalInfo) existingAppData.resumeData.personalInfo = {};
        existingAppData.resumeData.personalInfo.name = newName; // Sync name
        existingAppData.updatedAt = new Date();

        // Save the updated application object
        const savedId = await saveApplication(existingAppData, appId);

        if (savedId) {
            showNotification(translations[currentLang]?.myapplications_notify_edit_success || "Application info updated!", 'success');
            editInfoModalInstance.hide();

            // Update the cache and re-render the specific card or the whole list
            const index = allFetchedApplications.findIndex(app => app.id === appId);
            if (index !== -1) {
                allFetchedApplications[index] = existingAppData; // Update cache
            } else {
                allFetchedApplications = []; // Or clear cache to force full reload
            }
            // Simple approach: reload the whole list with current filters
            await loadAndRenderApplications(getFilterFunction());
        } else {
            throw new Error("Failed to save application updates.");
        }

    } catch (error) {
        console.error("Error saving application info:", error);
        editModalError.textContent = translations[currentLang]?.myapplications_modal_error_save || "Error saving changes.";
        editModalError.style.display = 'block';
    } finally {
        // Restore button state
        editInfoModalSaveBtn.disabled = false;
        editInfoModalSaveBtn.innerHTML = translations[currentLang]?.myapplications_edit_modal_button_save || 'Save Changes';
    }
}


// --- Initialization (MODIFIED) ---
function initMyApplicationsPage() {
    console.log("Initializing My Applications page...");

    // Initialize Create Modal
    if (createModalElement) {
        createModalInstance = new bootstrap.Modal(createModalElement);
        createModalSaveBtn?.addEventListener('click', handleCreateNewApplication);
        // ... (rest of create modal setup) ...
        createModalElement.addEventListener('hidden.bs.modal', () => {
             newAppNameInput.value = '';
             newAppJobDescInput.value = '';
             newAppLanguageSelect.value = 'en';
             createModalError.style.display = 'none';
             createModalSaveBtn.disabled = false;
             createModalSaveBtn.innerHTML = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
         });
    }

    // *** NEW: Initialize Edit Info Modal ***
    if (editInfoModalElement) {
        editInfoModalInstance = new bootstrap.Modal(editInfoModalElement);
        editInfoModalSaveBtn?.addEventListener('click', handleSaveEditInfo);
         // Add listener to clear edit modal on close
         editInfoModalElement.addEventListener('hidden.bs.modal', () => {
             editAppIdInput.value = '';
             editAppNameInput.value = '';
             editAppJobDescInput.value = '';
             editAppLanguageSelect.value = 'en';
             editModalError.style.display = 'none';
             editInfoModalSaveBtn.disabled = false; // Ensure button is enabled
             editInfoModalSaveBtn.innerHTML = translations[currentLang]?.myapplications_edit_modal_button_save || 'Save Changes';
         });
    } else {
        console.warn("Edit Info Modal element not found.");
    }

    // Link header create button
    document.getElementById('create-new-resume-btn-header')?.addEventListener('click', (e) => {
         e.preventDefault();
         if (createModalInstance) createModalInstance.show();
     });

          //Live Filters Search Input
    searchInput?.addEventListener('input', (e) => {
        e.preventDefault(); // Prevent default form submission
        console.log("Live Filter Search button changed.");
        const filterFn = getFilterFunction();
        loadAndRenderApplications(filterFn); // Reload list with filters applied
     });

    // Filter listeners (Keep existing)
    filterForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        console.log("Filter form submitted.");
        const filterFn = getFilterFunction();
        loadAndRenderApplications(filterFn);
    });
    clearFiltersBtn?.addEventListener('click', () => {
         console.log("Clear filters clicked.");
         if (searchInput) searchInput.value = '';
         filterLangCheckboxes.forEach(cb => cb.checked = true);
         filterDateRadios.forEach(rb => { rb.checked = (rb.value === 'all'); });
         loadAndRenderApplications(null);
         showNotification(translations[currentLang]?.myapplications_notify_filters_cleared || "Filters cleared.", 'info');
     });

    // Single Import Listeners (Keep existing)
    importSingleBtn?.addEventListener('click', () => { importSingleFileInput?.click(); });
    importSingleFileInput?.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) {
            handleSingleApplicationImport(file);
        }
     });


         // Handle #create hash on page load
         if (window.location.hash === '#create' && createModalInstance) {
            // Delay showing modal slightly to ensure page elements are fully ready
            setTimeout(() => {
                 createModalInstance.show();
                 // Optional: remove the hash
                 history.pushState("", document.title, window.location.pathname + window.location.search);
            }, 100); // Small delay
        }

    // Initial Load (no filter)
    loadAndRenderApplications(null);
}
// --- showNotification (Keep) ---

// --- END OF FILE myResumes.js ---