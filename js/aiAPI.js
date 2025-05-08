// --- START OF FILE aiAPI.js ---

// --- Helper Functions ---

/**
 * Gets the API Key.
 * Priority: User's key > Public key (if within limits and configured).
 * Shows notifications if public key is limited or unconfigured when it's the only option.
 * @returns {Promise<string|undefined>} The API key string, or undefined if no key is available.
 */
async function getApiKey() {
    // Ensure Dexie helpers are available for settings access
    if (typeof getSetting !== 'function' || typeof saveSetting !== 'function') {
        console.error("Dexie helper 'getSetting' not found. API functionality will be severely limited.");
        // Fallback to localStorage for user key ONLY if Dexie is fundamentally broken for settings
        const lsKey = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
        if (lsKey) {
            console.warn("Dexie helpers unavailable, attempting to use user API key from localStorage.");
            return lsKey;
        }
        showNotification(translations[currentLang]?.error_dexie_unavailable_critical || "Critical error: Cannot access settings. AI features disabled.", 'danger', 10000);
        return undefined;
    }

    // 1. Check for user's own API key
    const userApiKey = await getSetting(GEMINI_API_KEY_STORAGE_KEY);
    if (userApiKey) {
        console.log("Using user-provided API key.");
        return userApiKey;
    }

    // 2. If no user key, check public key status
    if (!PUBLIC_GEMINI_API_KEY || PUBLIC_GEMINI_API_KEY === 'YOUR_REAL_PUBLIC_API_KEY_HERE_REPLACE_ME') {
        console.warn("Public API key is not configured by the developer.");
        showNotification(
            translations[currentLang]?.public_api_dev_config_issue_notification || "Public API key is not available. Please add your own API key in Settings to use AI features.",
            'warning', 7000
        );
        return undefined;
    }

    let usageCount = await getSetting(PUBLIC_API_KEY_USAGE_COUNT_KEY);
    usageCount = parseInt(usageCount) || 0;

    if (usageCount >= PUBLIC_API_KEY_USAGE_LIMIT) {
        console.warn(`Public API key usage limit (${PUBLIC_API_KEY_USAGE_LIMIT}) reached.`);
        const limitReachedMsg = (translations[currentLang]?.public_api_limit_reached_notification ||
            `Public API key usage limit has been reached (${usageCount}/${PUBLIC_API_KEY_USAGE_LIMIT}). Please add your own API key in Settings to continue using AI features.`)
            .replace('${usageCount}', usageCount)
            .replace('${PUBLIC_API_KEY_USAGE_LIMIT}', PUBLIC_API_KEY_USAGE_LIMIT);
        showNotification(limitReachedMsg, 'warning', 10000);
        return undefined;
    }

    console.log(`Attempting to use public API key. Current usage (before this call): ${usageCount}/${PUBLIC_API_KEY_USAGE_LIMIT}`);
    return PUBLIC_GEMINI_API_KEY;
}




/**
 * Increments the public API key usage count if the provided key was the public key.
 * @param {string} apiKeyUsed - The API key string that was successfully used for an API call.
 */
async function handlePublicKeyUsage(apiKeyUsed) {
    if (typeof getSetting !== 'function' || typeof saveSetting !== 'function') {
        console.error("Dexie helpers not available for handlePublicKeyUsage.");
        return;
    }
    if (!PUBLIC_GEMINI_API_KEY || PUBLIC_GEMINI_API_KEY === 'AIzaSyDf041XowUVEEwHh36RPcXW76jYK0iwacU') return;


    if (apiKeyUsed === PUBLIC_GEMINI_API_KEY) {
        let usageCount = await getSetting(PUBLIC_API_KEY_USAGE_COUNT_KEY);
        usageCount = (parseInt(usageCount) || 0) + 1;
        await saveSetting(PUBLIC_API_KEY_USAGE_COUNT_KEY, usageCount);
        console.log(`Public API key usage incremented to: ${usageCount}`);

        // Optionally, update the status in settings if the settings page is active
        if (document.body.id === 'settings-page' && typeof window.displayApiKeyStatus === 'function') {
            await window.displayApiKeyStatus();
        }
    }
}







// --- NEW: Function for Resume Content Generation ---
async function fetchResumeContentFromAI(promptType, jobDesc, contextData, outputLanguage) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error(translations[currentLang]?.api_key_missing || "API Key missing.");
    }



    const modelName = "gemini-1.5-flash"; // Or your preferred model
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let prompt = "";
    const targetLanguageName = outputLanguage === 'ar' ? 'Arabic' : 'English';

    // --- Construct Prompts based on type ---
    switch (promptType) {
        case 'summary':
            prompt = `Based on the following resume information (if provided), write a concise and compelling professional summary/objective (around 3-4 sentences) suitable for a resume. Tailor it towards the job title/role if specified. Focus on key skills and experience and create it according to job description (if specified).
            IMPORTANT: Respond ONLY with the generated summary text itself, Ensure the full response in ${targetLanguageName} again you must make all the words in your response in ${targetLanguageName} even names and acronyms. Do not include any introductory phrases like "Here is a summary:", markdown formatting, or any other extra text. Just the summary.
            Job Title/Role: ${contextData.role || 'Not specified'}
            Key Skills: ${contextData.keySkills || 'Not specified'}
            Experience Highlights: ${contextData.experienceHighlights || 'Not specified'}
            Job Description: ${jobDesc}
            `;
            break;
        case 'work_experience_item':
             prompt = `Based on the following job title and company, generate 3-5 impactful bullet points for a resume's work experience section. if in English language Focus on action verbs, quantifiable achievements, and relevance to the job description and if in Arabic do not use action verbs insted descripe the duties themselves which means make the generated response objective not subjective. Focus on responsibilities relevant to the title.
                          IMPORTANT: Respond ONLY with the generated bullet points (starting with '*' or '-'), each on a new line, in ${targetLanguageName}. Do not include any introductory phrases, markdown formatting, or any other extra text. Just the bullet points.
             Job Title: ${contextData.jobTitle || 'Not specified'}
             Company: ${contextData.company || 'Not specified'}
             Existing Job duties: ${contextData.existingDescription || 'Not specified'}
             Job Description Keywords/Context: ${jobDesc || ''}
`;
             break;
        case 'skills':
            const skills = contextData.existingSkills.map(s => `${s.category}: ${s.skillsList}`).join('\n');
                prompt = `Based on the following job description and my resume information (if provided), generate or enhance existing skills list for a resume's skills section. Use key words from job description where possible. Focus on skills relevant to job.
                Job Description: ${jobDesc}
                Existing Skills: ${skills || 'Not specified'}
                IMPORTANT: Respond ONLY with the generated skills, each followed by comma and space, in ${targetLanguageName}. Do not include any introductory phrases, markdown formatting, or any other extra text. Just the skills.`;
                break;
                // --- MODIFIED/RENAMED CASE for all skills ---
                case 'skills_all':
                    const allSkills = contextData.existingSkills || [];
                    const allSkillsString = allSkills.map((s, index) => `
        Entry ${index + 1}:
        Category: ${s.category || 'N/A'}
        Existing Skills: ${s.skillsList || 'N/A'}
        `).join('\n');
        
                    prompt = `You are an AI assistant helping to enhance resume skills sections. Based on the following skill entries and the overall job description, generate enhanced comma-separated skill lists for EACH category. Suggest a category name if one isn't provided or could be improved. Focus on skills relevant to the job description.
        
        Job Description Context:
        ${jobDesc || 'Not provided'}
        
        Skill Entries:
        ---
        ${allSkillsString}
        ---
        
        IMPORTANT: Respond ONLY with a valid JSON array. Each object in the array should correspond to one of the input entries (or a logical grouping) and have the following structure:
        {
          "category": "The original or AI-suggested category name",
          "enhancedSkillsList": "The comma-separated list of enhanced/generated skills for this category in ${targetLanguageName}"
        }
        Do not include any introductory text, explanations, or markdown formatting outside the JSON structure. Ensure the output is a single, valid JSON array.`;
                    break; // Added break
        
                 // --- NEW CASE for single skill item ---
                 case 'skills_item':
                     prompt = `You are an AI assistant helping to enhance resume skills. Based on the following skill category, existing skills, and the job description, generate an enhanced comma-separated list of skills relevant to the job.
        
        Job Description Context:
        ${jobDesc || 'Not provided'}
        
        Category: ${contextData.categoryName || 'N/A'}
        Existing Skills: ${contextData.existingSkills || 'N/A'}
        
        IMPORTANT: Respond ONLY with the enhanced comma-separated list of skills itself, in ${targetLanguageName}. Do not include the category name, any introductory phrases, markdown formatting, or any other extra text. Just the skills list.`;
                     break;        
        case 'work_experience_all':
             // Prepare the work experience data for the prompt
             const workExperiences = contextData.workExperiences || [];
             const workExpString = workExperiences.map((exp, index) => `
Entry ${index + 1}:
Job Title: ${exp.jobTitle || 'N/A'}
Company: ${exp.company || 'N/A'}
Existing Description: ${exp.description || 'N/A'}
`).join('\n');

             prompt = `You are an AI assistant helping to enhance resume work experience descriptions. Based on the following work experience entries and the overall job description (if provided), generate enhanced bullet-point descriptions for EACH entry. IF THERE IS NO EXISTING WORK DESCRIPTION / DUTIES FOR A JOB ENTRY GENERATE BASED IN THE JOB TITLE AND COMPANY NAME. Focus on action verbs, quantifiable achievements, and relevance to the job description if in Arabic do not use action verbs insted descripe the duties themselves which means make the generated response objective not subjective.

Job Description Context:
${jobDesc || 'Not provided'}

Work Experience Entries:
---
${workExpString}
---

IMPORTANT: Respond ONLY with a valid JSON array. Each object in the array should correspond to one of the input entries and have the following structure:
{
  "jobTitle": "The original job title provided",
  "company": "The original company name provided",
  "enhancedDescription": "Only The newly generated bullet points (3-5 points, starting with '*' or '-', each on a new line) for this specific job in ${targetLanguageName}"
}
Do not include any introductory text, explanations, or markdown formatting outside the JSON structure. Ensure the output is a single, valid JSON array.`;
             break;
        // Add more cases for other AI features (e.g., 'skills_suggestion')
        default:
            throw new Error(`Invalid prompt type requested: ${promptType}`);
    }

    console.log("Sending Prompt:", prompt);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }, // Increased tokens for multiple entries
        // Add safety settings if desired
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
             // ... (reuse error handling logic from fetchQuestionsFromAI) ...
            let errorData; try { errorData = await response.json(); } catch (e) { /* ignore */ }
             throw new Error(`API Error (${response.status}): ${errorData?.error?.message || response.statusText}`);
        }

        // If the call was successful, handle public key usage increment
        await handlePublicKeyUsage(apiKey); // Pass the key that was actually used

        const responseData = await response.json();
        console.log("AI Content Response:", responseData);

         if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
             let generatedText = responseData.candidates[0].content.parts[0].text.trim();

             // Attempt to parse JSON if promptType expects it
             if (promptType === 'work_experience_all' || promptType === 'skills_all') {
                 console.log("Attempting to parse work_experience_all response:", generatedText); // Debug log
                 try {
                     // Clean up potential markdown code blocks around JSON more robustly
                     const jsonMatch = generatedText.match(/```json\s*([\s\S]*?)\s*```/i);
                     let jsonString = generatedText;
                     if (jsonMatch && jsonMatch[1]) {
                         jsonString = jsonMatch[1];
                     } else {
                         // Fallback: remove potential leading/trailing ``` if no explicit ```json block found
                         jsonString = generatedText.replace(/^```\s*/, '').replace(/```\s*$/, '');
                     }
                     
                     // Attempt to parse the cleaned string
                     const parsedJson = JSON.parse(jsonString);
                     console.log("Successfully parsed JSON:", parsedJson); // Debug log
                     return parsedJson; // Return the parsed JSON array
                 } catch (jsonError) {
                     console.error("Failed to parse AI response as JSON. Raw text:", generatedText, "Error:", jsonError);
                     // Provide more context in the error
                     throw new Error(`AI returned invalid JSON format. Error: ${jsonError.message}. Raw response: ${generatedText.substring(0, 100)}...`);
                 }
             }

             // For other prompt types, return the raw text
             return generatedText; // Return the generated text
         } else if (responseData.promptFeedback?.blockReason) {
             throw new Error(`Request blocked by safety filters: ${responseData.promptFeedback.blockReason}`);
         } else {
             throw new Error('Unexpected response structure from AI content generation.');
         }
    } catch (error) {
         console.error("Error fetching AI content:", error);
         throw error; // Re-throw for the caller to handle
    }
}





// --- NEW: Function for Cover Letter Generation/Enhancement ---
async function fetchCoverLetterFromAI(action, jobDesc, company, hiringManager, existingText = '', resumeContext = '', outputLanguage = 'en') {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error(translations[currentLang]?.api_key_missing || "API Key missing.");
    }

    const modelName = "gemini-1.5-flash"; // Or your preferred model
    const API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const targetLanguageName = outputLanguage === 'ar' ? 'Arabic' : 'English';

    let prompt = "";

    // Build context strings safely
    const jobContext = `Job Description:\n${jobDesc || 'Not provided'}\nCompany: ${company || 'Not provided'}\nHiring Manager: ${hiringManager || 'Not specified'}`;
    const resumeInfo = resumeContext ? `\n\nRelevant Resume Info:\n${resumeContext}` : ''; // Add later if using resume data

    if (action === 'generate') {
        prompt = `You are an expert cover letter writer. Write a professional and compelling cover letter in ${targetLanguageName} based on the following information. Tailor it specifically to the job description. Address the hiring manager if their name is provided. Focus on highlighting skills and experience relevant to the job description. Keep the tone professional and enthusiastic. Do NOT invent skills or experience not mentioned in the resume context (if provided).

${jobContext}${resumeInfo}

IMPORTANT: Respond ONLY with the full cover letter text body paragraphs (excluding salutation, and closing). Do not include any introductory phrases like "Here is the cover letter:", markdown formatting (except maybe for paragraphs), or any other extra text. Just the cover letter content itself.`;

    } else if (action === 'enhance') {
        if (!existingText) {
            throw new Error("No existing text provided for enhancement.");
        }
        prompt = `You are an expert cover letter editor. Enhance the following DRAFT cover letter based on the provided job information. Improve clarity, tone, impact, and ensure it strongly aligns with the job description. Correct any grammatical errors or awkward phrasing. Maintain a professional and enthusiastic tone. Address the hiring manager if provided.

${jobContext}${resumeInfo}

DRAFT Cover Letter to Enhance:
---
${existingText}
---

IMPORTANT: Respond ONLY with the full, enhanced cover letter text in ${targetLanguageName}. Do not include any introductory phrases like "Here is the enhanced letter:", explanations of changes, or markdown formatting (except paragraphs). Just the complete, improved cover letter. reponse in full cover letter text body paragraphs (excluding salutation, and closing)`;

    } else {
        throw new Error("Invalid AI cover letter action requested.");
    }

    console.log("Sending Cover Letter Prompt:", prompt);

    const requestBody = {
        contents: [{ parts: [{ text: prompt }] }],
        // Adjust generation config - might need more tokens for a full letter
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
        // Add safety settings if desired
    };

    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            let errorData; try { errorData = await response.json(); } catch (e) { /* ignore */ }
            throw new Error(`API Error (${response.status}): ${errorData?.error?.message || response.statusText}`);
        }

        // If the call was successful, handle public key usage increment
        await handlePublicKeyUsage(apiKey); // Pass the key that was actually used

        const responseData = await response.json();
        console.log("AI Cover Letter Response:", responseData);

        if (responseData.candidates?.[0]?.content?.parts?.[0]?.text) {
             // Clean up potential AI artifacts like "```" or markdown headers if they sneak in
             let generatedText = responseData.candidates[0].content.parts[0].text.trim();
             generatedText = generatedText.replace(/^```(text|markdown)?\s*/i, '').replace(/```\s*$/, ''); // Remove code block fences
             return generatedText;
        } else if (responseData.promptFeedback?.blockReason) {
            throw new Error(`Request blocked by safety filters: ${responseData.promptFeedback.blockReason}`);
        } else {
            throw new Error('Unexpected response structure from AI cover letter generation.');
        }
    } catch (error) {
        console.error("Error fetching AI cover letter:", error);
        throw error; // Re-throw for the caller to handle
    }
}



// --- END OF FILE aiAPI.js ---