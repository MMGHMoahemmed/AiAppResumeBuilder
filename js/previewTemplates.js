// Helper function to format text (e.g., newlines to <br>, simple markdown)
// Moved from resumeBuilder.js


function formatPreviewText(text) {
    if (!text) return '';
    // Basic: replace newlines with <br>
    let html = text.replace(/\n/g, '<br>');
    // Basic bold/italic - adjust regex if needed
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');       // Italic
     // Basic lists (simple conversion)
     html = html.replace(/^\s*[-*+]\s+(.*?)(\<br\>|$)/gm, '<li>$1</li>'); // Find list items
     html = html.replace(/(<li>.*?<\/li>)+/gs, '<ul>$1</ul>'); // Wrap consecutive LIs in UL
    return html;
}

// --- Default Resume Template Generation Function ---
// Takes the collected resume data, translations object, and current language code
function generateDefaultPreviewHTML(data, translations, currentLang) {
    if (!data || !translations || !currentLang) {
        console.error("Missing data, translations, or currentLang for resume preview generation.");
        return `<div class="text-center p-5 text-muted"><p data-translate="preview_error_loading">Error loading preview data.</p></div>`;
    }

    let previewHTML = ''; // Start fresh
    const currentTranslations = translations[currentLang] || {}; // Get translations for the current language
    const settings = data.settings || {}; // Get settings

    // Apply basic settings to the wrapper
    previewHTML += `<div class="resume-default" style="font-family: ${settings.fontFamily || 'sans-serif'}; font-size: ${settings.fontSize || '10pt'};">`;

    // --- Personal Info ---
    const pi = data.personalInfo || {};
    previewHTML += `
        <div class="text-center mb-4">
            ${pi.photo ? `<img src="${pi.photo}" alt="Profile Photo" class="img-thumbnail rounded-circle mb-2" style="width: 100px; height: 100px; object-fit: cover;">` : ''}
            <h2 class="text-primary mb-1" style="color: ${settings.themeColor || '#206bc4'} !important;">${pi.name || (currentTranslations.placeholder_name || 'Full Name')}</h2>
            <p class="lead fs-6 mb-1">${pi.role || (currentTranslations.placeholder_role || 'Job Title / Role')}</p>
            <div class="text-muted small d-flex justify-content-center flex-wrap gap-3">
                ${pi.location ? `<span><i class="ti ti-map-pin me-1"></i>${pi.location}</span>` : ''}
                ${pi.phone ? `<span><i class="ti ti-phone me-1"></i>${pi.phone}</span>` : ''}
                ${pi.email ? `<span><i class="ti ti-mail me-1"></i><a href="mailto:${pi.email}">${pi.email}</a></span>` : ''}
                ${pi.website ? `<span><i class="ti ti-world me-1"></i><a href="${pi.website}" target="_blank" rel="noopener noreferrer">${pi.website}</a></span>` : ''}
                ${pi.linkedin ? `<span><i class="ti ti-brand-linkedin me-1"></i><a href="${pi.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a></span>` : ''}
                ${pi.github ? `<span><i class="ti ti-brand-github me-1"></i><a href="${pi.github}" target="_blank" rel="noopener noreferrer">GitHub</a></span>` : ''}
            </div>
        </div>`;

    if (pi.summary) {
        previewHTML += `<div class="mb-4">${formatPreviewText(pi.summary)}</div>`;
    }

    // Helper function for sections
    const addSection = (titleKey, defaultTitle, items, itemRenderer) => {
        if (items && items.length > 0) {
            previewHTML += `<h5 style="color: ${settings.themeColor || '#206bc4'}; border-bottom: 1px solid ${settings.themeColor || '#dee2e6'}; padding-bottom: 0.25rem; margin-bottom: 0.75rem;" data-translate="${titleKey}">${currentTranslations[titleKey] || defaultTitle}</h5>`;
            items.forEach(item => {
                previewHTML += itemRenderer(item, currentTranslations, settings);
            });
            previewHTML += '<div style="margin-bottom: 1.25rem;"></div>'; // Add space after section
        }
    };

    // --- Work Experience ---
    addSection('preview_section_work', 'Work Experience', data.workExperience, (job, trans) => {
        const dates = `${job.startDate || ''} - ${job.endDate || (job.current ? (trans.label_current_job || 'Present') : '')}`;
        return `
            <div class="mb-3">
                <h6><strong>${job.jobTitle || 'Job Title'}</strong> | ${job.company || 'Company'}</h6>
                <div class="d-flex justify-content-between text-muted small mb-1">
                    <span>${job.location || ''}</span>
                    <span>${dates}</span>
                </div>
                ${job.description ? `<div class="text-muted small">${formatPreviewText(job.description)}</div>` : ''}
            </div>`;
    });

    // --- Education ---
     addSection('preview_section_education', 'Education', data.education, (edu, trans) => {
          const dates = `${edu.startDate || ''} - ${edu.endDate || (edu.current ? (trans.label_edu_current || 'Present') : '')}`;
          return `
             <div class="mb-3">
                 <h6><strong>${edu.degree || 'Degree & Major'}</strong> | ${edu.school || 'Institution'}</h6>
                  <div class="d-flex justify-content-between text-muted small mb-1">
                     <span>${edu.location || ''} ${edu.gpa ? `(GPA: ${edu.gpa})` : ''}</span>
                     <span>${dates}</span>
                 </div>
                 ${edu.additionalInfo ? `<div class="text-muted small">${formatPreviewText(edu.additionalInfo)}</div>` : ''}
             </div>`;
     });

     // --- Trainings ---
     addSection('preview_section_trainings', 'Trainings & Courses', data.trainings, (tr) => `
         <div class="mb-3">
             <h6><strong>${tr.name || 'Training Name'}</strong> | ${tr.institution || 'Provider'}</h6>
             <div class="text-muted small mb-1">${tr.date || ''}</div>${tr.description ? `<div class="text-muted small"> ${formatPreviewText(tr.description)}</div>` : ''}
         </div>`);

     // --- Skills ---
     addSection('preview_section_skills', 'Skills', data.skills, (skillCat) => `
         <div class="mb-2">
             <strong>${skillCat.category || 'Skills'}:</strong>
             <span class="text-muted small ms-1">${skillCat.skillsList || ''}</span>
         </div>`);

     // --- Projects ---
     addSection('preview_section_projects', 'Projects', data.projects, (proj) => `
         <div class="mb-3">
             <h6><strong>${proj.name || 'Project Name'}</strong> ${proj.link ? `| <a href="${proj.link}" target="_blank" rel="noopener noreferrer"><i class="ti ti-link"></i> Link</a>` : ''}</h6>
             <div class="text-muted small mb-1">${proj.date || ''}</div>
             ${proj.description ? `<div class="text-muted small">${formatPreviewText(proj.description)}</div>` : ''}
         </div>`);

    // --- Certifications ---
    addSection('preview_section_certifications', 'Certifications', data.certifications, (cert) => {
         const dates = `${cert.issueDate || ''}${cert.expDate ? ` - ${cert.expDate}`: ''}`;
         return `
            <div class="mb-3">
                 <h6><strong>${cert.name || 'Certification Name'}</strong> | ${cert.issuer || 'Issuer'}</h6>
                 <div class="text-muted small mb-1">
                    <span>${dates}</span>
                    ${cert.url ? `<a href="${cert.url}" target="_blank" rel="noopener noreferrer" class="ms-2"><i class="ti ti-link"></i> Credential</a>` : ''}
                 </div>
             </div>`;
    });

     // --- Awards ---
     addSection('preview_section_awards', 'Awards & Recognition', data.awards, (aw) => `
         <div class="mb-3">
             <h6><strong>${aw.title || 'Award Title'}</strong> | ${aw.issuer || 'Issuer'}</h6>
             <div class="text-muted small mb-1">${aw.date || ''}</div>
             ${aw.description ? `<div class="text-muted small">${formatPreviewText(aw.description)}</div>` : ''}
         </div>`);

      // --- Publications ---
     addSection('preview_section_publications', 'Publications', data.publications, (pub) => `
         <div class="mb-3">
             <h6><strong>${pub.title || 'Publication Title'}</strong> | ${pub.publisher || 'Publisher'}</h6>
             <div class="text-muted small mb-1">
                <span>${pub.date || ''}</span>
                ${pub.url ? `<a href="${pub.url}" target="_blank" rel="noopener noreferrer" class="ms-2"><i class="ti ti-link"></i> Link</a>` : ''}
             </div>
             ${pub.description ? `<div class="text-muted small">${formatPreviewText(pub.description)}</div>` : ''}
         </div>`);

    // --- Volunteering ---
     addSection('preview_section_volunteering', 'Volunteering Experience', data.volunteering, (vol, trans) => {
         const dates = `${vol.startDate || ''} - ${vol.endDate || (vol.current ? (trans.label_currently_volunteering || 'Present') : '')}`;
         return `
             <div class="mb-3">
                 <h6><strong>${vol.role || 'Role'}</strong> | ${vol.organization || 'Organization'}</h6>
                  <div class="d-flex justify-content-between text-muted small mb-1">
                     <span>${vol.location || ''}</span>
                     <span>${dates}</span>
                 </div>
                 ${vol.description ? `<div class="text-muted small">${formatPreviewText(vol.description)}</div>` : ''}
             </div>`;
     });

     // --- Languages ---
     if (data.languages && data.languages.length > 0) {
         previewHTML += `<h5 style="color: ${settings.themeColor || '#206bc4'}; border-bottom: 1px solid ${settings.themeColor || '#dee2e6'}; padding-bottom: 0.25rem; margin-bottom: 0.75rem;" data-translate="preview_section_languages">${currentTranslations.preview_section_languages || 'Languages'}</h5>`;
         previewHTML += '<div class="d-flex flex-wrap text-muted small gap-3">'; // Use gap
         data.languages.forEach((lang) => {
             previewHTML += `
                 <div>
                     <span>${lang.language || 'Language'}</span>
                     ${lang.proficiency ? `<span class="ms-1">(${lang.proficiency})</span>` : ''}
                 </div>`;
         });
         previewHTML += '</div><div style="margin-bottom: 1.25rem;"></div>';
     }

     // --- Interests ---
     if (data.interests && data.interests.length > 0) {
         previewHTML += `<h5 style="color: ${settings.themeColor || '#206bc4'}; border-bottom: 1px solid ${settings.themeColor || '#dee2e6'}; padding-bottom: 0.25rem; margin-bottom: 0.75rem;" data-translate="preview_section_interests">${currentTranslations.preview_section_interests || 'Interests'}</h5>`;
         previewHTML += `<p class="text-muted small">${data.interests.map(i => i.name).join(', ')}</p>`;
         previewHTML += '<div style="margin-bottom: 1.25rem;"></div>';
     }


     // --- Social Media --- (Displaying as links)
     if (data.socialMedia && data.socialMedia.length > 0) {
        previewHTML += `<h5 style="color: ${settings.themeColor || '#206bc4'}; border-bottom: 1px solid ${settings.themeColor || '#dee2e6'}; padding-bottom: 0.25rem; margin-bottom: 0.75rem;" data-translate="preview_section_social_media">${currentTranslations.preview_section_social_media || 'Social Media'}</h5>`;
         previewHTML += '<div class="d-flex flex-wrap text-muted small gap-3">';
         data.socialMedia.forEach(sm => {
            let icon = 'ti-world'; // Default icon
            if (sm.network?.toLowerCase().includes('linkedin')) icon = 'ti-brand-linkedin';
            else if (sm.network?.toLowerCase().includes('github')) icon = 'ti-brand-github';
            else if (sm.network?.toLowerCase().includes('twitter')) icon = 'ti-brand-twitter';
            else if (sm.network?.toLowerCase().includes('facebook')) icon = 'ti-brand-facebook';
            // Add more specific icons if needed

            previewHTML += `
                <div>
                    <a href="${sm.url || '#'}" target="_blank" rel="noopener noreferrer" class="text-muted">
                        <i class="ti ${icon} me-1"></i>
                        ${sm.username || sm.network || 'Profile'}
                    </a>
                </div>`;
         });
         previewHTML += '</div><div style="margin-bottom: 1.25rem;"></div>';
     }

    // --- References --- (Often better to state "Available upon request")
     if (data.references && data.references.length > 0) {
         previewHTML += `<h5 style="color: ${settings.themeColor || '#206bc4'}; border-bottom: 1px solid ${settings.themeColor || '#dee2e6'}; padding-bottom: 0.25rem; margin-bottom: 0.75rem;" data-translate="preview_section_references">${currentTranslations.preview_section_references || 'References'}</h5>`;
         // Option 1: Display "Available upon request" if any reference exists
         const refText = data.references[0]?.note || (currentTranslations.placeholder_reference_text || 'Available upon request');
         previewHTML += `<p class="text-muted small">${refText}</p>`;
         previewHTML += '<div style="margin-bottom: 1.25rem;"></div>';
     }

    // --- Custom Sections ---
    addSection('preview_section_custom', 'Custom Sections', data.customSections, (section) => {
         // Use the actual title provided by the user
         const customTitleHtml = `<h6 style="color: inherit; margin-bottom: 0.5rem;"><strong>${section.title || (currentTranslations.preview_section_custom_placeholder || 'Custom Section')}</strong></h6>`;
         return `
             <div class="mb-3">
                 ${customTitleHtml}
                 <div class="text-muted small">${formatPreviewText(section.description) || ''}</div>
             </div>`;
     });

    // Add padding at the end for better scrolling/visual separation
    previewHTML += '<div style="height: 1px;"></div>'; // Reduced padding
    previewHTML += '</div>'; // Close the main wrapper div

    return previewHTML;
}


// --- Modern Resume Template Generation Function ---
function generateModernPreviewHTML(data, translations, currentLang) {
    if (!data || !translations || !currentLang) {
        console.error("Missing data, translations, or currentLang for modern resume preview.");
        return `<div class="text-center p-5 text-muted"><p data-translate="preview_error_loading">Error loading preview data.</p></div>`;
    }

    let previewHTML = '';
    const currentTranslations = translations[currentLang] || {};
    const settings = data.settings || {};
    const themeColor = settings.themeColor || '#00529b'; // Example modern color

     // Apply basic settings to the wrapper
    previewHTML += `<div class="resume-modern p-4" style="font-family: ${settings.fontFamily || "'Lato', sans-serif"}; font-size: ${settings.fontSize || '10pt'}; border-left: 5px solid ${themeColor}; background-color: #f8f9fa;">`; // Example modern style

    // --- Personal Info (Header Style) ---
    const pi = data.personalInfo || {};
    previewHTML += `
        <div class="mb-5 modern-header">
            <div class="d-flex align-items-center mb-3">
                 ${pi.photo ? `<img src="${pi.photo}" alt="Profile Photo" class="rounded-circle me-3" style="width: 80px; height: 80px; object-fit: cover; border: 2px solid ${themeColor};">` : ''}
                <div>
                    <h1 class="mb-0" style="color: ${themeColor};">${pi.name || (currentTranslations.placeholder_name || 'Full Name')}</h1>
                    <p class="lead fs-5 mb-2 text-secondary">${pi.role || (currentTranslations.placeholder_role || 'Job Title / Role')}</p>
                </div>
            </div>
            <div class="modern-contact-info text-muted small d-flex flex-wrap gap-3 border-top pt-2">
                ${pi.location ? `<span><i class="ti ti-map-pin me-1"></i>${pi.location}</span>` : ''}
                ${pi.phone ? `<span><i class="ti ti-phone me-1"></i>${pi.phone}</span>` : ''}
                ${pi.email ? `<span><i class="ti ti-mail me-1"></i><a href="mailto:${pi.email}">${pi.email}</a></span>` : ''}
                ${pi.website ? `<span><i class="ti ti-world me-1"></i><a href="${pi.website}" target="_blank" rel="noopener noreferrer">${pi.website}</a></span>` : ''}
                ${pi.linkedin ? `<span><i class="ti ti-brand-linkedin me-1"></i><a href="${pi.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a></span>` : ''}
                ${pi.github ? `<span><i class="ti ti-brand-github me-1"></i><a href="${pi.github}" target="_blank" rel="noopener noreferrer">GitHub</a></span>` : ''}
            </div>
        </div>`;

    if (pi.summary) {
        previewHTML += `<div class="mb-4 p-3 bg-white rounded shadow-sm">${formatPreviewText(pi.summary)}</div>`; // Use white bg
    }

    // --- Sections (Maybe two columns or different styling) ---
    // Helper function for sections
    const addModernSection = (titleKey, defaultTitle, items, itemRenderer) => {
        if (items && items.length > 0) {
            previewHTML += `<h4 class="text-uppercase fw-bold mb-3" style="color: ${themeColor}; letter-spacing: 1px;" data-translate="${titleKey}">${currentTranslations[titleKey] || defaultTitle}</h4>`;
            items.forEach(item => {
                previewHTML += itemRenderer(item, currentTranslations, settings);
            });
             previewHTML += '<div style="margin-bottom: 1.5rem;"></div>'; // More space after section
        }
    };


    // --- Work Experience (Card-like) ---
    addModernSection('preview_section_work', 'Work Experience', data.workExperience, (job, trans) => {
        const dates = `${job.startDate || ''} - ${job.endDate || (job.current ? (trans.label_current_job || 'Present') : '')}`;
        return `
            <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
              <h5 class="mb-1"><strong>${job.jobTitle || 'Job Title'}</strong></h5>
              <h6 class="mb-2 text-muted">${job.company || 'Company'} | ${job.location || ''}</h6>
              <p class="small text-muted fst-italic">${dates}</p>
              ${job.description ? `<div class="small">${formatPreviewText(job.description)}</div>` : ''}
            </div>`;
    });

    // --- Education (Similar card style) ---
     addModernSection('preview_section_education', 'Education', data.education, (edu, trans) => {
          const dates = `${edu.startDate || ''} - ${edu.endDate || (edu.current ? (trans.label_edu_current || 'Present') : '')}`;
          return `
             <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
               <h5 class="mb-1"><strong>${edu.degree || 'Degree & Major'}</strong></h5>
               <h6 class="mb-2 text-muted">${edu.school || 'Institution'} | ${edu.location || ''} ${edu.gpa ? `(GPA: ${edu.gpa})` : ''}</h6>
               <p class="small text-muted fst-italic">${dates}</p>
               ${edu.additionalInfo ? `<div class="small">${formatPreviewText(edu.additionalInfo)}</div>` : ''}
             </div>`;
     });

     // --- Skills (Badges within categories) ---
     if (data.skills && data.skills.length > 0) {
         previewHTML += `<h4 class="text-uppercase fw-bold mb-3" style="color: ${themeColor}; letter-spacing: 1px;" data-translate="preview_section_skills">${currentTranslations.preview_section_skills || 'Skills'}</h4>`;
         data.skills.forEach(skillCat => {
             previewHTML += `
                 <div class="mb-3">
                     <h6 class="text-muted">${skillCat.category || 'Skills'}</h6>
                     <div class="d-flex flex-wrap gap-2">
                       ${(skillCat.skillsList || '').split(',').map(skill => skill.trim()).filter(s => s).map(s => `<span class="badge bg-secondary text-light-emphasis">${s}</span>`).join(' ')}
                     </div>
                 </div>`;
         });
         previewHTML += '<div style="margin-bottom: 1.5rem;"></div>';
     }


    // --- Other Sections (Using the modern helper) ---
    addModernSection('preview_section_trainings', 'Trainings & Courses', data.trainings, (tr) => `
        <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
             <h5 class="mb-1"><strong>${tr.name || 'Training Name'}</strong></h5>
             <h6 class="mb-2 text-muted">${tr.institution || 'Provider'} | ${tr.date || ''}</h6>
             ${tr.description ? `<div class="small"> ${formatPreviewText(tr.description)}</div>` : ''}
         </div>`);

    addModernSection('preview_section_projects', 'Projects', data.projects, (proj) => `
         <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
             <h5 class="mb-1"><strong>${proj.name || 'Project Name'}</strong> ${proj.link ? `| <a href="${proj.link}" target="_blank" rel="noopener noreferrer"><i class="ti ti-link"></i> Link</a>` : ''}</h6>
             <p class="small text-muted fst-italic">${proj.date || ''}</p>
             ${proj.description ? `<div class="small">${formatPreviewText(proj.description)}</div>` : ''}
         </div>`);

    addModernSection('preview_section_certifications', 'Certifications', data.certifications, (cert) => {
         const dates = `${cert.issueDate || ''}${cert.expDate ? ` - ${cert.expDate}`: ''}`;
         return `
            <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
                 <h5 class="mb-1"><strong>${cert.name || 'Certification Name'}</strong></h5>
                 <h6 class="mb-2 text-muted">${cert.issuer || 'Issuer'} | ${dates}
                    ${cert.url ? `<a href="${cert.url}" target="_blank" rel="noopener noreferrer" class="ms-2"><i class="ti ti-link"></i> Credential</a>` : ''}
                 </h6>
             </div>`;
    });

    addModernSection('preview_section_awards', 'Awards & Recognition', data.awards, (aw) => `
         <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
             <h5 class="mb-1"><strong>${aw.title || 'Award Title'}</strong></h5>
             <h6 class="mb-2 text-muted">${aw.issuer || 'Issuer'} | ${aw.date || ''}</h6>
             ${aw.description ? `<div class="small">${formatPreviewText(aw.description)}</div>` : ''}
         </div>`);

     addModernSection('preview_section_publications', 'Publications', data.publications, (pub) => `
         <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
             <h5 class="mb-1"><strong>${pub.title || 'Publication Title'}</strong></h5>
             <h6 class="mb-2 text-muted">${pub.publisher || 'Publisher'} | ${pub.date || ''}
                ${pub.url ? `<a href="${pub.url}" target="_blank" rel="noopener noreferrer" class="ms-2"><i class="ti ti-link"></i> Link</a>` : ''}
             </h6>
             ${pub.description ? `<div class="small">${formatPreviewText(pub.description)}</div>` : ''}
         </div>`);

    addModernSection('preview_section_volunteering', 'Volunteering Experience', data.volunteering, (vol, trans) => {
         const dates = `${vol.startDate || ''} - ${vol.endDate || (vol.current ? (trans.label_currently_volunteering || 'Present') : '')}`;
         return `
             <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
                 <h5 class="mb-1"><strong>${vol.role || 'Role'}</strong></h5>
                  <h6 class="mb-2 text-muted">${vol.organization || 'Organization'} | ${vol.location || ''}</h6>
                 <p class="small text-muted fst-italic">${dates}</p>
                 ${vol.description ? `<div class="small">${formatPreviewText(vol.description)}</div>` : ''}
             </div>`;
     });

    // --- Languages (Simple list) ---
     if (data.languages && data.languages.length > 0) {
         previewHTML += `<h4 class="text-uppercase fw-bold mb-3" style="color: ${themeColor}; letter-spacing: 1px;" data-translate="preview_section_languages">${currentTranslations.preview_section_languages || 'Languages'}</h4>`;
         previewHTML += '<div class="d-flex flex-wrap text-muted small gap-3">'; // Use gap
         data.languages.forEach((lang) => {
             previewHTML += `
                 <div>
                     <span>${lang.language || 'Language'}</span>
                     ${lang.proficiency ? `<span class="ms-1">(${lang.proficiency})</span>` : ''}
                 </div>`;
         });
         previewHTML += '</div><div style="margin-bottom: 1.5rem;"></div>';
     }

     // --- Interests (Simple list) ---
     if (data.interests && data.interests.length > 0) {
         previewHTML += `<h4 class="text-uppercase fw-bold mb-3" style="color: ${themeColor}; letter-spacing: 1px;" data-translate="preview_section_interests">${currentTranslations.preview_section_interests || 'Interests'}</h4>`;
         previewHTML += `<p class="text-muted small">${data.interests.map(i => i.name).join(' • ')}</p>`; // Use dot separator
         previewHTML += '<div style="margin-bottom: 1.5rem;"></div>';
     }

     // --- Social Media (Icons only maybe?) ---
     if (data.socialMedia && data.socialMedia.length > 0) {
        previewHTML += `<h4 class="text-uppercase fw-bold mb-3" style="color: ${themeColor}; letter-spacing: 1px;" data-translate="preview_section_social_media">${currentTranslations.preview_section_social_media || 'Online Presence'}</h4>`;
         previewHTML += '<div class="d-flex flex-wrap gap-3">';
         data.socialMedia.forEach(sm => {
            let icon = 'ti-world'; // Default icon
            if (sm.network?.toLowerCase().includes('linkedin')) icon = 'ti-brand-linkedin';
            else if (sm.network?.toLowerCase().includes('github')) icon = 'ti-brand-github';
            else if (sm.network?.toLowerCase().includes('twitter')) icon = 'ti-brand-twitter';
            else if (sm.network?.toLowerCase().includes('facebook')) icon = 'ti-brand-facebook';

            previewHTML += `
                <a href="${sm.url || '#'}" target="_blank" rel="noopener noreferrer" class="text-muted fs-4" title="${sm.username || sm.network}">
                    <i class="ti ${icon}"></i>
                </a>`;
         });
         previewHTML += '</div><div style="margin-bottom: 1.5rem;"></div>';
     }

    // --- References ---
     if (data.references && data.references.length > 0) {
         previewHTML += `<h4 class="text-uppercase fw-bold mb-3" style="color: ${themeColor}; letter-spacing: 1px;" data-translate="preview_section_references">${currentTranslations.preview_section_references || 'References'}</h4>`;
         const refText = data.references[0]?.note || (currentTranslations.placeholder_reference_text || 'Available upon request');
         previewHTML += `<p class="text-muted small fst-italic">${refText}</p>`;
         previewHTML += '<div style="margin-bottom: 1.5rem;"></div>';
     }

    // --- Custom Sections ---
    addModernSection('preview_section_custom', 'Custom Sections', data.customSections, (section) => {
         const customTitleHtml = `<h5 class="mb-1"><strong>${section.title || (currentTranslations.preview_section_custom_placeholder || 'Custom Section')}</strong></h5>`;
         return `
             <div class="mb-3 modern-entry bg-white p-3 rounded shadow-sm">
                 ${customTitleHtml}
                 <div class="small">${formatPreviewText(section.description) || ''}</div>
             </div>`;
     });


    previewHTML += '</div>'; // Close the main wrapper div
    return previewHTML;
}

// --- Resume Template Selection Function ---
function getTemplateGenerator(templateId = 'default') {
    switch (templateId) {
        case 'modern':
            return generateModernPreviewHTML;
        case 'default':
        default:
            return generateDefaultPreviewHTML;
    }
}


// --- **** NEW: Cover Letter Template Functions **** ---

// Default Cover Letter Template
function generateDefaultCoverLetterHTML(data, translations, currentLang) {
    
    if (!data || !translations || !currentLang) {
        console.error("Missing data for default cover letter preview.");
        return `<div class="text-muted p-3">Error loading cover letter data.</div>`;
    }
    const currentTranslations = translations[currentLang] || {};
    const pi = data.personalInfo || {};
    const today = new Date().toLocaleDateString(currentLang, { year: 'numeric', month: 'long', day: 'numeric' });

    let letterHTML = `<div class="cover-letter-default" style="font-family: sans-serif; font-size: 11pt; line-height: 1.6;">`;

    // --- Sender Info (Optional Header) ---
    letterHTML += `<div class="mb-4 text-end">`;
    if (pi.name) letterHTML += `<strong>${pi.name}</strong><br>`;
    if (pi.location) letterHTML += `${pi.location}<br>`;
    if (pi.phone) letterHTML += `${pi.phone}<br>`;
    if (pi.email) letterHTML += `<a href="mailto:${pi.email}">${pi.email}</a><br>`;
    if (pi.linkedin) letterHTML += `<a href="${pi.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn</a><br>`;
    letterHTML += `</div>`;

    // --- Date ---
    letterHTML += `<div class="mb-4">${today}</div>`;

    // --- Recipient Info ---
    letterHTML += `<div class="mb-4">`;
    if (data.hiringManager) letterHTML += `${data.hiringManager}<br>`;
    letterHTML += `${data.companyName || (currentTranslations.cover_letter_placeholder_company || 'Company Name')}<br>`;
    // Add address if available/needed
    letterHTML += `</div>`;

    // --- Salutation ---
    letterHTML += `<div class="mb-3">`;
    letterHTML += `Dear ${data.hiringManager ? data.hiringManager : (currentTranslations.cover_letter_salutation_default || 'Hiring Manager')},`;
    letterHTML += `</div>`;

    // --- Body ---
    letterHTML += `<div class="mb-4 cover-letter-body">`;
    letterHTML += formatPreviewText(data.letterContent || (currentTranslations.cover_letter_placeholder_editable_main || 'Your letter content here...'));
    letterHTML += `</div>`;

    // --- Closing ---
    letterHTML += `<div class="mb-3">`;
    letterHTML += `${currentTranslations.cover_letter_closing_default || 'Sincerely,'}`;
    letterHTML += `</div>`;

    // --- Signature ---
    letterHTML += `<div>`;
    letterHTML += `${pi.name || (currentTranslations.placeholder_name || 'Your Name')}`;
    letterHTML += `</div>`;


    letterHTML += `</div>`; // Close wrapper
    return letterHTML;
}

// Modern Cover Letter Template
function generateModernCoverLetterHTML(data, translations, currentLang) {
   
     if (!data || !translations || !currentLang) {
        console.error("Missing data for modern cover letter preview.");
        return `<div class="text-muted p-3">Error loading cover letter data.</div>`;
    }
    const currentTranslations = translations[currentLang] || {};
    const pi = data.personalInfo || {};
    const today = new Date().toLocaleDateString(currentLang, { year: 'numeric', month: 'long', day: 'numeric' });
    const themeColor = data.settings.themeColor || '#00529b'; // Use themeColor from settings

    // Add a class for easier selection if needed, keep inline styles '${data.settings.fontFamily || 'Lato, sans-serif'}'   ${settings.fontSize || '10pt'}
    let letterHTML = `<div class="cover-letter-modern p-4" style="font-family: 'Lato, sans-serif'; font-size:'11pt'; line-height: 1.7; border-left: 4px solid ${themeColor}; background-color: #eff2f5;">`;
     // --- Header (Integrated Sender/Date/Recipient) ---
     letterHTML += `<div class="row mb-5 modern-cl-header">`;
         // Sender Column
         letterHTML += `<div class="col-6">`;
         if (pi.name) letterHTML += `<h4 class="mb-1" style="color: ${themeColor};">${pi.name}</h4>`;
         // ... (rest of sender info) ...
         letterHTML += `</div>`;
          // Recipient/Date Column
         letterHTML += `<div class="col-6 text-end">`;
         letterHTML += `<div class="small text-muted mb-2">${today}</div>`;
         if (data.hiringManager) letterHTML += `<div class="fw-bold">${data.hiringManager}</div>`;
         letterHTML += `<div class="fw-bold">${data.companyName || (currentTranslations.cover_letter_placeholder_company || 'Company Name')}</div>`;
         letterHTML += `</div>`;
     letterHTML += `</div>`; // end row

    // --- Salutation ---
    letterHTML += `<div class="mb-4">`;
    letterHTML += `<strong>Dear ${data.hiringManager ? data.hiringManager : (currentTranslations.cover_letter_salutation_default || 'Hiring Manager')}</strong>,`;
    letterHTML += `</div>`;

     // --- Body ---
     letterHTML += `<div class="mb-5 cover-letter-body">`;
     letterHTML += formatPreviewText(data.letterContent || (currentTranslations.cover_letter_placeholder_editable_main || 'Your letter content here...'));
     letterHTML += `</div>`;

    // --- Closing ---
    letterHTML += `<div class="mb-3">`;
    letterHTML += `${currentTranslations.cover_letter_closing_default || 'Sincerely,'}`;
    letterHTML += `</div>`;

    // --- Signature ---
    letterHTML += `<div style="color: ${themeColor}; font-weight: bold;">`;
    letterHTML += `${pi.name || (currentTranslations.placeholder_name || 'Your Name')}`;
    letterHTML += `</div>`;

       // ***** ADDED: Bottom padding inside the main div *****
       letterHTML += `<div style="height: 40px;"></div>`; // Add 40 points of space at the bottom


    letterHTML += `</div>`; // Close wrapper
    return letterHTML;
}


// Cover Letter Template Selection Function
function getCoverLetterTemplateGenerator(templateId = 'default') {
    switch (templateId) {
        case 'modern':
            return generateModernCoverLetterHTML;
        case 'default':
        default:
            return generateDefaultCoverLetterHTML;
    }
}

// --- END OF FILE js/previewTemplates.js ---