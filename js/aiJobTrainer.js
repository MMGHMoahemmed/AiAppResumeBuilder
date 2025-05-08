// START OF FILE aiJobTrainer.js ---

let currentApplicationId = null;
let currentApplicationData = null; // Holds the full Application object


// --- DOM Elements ---
const jobDescDisplay = document.getElementById('job-description-input');
const appNameDisplay = document.getElementById('display-application-name-trainer');
const hiddenAppIdInput = document.getElementById('current-application-id-trainer');


const outputLanguageSelect = document.getElementById('output-language-select');
const outputQuestionsNumber = document.getElementById('generated_questions_number');


// --- ** AI Job Trainer Logic ** ---
const jobDescriptionInput = document.getElementById('job-description-input');
const generateWrittenBtn = document.getElementById('generate-written-btn');
const generateInterviewBtn = document.getElementById('generate-interview-btn');
const writtenQuestionsContainer = document.getElementById('written-questions-container');
const interviewQuestionsContainer = document.getElementById('interview-questions-container');
const questionTemplate = document.getElementById('question-card-template');
const generateMoreWrittenBtn = document.getElementById('generate-more-written-btn');
const generateMoreInterviewBtn = document.getElementById('generate-more-interview-btn');

// --- ** Delete Buttons ** ---
const deleteAllWrittenBtn = document.getElementById('delete-all-written-btn');
const deleteAllInterviewBtn = document.getElementById('delete-all-interview-btn');


// --- NEW: Modal Elements for Creation ---
const createModalElementBuilder = document.getElementById('modal-create-application');
const createModalSaveBtnBuilder = document.getElementById('modal-create-save-btn');
const newAppNameInputBuilder = document.getElementById('new-application-name');
const newAppJobDescInputBuilder = document.getElementById('new-application-jobdesc');
const newAppLanguageSelectBuilder = document.getElementById('new-application-language');
const createModalErrorBuilder = document.getElementById('modal-create-error');
let createModalInstanceBuilder = null;


// --- Helper: Update "Generate More" button visibility ---
function updateGenerateMoreButtonVisibility(container, button) {
    if (button) {
        const hasQuestions = container.querySelector('.question-card') !== null;
        button.style.display = hasQuestions ? 'block' : 'none';
    }
}


// --- Display Questions (MODIFIED for delete button and re-rendering) ---
function displayQuestions(questions, container, template, questionType, append = false) { // `append` is effectively always false now for main rendering
    if (!container || !template) return;

    // Always clear the container before re-rendering the full list
    container.innerHTML = '';

    if (!questions || questions.length === 0) {
        container.innerHTML = `<p class="text-center text-muted" data-translate="placeholder_questions">${translations[currentLang]?.placeholder_questions || 'No questions generated or returned.'}</p>`;
        // Update visibility of "Generate More" button
        if (container === writtenQuestionsContainer) updateGenerateMoreButtonVisibility(writtenQuestionsContainer, generateMoreWrittenBtn);
        if (container === interviewQuestionsContainer) updateGenerateMoreButtonVisibility(interviewQuestionsContainer, generateMoreInterviewBtn);
        return;
    }

    questions.forEach((q, index) => {
        const clone = template.content.firstElementChild.cloneNode(true);
        const questionNumberEl = clone.querySelector('.question-number');
        const questionTextEl = clone.querySelector('.question-text');
        const sampleAnswerEl = clone.querySelector('.sample-answer-content');
        const howToAnswerEl = clone.querySelector('.how-to-answer-content');
        const showSampleBtn = clone.querySelector('.show-sample-answer-btn');
        const showHowToBtn = clone.querySelector('.show-how-to-answer-btn');
        const deleteQuestionBtn = clone.querySelector('.delete-question-btn');
        const sampleBtnSpan = showSampleBtn?.querySelector('span');
        const howToBtnSpan = showHowToBtn?.querySelector('span');

        clone.dataset.questionType = q.type || questionType;
        clone.dataset.questionText = q.question; 

        if (questionNumberEl) questionNumberEl.textContent = `#${index + 1}`; // Index directly from the full list
        if (questionTextEl) questionTextEl.textContent = q.question || "Error: Question text missing";

        let solutionText, howToText;
        let btn1ShowKey, btn1HideKey, btn1DefaultShow, btn1DefaultHide;
        let btn2ShowKey, btn2HideKey, btn2DefaultShow, btn2DefaultHide;

        if (questionType === 'interview') {
            solutionText = q.sample_answer || "Sample answer not provided.";
            howToText = q.how_to_answer || "Guidance not provided.";
            btn1ShowKey = 'button_show_sample_answer'; btn1HideKey = 'button_hide_sample_answer';
            btn1DefaultShow = "Show Sample"; btn1DefaultHide = "Hide Sample";
            btn2ShowKey = 'button_show_how_to_answer'; btn2HideKey = 'button_hide_how_to_answer';
            btn2DefaultShow = "Show How To"; btn2DefaultHide = "Hide How To";
        } else { // Written questions
            solutionText = q.solution || "Solution not provided.";
            howToText = q.how_to_answer || "Guidance not provided.";
            btn1ShowKey = 'button_show_answer'; btn1HideKey = 'button_hide_answer';
            btn1DefaultShow = "Show Answer"; btn1DefaultHide = "Hide Answer";
            btn2ShowKey = 'button_show_how_to_answer'; btn2HideKey = 'button_hide_how_to_answer';
            btn2DefaultShow = "Show How To"; btn2DefaultHide = "Hide How To";
        }

        if (sampleAnswerEl) sampleAnswerEl.textContent = solutionText;
        if (howToAnswerEl) howToAnswerEl.textContent = howToText;

        if (showSampleBtn && sampleBtnSpan && sampleAnswerEl) {
            sampleBtnSpan.textContent = translations[currentLang]?.[btn1ShowKey] || btn1DefaultShow;
            showSampleBtn.style.display = 'inline-block';
            sampleAnswerEl.style.display = 'none';
            showSampleBtn.addEventListener('click', () => {
                const isVisible = sampleAnswerEl.style.display === 'block';
                sampleAnswerEl.style.display = isVisible ? 'none' : 'block';
                const key = !isVisible ? btn1HideKey : btn1ShowKey;
                sampleBtnSpan.textContent = translations[currentLang]?.[key] || (!isVisible ? btn1DefaultHide : btn1DefaultShow);
            });
        } else if (showSampleBtn) { showSampleBtn.style.display = 'none'; }

        if (showHowToBtn && howToBtnSpan && howToAnswerEl) {
            howToBtnSpan.textContent = translations[currentLang]?.[btn2ShowKey] || btn2DefaultShow;
            showHowToBtn.style.display = 'inline-block';
            howToAnswerEl.style.display = 'none';
            showHowToBtn.addEventListener('click', () => {
                const isVisible = howToAnswerEl.style.display === 'block';
                howToAnswerEl.style.display = isVisible ? 'none' : 'block';
                const key = !isVisible ? btn2HideKey : btn2ShowKey;
                howToBtnSpan.textContent = translations[currentLang]?.[key] || (!isVisible ? btn2DefaultHide : btn2DefaultShow);
            });
        } else if (showHowToBtn) { showHowToBtn.style.display = 'none'; }
        
        if (deleteQuestionBtn) {
            const tooltipText = translations[currentLang]?.tooltip_delete_question || "Delete This Question";
            deleteQuestionBtn.setAttribute('title', tooltipText);
            if (window.bootstrap && bootstrap.Tooltip) new bootstrap.Tooltip(deleteQuestionBtn);

            deleteQuestionBtn.addEventListener('click', async () => {
                const confirmMsg = translations[currentLang]?.confirm_delete_question || "Are you sure you want to delete this question?";
                if (confirm(confirmMsg)) {
                    await handleDeleteSingleQuestion(q, questionType, container, template);
                }
            });
        }
        container.appendChild(clone);
    });

    if (container === writtenQuestionsContainer) updateGenerateMoreButtonVisibility(writtenQuestionsContainer, generateMoreWrittenBtn);
    if (container === interviewQuestionsContainer) updateGenerateMoreButtonVisibility(interviewQuestionsContainer, generateMoreInterviewBtn);
}


// --- Update All Question Displays (Simplified for initial load) ---
function initialLoadQuestionDisplays() {
    if (!currentApplicationData || !currentApplicationData.aiTrainerData) {
        displayQuestions([], writtenQuestionsContainer, questionTemplate, 'written');
        displayQuestions([], interviewQuestionsContainer, questionTemplate, 'interview');
        return;
    }
    const trainerData = currentApplicationData.aiTrainerData;
    displayQuestions(trainerData.written || [], writtenQuestionsContainer, questionTemplate, 'written');
    displayQuestions(trainerData.interview || [], interviewQuestionsContainer, questionTemplate, 'interview');
}


// --- Fetch and Generate Questions ---
// (loadApplicationForTrainer, handleCreateApplicationFromBuilderModal, fetchQuestionsFromAI, setButtonLoading remain largely the same as previous version)
async function loadApplicationForTrainer() {
    const urlParams = new URLSearchParams(window.location.search);
    const applicationIdParam = urlParams.get('applicationId');

    if (applicationIdParam) {
        currentApplicationId = parseInt(applicationIdParam);
        if(hiddenAppIdInput) hiddenAppIdInput.value = currentApplicationId;

        currentApplicationData = await getApplication(currentApplicationId);

        if (currentApplicationData) {
            console.log("Loaded Application Data for Trainer:", currentApplicationData);

            if (appNameDisplay) {
                appNameDisplay.textContent = currentApplicationData.applicationName || '(Unnamed Application)';
            }

            if (jobDescriptionInput) { 
                if (currentApplicationData.jobDescription) {
                    jobDescriptionInput.value = currentApplicationData.jobDescription;
                } else {
                    jobDescriptionInput.value = ''; 
                }
            }
            initialLoadQuestionDisplays();
            document.title = `Trainer: ${currentApplicationData.applicationName || 'AI Job Trainer'} - ${translations[currentLang]?.navbar_title || 'ATS Resume Builder'}`;

        } else {
            console.error(`Application with ID ${currentApplicationId} not found.`);
            currentApplicationId = null;
            currentApplicationData = null;
            if(hiddenAppIdInput) hiddenAppIdInput.value = '';
            const errorMsgKey = 'trainer_error_app_load_fail';
            showNotification(translations[currentLang]?.[errorMsgKey] || "Failed to load application data.", 'danger');
            if (appNameDisplay) appNameDisplay.textContent = '(Error Loading)';
            if (jobDescriptionInput) jobDescriptionInput.value = '(Error Loading)';
            initialLoadQuestionDisplays(); 
        }
    } else {
        console.log("No applicationId found in URL. Prompting for new application.");
        document.title = `${translations[currentLang]?.navbar_title || 'AI Job Trainer'}`;
        currentApplicationId = null;
        currentApplicationData = null;
        if(hiddenAppIdInput) hiddenAppIdInput.value = '';
        
        initialLoadQuestionDisplays(); 

        if (createModalInstanceBuilder) {
            newAppNameInputBuilder.value = '';
            newAppJobDescInputBuilder.value = '';
            newAppLanguageSelectBuilder.value = currentLang || 'en';
            createModalErrorBuilder.style.display = 'none';
            createModalSaveBtnBuilder.disabled = false;
            const createButtonText = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
            createModalSaveBtnBuilder.innerHTML = createButtonText;
            createModalInstanceBuilder.show();
        } else {
            console.error("Create modal instance not available.");
            showNotification("Error: Cannot initialize application creation.", "danger");
        }
        if (jobDescriptionInput) { 
            jobDescriptionInput.placeholder = translations[currentLang]?.resume_create_app_prompt || 'Please create an application using the modal to begin.';
        }
    }
}

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
    const newApplicationData = {
        applicationName: name, 
        jobDescription: jobDesc,
        companyName: '',
        hiringManager: '',
        resumeData: {
            personalInfo: { name: name },
            settings: { language: language, themeColor: '#206bc4', fontFamily: "'Inter', sans-serif", fontSize: '10pt', documentSize: 'A4' },
            workExperience: [], education: [], skills: [], trainings: [],
            projects: [], certifications: [], awards: [], publications: [],
            volunteering: [], languages: [], interests: [], socialMedia: [],
            references: [], customSections: []
        },
        coverLetterData: { content: '' },
        aiTrainerData: { written: [], interview: [] }, 
        createdAt: now,
        updatedAt: now
    };

    try {
        const newId = await saveApplication(newApplicationData);
        if (newId) {
            showNotification(translations[currentLang]?.myapplications_notify_create_success || "Application created!", 'success');
            if (createModalInstanceBuilder) createModalInstanceBuilder.hide();

            currentApplicationId = newId;
            if(document.getElementById('current-application-id-trainer')) { 
                 document.getElementById('current-application-id-trainer').value = currentApplicationId;
            }
            const newUrl = `${window.location.pathname}?applicationId=${newId}${window.location.hash}`;
            history.pushState({ applicationId: newId }, document.title, newUrl);
            
            await loadApplicationForTrainer(); 

        } else {
            throw new Error("Failed to save new application and get ID.");
        }
    } catch (error) {
        console.error("Error creating application from builder modal:", error);
        createModalErrorBuilder.textContent = translations[currentLang]?.myapplications_modal_error_save || "Error saving application.";
        createModalErrorBuilder.style.display = 'block';
    } finally {
        createModalSaveBtnBuilder.disabled = false; 
        const createButtonText = translations[currentLang]?.myapplications_modal_button_create || 'Create Application';
        createModalSaveBtnBuilder.innerHTML = createButtonText; 
    }
}

async function fetchQuestionsFromAI(apiKey, jobDescription, questionType, outputLanguage, count = outputQuestionsNumber.value, existingQuestions = []) {
    console.log(`Fetching ${count} ${questionType} questions via API...`);
    const modelName = "gemini-1.5-flash"; 
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    let promptInstruction = "";
    let outputFormatInstruction = ""; 
    const targetLanguageName = outputLanguage === 'ar' ? 'Arabic' : 'English';
    const languageInstruction = `\n\nIMPORTANT: Generate the entire JSON response (all keys and string values like "question", "solution", "how_to_answer", "type") ONLY in ${targetLanguageName}. Do not use any other language in the response.`;

   if (questionType === 'interview') {
        promptInstruction = `Generate ${count} potential behavioral or technical interview questions suitable for evaluating candidates applying for the following job. Focus on questions that assess experience, problem-solving, and cultural fit based on the description.`;
        outputFormatInstruction = `
Respond ONLY with a valid JSON array containing ${count} objects.
Each object in the array must have the following exact keys:
- "question": (string) The generated interview question.
- "sample_answer": (string) A detailed specific example answer using methods like STAR where applicable. This should be a concrete example of what a candidate might say.
- "how_to_answer": (string) A guide explaining the structure or method for answering the question well (e.g., explain the STAR method, mention key points to cover).
- "type": (string) The type of question (e.g., "behavioral", "technical", "scenario").

Do NOT include any introductory text, explanations, closing remarks, markdown formatting (like \`\`\`json), or anything else outside the single JSON array structure in your response. The entire response must be only the JSON array.
${languageInstruction}
`;
    } else { // written
        promptInstruction = `Generate ${count} potential written test questions suitable for evaluating candidates applying for the following job. Focus on technical skills, problem-solving scenarios, or short-answer questions relevant to the description.`;
        outputFormatInstruction = `
Respond ONLY with a valid JSON array containing ${count} objects.
Each object in the array must have the following exact keys:
- "question": (string) The generated written test question.
- "solution": (string) The detailed correct answer or the direct solution to the problem/question.
- "how_to_answer": (string) Step-by-step instructions, key concepts to mention, or guidance on how to arrive at the solution or structure a good response.
- "type": (string) The type of question (e.g., "technical", "problem-solving", "short-answer", "calculation").

Do NOT include any introductory text, explanations, closing remarks, markdown formatting (like \`\`\`json), or anything else outside the single JSON array structure in your response. The entire response must be only the JSON array.
${languageInstruction}
`;
    }

    let existingQuestionsContext = "";
    if (existingQuestions.length > 0) {
        existingQuestionsContext = "\n\nAvoid generating questions similar to these existing ones:\n" + existingQuestions.map((q, i) => `${i+1}. ${q.question}`).join("\n");
    }

const fullPrompt = `
Job Description:
---
${jobDescription}
---

Instructions:
${promptInstruction}
${existingQuestionsContext}

Output Format Instructions:
${outputFormatInstruction}
`;

    const requestBody = {
        contents: [{
            parts: [{ text: fullPrompt }]
        }],
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorData;
            try { errorData = await response.json(); console.error("API Error Response:", errorData);
                 if (response.status === 400) { throw new Error(`${translations[currentLang]?.error_api_key_invalid || 'API Key invalid or request error.'} (Status: ${response.status})`); }
                 else if (response.status === 429) { throw new Error(`${translations[currentLang]?.error_api_quota || 'API Quota Exceeded.'} (Status: ${response.status})`); }
            } catch (e) { console.error("Failed to parse error response:", e); throw new Error(`${translations[currentLang]?.error_api_generic || 'API Error.'} Status: ${response.status}`); }
             throw new Error(`${translations[currentLang]?.error_api_generic || 'API Error:'} ${errorData?.error?.message || response.statusText}`);
        }

        // If the call was successful, handle public key usage increment
        await handlePublicKeyUsage(apiKey); // Pass the key that was actually used

        const responseData = await response.json();
        if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
            const generatedText = responseData.candidates[0].content.parts[0].text;
            let jsonString = generatedText;
            const startIndex = jsonString.indexOf('[');
            const endIndex = jsonString.lastIndexOf(']');
            if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) { jsonString = jsonString.substring(startIndex, endIndex + 1); }
            else { console.warn("Could not extract JSON using []. Falling back to regex cleaning."); jsonString = jsonString.replace(/^```json\s*|```$/g, '').trim(); }
            
            try {
                if (!jsonString) { throw new Error("JSON string is empty after extraction/cleaning."); }
                const parsedQuestions = JSON.parse(jsonString);
                if (!Array.isArray(parsedQuestions)) { throw new Error("Response is not JSON array."); }
                return parsedQuestions;
            } catch (parseError) { console.error("JSON Parse Error:", parseError, "String:", jsonString); throw new Error(translations[currentLang]?.error_json_parse || 'Failed to parse AI response.'); }
        } else if (responseData.promptFeedback?.blockReason) { console.error("Prompt blocked:", responseData.promptFeedback); throw new Error(`${translations[currentLang]?.error_api_safety || 'Request blocked by safety filters.'} Reason: ${responseData.promptFeedback.blockReason}`); }
         else { console.error("Unexpected API response structure:", responseData); throw new Error('Unexpected response structure from API.'); }
    } catch (error) { console.error("Error during fetchQuestionsFromAI:", error); throw error; }
}

function setButtonLoading(button, isLoading) {
    if (!button) return;
    const textSpan = button.querySelector('.btn-text > span');
    const spinner = button.querySelector('.spinner-border');
    const originalTextKey = textSpan?.getAttribute('data-translate');
    const selectedOutputLang = outputLanguageSelect?.value || 'en';
    const langName = selectedOutputLang === 'ar' ? (translations[currentLang]?.lang_arabic || 'Arabic') : (translations[currentLang]?.lang_english || 'English');

    if (isLoading) {
        button.disabled = true;
        button.classList.add('loading');
        if (textSpan) {
            if (!textSpan.dataset.originalText && originalTextKey) {
                textSpan.dataset.originalText = translations[currentLang]?.[originalTextKey] || textSpan.textContent;
            }
             let loadingText = translations[currentLang]?.generating_in_language || 'Generating in {lang}...';
             textSpan.textContent = loadingText.replace('{lang}', langName);
        }
        if (spinner) spinner.style.display = 'inline-block';

    } else {
        button.disabled = false;
        button.classList.remove('loading');
        if (textSpan && textSpan.dataset.originalText) {
            textSpan.textContent = textSpan.dataset.originalText;
        } else if (textSpan && originalTextKey) {
            textSpan.textContent = translations[currentLang]?.[originalTextKey] || 'Generate';
        }
        if (spinner) spinner.style.display = 'none';
    }
}

// --- Generate Button Click Handler (MODIFIED for data appending and UI re-render) ---
async function handleGenerateClick(questionType, container, template, generateMoreBtnElement, buttonElement, numToGenerate, isFromMoreButton) {
    if (!currentApplicationId || !currentApplicationData) {
        showNotification(translations[currentLang]?.trainer_error_no_app || "Please load or create an application first.", "warning");
        return;
    }
    const apiKey = await getApiKey();
    if (!apiKey) {
        alert(translations[currentLang]?.api_key_missing || "API Key is missing. Please set it in Settings.");
        return;
    }

    const jobDesc = jobDescriptionInput.value.trim();
    if (!jobDesc) {
        alert(translations[currentLang]?.trainer_text_no_job_desc_alert || 'Please paste a job description first.');
        jobDescriptionInput.focus();
        return;
    }

    const selectedOutputLanguage = outputLanguageSelect?.value || 'en';
    setButtonLoading(buttonElement, true);

    const dataKey = questionType === 'interview' ? 'interview' : 'written';
    const noExistingDataInStore = !currentApplicationData.aiTrainerData?.[dataKey]?.length;

    // Show full container loading only if it's NOT a "Generate More" button click AND there's no data in the store yet for this type.
    if (!isFromMoreButton && noExistingDataInStore) {
        container.innerHTML = `<div class="text-center p-3"><div class="spinner-border text-primary" role="status"></div><p class="mt-2">${buttonElement.querySelector('.btn-text > span')?.textContent || 'Generating...'}</p></div>`;
        if(generateMoreBtnElement) generateMoreBtnElement.style.display = 'none';
    }

    try {
        // Always pass existing questions from the data store to AI to help avoid duplicates
        const existingQuestionsForAI = currentApplicationData.aiTrainerData?.[dataKey] || [];
        const newQuestions = await fetchQuestionsFromAI(apiKey, jobDesc, questionType, selectedOutputLanguage, numToGenerate, existingQuestionsForAI);

        if (newQuestions && newQuestions.length > 0) {
            // Ensure aiTrainerData and the specific question type array exist
            if (!currentApplicationData.aiTrainerData) {
                currentApplicationData.aiTrainerData = { written: [], interview: [] };
            }
            if (!currentApplicationData.aiTrainerData[dataKey]) {
                currentApplicationData.aiTrainerData[dataKey] = [];
            }

            // Always append new questions to the existing list in the data store
            currentApplicationData.aiTrainerData[dataKey].push(...newQuestions);
            
            currentApplicationData.updatedAt = new Date();
            const savedId = await saveApplication(currentApplicationData, currentApplicationId);

            if (savedId) {
                currentApplicationData = await getApplication(currentApplicationId); // Refresh data
                // Always re-render the entire section from the updated data store.
                // The 'false' for the last displayQuestions param means "don't append to UI, replace UI content".
                displayQuestions(currentApplicationData.aiTrainerData[dataKey], container, template, questionType, false); 
                showNotification(translations[currentLang]?.trainer_notify_autosave_success || `Generated and saved ${newQuestions.length} ${questionType} questions.`, 'success', 2000);
            } else {
                throw new Error("Save operation failed.");
            }
        } else if (!isFromMoreButton && noExistingDataInStore) {
            // This means: it was NOT a "more" button click, AND there was no data in store, AND AI returned nothing.
            displayQuestions([], container, template, questionType, false); // Show placeholder
        } else if (newQuestions.length === 0) {
            // AI returned no new questions (could be from "more" click or main click when data already exists)
             showNotification(translations[currentLang]?.trainer_notify_no_new_questions || "No new questions were generated this time.", "info", 2000);
        }

        updateGenerateMoreButtonVisibility(container, generateMoreBtnElement);

    } catch (error) {
         console.error(`Error generating ${questionType} questions:`, error);
         const errorMsg = error.message || translations[currentLang]?.error_generating || 'Error generating questions.';
         // Show error in container only if it was an initial generation attempt for an empty section
         if (!isFromMoreButton && noExistingDataInStore) {
             container.innerHTML = `<div class="alert alert-danger" role="alert">${errorMsg}</div>`;
         } else {
             showNotification(errorMsg, 'danger'); // For "more" button errors or errors when data already existed
         }
         updateGenerateMoreButtonVisibility(container, generateMoreBtnElement);
    } finally {
        setButtonLoading(buttonElement, false);
    }
}

// --- Delete All Questions Handler ---
async function handleDeleteAllQuestions(questionType, container, template, generateMoreBtnElement) {
    if (!currentApplicationId || !currentApplicationData) {
        showNotification(translations[currentLang]?.trainer_error_no_app || "No application loaded.", 'warning');
        return;
    }

    const confirmMsgKey = questionType === 'written' ? 'confirm_delete_all_written' : 'confirm_delete_all_interview';
    const confirmMsg = translations[currentLang]?.[confirmMsgKey] || `Are you sure you want to delete all ${questionType} questions?`;

    if (confirm(confirmMsg)) {
        try {
            const dataKey = questionType === 'interview' ? 'interview' : 'written';
            if (!currentApplicationData.aiTrainerData) {
                currentApplicationData.aiTrainerData = { written: [], interview: [] };
            }
            currentApplicationData.aiTrainerData[dataKey] = [];
            currentApplicationData.updatedAt = new Date();

            const savedId = await saveApplication(currentApplicationData, currentApplicationId);
            if (savedId) {
                currentApplicationData = await getApplication(currentApplicationId);
                displayQuestions([], container, template, questionType, false); 
                
                const notifyMsgKey = questionType === 'written' ? 'notify_all_written_deleted' : 'notify_all_interview_deleted';
                showNotification(translations[currentLang]?.[notifyMsgKey] || `All ${questionType} questions deleted.`, 'success');
            } else {
                throw new Error("Save operation failed after deleting questions.");
            }
        } catch (error) {
            console.error(`Error deleting all ${questionType} questions:`, error);
            showNotification(translations[currentLang]?.notify_delete_failed || "Failed to delete questions.", 'danger');
        }
    }
}

// --- Delete Single Question Handler ---
async function handleDeleteSingleQuestion(questionToDelete, questionType, container, template) {
    if (!currentApplicationId || !currentApplicationData || !questionToDelete) {
        showNotification(translations[currentLang]?.trainer_error_no_app || "No application or question data.", 'warning');
        return;
    }

    try {
        const dataKey = questionType === 'interview' ? 'interview' : 'written';
        if (!currentApplicationData.aiTrainerData || !currentApplicationData.aiTrainerData[dataKey]) {
            console.warn("No questions array to delete from.");
            return;
        }

        const questionIndex = currentApplicationData.aiTrainerData[dataKey].findIndex(
            q => q.question === questionToDelete.question 
        );

        if (questionIndex > -1) {
            currentApplicationData.aiTrainerData[dataKey].splice(questionIndex, 1);
            currentApplicationData.updatedAt = new Date();

            const savedId = await saveApplication(currentApplicationData, currentApplicationId);
            if (savedId) {
                currentApplicationData = await getApplication(currentApplicationId);
                displayQuestions(currentApplicationData.aiTrainerData[dataKey], container, template, questionType, false);
                showNotification(translations[currentLang]?.notify_question_deleted || "Question deleted.", 'success');
            } else {
                throw new Error("Save operation failed after deleting single question.");
            }
        } else {
            console.warn("Question to delete not found in current data:", questionToDelete);
            showNotification("Could not find the question to delete.", "warning");
        }
    } catch (error) {
        console.error(`Error deleting single ${questionType} question:`, error);
        showNotification(translations[currentLang]?.notify_delete_failed || "Failed to delete question.", 'danger');
    }
}


function initAiJobTrainer() {
    console.log("Initializing AI Job Trainer page...");

    if (createModalElementBuilder) {
        createModalInstanceBuilder = new bootstrap.Modal(createModalElementBuilder, {
            backdrop: 'static', keyboard: false
        });
        createModalSaveBtnBuilder?.addEventListener('click', handleCreateApplicationFromBuilderModal);
    } else {
        console.error("Create Application Modal not found on AI Job Trainer page!");
    }

    if (outputLanguageSelect) {
        const preferredLang = localStorage.getItem('preferredOutputLang');
        if(preferredLang) outputLanguageSelect.value = preferredLang;

        outputLanguageSelect.addEventListener('change', () => {
            localStorage.setItem('preferredOutputLang', outputLanguageSelect.value);
        });
    }

    // --- Event Listeners for Generate Buttons ---
    generateWrittenBtn?.addEventListener('click', () => {
      const numToGenerate = parseInt(outputQuestionsNumber.value) || 5; // Default for main button
      // Pass 'false' for isFromMoreButton
      handleGenerateClick('written', writtenQuestionsContainer, questionTemplate, generateMoreWrittenBtn, generateWrittenBtn, numToGenerate, false);
    });
    generateInterviewBtn?.addEventListener('click', () => {
      const numToGenerate = parseInt(outputQuestionsNumber.value) || 5; // Default for main button
      // Pass 'false' for isFromMoreButton
      handleGenerateClick('interview', interviewQuestionsContainer, questionTemplate, generateMoreInterviewBtn, generateInterviewBtn, numToGenerate, false);
    });
    generateMoreWrittenBtn?.addEventListener('click', () => {
      const numToGenerate = 3; // Fixed number for "more"
      // Pass 'true' for isFromMoreButton
      handleGenerateClick('written', writtenQuestionsContainer, questionTemplate, generateMoreWrittenBtn, generateMoreWrittenBtn, numToGenerate, true);
    });
    generateMoreInterviewBtn?.addEventListener('click', () => {
      const numToGenerate = 3; // Fixed number for "more"
      // Pass 'true' for isFromMoreButton
      handleGenerateClick('interview', interviewQuestionsContainer, questionTemplate, generateMoreInterviewBtn, generateMoreInterviewBtn, numToGenerate, true);
    });

    // --- Delete All Listeners ---
    deleteAllWrittenBtn?.addEventListener('click', () => {
        handleDeleteAllQuestions('written', writtenQuestionsContainer, questionTemplate, generateMoreWrittenBtn);
    });
    deleteAllInterviewBtn?.addEventListener('click', () => {
        handleDeleteAllQuestions('interview', interviewQuestionsContainer, questionTemplate, generateMoreInterviewBtn);
    });

    // Initialize tooltips
    const staticTooltipElements = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    staticTooltipElements.forEach(tooltipEl => {
        if (window.bootstrap && bootstrap.Tooltip) {
            let currentTooltip = bootstrap.Tooltip.getInstance(tooltipEl);
            if (currentTooltip) currentTooltip.dispose(); // Dispose existing if any, to reapply with correct title
            
            const translateKey = tooltipEl.querySelector('span.visually-hidden')?.dataset.translate || 
                                 tooltipEl.dataset.translateTitle; 
            let title = tooltipEl.title;
            if(translateKey && translations[currentLang]?.[translateKey]) {
                title = translations[currentLang][translateKey];
            } else if (tooltipEl.querySelector('span.visually-hidden') && !translateKey) { 
                title = tooltipEl.querySelector('span.visually-hidden').textContent;
            }
            tooltipEl.setAttribute('title', title); // Set the potentially translated title
            new bootstrap.Tooltip(tooltipEl);
        }
    });
    
    loadApplicationForTrainer();
    translatePage(currentLang); 
}

// document.addEventListener('DOMContentLoaded', initAiJobTrainer); // Or ensure main.js handles initialization