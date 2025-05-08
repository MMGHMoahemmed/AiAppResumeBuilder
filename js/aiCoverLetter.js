// --- START OF FILE aiCoverLetter.js ---

// --- Global Variables ---
let currentApplicationId = null; // Holds the ID of the Application being edited
let currentApplicationData = null; // Holds the entire loaded Application object
let selectedTemplateId = 'default'; // **** NEW: Store selected template ID ****

// --- DOM Elements ---
const jobDescInput = document.getElementById('job-description-input');
const companyInput = document.getElementById('company-name-input');
const managerInput = document.getElementById('hiring-manager-input');
const coverLetterTextarea = document.getElementById('existing-cover-letter-input'); // Main editable area
const previewDiv = document.getElementById('cover-letter-preview'); // Preview container
const generateDescOnlyBtn = document.getElementById('generate-cl-desc-only-btn');
const generateDescInfoBtn = document.getElementById('generate-cl-desc-info-btn');
const enhanceDescBtn = document.getElementById('enhance-cl-desc-btn');
const enhanceDescInfoBtn = document.getElementById('enhance-cl-desc-info-btn');
const generationLangSelect = document.getElementById('generation-language-select');
const saveBtn = document.getElementById('save-cl-btn');
const downloadBtn = document.getElementById('download-cl-btn');
const currentCoverLetterIdInput = document.getElementById('current-cover-letter-id'); // Hidden input for App ID

// --- NEW: Modal Elements for Creation on Builder Page ---
const createModalElementBuilder = document.getElementById('modal-create-application'); // Reuse ID
const createModalSaveBtnBuilder = document.getElementById('modal-create-save-btn'); // Reuse ID
const newAppNameInputBuilder = document.getElementById('new-application-name'); // Reuse ID
const newAppJobDescInputBuilder = document.getElementById('new-application-jobdesc'); // Reuse ID
const newAppLanguageSelectBuilder = document.getElementById('new-application-language'); // Reuse ID
const createModalErrorBuilder = document.getElementById('modal-create-error'); // Reuse ID
let createModalInstanceBuilder = null; // Separate instance variable for this page

// --- **** NEW: Template Modal Elements **** ---
const changeTemplateBtnCL = document.getElementById('change-cl-template-btn');
const templateModalElementCL = document.getElementById('modal-change-template'); // Reuse ID from ResumeBuilder
const templateModalInstanceCL = templateModalElementCL ? new bootstrap.Modal(templateModalElementCL) : null;
const templateSelectionContainerCL = document.getElementById('template-selection-container'); // Reuse ID


// --- *** NEW: Download Modal Elements *** ---
const downloadModalElementCL = document.getElementById('modal-download-options-cl'); // Specific ID
const downloadModalInstanceCL = downloadModalElementCL ? new bootstrap.Modal(downloadModalElementCL) : null;
const downloadOptionsContainerCL = document.getElementById('download-options-container-cl'); // Specific ID




// --- Core Functions ---

// --- *** MODIFIED: updatePreview Function *** ---
function updatePreview() {
    if (!previewDiv) {
        console.error("Preview container not found.");
        return;
    }

    // 1. Collect data needed for the cover letter preview
    //    We need the currentApplicationData mostly, but also live inputs if available
    const letterContent = coverLetterTextarea?.value || currentApplicationData?.coverLetterData?.content || '';
    const companyName = companyInput?.value || currentApplicationData?.companyName || '';
    const hiringManager = managerInput?.value || currentApplicationData?.hiringManager || '';
    const jobDescription = jobDescInput?.value || currentApplicationData?.jobDescription || '';
    // Get user info from applicationData if it exists
    const personalInfo = currentApplicationData?.resumeData?.personalInfo || {};
    const themeColor = currentApplicationData?.resumeData?.settings.themeColor || '';
    const fontFamily =currentApplicationData?.resumeData?.settings.fontFamily || '';

    // Prepare data structure for the template generator
    const previewData = {
        companyName: companyName,
        hiringManager: hiringManager,
        jobDescription: jobDescription, // May not be directly used in template, but good context
        letterContent: letterContent,
        settings:{
            themeColor: themeColor || '',
            fontFamily: fontFamily || '',
            },
        personalInfo: { // Pass relevant personal info for letterhead/signature
            name: personalInfo.name || '',
            email: personalInfo.email || '',
            phone: personalInfo.phone || '',
            location: personalInfo.location || '',
            website: personalInfo.website || '',
            linkedin: personalInfo.linkedin || '',
            // Add other relevant fields if templates use them
        },

        // Add settings if templates use them (e.g., font size)
        // settings: currentApplicationData?.settings || {}
    };

    // 2. Check if necessary global objects are available
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.error("Translations or currentLang not available for preview generation.");
        previewDiv.innerHTML = `<div class="text-center p-5 text-muted">Preview unavailable: Missing language data.</div>`;
        return;
    }

    // 3. Select the template generator function using the NEW cover letter getter
    let templateGenerator;
    if (typeof getCoverLetterTemplateGenerator === 'function') { // **** Use NEW function ****
        templateGenerator = getCoverLetterTemplateGenerator(selectedTemplateId); // Use the global variable
    } else {
         console.error("getCoverLetterTemplateGenerator function not found. Make sure previewTemplates.js is loaded correctly.");
         previewDiv.innerHTML = `<div class="text-center p-5 text-muted">Preview generation function missing.</div>`;
         return;
    }

    // 4. Generate HTML using the SELECTED function
    let generatedHTML = '';
    if (typeof templateGenerator === 'function') {
        try {
            // **** Pass the structured previewData ****
            generatedHTML = templateGenerator(previewData, translations, currentLang);
        } catch (error) {
             console.error(`Error executing cover letter template generator for ID '${selectedTemplateId}':`, error);
             generatedHTML = `<div class="text-center p-5 text-danger">Error generating preview for template '${selectedTemplateId}'. Check console.</div>`;
        }
    } else {
        console.error(`Cover letter template generator for ID '${selectedTemplateId}' is not a function.`);
        generatedHTML = `<div class="text-center p-5 text-muted">Error loading template '${selectedTemplateId}'.</div>`;
    }

    // 5. Inject the generated HTML into the preview container
    previewDiv.innerHTML = generatedHTML;

    // 6. Re-apply translations to any preview elements that use data-translate
    previewDiv.querySelectorAll('[data-translate]').forEach(el => {
         const key = el.getAttribute('data-translate');
         if (translations[currentLang] && translations[currentLang][key]) {
             el.textContent = translations[currentLang][key];
         } else if (translations['en'] && translations['en'][key]) {
             el.textContent = translations['en'][key];
         }
     });
}
// --- *** END updatePreview Modification *** ---




// --- AI Call ---
// action: 'generate_desc_only', 'generate_desc_info', 'enhance_desc', 'enhance_desc_info'
async function callAI(action, buttonElement) {
    if (!currentApplicationData) {
        showNotification(translations[currentLang]?.cover_letter_notify_app_load_fail || "Error: Application data not loaded. Cannot run AI.", "danger");
        return;
    }

    // Get common inputs
    const jobDesc = jobDescInput?.value.trim() || currentApplicationData.jobDescription || '';
    const company = companyInput?.value.trim() || currentApplicationData.companyName || '';
    const manager = managerInput?.value.trim() || currentApplicationData.hiringManager || '';
    const existingText = coverLetterTextarea?.value.trim(); // Get current content from the main textarea
    const generationLang = generationLangSelect?.value || 'en'; // Get selected language

    let useMyInfo = false;
    let isEnhance = false;
    let loadingKey = '';
    let notifyFailKey = 'cover_letter_notify_ai_fail';
    let apiAction = 'generate'; // Default API action

    // Determine parameters based on the button clicked (action string)
    switch (action) {
        case 'generate_desc_only':
            if (!jobDesc) {
                showNotification(translations[currentLang]?.cover_letter_notify_job_desc_missing || "Please provide the job description.", 'warning');
                jobDescInput?.focus(); return;
            }
            loadingKey = 'cover_letter_notify_generating';
            break;
        case 'generate_desc_info':
            if (!jobDesc) {
                showNotification(translations[currentLang]?.cover_letter_notify_job_desc_missing || "Please provide the job description.", 'warning');
                jobDescInput?.focus(); return;
            }
            useMyInfo = true;
            loadingKey = 'cover_letter_notify_generating';
            break;
        case 'enhance_desc':
            if (!existingText) {
                showNotification(translations[currentLang]?.cover_letter_notify_existing_missing || "Please provide the letter content to enhance.", 'warning');
                coverLetterTextarea?.focus(); return;
            }
            if (!jobDesc) { // Job desc still needed for context
                showNotification(translations[currentLang]?.cover_letter_notify_job_desc_missing || "Job description needed for context.", 'warning');
                jobDescInput?.focus(); return;
            }
            isEnhance = true;
            apiAction = 'enhance';
            loadingKey = 'cover_letter_notify_enhancing';
            break;
        case 'enhance_desc_info':
            if (!existingText) {
                showNotification(translations[currentLang]?.cover_letter_notify_existing_missing || "Please provide the letter content to enhance.", 'warning');
                coverLetterTextarea?.focus(); return;
            }
             if (!jobDesc) { // Job desc still needed for context
                showNotification(translations[currentLang]?.cover_letter_notify_job_desc_missing || "Job description needed for context.", 'warning');
                jobDescInput?.focus(); return;
            }
            isEnhance = true;
            useMyInfo = true;
            apiAction = 'enhance';
            loadingKey = 'cover_letter_notify_enhancing';
            break;
        default:
            console.error("Unknown AI action:", action);
            return;
    }

    // --- Button disabling and loading state ---
    const originalButtonContent = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[loadingKey] || 'Processing...'}`;

    try {
        // *** Get Resume Context (if needed) ***
        let resumeContext = '';
        if (useMyInfo && currentApplicationData.resumeData) {
            // Extract relevant info from currentApplicationData.resumeData
            // (Keep the existing resume context extraction logic)
            const rd = currentApplicationData.resumeData;
            const contextParts = [];
            const name = rd.personalInfo?.name || '';
            const role = rd.personalInfo?.role || '';
            if (name) contextParts.push(`Candidate Name: ${name}`);
            if (role) contextParts.push(`Target Role: ${role}`);
            if (rd.workExperience && rd.workExperience.length > 0) {
                const experiences = rd.workExperience.slice(0, 3).map(exp =>
                    `- ${exp.jobTitle || ''} at ${exp.company || ''}${exp.description ? ': ' + exp.description.substring(0, 100) + '...' : ''}` // Use description instead of summary
                ).join('\n');
                if (experiences) contextParts.push(`\nRecent Work Experience:\n${experiences}`);
            }
            if (rd.education && rd.education.length > 0) {
                const education = rd.education.slice(0, 1).map(edu =>
                    `- ${edu.degree || ''} from ${edu.school || ''}` // Use school, not institution
                ).join('\n');
                 if (education) contextParts.push(`\nEducation:\n${education}`);
            }
            const skills = rd.skills?.map(s => s.skillsList).flat().join(', ') || ''; // Flatten if skillsList is an array
            if (skills) contextParts.push(`\nKey Skills: ${skills}`);
             if (rd.trainings && rd.trainings.length > 0) {
                const trainings = rd.trainings.slice(0, 3).map(tr => `- ${tr.name || ''}`).join('\n'); // Use 'name' for training
                 if (trainings) contextParts.push(`\nRelevant Training:\n${trainings}`);
            }
            resumeContext = contextParts.join('\n');
            console.log("Generated Resume Context:", resumeContext);
        }

        // *** Call the AI API function ***
        const generatedText = await fetchCoverLetterFromAI(apiAction, jobDesc, company, manager, existingText, resumeContext, generationLang);

        if (generatedText) {
            coverLetterTextarea.value = generatedText; // Update the main editable textarea
            updatePreview(); // Update preview based on the new content
            showNotification(translations[currentLang]?.cover_letter_notify_ai_success || "AI processing complete.", 'success');
        } else {
             throw new Error("AI returned empty content.");
        }

    } catch (error) {
        console.error(`AI ${action} error:`, error);
        showNotification(`${translations[currentLang]?.[notifyFailKey] || 'AI request failed:'} ${error.message}`, 'danger');
    } finally {
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalButtonContent;
    }
}


// --- *** NEW: Setup Download Modal Listeners *** ---
function setupCoverLetterDownloadModalListeners() {
    // Listener for the main "Download" button
    downloadBtn?.addEventListener('click', () => {
        if (!currentApplicationData) {
            showNotification(translations[currentLang]?.cover_letter_notify_download_no_data || "No application data loaded to download.", 'warning');
            return;
        }
        // Check for libraries before opening modal (optional but good UX)
        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
             showNotification(translations[currentLang]?.cover_letter_notify_download_lib_missing || "Required PDF generation libraries not loaded.", 'warning');
             return;
        }

        if (downloadModalInstanceCL) {
            downloadModalInstanceCL.show(); // Show the download options modal
        } else {
            console.error("Download options modal instance not found for Cover Letter.");
            showNotification("Cannot open download options.", "danger");
        }
    });

    // Listener for clicks within the download options modal (using delegation)
    downloadOptionsContainerCL?.addEventListener('click', async (event) => { // Make async
        const selectedCard = event.target.closest('.download-option-card');
        if (selectedCard && selectedCard.dataset.downloadType) {
            const downloadType = selectedCard.dataset.downloadType;
            console.log("Cover Letter Download Type selected:", downloadType);

            // Ensure the generation function exists before calling
            if (typeof generatePdf === 'function') {
                 // Call the fully implemented function from downloadpdf.js
                 // No need to hide modal here, generatePdf does it
                 await generatePdf(downloadType, currentApplicationData, 'cover-letter-preview'); // Pass context and await it
            } else {
                console.error("generatePdf function (from downloadpdf.js) not found.");
                showNotification("PDF generation function is missing.", "danger");
                 if (downloadModalInstanceCL) {
                     downloadModalInstanceCL.hide(); // Hide modal if function missing
                 }
            }
             // Modal hiding is now handled within generatePdf start
        }
    });
}


// --- Data Persistence ---

// Collects essential data for SAVING the cover letter section AND shared settings
function collectApplicationDataForSave() {
    // Ensure settings are initialized if they don't exist
    if (!currentApplicationData.settings) {
        currentApplicationData.settings = {};
    }
    // Ensure coverLetterData is initialized
    if (!currentApplicationData.coverLetterData) {
        currentApplicationData.coverLetterData = {};
    }

    // Update specific fields from the form
    currentApplicationData.jobDescription = jobDescInput?.value.trim() || '';
    currentApplicationData.companyName = companyInput?.value.trim() || '';
    currentApplicationData.hiringManager = managerInput?.value.trim() || '';
    currentApplicationData.coverLetterData.content = coverLetterTextarea?.value || '';
    currentApplicationData.settings.templateId = selectedTemplateId || 'default'; // **** SAVE TEMPLATE ID ****

    console.log("Collected data for save:", currentApplicationData);
    return currentApplicationData; // Return the modified full object
}

// Populates the form fields from the loaded application data
function populateCoverLetterForm(appData) {
    if (!appData) return;
    jobDescInput.value = appData.jobDescription || '';
    companyInput.value = appData.companyName || '';
    managerInput.value = appData.hiringManager || '';
    coverLetterTextarea.value = appData.coverLetterData?.content || '';

    // **** Set selected template ID from loaded data ****
    selectedTemplateId = appData.settings?.templateId || 'default';
    console.log("Populating form, loaded template ID:", selectedTemplateId);

    updatePreview(); // Update preview after loading data
}


// --- Loading Logic ---
async function loadApplicationForCoverLetter() {
    console.log("loadApplicationForCoverLetter() was called");
    const urlParams = new URLSearchParams(window.location.search);
    const applicationIdParam = urlParams.get('applicationId');

    // Reset state
    currentApplicationId = null;
    currentApplicationData = null;
    selectedTemplateId = 'default'; // Reset template ID
    if (currentCoverLetterIdInput) currentCoverLetterIdInput.value = '';

    // Disable buttons initially
    const buttonsToDisable = [
        generateDescOnlyBtn, generateDescInfoBtn, enhanceDescBtn,
        enhanceDescInfoBtn, saveBtn, downloadBtn, changeTemplateBtnCL // Disable template btn too
    ];
    buttonsToDisable.forEach(btn => { if(btn) btn.disabled = true; });

    // Clear form
    jobDescInput.value = '';
    companyInput.value = '';
    managerInput.value = '';
    coverLetterTextarea.value = '';
    updatePreview(); // Show empty preview


    if (applicationIdParam) {
        console.log("Application ID found:", applicationIdParam);
        currentApplicationId = parseInt(applicationIdParam);
        if (currentCoverLetterIdInput) currentCoverLetterIdInput.value = currentApplicationId;

        currentApplicationData = await getApplication(currentApplicationId);

        if (currentApplicationData) {
            console.log("Loaded Application Data:", currentApplicationData);
            populateCoverLetterForm(currentApplicationData); // Populates form AND sets selectedTemplateId

            // Enable buttons now that data is loaded
            buttonsToDisable.forEach(btn => { if(btn) btn.disabled = false; });

            // Set page title
            document.title = `${currentApplicationData.applicationName || 'Cover Letter'} - ${translations[currentLang]?.cover_letter_page_title || 'AI Cover Letter Writer'}`;

        } else {
            console.error(`Application with ID ${currentApplicationId} not found.`);
            currentApplicationId = null;
            currentApplicationData = null;
            if (currentCoverLetterIdInput) currentCoverLetterIdInput.value = '';
            const errorMsgKey = 'cover_letter_notify_app_load_fail';
            showNotification(translations[currentLang]?.[errorMsgKey] || "Failed to load application data.", 'danger');
            // Show create modal as fallback
            if (createModalInstanceBuilder) {
                 createModalInstanceBuilder.show();
            } else {
                 console.error("Create modal instance not available for fallback.");
            }
        }
    } else {
        console.log("No applicationId found in URL. Prompting for creation.");
        document.title = `${translations[currentLang]?.cover_letter_page_title || 'AI Cover Letter Writer'}`; // Reset title

         // Show the 'Create New Application' modal
        if (createModalInstanceBuilder) {
            newAppNameInputBuilder.value = '';
            newAppJobDescInputBuilder.value = '';
            newAppLanguageSelectBuilder.value = currentLang || 'en';
            createModalErrorBuilder.style.display = 'none';
            createModalSaveBtnBuilder.disabled = false;
            createModalSaveBtnBuilder.innerHTML = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
            createModalInstanceBuilder.show();
        } else {
             console.error("Create modal instance not available.");
             showNotification("Error: Cannot initialize application creation.", "danger");
        }
    }
    // Update template modal visuals in case it's opened before interaction
    updateCoverLetterTemplateModalSelection();
}

// Handles saving changes made in the Cover Letter UI
async function handleSaveCoverLetterChanges() {
    if (!currentApplicationId) { // Check ID primarily
        showNotification(translations[currentLang]?.cover_letter_notify_save_no_app || "Cannot save: No application loaded.", 'danger');
        console.error("Attempted to save cover letter without a valid currentApplicationId.");
        return;
    }
    // Fetch the latest data if currentApplicationData is missing (shouldn't happen ideally)
    if (!currentApplicationData) {
        console.warn("currentApplicationData missing, re-fetching before save...");
        currentApplicationData = await getApplication(currentApplicationId);
        if (!currentApplicationData) {
            showNotification("Error: Could not retrieve application data to save.", 'danger');
            return;
        }
    }

    // 1. Collect data from inputs AND update the global object
    collectApplicationDataForSave(); // This now modifies currentApplicationData directly

    // 2. Update timestamp
    currentApplicationData.updatedAt = new Date();

    // 3. Save Logic
    if (!saveBtn) return;
    const originalButtonContent = saveBtn.innerHTML;
    saveBtn.disabled = true;
    const savingKey = 'cover_letter_notify_saving';
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[savingKey] || 'Saving...'}`;

    try {
        // Save the entire updated application object using its ID
        const savedId = await saveApplication(currentApplicationData, currentApplicationId);

        if (savedId === currentApplicationId) { // Ensure the ID matches
            console.log(`Application ID ${currentApplicationId} updated with cover letter changes.`);
            // Optionally re-fetch to confirm, though modifying global object should suffice
            // currentApplicationData = await getApplication(currentApplicationId);

            const successMsgKey = 'cover_letter_notify_app_save_success';
            showNotification(translations[currentLang]?.[successMsgKey] || "Application updated successfully!", 'success');
        } else {
            throw new Error("Saved ID mismatch or failed to save application (cover letter).");
        }
    } catch (error) {
        console.error("Error saving application (cover letter):", error);
        const errorMsgKey = 'cover_letter_notify_app_save_fail';
        showNotification(`${translations[currentLang]?.[errorMsgKey] || "Failed to save application changes."} ${error.message}`, 'danger');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalButtonContent; // Restore original content
         // Ensure translation is applied if necessary, e.g., after language switch
         const span = saveBtn.querySelector('span[data-translate]');
         if(span) translateElement(span, currentLang);
    }
}


// Handles downloading the cover letter as PDF
function handleDownload() {
     // Check if jsPDF is loaded
     if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        showNotification(translations[currentLang]?.cover_letter_notify_download_lib_missing || "PDF library (jsPDF) not loaded.", 'warning');
        console.error("jsPDF library not found.");
        return;
     }
     if (!currentApplicationData) {
         showNotification(translations[currentLang]?.cover_letter_notify_download_no_data || "No application data loaded to download.", 'warning');
         return;
     }

     showNotification(translations[currentLang]?.cover_letter_notify_download_generating || "Generating PDF...", 'info');

     try {
        const { jsPDF } = jspdf;
        const doc = new jsPDF({
            orientation: 'p',
            unit: 'pt',
            format: 'a4' // Consider using appData.settings.documentSize later
        });

        // --- Get Content ---
        // IMPORTANT: Generate PDF based on the *preview* HTML, not the raw textarea,
        //            to reflect the chosen template's styling.
        //            Requires html2canvas for better results.

        const previewElement = document.getElementById('cover-letter-preview');
        if (!previewElement) {
            throw new Error("Preview element not found for PDF generation.");
        }

        // Use html2canvas to render the preview div to a canvas, then add to PDF
        // Make sure html2canvas library is included in your HTML
        if (typeof html2canvas === 'undefined') {
            showNotification("html2canvas library not found. PDF will be text-only.", 'warning');
            // Fallback to basic text rendering (like before)
             const textContent = coverLetterTextarea.value;
             const margin = 40;
             const usableWidth = doc.internal.pageSize.getWidth() - 2 * margin;
             const defaultFontSize = 11;
             const lineHeightFactor = 1.4;
             doc.setFont('helvetica', 'normal');
             doc.setFontSize(defaultFontSize);
             const lines = doc.splitTextToSize(textContent, usableWidth);
             let y = margin;
             lines.forEach(line => {
                 if (y + (defaultFontSize * lineHeightFactor) > doc.internal.pageSize.getHeight() - margin) {
                     doc.addPage(); y = margin;
                 }
                 doc.text(line, margin, y);
                 y += defaultFontSize * lineHeightFactor;
             });
             const fileName = `${currentApplicationData.applicationName || 'CoverLetter'}_${new Date().toISOString().split('T')[0]}.pdf`;
             doc.save(fileName);
             showNotification(translations[currentLang]?.cover_letter_notify_download_success || "PDF downloaded successfully.", 'success');

        } else {
            // Use html2canvas for better rendering
             html2canvas(previewElement, {
                scale: 2, // Increase scale for better quality
                useCORS: true // If loading external images/fonts
             }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const pdfWidth = doc.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                let heightLeft = pdfHeight;
                let position = 0;

                doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= doc.internal.pageSize.getHeight();

                while (heightLeft >= 0) {
                  position = heightLeft - pdfHeight;
                  doc.addPage();
                  doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                  heightLeft -= doc.internal.pageSize.getHeight();
                }

                 const fileName = `${currentApplicationData.applicationName || 'CoverLetter'}_${new Date().toISOString().split('T')[0]}.pdf`;
                doc.save(fileName);
                 showNotification(translations[currentLang]?.cover_letter_notify_download_success || "PDF downloaded successfully.", 'success');
            }).catch(err => {
                 console.error("Error using html2canvas:", err);
                 showNotification(translations[currentLang]?.cover_letter_notify_download_fail || "Failed to generate PDF using preview.", 'danger');
            });
        }

     } catch (error) {
         console.error("Error generating PDF:", error);
         showNotification(translations[currentLang]?.cover_letter_notify_download_fail || "Failed to generate PDF.", 'danger');
     }
}

// --- *** NEW: Function to Update Template Modal Selection Visuals *** ---
function updateCoverLetterTemplateModalSelection() {
    if (!templateSelectionContainerCL) return;
    const cards = templateSelectionContainerCL.querySelectorAll('.template-card');
    cards.forEach(card => {
        const icon = card.querySelector('.template-selected-icon');
        if (card.dataset.templateId === selectedTemplateId) {
            card.classList.add('border', 'border-primary', 'border-2'); // Add border highlight
            if (icon) icon.style.display = 'inline-block'; // Show checkmark
        } else {
            card.classList.remove('border', 'border-primary', 'border-2'); // Remove border
            if (icon) icon.style.display = 'none'; // Hide checkmark
        }
    });
}


// --- *** NEW: Setup Template Switching Listeners *** ---
function setupCoverLetterTemplateSwitcherListeners() {
    // Listener for the main "Change Template" button
    changeTemplateBtnCL?.addEventListener('click', () => {
        if (templateModalInstanceCL) {
            updateCoverLetterTemplateModalSelection(); // Update visuals before showing
            templateModalInstanceCL.show();
        } else {
            console.error("Template modal instance not found for Cover Letter.");
            showNotification("Cannot open template selection.", "danger");
        }
    });

    // Listener for clicks within the template selection modal (using delegation)
    templateSelectionContainerCL?.addEventListener('click', (event) => {
        const selectedCard = event.target.closest('.template-card');
        if (selectedCard && selectedCard.dataset.templateId) {
            const newTemplateId = selectedCard.dataset.templateId;
            if (newTemplateId !== selectedTemplateId) {
                console.log("Cover Letter Template selected:", newTemplateId);
                selectedTemplateId = newTemplateId; // Update the global variable
                updateCoverLetterTemplateModalSelection(); // Update visual highlight in modal
                updatePreview(); // Update the main cover letter preview
                // Auto-save the change immediately
                handleSaveCoverLetterChanges();
            }
            if (templateModalInstanceCL) {
                templateModalInstanceCL.hide(); // Hide modal after selection
            }
        }
    });
}

// --- Initialization ---
function initCoverLetterPage() {
    console.log("Initializing AI Cover Letter page...");

    // --- Initialize the Create Modal ---
    if (createModalElementBuilder) {
        createModalInstanceBuilder = new bootstrap.Modal(createModalElementBuilder, {
            backdrop: 'static', keyboard: false
        });
        createModalSaveBtnBuilder?.addEventListener('click', handleCreateApplicationFromBuilderModal); // Use specific handler
    } else {
        console.error("Create Application Modal not found!");
    }

    // --- Event Listeners for AI Buttons ---
    generateDescOnlyBtn?.addEventListener('click', (e) => callAI('generate_desc_only', e.currentTarget));
    generateDescInfoBtn?.addEventListener('click', (e) => callAI('generate_desc_info', e.currentTarget));
    enhanceDescBtn?.addEventListener('click', (e) => callAI('enhance_desc', e.currentTarget));
    enhanceDescInfoBtn?.addEventListener('click', (e) => callAI('enhance_desc_info', e.currentTarget));

    // Other listeners
    saveBtn?.addEventListener('click', handleSaveCoverLetterChanges);
    

    // Live preview update from the main textarea (triggers full template update)
    coverLetterTextarea?.addEventListener('input', updatePreview);
    // Also trigger preview update when company/manager changes, as templates might use them
    companyInput?.addEventListener('input', updatePreview);
    managerInput?.addEventListener('input', updatePreview);

    // Load application data based on URL
    loadApplicationForCoverLetter();

    // **** NEW: Setup Template Switcher Listeners ****
    setupCoverLetterTemplateSwitcherListeners();

     // *** NEW: Setup Download Modal Listeners ***
     setupCoverLetterDownloadModalListeners();

    // Translate page initially
    if (typeof translatePage === 'function') {
        translatePage(currentLang);
    } else {
        console.warn("translatePage function not found during init.");
    }
}

// Make sure showNotification is globally available (e.g., in main.js)
function showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.warn("showNotification function not found. Falling back to alert.");
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// Helper function from Resume Builder - adapt if needed, but likely usable as is
async function handleCreateApplicationFromBuilderModal() {
    const name = newAppNameInputBuilder.value.trim();
    const jobDesc = newAppJobDescInputBuilder.value.trim();
    const language = newAppLanguageSelectBuilder.value;

    if (!name) {
        createModalErrorBuilder.textContent = translations[currentLang]?.myapplications_modal_error_name || "Please enter an application name.";
        createModalErrorBuilder.style.display = 'block';
        newAppNameInputBuilder.focus();
        return;
    }
    createModalErrorBuilder.style.display = 'none';

    createModalSaveBtnBuilder.disabled = true;
    const creatingText = translations[currentLang]?.myresumes_create_loading || 'Creating...';
    createModalSaveBtnBuilder.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${creatingText}`;

    const now = new Date();
    // Create the initial Application object structure
    const newApplicationData = {
        applicationName: name,
        jobDescription: jobDesc,
        companyName: '', // Initialize CL specific fields too
        hiringManager: '', // Initialize CL specific fields too
        resumeData: { // Keep resume structure empty initially
            personalInfo: { name: name }, // Pre-fill name
            settings: { /* Keep default settings or copy from resume builder */ },
            workExperience: [], education: [], skills: [], trainings: [],
            projects: [], certifications: [], awards: [], publications: [],
            volunteering: [], languages: [], interests: [], socialMedia: [],
            references: [], customSections: []
        },
         settings: { // Top-level settings (SHARED)
            language: language,
            themeColor: '#206bc4',
            fontFamily: "'Inter', sans-serif",
            fontSize: '10pt',
            documentSize: 'A4',
            templateId: 'default' // Initialize template ID
        },
        coverLetterData: { content: '' }, // Initialize CL content
        aiTrainerData: { behavioral: [], technical: [], situational: [] },
        createdAt: now,
        updatedAt: now
    };

    try {
        const newId = await saveApplication(newApplicationData); // Save to Dexie
        if (newId) {
            showNotification(translations[currentLang]?.myapplications_notify_create_success || "Application created!", 'success');
            if (createModalInstanceBuilder) createModalInstanceBuilder.hide();

            // Update Page State
            currentApplicationId = newId;
            if (currentCoverLetterIdInput) currentCoverLetterIdInput.value = currentApplicationId; // Update hidden input

            // Update the URL without reloading
            const newUrl = `${window.location.pathname}?applicationId=${newId}${window.location.hash}`;
            history.pushState({ applicationId: newId }, document.title, newUrl);
            console.log(`URL updated to include applicationId=${newId}`);

            // Reload the cover letter page with the new application data
            await loadApplicationForCoverLetter(); // This will fetch the newly created app

        } else {
            throw new Error("Failed to save new application and get ID.");
        }
    } catch (error) {
        console.error("Error creating application from cover letter page modal:", error);
        createModalErrorBuilder.textContent = translations[currentLang]?.myapplications_modal_error_save || "Error saving application.";
        createModalErrorBuilder.style.display = 'block';
    } finally {
         createModalSaveBtnBuilder.disabled = false;
         createModalSaveBtnBuilder.innerHTML = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
    }
}


// --- END OF FILE aiCoverLetter.js ---
