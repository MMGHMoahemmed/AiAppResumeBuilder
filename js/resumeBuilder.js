// --- START OF FILE resumeBuilder.js ---
// ... (keep existing vars like previewContainer)


// --- Global Variables ---
// let currentResumeId = null; // RENAME this variable conceptually
let currentApplicationId = null; // Holds the ID of the Application being edited
let currentApplicationData = null; // Holds the entire loaded Application object
let selectedTemplateId = 'default'; // *** NEW: Store selected template ID ***

// --- Live Preview ---
const previewContainer = document.getElementById('resume-preview-content');

// --- DOM Elements ---

const displayJobDescElement = document.getElementById('display-job-description');
const saveBtnResume = document.getElementById('save-resume-btn'); // Save button
const downloadBtnResume = document.getElementById('download-resume-btn'); // Download button

// --- NEW: Modal Elements for Creation on Builder Page ---
const createModalElementBuilder = document.getElementById('modal-create-application'); // Reuse ID
const createModalSaveBtnBuilder = document.getElementById('modal-create-save-btn'); // Reuse ID
const newAppNameInputBuilder = document.getElementById('new-application-name'); // Reuse ID
const newAppJobDescInputBuilder = document.getElementById('new-application-jobdesc'); // Reuse ID
const newAppLanguageSelectBuilder = document.getElementById('new-application-language'); // Reuse ID
const createModalErrorBuilder = document.getElementById('modal-create-error'); // Reuse ID
let createModalInstanceBuilder = null; // Separate instance variable for this page

// --- NEW: AI Assist Modal Elements ---
const aiAssistModalElement = document.getElementById('ai-assist-modal');
const aiAssistModalInstance = aiAssistModalElement ? new bootstrap.Modal(aiAssistModalElement) : null;
const aiAssistModalLabel = document.getElementById('aiAssistModalLabel');
const aiAssistLanguageSelect = document.getElementById('ai-assist-language');
const aiAssistOutputTextarea = document.getElementById('ai-assist-output');
const aiAssistOriginalTextarea = document.getElementById('ai-assist-original');
const aiAssistLoadingDiv = document.getElementById('ai-assist-loading');
const aiAssistErrorDiv = document.getElementById('ai-assist-error');
const aiAssistReplaceBtn = document.getElementById('ai-assist-replace-btn');
const aiAssistAddBelowBtn = document.getElementById('ai-assist-add-below-btn');
let currentAiAssistTargetElement = null; // To store the textarea being modified
let currentAiAssistOriginalContent = ''; // Store original content for modal actions
let currentAiAssistGeneratedContent = ''; // Store generated content


// *** NEW: Template Modal Elements ***
const templateModalElement = document.getElementById('modal-change-template');
const templateModalInstance = templateModalElement ? new bootstrap.Modal(templateModalElement) : null;
const templateSelectionContainer = document.getElementById('template-selection-container');


// --- *** NEW: Download Modal Elements *** ---
const downloadModalElementResume = document.getElementById('modal-download-options-resume'); // Specific ID
const downloadModalInstanceResume = downloadModalElementResume ? new bootstrap.Modal(downloadModalElementResume) : null;
const downloadOptionsContainerResume = document.getElementById('download-options-container-resume'); // Specific ID




// --- Helper Function to Translate a Specific Node and its Children ---
function translateNodeContent(node, lang) {
    if (!translations || !translations[lang] || !node) {
        // console.warn("translateNodeContent: Missing translations, language, or node.");
        return;
    }

    const elementsToTranslate = [];
    if (node.hasAttribute && node.hasAttribute('data-translate')) {
        elementsToTranslate.push(node);
    }
    elementsToTranslate.push(...node.querySelectorAll('[data-translate]'));

    elementsToTranslate.forEach(el => {
        const key = el.getAttribute('data-translate');
        const translation = translations[lang][key];

        if (translation !== undefined) {
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder !== undefined) {
                // Only update placeholder if it exists and is meant to be translated
                // Do not overwrite existing input values with placeholder translations
                el.placeholder = translation;
            } else if (el.title && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SPAN')) { // Common elements with titles
                // Update tooltips/titles if the 'title' attribute is present and the key matches
                // This is a common pattern for icon buttons.
                el.title = translation;
                const tooltipInstance = bootstrap.Tooltip.getInstance(el);
                if (tooltipInstance) {
                    tooltipInstance.setContent({ '.tooltip-inner': translation });
                }
            } else if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
                // For other elements (labels, spans, etc.), set textContent
                el.textContent = translation;
            }
        } else {
            // console.warn(`translateNodeContent: Translation key "${key}" not found for language "${lang}".`);
        }
    });
}



let entryCounters = {}; // Keep if you need unique IDs for entries

function addSectionEntry(button, containerId, templateId) {
    const container = document.getElementById(containerId);
    const template = document.getElementById(templateId);
    if (!container || !template) {
        console.error(`Container #${containerId} or Template #${templateId} not found.`);
        return;
    }

    const clone = template.content.firstElementChild.cloneNode(true);

    const removeBtn = clone.querySelector('.remove-entry-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            clone.remove();
            updatePreview();
        });
    }

    const addButton = container.querySelector('.add-entry-btn');
    if (addButton && container.contains(addButton)) {
         container.insertBefore(clone, addButton);
    } else {
        container.appendChild(clone);
    }

    // **** NEW: Translate the cloned content using the helper ****
    if (typeof currentLang !== 'undefined') {
        translateNodeContent(clone, currentLang);
    } else {
        console.warn("addSectionEntry: currentLang is not defined. Cannot translate new entry.");
    }
    // **** END NEW ****

    clone.querySelectorAll('input, textarea, select').forEach(input => {
         const eventType = (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';
        input.addEventListener(eventType, updatePreview);
    });

    clone.querySelectorAll('input, textarea').forEach(input => {
        if (input.type !== 'checkbox' && input.type !== 'radio') {
             input.value = '';
        } else if (input.type === 'checkbox' || input.type === 'radio') {
            input.checked = false;
        }
    });
     clone.querySelectorAll('select').forEach(select => {
         select.selectedIndex = 0;
     });

    updatePreview();
}



// --- Populate Form Function ---
function populateForm(resumeData) {
    if (!resumeData) return;
    console.log("Populating form with data:", resumeData);

    // Clear existing dynamic entries before populating
    document.getElementById('work-experience-entries').innerHTML = '';
    document.getElementById('education-entries').innerHTML = '';
    document.getElementById('trainings-entries').innerHTML = '';
    document.getElementById('skills-entries').innerHTML = '';
    document.getElementById('projects-entries').innerHTML = '';
    document.getElementById('certifications-entries').innerHTML = '';
    document.getElementById('awards-entries').innerHTML = '';
    document.getElementById('publications-entries').innerHTML = '';
    document.getElementById('volunteering-entries').innerHTML = '';
    document.getElementById('languages-entries').innerHTML = '';
    document.getElementById('interests-entries').innerHTML = '';
    document.getElementById('social-media-entries').innerHTML = '';
    document.getElementById('references-entries').innerHTML = '';
    document.getElementById('custom-sections-entries').innerHTML = '';

    if (!resumeData) {
        // Reset settings and template ID if no data
        document.getElementById('settings-theme-color').value = '#206bc4';
        document.getElementById('settings-font-family').value = "'Inter', sans-serif";
        document.getElementById('settings-font-size').value = '10pt';
        document.getElementById('settings-document-size').value = 'A4';
        selectedTemplateId = 'default'; // Reset to default
        updatePreview(); // Update preview to show empty state with default template
        return;
    }
    console.log("Populating form with data:", resumeData);



    // Personal Info
    const pi = resumeData.personalInfo || {};
    document.getElementById('input-name').value = pi.name || '';
    document.getElementById('input-role').value = pi.role || '';
    document.getElementById('input-objective').value = pi.summary || '';
    document.getElementById('input-email').value = pi.email || '';
    document.getElementById('input-phone').value = pi.phone || '';
    document.getElementById('input-website').value = pi.website || '';
    document.getElementById('input-linkedin').value = pi.linkedin || '';
    document.getElementById('input-github').value = pi.github || '';
    document.getElementById('input-location').value = pi.location || '';
    
    // Photo (handle carefully - only update if photo data exists)
    const photoPreviewImg = document.getElementById('profile-photo-preview');
    const photoPreviewContainer = document.getElementById('photo-preview-container');
    const removePhotoButton = document.getElementById('remove-photo-btn');
    if (pi.photo && photoPreviewImg && photoPreviewContainer && removePhotoButton) {
         photoPreviewImg.src = pi.photo;
         photoPreviewContainer.style.display = 'block';
         removePhotoButton.style.display = 'inline-block';
    } else if (photoPreviewContainer) {
         photoPreviewContainer.style.display = 'none';
         removePhotoButton.style.display = 'none';
         photoPreviewImg.src = '#';
    }


    // Populate dynamic sections by simulating clicks isn't ideal.
    // Instead, create elements directly and populate them.

    const populateSection = (items, containerId, templateId, populateFn) => {
        const container = document.getElementById(containerId);
        const template = document.getElementById(templateId);
        if (!container || !template || !items || !Array.isArray(items)) return;

        items.forEach(itemData => {
            const clone = template.content.firstElementChild.cloneNode(true);
            populateFn(clone, itemData);

            const removeBtn = clone.querySelector('.remove-entry-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    clone.remove();
                    updatePreview();
                });
            }
            clone.querySelectorAll('input, textarea, select').forEach(input => {
                 const eventType = (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';
                input.addEventListener(eventType, updatePreview);
            });

            container.appendChild(clone);

            // **** NEW: Translate the cloned content when populating from existing data ****
            if (typeof currentLang !== 'undefined') {
                translateNodeContent(clone, currentLang);
            } else {
                console.warn("populateForm: currentLang is not defined. Cannot translate populated entry.");
            }
            // **** END NEW ****
        });
    };

    // --- Define Population Functions for Each Section ---
    const populateJob = (clone, data) => {
        clone.querySelector('[data-input="company"]').value = data.company || '';
        clone.querySelector('[data-input="job_title"]').value = data.jobTitle || '';
        clone.querySelector('[data-input="job_location"]').value = data.location || '';
        clone.querySelector('[data-input="start_date"]').value = data.startDate || '';
        clone.querySelector('[data-input="end_date"]').value = data.endDate || '';
        clone.querySelector('[data-input="current_job"]').checked = data.current || false;
        clone.querySelector('[data-input="description"]').value = data.description || '';
    };
    populateSection(resumeData.workExperience, 'work-experience-entries', 'job-entry-template', populateJob);

    const populateEdu = (clone, data) => {
         clone.querySelector('[data-input="school"]').value = data.school || '';
         clone.querySelector('[data-input="degree_major"]').value = data.degree || ''; // Match data key
         clone.querySelector('[data-input="edu_location"]').value = data.location || '';
         clone.querySelector('[data-input="gpa"]').value = data.gpa || '';
         clone.querySelector('[data-input="edu_start_date"]').value = data.startDate || '';
         clone.querySelector('[data-input="edu_end_date"]').value = data.endDate || '';
         clone.querySelector('[data-input="edu_current"]').checked = data.current || false;
         clone.querySelector('[data-input="additional_info"]').value = data.additionalInfo || '';
    };
     populateSection(resumeData.education, 'education-entries', 'education-entry-template', populateEdu);

    const populateTraining = (clone, data) => {
         clone.querySelector('[data-input="training_name"]').value = data.name || '';
         clone.querySelector('[data-input="institution"]').value = data.institution || '';
         clone.querySelector('[data-input="completion_date"]').value = data.date || '';
         clone.querySelector('[data-input="training_description"]').value = data.description || '';
    };
     populateSection(resumeData.trainings, 'trainings-entries', 'training-entry-template', populateTraining);

     const populateSkillCat = (clone, data) => {
        clone.querySelector('[data-input="skills_category"]').value = data.category || '';
        clone.querySelector('[data-input="skills_list"]').value = data.skillsList || '';
     };
     populateSection(resumeData.skills, 'skills-entries', 'skill-category-template', populateSkillCat);

     const populateProject = (clone, data) => {
         clone.querySelector('[data-input="project_name"]').value = data.name || '';
         clone.querySelector('[data-input="project_link"]').value = data.link || '';
         clone.querySelector('[data-input="project_date"]').value = data.date || '';
         clone.querySelector('[data-input="project_description"]').value = data.description || '';
     };
     populateSection(resumeData.projects, 'projects-entries', 'project-entry-template', populateProject);

     const populateCertification = (clone, data) => {
         clone.querySelector('[data-input="certification_name"]').value = data.name || '';
         clone.querySelector('[data-input="cert_issuer"]').value = data.issuer || '';
         clone.querySelector('[data-input="issue_date"]').value = data.issueDate || '';
         clone.querySelector('[data-input="expiration_date"]').value = data.expDate || '';
         clone.querySelector('[data-input="credential_url"]').value = data.url || '';
     };
     populateSection(resumeData.certifications, 'certifications-entries', 'certification-entry-template', populateCertification);

     const populateAward = (clone, data) => {
         clone.querySelector('[data-input="award_title"]').value = data.title || '';
         clone.querySelector('[data-input="issuer"]').value = data.issuer || '';
         clone.querySelector('[data-input="award_date"]').value = data.date || '';
         clone.querySelector('[data-input="award_description"]').value = data.description || '';
     };
     populateSection(resumeData.awards, 'awards-entries', 'award-entry-template', populateAward);

     const populatePublication = (clone, data) => {
        clone.querySelector('[data-input="publication_title"]').value = data.title || '';
        clone.querySelector('[data-input="publisher"]').value = data.publisher || '';
        clone.querySelector('[data-input="publication_date"]').value = data.date || '';
        clone.querySelector('[data-input="publication_url"]').value = data.url || '';
        clone.querySelector('[data-input="publication_description"]').value = data.description || '';
     };
     populateSection(resumeData.publications, 'publications-entries', 'publication-entry-template', populatePublication);

    const populateVolunteer = (clone, data) => {
         clone.querySelector('[data-input="role"]').value = data.role || '';
         clone.querySelector('[data-input="organization"]').value = data.organization || '';
         clone.querySelector('[data-input="volunteer_location"]').value = data.location || '';
         clone.querySelector('[data-input="volunteer_start_date"]').value = data.startDate || '';
         clone.querySelector('[data-input="volunteer_end_date"]').value = data.endDate || '';
         clone.querySelector('[data-input="currently_volunteering"]').checked = data.current || false;
         clone.querySelector('[data-input="volunteer_description"]').value = data.description || '';
     };
     populateSection(resumeData.volunteering, 'volunteering-entries', 'volunteering-entry-template', populateVolunteer);

     const populateLanguage = (clone, data) => {
         clone.querySelector('[data-input="language"]').value = data.language || '';
         clone.querySelector('[data-input="proficiency"]').value = data.proficiency || '';
     };
     populateSection(resumeData.languages, 'languages-entries', 'language-entry-template', populateLanguage);

     const populateInterest = (clone, data) => {
         clone.querySelector('[data-input="interest_name"]').value = data.name || '';
     };
     populateSection(resumeData.interests, 'interests-entries', 'interest-entry-template', populateInterest);

     const populateSocial = (clone, data) => {
         clone.querySelector('[data-input="network"]').value = data.network || '';
         clone.querySelector('[data-input="username"]').value = data.username || '';
         clone.querySelector('[data-input="profile_url"]').value = data.url || '';
     };
     populateSection(resumeData.socialMedia, 'social-media-entries', 'social-media-entry-template', populateSocial);

     const populateReference = (clone, data) => {
         clone.querySelector('[data-input="referent_name"]').value = data.name || '';
         clone.querySelector('[data-input="referent_company"]').value = data.company || '';
         clone.querySelector('[data-input="referent_email"]').value = data.email || '';
         clone.querySelector('[data-input="referent_phone"]').value = data.phone || '';
         clone.querySelector('[data-input="reference_text"]').value = data.note || '';
     };
     populateSection(resumeData.references, 'references-entries', 'reference-entry-template', populateReference);

    const populateCustom = (clone, data) => {
        clone.querySelector('[data-input="custom_title"]').value = data.title || '';
        clone.querySelector('[data-input="custom_description"]').value = data.description || '';
    };
    populateSection(resumeData.customSections, 'custom-sections-entries', 'custom-section-template', populateCustom);

    // Settings
    const s = resumeData.settings || {};
    document.getElementById('settings-theme-color').value = s.themeColor || '#206bc4';
    document.getElementById('settings-font-family').value = s.fontFamily || "'Inter', sans-serif";
    document.getElementById('settings-font-size').value = s.fontSize || '10pt';
    document.getElementById('settings-document-size').value = s.documentSize || 'A4';
    document.getElementById('settings-language').value = s.language;
    
     // *** NEW: Set selected template ID from loaded data ***
     selectedTemplateId = s.templateId || 'default';
     console.log("Loaded template ID:", selectedTemplateId);

    // IMPORTANT: Update preview after populating all fields
    updatePreview();
}



  // Helper function to collect data from all form inputs
  function collectFormData() {
    const resumePartData = {
        personalInfo: {},
        workExperience: [],
        education: [],
        trainings: [], // New
        skills: [],
        projects: [],
        certifications: [], // New
        awards: [], // New
        publications: [], // New
        volunteering: [], // New
        languages: [],
        interests: [], // New
        socialMedia: [], // New
        references: [], // New
        customSections: [],
        settings: {}
    };

    // Personal Info (as before)
    resumePartData.personalInfo.name = document.getElementById('input-name')?.value;
    resumePartData.personalInfo.role = document.getElementById('input-role')?.value;
    resumePartData.personalInfo.summary = document.getElementById('input-objective')?.value;
    resumePartData.personalInfo.email = document.getElementById('input-email')?.value;
    resumePartData.personalInfo.phone = document.getElementById('input-phone')?.value;
    resumePartData.personalInfo.website = document.getElementById('input-website')?.value;
    resumePartData.personalInfo.linkedin = document.getElementById('input-linkedin')?.value;
    resumePartData.personalInfo.github = document.getElementById('input-github')?.value;
    resumePartData.personalInfo.location = document.getElementById('input-location')?.value;
    const photoPreview = document.getElementById('profile-photo-preview');
    resumePartData.personalInfo.photo = photoPreview?.src.startsWith('resumePartData:image') ? photoPreview.src : null; // Ensure it's a resumePartData URL

    // Work Experience (as before)
    document.querySelectorAll('#work-experience-entries .job-entry').forEach(entry => {
        resumePartData.workExperience.push({
            company: entry.querySelector('[data-input="company"]')?.value,
            jobTitle: entry.querySelector('[data-input="job_title"]')?.value,
            location: entry.querySelector('[data-input="job_location"]')?.value,
            startDate: entry.querySelector('[data-input="start_date"]')?.value,
            endDate: entry.querySelector('[data-input="end_date"]')?.value,
            current: entry.querySelector('[data-input="current_job"]')?.checked,
            description: entry.querySelector('[data-input="description"]')?.value,
        });
    });

    // Education (as before)
    document.querySelectorAll('#education-entries .education-entry').forEach(entry => {
         resumePartData.education.push({
            school: entry.querySelector('[data-input="school"]')?.value,
            degree: entry.querySelector('[data-input="degree_major"]')?.value,
            location: entry.querySelector('[data-input="edu_location"]')?.value,
            gpa: entry.querySelector('[data-input="gpa"]')?.value,
            startDate: entry.querySelector('[data-input="edu_start_date"]')?.value,
            endDate: entry.querySelector('[data-input="edu_end_date"]')?.value,
            current: entry.querySelector('[data-input="edu_current"]')?.checked,
            additionalInfo: entry.querySelector('[data-input="additional_info"]')?.value,
         });
    });

     // Trainings *NEW*
     document.querySelectorAll('#trainings-entries .training-entry').forEach(entry => {
         resumePartData.trainings.push({
             name: entry.querySelector('[data-input="training_name"]')?.value,
             institution: entry.querySelector('[data-input="institution"]')?.value,
             date: entry.querySelector('[data-input="completion_date"]')?.value,
             description: entry.querySelector('[data-input="training_description"]')?.value,
         });
     });

    // Skills (as before)
    document.querySelectorAll('#skills-entries .skill-category-entry').forEach(entry => {
        resumePartData.skills.push({
            category: entry.querySelector('[data-input="skills_category"]')?.value,
            skillsList: entry.querySelector('[data-input="skills_list"]')?.value,
        });
    });

    // Projects (as before)
     document.querySelectorAll('#projects-entries .project-entry').forEach(entry => {
         resumePartData.projects.push({
             name: entry.querySelector('[data-input="project_name"]')?.value,
             link: entry.querySelector('[data-input="project_link"]')?.value,
             date: entry.querySelector('[data-input="project_date"]')?.value,
             description: entry.querySelector('[data-input="project_description"]')?.value,
         });
     });

     // Certifications *NEW*
     document.querySelectorAll('#certifications-entries .certification-entry').forEach(entry => {
         resumePartData.certifications.push({
             name: entry.querySelector('[data-input="certification_name"]')?.value,
             issuer: entry.querySelector('[data-input="cert_issuer"]')?.value,
             issueDate: entry.querySelector('[data-input="issue_date"]')?.value,
             expDate: entry.querySelector('[data-input="expiration_date"]')?.value,
             url: entry.querySelector('[data-input="credential_url"]')?.value,
         });
     });

     // Awards *NEW*
     document.querySelectorAll('#awards-entries .award-entry').forEach(entry => {
         resumePartData.awards.push({
             title: entry.querySelector('[data-input="award_title"]')?.value,
             date: entry.querySelector('[data-input="award_date"]')?.value,
             issuer: entry.querySelector('[data-input="issuer"]')?.value,
             description: entry.querySelector('[data-input="award_description"]')?.value,
         });
     });

     // Publications *NEW*
     document.querySelectorAll('#publications-entries .publication-entry').forEach(entry => {
         resumePartData.publications.push({
             title: entry.querySelector('[data-input="publication_title"]')?.value,
             publisher: entry.querySelector('[data-input="publisher"]')?.value,
             date: entry.querySelector('[data-input="publication_date"]')?.value,
             url: entry.querySelector('[data-input="publication_url"]')?.value,
             description: entry.querySelector('[data-input="publication_description"]')?.value,
         });
     });

     // Volunteering *NEW*
     document.querySelectorAll('#volunteering-entries .volunteering-entry').forEach(entry => {
         resumePartData.volunteering.push({
             role: entry.querySelector('[data-input="role"]')?.value,
             organization: entry.querySelector('[data-input="organization"]')?.value,
             location: entry.querySelector('[data-input="volunteer_location"]')?.value,
             startDate: entry.querySelector('[data-input="volunteer_start_date"]')?.value,
             endDate: entry.querySelector('[data-input="volunteer_end_date"]')?.value,
             current: entry.querySelector('[data-input="currently_volunteering"]')?.checked,
             description: entry.querySelector('[data-input="volunteer_description"]')?.value,
         });
     });

     // Languages (as before)
     document.querySelectorAll('#languages-entries .language-entry').forEach(entry => {
         resumePartData.languages.push({
             language: entry.querySelector('[data-input="language"]')?.value,
             proficiency: entry.querySelector('[data-input="proficiency"]')?.value,
         });
     });

     // Interests *NEW*
     document.querySelectorAll('#interests-entries .interest-entry').forEach(entry => {
         resumePartData.interests.push({
             name: entry.querySelector('[data-input="interest_name"]')?.value,
         });
     });

     // Social Media *NEW*
     document.querySelectorAll('#social-media-entries .social-media-entry').forEach(entry => {
         resumePartData.socialMedia.push({
             network: entry.querySelector('[data-input="network"]')?.value,
             username: entry.querySelector('[data-input="username"]')?.value,
             url: entry.querySelector('[data-input="profile_url"]')?.value,
         });
     });

     // References *NEW*
     document.querySelectorAll('#references-entries .reference-entry').forEach(entry => {
         resumePartData.references.push({
             name: entry.querySelector('[data-input="referent_name"]')?.value,
             company: entry.querySelector('[data-input="referent_company"]')?.value,
             // position: entry.querySelector('[data-input="referent_position"]')?.value, // Removed
             email: entry.querySelector('[data-input="referent_email"]')?.value,
             phone: entry.querySelector('[data-input="referent_phone"]')?.value,
             note: entry.querySelector('[data-input="reference_text"]')?.value,
         });
     });

    // Custom Sections (as before)
    document.querySelectorAll('#custom-sections-entries .custom-section-entry').forEach(entry => {
         resumePartData.customSections.push({
             title: entry.querySelector('[data-input="custom_title"]')?.value,
             description: entry.querySelector('[data-input="custom_description"]')?.value,
         });
    });

    // Settings (as before)
    resumePartData.settings.themeColor = document.getElementById('settings-theme-color')?.value;
    resumePartData.settings.fontFamily = document.getElementById('settings-font-family')?.value;
    resumePartData.settings.fontSize = document.getElementById('settings-font-size')?.value;
    resumePartData.settings.documentSize = document.getElementById('settings-document-size')?.value;
        // *** NEW: Add selected template ID to settings ***
        resumePartData.settings.templateId = selectedTemplateId || 'default';
        console.log("currentApplicationData:", currentApplicationData); // For debugging
        resumePartData.settings.language = document.getElementById('settings-language')?.value;
    console.log("resumePartData Collected Data:", resumePartData); // For debugging
    return resumePartData;
}


// --- *** NEW: Handler for Creating App from Builder Modal *** ---
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
        companyName: '',
        hiringManager: '',
        resumeData: {
            personalInfo: { }, // Sync name initially
            settings: { language: language, themeColor: '#206bc4', fontFamily: "'Inter', sans-serif", fontSize: '10pt', documentSize: 'A4', templateId: 'default' },
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
        const newId = await saveApplication(newApplicationData); // Save to Dexie
        if (newId) {
            showNotification(translations[currentLang]?.myapplications_notify_create_success || "Application created!", 'success');
            if (createModalInstanceBuilder) createModalInstanceBuilder.hide();

            // --- Update Page State ---
            currentApplicationId = newId; // Set the ID for the current page session
             if(document.getElementById('current-resume-id')) {
                 document.getElementById('current-resume-id').value = currentApplicationId;
            }
            // Update the URL without reloading
            const newUrl = `${window.location.pathname}?applicationId=${newId}${window.location.hash}`;
            history.pushState({ applicationId: newId }, document.title, newUrl);
            console.log(`URL updated to include applicationId=${newId}`);

            // --- Reload the builder with the new application ---
            // Simply calling loadApplicationForBuilder() again should work now
            // as it will find the ID in the (newly pushed) URL state conceptually,
            // or we can rely on the currentApplicationId variable being set.
            // It's better to be explicit:
            await loadApplicationForBuilder(); // Reloads data based on the new ID

        } else {
            throw new Error("Failed to save new application and get ID.");
        }
    } catch (error) {
        console.error("Error creating application from builder modal:", error);
        createModalErrorBuilder.textContent = translations[currentLang]?.myapplications_modal_error_save || "Error saving application.";
        createModalErrorBuilder.style.display = 'block';
        createModalSaveBtnBuilder.disabled = false;
        createModalSaveBtnBuilder.innerHTML = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
    }
}




// --- *** REFACTOR Loading Logic *** ---
async function loadApplicationForBuilder() {
    console.log("loadApplicationForBuilder called...");
    const urlParams = new URLSearchParams(window.location.search);
    const applicationIdParam = urlParams.get('applicationId');

    // Clear previous state explicitly
    currentApplicationId = null;
    currentApplicationData = null;
    if(document.getElementById('current-resume-id')) { // Check if hidden input exists
        document.getElementById('current-resume-id').value = '';
    }
    // Clear form and preview before deciding what to do
    populateForm(null);
    // Reset Job Description display
     if (displayJobDescElement) {
         displayJobDescElement.innerHTML = ''; // Clear it completely initially
         displayJobDescElement.classList.add('text-muted');
     }


    if (applicationIdParam) {
        // --- Scenario 1: Application ID Found ---
        console.log(`Application ID ${applicationIdParam} found in URL.`);
        currentApplicationId = parseInt(applicationIdParam);
        if (document.getElementById('current-resume-id')) {
            document.getElementById('current-resume-id').value = currentApplicationId;
        }

        // Fetch the entire application object
        currentApplicationData = await getApplication(currentApplicationId);

        if (currentApplicationData) {
            console.log("Loaded Application Data:", currentApplicationData);
            // Populate form using the nested resumeData
            populateForm(currentApplicationData.resumeData);

            // Display the job description
            if (displayJobDescElement) {
                if (currentApplicationData.jobDescription) {
                    displayJobDescElement.textContent = currentApplicationData.jobDescription;
                    displayJobDescElement.classList.remove('text-muted');
                } else {
                    //const noDescKey = 'resume_text_no_job_desc';
                    //displayJobDescElement.innerHTML = `<em data-translate="${noDescKey}">${translations[currentLang]?.[noDescKey] || '(No job description provided...)'}</em>`;
                    //displayJobDescElement.classList.add('text-muted');
                    translatePage(currentLang);
                }
            }

            // Set page title based on application name
            document.title = `${currentApplicationData.applicationName || 'Resume Builder'} - ${translations[currentLang]?.navbar_title || 'ATS Resume Builder'}`;
            // Ensure preview is updated after loading
             updatePreview(); // Update preview here for loaded data

        } else {
            // Handle case where ID is in URL but data not found
            console.error(`Application with ID ${currentApplicationId} not found in DB.`);
            currentApplicationId = null; // Reset ID
            if (document.getElementById('current-resume-id')) {
                document.getElementById('current-resume-id').value = '';
            }
            const errorMsgKey = 'resume_notify_app_load_fail';
            showNotification(translations[currentLang]?.[errorMsgKey] || "Failed to load application data.", 'danger');
             // Show the create modal as a fallback? Or show a persistent error?
             // For now, let's show the modal.
             if (createModalInstanceBuilder) {
                 console.log("Showing create modal as fallback because specified App ID failed to load.");
                 createModalInstanceBuilder.show();
            } else {
                console.error("Create modal instance not available for fallback.");
                // Show a page-level error message
            }
            // Clear job desc display
            if (displayJobDescElement) displayJobDescElement.innerHTML = '<em>Error loading data. Please create a new application.</em>';
        }

    } else {
        // --- Scenario 2: No Application ID Found ---
        console.log("No applicationId found in URL. Showing Create Application modal.");

        // Reset title to default
         document.title = `${translations[currentLang]?.navbar_title || 'AI Resume Builder'}`;
         // Clear potentially loaded default personal info if any
         await loadDefaultPersonalInfo(true); // Pass flag to clear existing values first
         // Ensure Preview is cleared/shows placeholder
         updatePreview(); // Call preview to show empty state

        // Show the 'Create New Application' modal
        if (createModalInstanceBuilder) {
            // Reset modal fields before showing (in case it was somehow left open)
            newAppNameInputBuilder.value = '';
            newAppJobDescInputBuilder.value = '';
            newAppLanguageSelectBuilder.value = currentLang || 'en'; // Default to current UI lang
            createModalErrorBuilder.style.display = 'none';
            createModalSaveBtnBuilder.disabled = false;
            createModalSaveBtnBuilder.innerHTML = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
            createModalInstanceBuilder.show();
        } else {
             console.error("Create modal instance not available.");
             // Display an error on the page, maybe hide the builder?
             showNotification("Error: Cannot initialize application creation.", "danger");
        }
         // Display info in Job Desc area
         if (displayJobDescElement) {
             displayJobDescElement.innerHTML = `<em data-translate="resume_create_app_prompt">${translations[currentLang]?.resume_create_app_prompt || 'Please create an application using the modal to begin.'}</em>`;
             displayJobDescElement.classList.add('text-muted');
             translatePage(currentLang);
         }
    }
}








// --- Modify loadDefaultPersonalInfo to accept a clear flag ---
async function loadDefaultPersonalInfo(forceClear = false) {
    const userProfile = await getSetting('userProfile');
    const nameInput = document.getElementById('input-name');
    const emailInput = document.getElementById('input-email');
    const phoneInput = document.getElementById('input-phone');
    const locationInput = document.getElementById('input-location');

    if (forceClear) {
        console.log("Clearing personal info fields.");
        if (nameInput) nameInput.value = '';
        if (emailInput) emailInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (locationInput) locationInput.value = '';
    }

    if (userProfile) {
        console.log("Loading default personal info from settings...");
        // Only populate if the fields are empty OR if forceClear was false
        if (!nameInput.value && nameInput) {
             nameInput.value = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
        }
        if (!emailInput.value && emailInput) {
             emailInput.value = userProfile.email || '';
        }
         if (!phoneInput.value && phoneInput) {
             phoneInput.value = userProfile.phone || '';
        }
         if (!locationInput.value && locationInput) {
             locationInput.value = userProfile.address || '';
        }
        // Don't update preview here, let the calling function handle it
    }
}

async function handleSaveBuilderChanges() {
    if (!currentApplicationData && !currentApplicationId) {
        // This scenario shouldn't normally happen if loading logic is correct.
        // It means we're trying to save without a loaded application or a new one being properly initialized.
        // Might indicate an attempt to save a completely blank, never-loaded state.
        // Consider redirecting to create a new application or showing an error.
        showNotification("Cannot save: No application loaded or specified. Please create or load an application first.", 'warning');
        console.error("Attempted to save without a valid currentApplicationId or loaded currentApplicationData.");
        // Optional: Redirect to MyApplications page or trigger create modal
        // window.location.href = './MyApplications.html';
        return;
    }

    // 1. Collect data specifically from the resume builder form
    const collectedResumeData = collectFormData();

    // 2. Get the currently loaded application object (or prepare a new one if ID exists but data is missing)
    let applicationToSave = currentApplicationData;
    if (!applicationToSave && currentApplicationId) {
         // If ID exists but data somehow got wiped, fetch it again (less ideal)
         console.warn("currentApplicationData missing, re-fetching application:", currentApplicationId);
         applicationToSave = await getApplication(currentApplicationId);
         if (!applicationToSave) {
              showNotification("Error: Could not retrieve application data to save.", 'danger');
              return;
         }
         currentApplicationData = applicationToSave; // Restore global object
    } else if (!applicationToSave && !currentApplicationId) {
         // This case is handled by the initial check, but as a fallback:
         console.error("Critical error: Cannot proceed with save without application context.");
         return;
    }


    // 3. Update the nested resumeData within the application object
    applicationToSave.resumeData = collectedResumeData;
   
    // No need to update createdAt
    applicationToSave.updatedAt = new Date(); // Always update this

    // *** SAVE LOGIC ***
    const saveButton = document.getElementById('save-resume-btn');
    if (!saveButton) return;
    const originalButtonContent = saveButton.innerHTML;
    saveButton.disabled = true;
    const savingTextKey = 'myresumes_notify_saving'; // Reuse key
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> ${translations[currentLang]?.[savingTextKey] || 'Saving...'}`;

    try {
        // *** Save the entire updated application object ***
        const savedId = await saveApplication(applicationToSave, currentApplicationId);

        if (savedId) {
            // If it was a new application being saved for the first time
             if (!currentApplicationId) {
                currentApplicationId = savedId;
                document.getElementById('current-resume-id').value = currentApplicationId;
                // Update URL without reloading page
                const newUrl = `${window.location.pathname}?applicationId=${savedId}${window.location.hash}`;
                history.pushState({ applicationId: savedId }, document.title, newUrl);
                console.log(`New application saved with ID: ${savedId}. URL updated.`);
                 // Update the global data object with the newly saved data (especially if defaults were applied by saveApplication)
                 currentApplicationData = await getApplication(savedId);
            } else {
                console.log(`Application ID ${currentApplicationId} updated.`);
                // Refresh global data just in case
                 currentApplicationData = await getApplication(currentApplicationId);
            }

            // Show success feedback
            const successMsgKey = 'resume_notify_app_save_success';
            showNotification(translations[currentLang]?.[successMsgKey] || "Application updated successfully!", 'success');

        } else {
            throw new Error("Failed to get valid ID after saving application.");
// --- NEW: AI Assist Functionality ---








// --- END NEW AI Assist ---
        }
    } catch (error) {
        console.error("Error saving application:", error);
        const errorMsgKey = 'resume_notify_app_save_fail';
        showNotification(`${translations[currentLang]?.[errorMsgKey] || "Failed to save application changes."} ${error.message}`, 'danger');
    } finally {
        saveButton.disabled = false;
        // Use translation key for button text restoration
        const saveBtnKey = 'resume_button_save';
        saveButton.innerHTML = originalButtonContent; // Restore the exact original content (which includes the span text)
    }
}



// --- Load Default Personal Info ---
async function loadDefaultPersonalInfo() {
    const userProfile = await getSetting('userProfile');
    if (userProfile) {
        console.log("Loading default personal info from settings...");
        // Only populate if the fields are empty
        if (!document.getElementById('input-name').value) {
             document.getElementById('input-name').value = `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim();
        }
        if (!document.getElementById('input-email').value) {
             document.getElementById('input-email').value = userProfile.email || '';
        }
         if (!document.getElementById('input-phone').value) {
             document.getElementById('input-phone').value = userProfile.phone || '';
        }
         if (!document.getElementById('input-location').value) {
             document.getElementById('input-location').value = userProfile.address || ''; // Assuming address maps to location
        }
        // Update preview if any changes were made
        updatePreview();
    }
}




// --- REPLACE the old updatePreview function ---
function updatePreview() {
    if (!previewContainer) {
        console.error("Preview container not found.");
        return;
    }

    // 1. Collect data from the form
    const data = collectFormData();

    // 2. Check if necessary global objects are available
    if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
        console.error("Translations or currentLang not available for preview generation.");
        // Display a basic error in the preview
        previewContainer.innerHTML = `<div class="text-center p-5 text-muted">Preview unavailable: Missing language data.</div>`;
        return;
    }

        // 3. Select the template generator function
        let templateGenerator;
        if (typeof getTemplateGenerator === 'function') {
            templateGenerator = getTemplateGenerator(selectedTemplateId); // Use the global variable
        } else {
             console.error("getTemplateGenerator function not found. Make sure previewTemplates.js is loaded correctly.");
             previewContainer.innerHTML = `<div class="text-center p-5 text-muted">Preview generation function missing.</div>`;
             return; // Stop if we can't get the generator
        }

     // --- *** START FIX *** ---
    // 4. Generate HTML using the SELECTED function
    let generatedHTML = '';
    if (typeof templateGenerator === 'function') { // Check the SELECTED generator
        try {
            generatedHTML = templateGenerator(data, translations, currentLang); // Call the SELECTED generator
        } catch (error) {
             console.error(`Error executing template generator for ID '${selectedTemplateId}':`, error);
             generatedHTML = `<div class="text-center p-5 text-danger">Error generating preview for template '${selectedTemplateId}'. Check console.</div>`;
        }
    } else {
        // This case should ideally not be reached if getTemplateGenerator works
        console.error(`Template generator for ID '${selectedTemplateId}' is not a function.`);
        generatedHTML = `<div class="text-center p-5 text-muted">Error loading template '${selectedTemplateId}'.</div>`;
    }
    // --- *** END FIX *** ---

    // 5. Inject the generated HTML into the preview container
    previewContainer.innerHTML = generatedHTML;

    // 6. Re-apply translations to any preview elements that use data-translate
    //    (This handles elements *within* the generated HTML that still have the attribute)
    previewContainer.querySelectorAll('[data-translate]').forEach(el => {
         const key = el.getAttribute('data-translate');
         if (translations[currentLang] && translations[currentLang][key]) {
             // Use textContent for safety, assuming these are simple text nodes
             el.textContent = translations[currentLang][key];
         } else if (translations['en'] && translations['en'][key]) {
             // Fallback to English if current language key is missing
             el.textContent = translations['en'][key];
         }
     });

    // Optional: Add a small delay if rendering complex previews causes issues, though usually not needed
    // setTimeout(() => { /* translation re-apply logic here */ }, 50);
}

// --- *** NEW: Function to Update Template Modal Selection Visuals *** ---
function updateTemplateModalSelection() {
    if (!templateSelectionContainer) return;
    const cards = templateSelectionContainer.querySelectorAll('.template-card');
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
function setupTemplateSwitcherListeners() {
    const changeTemplateBtn = document.getElementById('change-template-btn');

    // Listener for the main "Change Template" button
    changeTemplateBtn?.addEventListener('click', () => {
        if (templateModalInstance) {
            updateTemplateModalSelection(); // Update visuals before showing
            templateModalInstance.show();
        } else {
            console.error("Template modal instance not found.");
            showNotification("Cannot open template selection.", "danger");
        }
    });

    // Listener for clicks within the template selection modal (using delegation)
    templateSelectionContainer?.addEventListener('click', (event) => {
        const selectedCard = event.target.closest('.template-card');
        if (selectedCard && selectedCard.dataset.templateId) {
            const newTemplateId = selectedCard.dataset.templateId;
            if (newTemplateId !== selectedTemplateId) {
                console.log("Template selected:", newTemplateId);
                selectedTemplateId = newTemplateId; // Update the global variable
                updateTemplateModalSelection(); // Update visual highlight in modal
                updatePreview(); // Update the main resume preview
                // Optional: Auto-save the change immediately
                handleSaveBuilderChanges();
            }
            if (templateModalInstance) {
                templateModalInstance.hide(); // Hide modal after selection
            }
        }
    });
}







// --- NEW Helper Function to Add Skill Category from AI Suggestion ---
function addSkillCategoryFromSuggestion(categoryName, skillsList) {
    console.log(`Adding new skill category: ${categoryName}`);
    const container = document.getElementById('skills-entries'); // Target the correct container
    const template = document.getElementById('skill-category-template');
    // We don't need the main add button for insertion logic anymore
    // const addButton = document.getElementById('add-skill-category-btn');

    if (!container || !template) {
        console.error("Skills container or template not found for adding suggestion.");
        showNotification("Error adding skill category: internal elements missing.", 'danger');
        return;
    }

    // Clone the template
    const clone = template.content.firstElementChild.cloneNode(true);

    // Populate the new entry
    const categoryInput = clone.querySelector('[data-input="skills_category"]');
    const skillsTextarea = clone.querySelector('[data-input="skills_list"]');
    if (categoryInput) categoryInput.value = categoryName || '';
    if (skillsTextarea) skillsTextarea.value = skillsList || '';

    // Add standard event listeners (remove, input for preview)
    const removeBtn = clone.querySelector('.remove-entry-btn');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            clone.remove();
            updatePreview();
        });
    }
    clone.querySelectorAll('input, textarea, select').forEach(input => {
         const eventType = (input.tagName === 'SELECT' || input.type === 'checkbox' || input.type === 'radio') ? 'change' : 'input';
        input.addEventListener(eventType, updatePreview);
    });

    // --- CORRECTED INSERTION LOGIC ---
    // Always append the new clone inside the 'skills-entries' div
    container.appendChild(clone);
    // --- END CORRECTION ---

    // Update the preview and save
    updatePreview();
    handleSaveBuilderChanges(); // Auto-save the new addition

    showNotification(`Added skill category: ${categoryName}`, 'success');
}





// --- AI Assist Handler (Handles identifying context, calling AI, and populating modal) ---
async function handleAiAssist(button) {
    if (!currentApplicationData) {
        showNotification(translations[currentLang]?.resume_notify_app_load_fail || "Application data not loaded.", 'danger');
        return;
    }
    if (!aiAssistModalInstance) {
        showNotification("AI Assist Modal not initialized.", 'danger');
        console.error("AI Assist Modal instance is missing.");
        return;
    }

    const promptType = button.dataset.promptType;
    const targetSelector = button.dataset.targetSelector; // For individual items
    const targetId = button.dataset.target; // For sections
    let targetElement = null; // The direct element (input/textarea) or container
    let originalContent = ''; // Text content for single inputs or reference for containers
    let contextData = {}; // Data specific to the AI prompt
    let workExperienceEntriesForAI = []; // Store collected work experiences for 'all' type
    let skillEntriesForAI = []; // Store collected skills for 'all' type

    console.log(`handleAiAssist called with promptType: ${promptType}, targetSelector: ${targetSelector}, targetId: ${targetId}`);

    // --- 1. Identify Target & Get Context/Original Content ---
    try {
        if (promptType === 'work_experience_all') {
            targetElement = document.getElementById('work-experience-entries');
            if (!targetElement) throw new Error("Work experience container not found.");
            const jobEntries = targetElement.querySelectorAll('.job-entry');
            if (jobEntries.length === 0) {
                showNotification("No work experience entries found to enhance.", 'info'); return;
            }
            jobEntries.forEach(entry => {
                workExperienceEntriesForAI.push({
                    jobTitle: entry.querySelector('[data-input="job_title"]')?.value || '',
                    company: entry.querySelector('[data-input="company"]')?.value || '',
                    description: entry.querySelector('[data-input="description"]')?.value || ''
                });
            });
            contextData.workExperiences = workExperienceEntriesForAI;
            originalContent = `Enhancing ${workExperienceEntriesForAI.length} entries.`;
            console.log("Context for work_experience_all:", contextData.workExperiences);

        } else if (promptType === 'skills_all') {
            targetElement = document.getElementById('skills-entries');
            if (!targetElement) throw new Error("Skills entries container not found.");
            const skillEntries = targetElement.querySelectorAll('.skill-category-entry');
            if (skillEntries.length === 0) {
                console.log("No existing skill entries found. Asking AI to generate from scratch based on job desc.");
                skillEntriesForAI = [];
                originalContent = "(No existing skills - AI will generate)";
            } else {
                skillEntries.forEach(entry => {
                    skillEntriesForAI.push({
                        category: entry.querySelector('[data-input="skills_category"]')?.value || '',
                        skillsList: entry.querySelector('[data-input="skills_list"]')?.value || ''
                    });
                });
                originalContent = `Enhancing ${skillEntriesForAI.length} skill categories.`;
            }
            contextData.existingSkills = skillEntriesForAI;
            console.log("Context for skills_all:", contextData.existingSkills);

        } else if (targetSelector) { // ITEM LEVEL
            const entryElement = button.closest('.dynamic-entry');
            if (!entryElement) throw new Error("Could not find parent dynamic entry.");
            targetElement = entryElement.querySelector(targetSelector);
            if (!targetElement) throw new Error(`Could not find target element with selector ${targetSelector} in entry.`);

            originalContent = targetElement.value;
            // Store the direct input/textarea for single actions
            currentAiAssistTargetElement = targetElement;

            if (promptType === 'work_experience_item') {
                contextData.jobTitle = entryElement.querySelector('[data-input="job_title"]')?.value || '';
                contextData.company = entryElement.querySelector('[data-input="company"]')?.value || '';
                contextData.existingDescription = originalContent;
                console.log("Context for work_experience_item:", contextData);
            } else if (promptType === 'skills_item') {
                contextData.categoryName = entryElement.querySelector('[data-input="skills_category"]')?.value || '';
                contextData.existingSkills = originalContent; // The skills list textarea value
                console.log("Context for skills_item:", contextData);
            } else {
                 console.warn(`Unhandled item-level promptType: ${promptType}`);
            }

        } else if (targetId) { // OTHER SECTION LEVEL (e.g., Summary)
            targetElement = document.getElementById(targetId);
            if (!targetElement) throw new Error(`Target element with ID ${targetId} not found.`);

            if (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT') {
                if (promptType === 'summary') {
                    originalContent = targetElement.value;
                    currentAiAssistTargetElement = targetElement; // Store single target
                    // Summary context is built later just before API call
                } else {
                    throw new Error(`Unhandled section-level AI Assist promptType '${promptType}' for targetId '${targetId}'.`);
                }
            } else {
                // This should not be reached if promptTypes are handled correctly
                throw new Error(`Target element #${targetId} is a container, but promptType '${promptType}' was not handled by specific container logic.`);
            }
        } else {
            throw new Error("Could not determine target for AI Assist button.");
        }
    } catch (error) {
        showNotification(`Error preparing AI Assist: ${error.message}`, 'danger');
        console.error("Error in handleAiAssist (Section 1 - Identify Target):", error);
        return; // Stop execution if target/context setup fails
    }

    // Store original content for modal display
    currentAiAssistOriginalContent = originalContent;

    // Clear target element ONLY for single item actions (reset for _all types)
    if (!promptType.endsWith('_all')) {
        // currentAiAssistTargetElement is already set if needed
    } else {
        currentAiAssistTargetElement = null; // Ensure it's null for _all types
    }

    // --- 2. Prepare Modal ---
    aiAssistErrorDiv.style.display = 'none';
    aiAssistLoadingDiv.style.display = 'block';

    const singleSuggestionArea = document.getElementById('ai-assist-single-suggestion');
    const dynamicContentArea = document.getElementById('ai-assist-dynamic-content');
    const singleActions = document.getElementById('ai-assist-single-actions');
    const originalContentArea = document.getElementById('ai-assist-original-content');
    const originalContentTextarea = document.getElementById('ai-assist-original');

    if (dynamicContentArea) dynamicContentArea.innerHTML = ''; // Always clear dynamic area

    if (promptType.endsWith('_all')) { // Catches work_experience_all and skills_all
        if (singleSuggestionArea) singleSuggestionArea.style.display = 'none';
        if (singleActions) singleActions.style.display = 'none';
        if (dynamicContentArea) dynamicContentArea.style.display = 'block';
        if (originalContentArea) originalContentArea.style.display = 'none';
    } else { // Catches summary, work_experience_item, skills_item
        if (aiAssistOutputTextarea) aiAssistOutputTextarea.value = '';
        if (aiAssistReplaceBtn) aiAssistReplaceBtn.disabled = true;
        // Enable Add Below if target is a textarea (listener will enforce specific logic)
        if (aiAssistAddBelowBtn) {
             aiAssistAddBelowBtn.disabled = !(currentAiAssistTargetElement?.tagName === 'TEXTAREA');
        }

        if (singleSuggestionArea) singleSuggestionArea.style.display = 'block';
        if (singleActions) singleActions.style.display = 'block';
        if (dynamicContentArea) dynamicContentArea.style.display = 'none';
        if (originalContentArea) originalContentArea.style.display = 'block';
        if (originalContentTextarea) originalContentTextarea.value = currentAiAssistOriginalContent;
    }

    // --- Set Modal Language and Title ---
    const defaultLang = currentApplicationData?.resumeData?.settings?.language || currentLang || 'en';
    if (aiAssistLanguageSelect) aiAssistLanguageSelect.value = defaultLang;

    const titleKey = `ai_assist_title_${promptType}`;
    let defaultTitle = `AI Assist: ${promptType.replace(/_/g, ' ')}`;
    if (promptType === 'skills_all') defaultTitle = 'AI Assist: All Skill Categories';
    else if (promptType === 'skills_item') defaultTitle = 'AI Assist: Skill Category';
    if (aiAssistModalLabel) aiAssistModalLabel.textContent = translations[currentLang]?.[titleKey] || defaultTitle;

    // --- 3. Store Context for Language Change & Show Modal ---
    const jobDesc = displayJobDescElement?.value.trim() || currentApplicationData.jobDescription || '';
    if (aiAssistModalElement) {
        aiAssistModalElement.dataset.currentPromptType = promptType;
        aiAssistModalElement.dataset.currentJobDesc = jobDesc;
        aiAssistModalElement.dataset.currentContextData = JSON.stringify(contextData);
    }
    aiAssistModalInstance.show();

    // --- 4. Call AI ---
    const selectedLanguage = aiAssistLanguageSelect.value;
    try {
        let apiContextData = contextData; // Use context prepared in step 1 by default

        if (promptType === 'summary') {
            const fullResumeData = collectFormData();
            const skillsString = (fullResumeData.skills && fullResumeData.skills.length > 0) ? fullResumeData.skills.map(s => `${s.category || 'Skills'}: ${s.skillsList || ''}`).join('; ') : 'Not specified';
            const experienceString = (fullResumeData.workExperience && fullResumeData.workExperience.length > 0) ? fullResumeData.workExperience.map(w => `${w.jobTitle || 'Role'} at ${w.company || 'Company'} (${w.startDate || ''}-${w.endDate || 'Current'}) duties included ${w.description || ''} `).join('; ') : 'Not specified';
            apiContextData = {
                role: fullResumeData.personalInfo.role,
                keySkills: skillsString,
                experienceHighlights: experienceString
            };
        }

        const result = await fetchResumeContentFromAI(promptType, jobDesc, apiContextData, selectedLanguage);
        currentAiAssistGeneratedContent = result; // Store raw result

        // --- 5. Populate Modal with Result ---
        aiAssistErrorDiv.style.display = 'none'; // Clear previous errors before populating

        if (promptType === 'work_experience_all' && Array.isArray(result)) {
            const suggestionTemplate = document.getElementById('ai-work-experience-suggestion-template');
            const workExpFormEntries = document.querySelectorAll('#work-experience-entries .job-entry');
            const numExistingWork = workExpFormEntries.length;
            if (!dynamicContentArea || !suggestionTemplate) throw new Error("Work experience template/container missing.");

            if (result.length !== numExistingWork && numExistingWork > 0) {
                console.warn(`AI work exp suggestions count (${result.length}) mismatch form entries (${numExistingWork}).`);
                 aiAssistErrorDiv.textContent = `Warning: AI suggestion count (${result.length}) doesn't match form entries (${numExistingWork}). Results shown might be misaligned.`;
                 aiAssistErrorDiv.classList.remove('alert-danger'); aiAssistErrorDiv.classList.add('alert-warning'); aiAssistErrorDiv.style.display = 'block';
            } else {
                 aiAssistErrorDiv.style.display = 'none'; // Hide if counts match
            }

            result.forEach((suggestion, index) => {
                const originalFormEntry = workExpFormEntries[index]; // May be undefined if AI added more
                const clone = suggestionTemplate.content.firstElementChild.cloneNode(true);
                clone.querySelector('.job-title').textContent = suggestion.jobTitle || originalFormEntry?.querySelector('[data-input="job_title"]')?.value || 'N/A';
                clone.querySelector('.company-name').textContent = suggestion.company || originalFormEntry?.querySelector('[data-input="company"]')?.value || 'N/A';
                const outputTextarea = clone.querySelector('.ai-suggestion-output');
                if (outputTextarea) outputTextarea.value = suggestion.enhancedDescription || '';

                clone.dataset.originalEntryIndex = index; // Always store index relative to suggestions
                //clone.querySelectorAll('[data-translate]').forEach(el => translateElement(el, currentLang));
                dynamicContentArea.appendChild(clone);
                // Note: Work exp template currently doesn't have Add Category/Add Below separation
            });

        } else if (promptType === 'skills_all' && Array.isArray(result)) {
            const suggestionTemplate = document.getElementById('ai-skill-suggestion-template');
            const skillFormEntries = document.querySelectorAll('#skills-entries .skill-category-entry');
            const numExistingSkills = skillFormEntries.length;
            if (!dynamicContentArea || !suggestionTemplate) throw new Error("Skill template/container missing.");

            if (result.length === 0 && numExistingSkills === 0) {
                dynamicContentArea.innerHTML = `<p class="text-muted" data-translate="ai_assist_skills_all_no_generate">AI couldn't generate initial skills. Try adding categories manually.</p>`;
                translateElement(dynamicContentArea.querySelector('p'), currentLang);
            } else {
                 if (result.length !== numExistingSkills && numExistingSkills > 0) {
                      console.warn(`AI skill suggestions count (${result.length}) mismatch form entries (${numExistingSkills}).`);
                      // Optionally show non-blocking info message
                 }

                result.forEach((suggestion, index) => {
                    const clone = suggestionTemplate.content.firstElementChild.cloneNode(true);
                    const categoryName = suggestion.category || `Suggested Category ${index + 1}`;
                    const skillsList = suggestion.enhancedSkillsList || '';

                    clone.querySelector('.skill-category-name').textContent = categoryName;
                    const outputTextarea = clone.querySelector('.ai-suggestion-output');
                    if (outputTextarea) outputTextarea.value = skillsList;

                    const replaceBtn = clone.querySelector('.ai-suggestion-replace-btn');
                    const addCategoryBtn = clone.querySelector('.ai-suggestion-add-category-btn');
                    const addBelowBtn = clone.querySelector('.ai-suggestion-add-below-btn');

                    const isExistingEntry = index < numExistingSkills;

                    if (isExistingEntry) { // Corresponds to existing entry
                        clone.dataset.originalEntryIndex = index;
                        if (replaceBtn) replaceBtn.style.display = 'inline-block';
                        if (addBelowBtn) addBelowBtn.style.display = 'inline-block'; // Show Add Below too
                        if (addCategoryBtn) addCategoryBtn.style.display = 'none';
                    } else { // New category suggested by AI
                        if (replaceBtn) replaceBtn.style.display = 'none';
                        if (addBelowBtn) addBelowBtn.style.display = 'none';
                        if (addCategoryBtn) {
                            addCategoryBtn.dataset.categoryName = categoryName;
                            addCategoryBtn.dataset.skillsList = skillsList;
                            addCategoryBtn.style.display = 'inline-block';
                        }
                    }
                    //clone.querySelectorAll('[data-translate]').forEach(el => translateElement(el, currentLang));
                    dynamicContentArea.appendChild(clone);
                });
             }

        } else if ((promptType.endsWith('_item') || promptType === 'summary') && typeof result === 'string') { // SINGLE SUGGESTION
            if (aiAssistOutputTextarea) aiAssistOutputTextarea.value = result;
            if (aiAssistReplaceBtn) aiAssistReplaceBtn.disabled = false;
            if (aiAssistAddBelowBtn) {
                // Re-check if target is textarea (already done when preparing modal, but safe)
                aiAssistAddBelowBtn.disabled = !(currentAiAssistTargetElement?.tagName === 'TEXTAREA');
            }
        } else {
            throw new Error(`AI returned unexpected data format for ${promptType}.`);
        }

    } catch (error) {
        console.error(`AI Assist Error during fetch/processing (${promptType}):`, error);
        aiAssistErrorDiv.textContent = `${translations[currentLang]?.error_generic || 'Error'}: ${error.message}`;
        aiAssistErrorDiv.style.display = 'block';
        if (aiAssistReplaceBtn) aiAssistReplaceBtn.disabled = true;
        if (aiAssistAddBelowBtn) aiAssistAddBelowBtn.disabled = true;
    } finally {
        aiAssistLoadingDiv.style.display = 'none';
    }
}


// --- Event Listener Setup (Handles applying changes from modal) ---
function setupAiAssistListeners() {

    // --- Delegate Listener for ALL AI Buttons within the Builder ---
    const builderContainer = document.querySelector('.builder-container .card-body');
    if (builderContainer) {
        builderContainer.addEventListener('click', function(event) {
            const button = event.target.closest('.ai-assist-btn');
            if (button && !button.closest('template')) { // Ensure it's not in a template
                handleAiAssist(button);
            }
        });
    } else {
        console.error("Could not find builder container to attach AI Assist listeners.");
    }

    // --- Listener for SINGLE Suggestion Buttons (Modal Footer) ---
    aiAssistReplaceBtn?.addEventListener('click', () => {
        const singleSuggestionArea = document.getElementById('ai-assist-single-suggestion');
        if (singleSuggestionArea?.style.display !== 'none' && currentAiAssistTargetElement && currentAiAssistGeneratedContent !== null) {
            if (currentAiAssistTargetElement.tagName === 'TEXTAREA' || currentAiAssistTargetElement.tagName === 'INPUT') {
                currentAiAssistTargetElement.value = currentAiAssistGeneratedContent;
                updatePreview();
                handleSaveBuilderChanges(); // Auto-save
                aiAssistModalInstance.hide();
            } else {
                 console.warn("Replace action attempted on unhandled element type:", currentAiAssistTargetElement);
            }
        } else {
             console.warn("Replace button clicked but conditions not met (Area visible? Target set? Content generated?)");
        }
    });

    aiAssistAddBelowBtn?.addEventListener('click', () => {
        const singleSuggestionArea = document.getElementById('ai-assist-single-suggestion');
        const currentPromptType = aiAssistModalElement?.dataset.currentPromptType; // Get type again

        // Check it's visible, target is TEXTAREA, AND content exists
        if (singleSuggestionArea?.style.display !== 'none' &&
            currentAiAssistTargetElement?.tagName === 'TEXTAREA' &&
            currentAiAssistGeneratedContent !== null)
        {
            const currentVal = currentAiAssistTargetElement.value.trim();
            const suggestionVal = currentAiAssistGeneratedContent.trim();
            let separator = '\n\n---\n\n'; // Default separator for work exp, summary
            let combinedValue = '';

            // --- Use comma separator for skills_item ---
            if (currentPromptType === 'skills_item') {
                separator = ', '; // Skill separator
                if (!currentVal) { // If original is empty
                    combinedValue = suggestionVal;
                } else {
                    // Clean potential trailing/leading commas before joining
                    const cleanedCurrent = currentVal.replace(/,\s*$/, '');
                    const cleanedSuggestion = suggestionVal.replace(/^\s*,/, '');
                    combinedValue = cleanedCurrent + separator + cleanedSuggestion;
                }
            } else { // For other textareas (like work experience)
                 if (!currentVal) {
                     combinedValue = suggestionVal;
                 } else {
                    combinedValue = currentVal + separator + suggestionVal;
                 }
            }

            currentAiAssistTargetElement.value = combinedValue; // Update textarea
            updatePreview();
            handleSaveBuilderChanges(); // Auto-save
            aiAssistModalInstance.hide();
        } else {
            console.warn("Add Below button clicked but conditions not met (Area visible? Target Textarea? Content generated?)");
        }
    });

    // --- Delegated Listener for DYNAMIC Suggestion Buttons (Modal Body) ---
    const dynamicContentArea = document.getElementById('ai-assist-dynamic-content');
    if (dynamicContentArea) {
        dynamicContentArea.addEventListener('click', function(event) {
            const replaceButton = event.target.closest('.ai-suggestion-replace-btn');
            const addCategoryButton = event.target.closest('.ai-suggestion-add-category-btn');
            const addBelowButton = event.target.closest('.ai-suggestion-add-below-btn'); // Get add below button

            const workSuggestionBlock = event.target.closest('.ai-work-experience-suggestion');
            const skillSuggestionBlock = event.target.closest('.ai-skill-suggestion');

            let suggestionBlock = workSuggestionBlock || skillSuggestionBlock;
            if (!suggestionBlock) return; // Not a relevant click

            const generatedContent = suggestionBlock.querySelector('.ai-suggestion-output')?.value;
            const originalEntryIndexStr = suggestionBlock.dataset.originalEntryIndex; // Relevant for replace/add below

            // --- Handle REPLACE Action ---
            if (replaceButton) {
                 if (generatedContent === undefined || originalEntryIndexStr === undefined) { console.error("Replace failed: Missing data"); return; }
                 const originalEntryIndex = parseInt(originalEntryIndexStr);
                 if (isNaN(originalEntryIndex)) { console.error("Replace failed: Invalid index"); return; }

                 let originalTargetTextarea = null;
                 if (workSuggestionBlock) {
                    const entries = document.querySelectorAll('#work-experience-entries .job-entry');
                    originalTargetTextarea = entries[originalEntryIndex]?.querySelector('[data-input="description"]');
                 } else if (skillSuggestionBlock) {
                    const entries = document.querySelectorAll('#skills-entries .skill-category-entry');
                    originalTargetTextarea = entries[originalEntryIndex]?.querySelector('[data-input="skills_list"]');
                 }

                 if (!originalTargetTextarea) { console.error("Replace failed: Target textarea not found"); return; }

                 originalTargetTextarea.value = generatedContent; // Replace
                 suggestionBlock.style.opacity = '0.5'; replaceButton.disabled = true;
                 // Disable other buttons on the same block too
                 suggestionBlock.querySelector('.ai-suggestion-add-below-btn')?.setAttribute('disabled', 'true');
                 suggestionBlock.querySelector('.ai-suggestion-add-category-btn')?.setAttribute('disabled', 'true');

                 updatePreview(); handleSaveBuilderChanges();
            }
            // --- Handle ADD CATEGORY Action ---
            else if (addCategoryButton && skillSuggestionBlock) {
                 const categoryName = addCategoryButton.dataset.categoryName;
                 const skillsList = addCategoryButton.dataset.skillsList;
                 if (categoryName !== undefined && skillsList !== undefined) {
                    addSkillCategoryFromSuggestion(categoryName, skillsList); // Calls update/save inside
                    suggestionBlock.style.opacity = '0.5'; addCategoryButton.disabled = true;
                     suggestionBlock.querySelector('.ai-suggestion-replace-btn')?.setAttribute('disabled', 'true');
                     suggestionBlock.querySelector('.ai-suggestion-add-below-btn')?.setAttribute('disabled', 'true');
                 } else { console.error("Add Category failed: Missing data on button"); }
            }
            // --- Handle ADD BELOW Action ---
            else if (addBelowButton) { // Can be work exp or skill block now
                 if (generatedContent === undefined || originalEntryIndexStr === undefined) { console.error("Add Below failed: Missing data"); return; }
                 const originalEntryIndex = parseInt(originalEntryIndexStr);
                 if (isNaN(originalEntryIndex)) { console.error("Add Below failed: Invalid index"); return; }

                 let originalTargetTextarea = null;
                 let separator = '\n\n---\n\n'; // Default for work exp
                 let isSkill = false;

                 if (workSuggestionBlock) {
                     const entries = document.querySelectorAll('#work-experience-entries .job-entry');
                     originalTargetTextarea = entries[originalEntryIndex]?.querySelector('[data-input="description"]');
                 } else if (skillSuggestionBlock) {
                     isSkill = true;
                     separator = ', '; // Use comma for skills
                     const entries = document.querySelectorAll('#skills-entries .skill-category-entry');
                     originalTargetTextarea = entries[originalEntryIndex]?.querySelector('[data-input="skills_list"]');
                 }

                 if (!originalTargetTextarea) { console.error("Add Below failed: Target textarea not found"); return; }

                 // Append logic
                 const currentVal = originalTargetTextarea.value.trim();
                 const suggestionVal = generatedContent.trim();
                 let combinedValue = '';

                 if (!currentVal) {
                     combinedValue = suggestionVal;
                 } else {
                     if (isSkill) {
                         const cleanedCurrent = currentVal.replace(/,\s*$/, '');
                         const cleanedSuggestion = suggestionVal.replace(/^\s*,/, '');
                         combinedValue = cleanedCurrent + separator + cleanedSuggestion;
                     } else {
                         combinedValue = currentVal + separator + suggestionVal; // Newline separator
                     }
                 }
                 originalTargetTextarea.value = combinedValue; // Update textarea

                 suggestionBlock.style.opacity = '0.5'; addBelowButton.disabled = true;
                  suggestionBlock.querySelector('.ai-suggestion-replace-btn')?.setAttribute('disabled', 'true');
                  suggestionBlock.querySelector('.ai-suggestion-add-category-btn')?.setAttribute('disabled', 'true');

                 updatePreview(); handleSaveBuilderChanges();
            }
        });
    } else {
        console.error("AI Assist Dynamic Content area not found for delegation.");
    }


    // --- Listener for Language Change in Modal ---
    aiAssistLanguageSelect?.addEventListener('change', async () => {
        if (aiAssistModalElement?.classList.contains('show')) {
            // --- Get Stored Context ---
            const promptType = aiAssistModalElement.dataset.currentPromptType;
            const jobDescForAI = aiAssistModalElement.dataset.currentJobDesc || '';
            let contextDataForAI = {};
            try { contextDataForAI = JSON.parse(aiAssistModalElement.dataset.currentContextData || '{}'); }
            catch (e) { console.error("Failed to parse context data on lang change:", e); return; }
            const selectedLanguage = aiAssistLanguageSelect.value;

            if (!promptType) { console.error("PromptType missing on language change."); return;}

            // --- Clear & Show Loading ---
            aiAssistErrorDiv.style.display = 'none';
            aiAssistLoadingDiv.style.display = 'block';
            const dynamicContentArea = document.getElementById('ai-assist-dynamic-content');
            const singleSuggestionArea = document.getElementById('ai-assist-single-suggestion');
            if (dynamicContentArea) dynamicContentArea.innerHTML = '';
            if (aiAssistOutputTextarea) aiAssistOutputTextarea.value = '';
            if (aiAssistReplaceBtn) aiAssistReplaceBtn.disabled = true;
            if (aiAssistAddBelowBtn) aiAssistAddBelowBtn.disabled = true;

            try {
                // --- Refetch with new language ---
                const result = await fetchResumeContentFromAI(promptType, jobDescForAI, contextDataForAI, selectedLanguage);
                currentAiAssistGeneratedContent = result; // Store new content

                // --- Repopulate based on prompt type (similar to section 5 in handleAiAssist) ---
                 if (promptType === 'work_experience_all' && Array.isArray(result)) {
                     const suggestionTemplate = document.getElementById('ai-work-experience-suggestion-template');
                     const workExpFormEntries = document.querySelectorAll('#work-experience-entries .job-entry');
                      if (!dynamicContentArea || !suggestionTemplate) throw new Error("Work exp template/container missing on lang change.");
                      result.forEach((suggestion, index) => {
                         const originalFormEntry = workExpFormEntries[index];
                         if (originalFormEntry) { // Avoid error if AI adds more than exists
                              const clone = suggestionTemplate.content.firstElementChild.cloneNode(true);
                               clone.querySelector('.job-title').textContent = suggestion.jobTitle || originalFormEntry.querySelector('[data-input="job_title"]')?.value || 'N/A';
                               clone.querySelector('.company-name').textContent = suggestion.company || originalFormEntry.querySelector('[data-input="company"]')?.value || 'N/A';
                               const outputTextarea = clone.querySelector('.ai-suggestion-output');
                               if (outputTextarea) outputTextarea.value = suggestion.enhancedDescription || '';
                               clone.dataset.originalEntryIndex = index;
                               //clone.querySelectorAll('[data-translate]').forEach(el => translateElement(el, currentLang));
                               dynamicContentArea.appendChild(clone);
                         }
                      });

                 } else if (promptType === 'skills_all' && Array.isArray(result)) {
                     const suggestionTemplate = document.getElementById('ai-skill-suggestion-template');
                     const skillFormEntries = document.querySelectorAll('#skills-entries .skill-category-entry');
                     const numExistingSkills = skillFormEntries.length;
                     if (!dynamicContentArea || !suggestionTemplate) throw new Error("Skill template/container missing on lang change.");

                     if (result.length === 0 && numExistingSkills === 0) { /* Handle no generation */ }
                     else {
                         result.forEach((suggestion, index) => {
                             const clone = suggestionTemplate.content.firstElementChild.cloneNode(true);
                             const categoryName = suggestion.category || `Suggested Category ${index + 1}`;
                             const skillsList = suggestion.enhancedSkillsList || '';
                             clone.querySelector('.skill-category-name').textContent = categoryName;
                             const outputTextarea = clone.querySelector('.ai-suggestion-output');
                             if (outputTextarea) outputTextarea.value = skillsList;
                             const replaceBtn = clone.querySelector('.ai-suggestion-replace-btn');
                             const addCategoryBtn = clone.querySelector('.ai-suggestion-add-category-btn');
                             const addBelowBtn = clone.querySelector('.ai-suggestion-add-below-btn');
                             const isExistingEntry = index < numExistingSkills;
                             if (isExistingEntry) {
                                 clone.dataset.originalEntryIndex = index;
                                 if(replaceBtn) replaceBtn.style.display = 'inline-block';
                                 if(addBelowBtn) addBelowBtn.style.display = 'inline-block';
                                 if(addCategoryBtn) addCategoryBtn.style.display = 'none';
                             } else {
                                 if(replaceBtn) replaceBtn.style.display = 'none';
                                 if(addBelowBtn) addBelowBtn.style.display = 'none';
                                 if(addCategoryBtn) {
                                     addCategoryBtn.dataset.categoryName = categoryName;
                                     addCategoryBtn.dataset.skillsList = skillsList;
                                     addCategoryBtn.style.display = 'inline-block';
                                 }
                             }
                             //clone.querySelectorAll('[data-translate]').forEach(el => translateElement(el, currentLang));
                             dynamicContentArea.appendChild(clone);
                         });
                     }
                 } else if ((promptType.endsWith('_item') || promptType === 'summary') && typeof result === 'string') {
                     if (aiAssistOutputTextarea) aiAssistOutputTextarea.value = result;
                     if (aiAssistReplaceBtn) aiAssistReplaceBtn.disabled = false;
                     if (aiAssistAddBelowBtn) {
                         aiAssistAddBelowBtn.disabled = !(currentAiAssistTargetElement?.tagName === 'TEXTAREA');
                     }
                 } else {
                     throw new Error(`AI returned unexpected format during language change for ${promptType}.`);
                 }

            } catch (error) {
                console.error("AI Assist Error on lang change:", error);
                aiAssistErrorDiv.textContent = `${translations[currentLang]?.error_generic || 'Error'}: ${error.message}`;
                aiAssistErrorDiv.style.display = 'block';
            } finally {
                aiAssistLoadingDiv.style.display = 'none';
            }
        }
    });

} // End of setupAiAssistListeners

// --- *** NEW: Setup Download Modal Listeners *** ---
function setupResumeDownloadModalListeners() {
    // Listener for the main "Download" button
    downloadBtnResume?.addEventListener('click', () => {
        if (!currentApplicationData) {
            showNotification(translations[currentLang]?.resume_notify_download_no_data || "No application data loaded to download.", 'warning');
            return;
        }
        // Optional: Check for libraries before opening
        if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined' || (typeof html2canvas === 'undefined')) { // Check both libs needed for some options
            showNotification(translations[currentLang]?.resume_notify_download_libs_missing || "Required PDF generation libraries not loaded.", 'warning');
            return;
        }

        if (downloadModalInstanceResume) {
            downloadModalInstanceResume.show(); // Show the download options modal
        } else {
            console.error("Download options modal instance not found for Resume Builder.");
            showNotification("Cannot open download options.", "danger");
        }
    });

    // Listener for clicks within the download options modal (using delegation)
    downloadOptionsContainerResume?.addEventListener('click', async (event) => { // Make async
        const selectedCard = event.target.closest('.download-option-card');
        if (selectedCard && selectedCard.dataset.downloadType) {
            const downloadType = selectedCard.dataset.downloadType;
            console.log("Resume Download Type selected:", downloadType);

            // Ensure the PDF generation function exists before calling
            if (typeof generatePdf === 'function') {
                 // *** Call the generatePdf function (from resumeDownloadPdf.js) ***
                 // Pass the full applicationData and the preview element ID
                 // generatePdf will handle hiding the modal internally now
                 await generatePdf(downloadType, currentApplicationData, 'resume-preview-content'); // Await the generation

            } else {
                console.error("generatePdf function (from resumeDownloadPdf.js) not found.");
                showNotification("PDF generation function is missing.", "danger");
                // Hide modal manually if function is missing
                if (downloadModalInstanceResume) {
                    downloadModalInstanceResume.hide();
                }
            }
            // Modal hiding is now handled within generatePdf start/call
        }
    });
}


// --- Resume Builder Init Function ---

function initResumeBuilder() {
   
    console.log("Initializing Resume Builder page...");

    // --- Initialize the Create Modal ---
    if (createModalElementBuilder) {
        createModalInstanceBuilder = new bootstrap.Modal(createModalElementBuilder, {
            backdrop: 'static', // Ensure options are set if not in HTML
            keyboard: false
        });
        // Add save listener for THIS modal instance
        createModalSaveBtnBuilder?.addEventListener('click', handleCreateApplicationFromBuilderModal);
         // Optional: Add cancel listener if you add a cancel button
         // document.getElementById('modal-create-cancel-builder')?.addEventListener('click', () => {
         //     // Decide what cancel does - go back? Go to My Applications?
         //     window.location.href = './MyApplications.html';
         // });
    } else {
        console.error("Create Application Modal not found on Resume Builder page!");
    }

        // Live Preview Listeners (for static fields)
        const formElements = document.querySelectorAll('.builder-container input, .builder-container textarea, .builder-container select');
        formElements.forEach(el => {
            if (!el.closest('template')) { // Only non-template elements
                const eventType = (el.tagName === 'SELECT' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'color') ? 'change' : 'input';
                el.addEventListener(eventType, updatePreview);
            }
        });

            // 'Add Section' Button Listeners
            document.getElementById('add-job-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'work-experience-entries', 'job-entry-template'));
            document.getElementById('add-school-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'education-entries', 'education-entry-template'));
            document.getElementById('add-training-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'trainings-entries', 'training-entry-template')); // New
            document.getElementById('add-skill-category-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'skills-entries', 'skill-category-template'));
            document.getElementById('add-project-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'projects-entries', 'project-entry-template'));
            document.getElementById('add-certification-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'certifications-entries', 'certification-entry-template')); // New
            document.getElementById('add-award-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'awards-entries', 'award-entry-template')); // New
            document.getElementById('add-publication-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'publications-entries', 'publication-entry-template')); // New
            document.getElementById('add-volunteer-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'volunteering-entries', 'volunteering-entry-template')); // New
            document.getElementById('add-language-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'languages-entries', 'language-entry-template'));
            document.getElementById('add-interest-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'interests-entries', 'interest-entry-template')); // New
            document.getElementById('add-social-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'social-media-entries', 'social-media-entry-template')); // New
            document.getElementById('add-reference-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'references-entries', 'reference-entry-template')); // New
            document.getElementById('add-custom-section-btn')?.addEventListener('click', (e) => addSectionEntry(e.target, 'custom-sections-entries', 'custom-section-template'));
        
        
            // Remove Button Listeners (delegate from container - more efficient)
            const mainCardBody = document.querySelector('.builder-container .card-body');
            if (mainCardBody) {
                mainCardBody.addEventListener('click', function(event) {
                    if (event.target.closest('.remove-entry-btn')) {
                        // Find the closest parent entry div and remove it
                        event.target.closest('.dynamic-entry')?.remove();
                        updatePreview(); // Update preview after removing
                    }
                });
            }    
            const photoInput = document.getElementById('input-photo');
            const photoPreviewImg = document.getElementById('profile-photo-preview'); // Renamed variable for clarity
            const photoPreviewContainer = document.getElementById('photo-preview-container');
            const removePhotoButton = document.getElementById('remove-photo-btn');
        
            if (photoInput && photoPreviewImg && photoPreviewContainer && removePhotoButton) {
                 photoInput.addEventListener('change', function() {
                     if (this.files && this.files[0]) {
                         const reader = new FileReader();
                         reader.onload = function(e) {
                             photoPreviewImg.src = e.target.result;
                             photoPreviewContainer.style.display = 'block';
                             removePhotoButton.style.display = 'inline-block';
                             updatePreview();
                         }
                         reader.readAsDataURL(this.files[0]);
                     }
                 });
        
                 removePhotoButton.addEventListener('click', () => {
                     photoInput.value = '';
                     photoPreviewImg.src = '#';
                     photoPreviewContainer.style.display = 'none';
                     removePhotoButton.style.display = 'none';
                     updatePreview();
                 });
            }






    // *** Update Save Button Listener ***
    const saveBtn = document.getElementById('save-resume-btn');
    if (saveBtn) {
         saveBtn.addEventListener('click', handleSaveBuilderChanges); // Call refactored handler
         console.log("Save button listener attached.");
     } else {
         console.error("Save button not found!");
     }


    // Translate page initially
    translatePage(currentLang);
   
    // --- Load Data ---
    loadApplicationForBuilder(); // Call refactored loading function



    // Setup AI Assist Listeners
    setupAiAssistListeners();

         // *** NEW: Setup Download Modal Listeners ***
         setupResumeDownloadModalListeners();

    // *** NEW: Setup Template Switcher Listeners ***
    setupTemplateSwitcherListeners();



}
  
// --- END OF FILE resumeBuilder.js ---