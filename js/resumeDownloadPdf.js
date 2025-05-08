// --- START OF FILE resumeDownloadPdf.js ---
console.log("resumeDownloadPdf.js loaded - PDF generation functions active (v1.8 - Global Font Logic).");

// --- NO import statement needed ---
// Assumes ARABIC_FONT_NAME and addArabicFontToVFS are globally defined by arabicFonts.js

/**
 * Generates a PDF from the application's resume data and preview element.
 * v1.8: Uses globally defined Arabic font logic.
 *
 * @param {string} downloadType - The selected download type ('single-page-native', etc.).
 * @param {object} applicationData - The full application data object.
 * @param {string} previewElementId - The ID of the HTML preview element (for html2canvas).
 */
async function generatePdf(downloadType, applicationData, previewElementId) { // Still async due to other awaits
    // --- Essential Checks ---
    const previewElement = document.getElementById(previewElementId);
    if (!previewElement && downloadType.includes('html2canvas')) { console.error(`Preview element #${previewElementId} not found.`); showGlobalNotification(`Error: Missing content element (#${previewElementId})`, "danger"); return; }
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') { console.error("jsPDF library not loaded."); showGlobalNotification("Error: PDF library missing.", "danger"); return; }
    if (downloadType.includes('html2canvas') && typeof html2canvas === 'undefined') { console.error("html2canvas library not loaded."); showGlobalNotification("Error: HTML rendering library missing.", "danger"); return; }
    if (!applicationData || !applicationData.resumeData) { console.error("Application data or resumeData missing."); showGlobalNotification("Error: Cannot generate PDF without data.", "danger"); return; }

    const resumeData = applicationData.resumeData;
    const settings = resumeData.settings || {};
    const language = settings.language || currentLang || 'en';

    console.log(`generatePdf (Resume) called with: Type: ${downloadType}, Lang: ${language}`);

    // ARABIC_FONT_NAME is now assumed to be global
    if (language === 'ar' && typeof ARABIC_FONT_NAME === 'undefined') {
        console.warn("ARABIC_FONT_NAME not defined globally. Ensure arabicFonts.js is loaded first.");
        // Potentially show a warning, but proceed using default fonts
    }

    const fileName = `${applicationData?.applicationName || 'Resume'}_${downloadType}_${language}_${new Date().toISOString().split('T')[0]}.pdf`;
    const { jsPDF } = jspdf;
    const selectedTemplateId = settings.templateId || 'default';
    const standardA4WidthPt = 595.28;
    const standardA4HeightPt = 841.89;
    const baseMargin = 30;

    // --- UI Feedback ---
    showGlobalNotification(`Generating PDF (${downloadType}, ${language})... Please wait.`, 'info', 5000);
    const downloadModalInstance = bootstrap.Modal.getInstance(document.getElementById('modal-download-options-resume'));
    if(downloadModalInstance) downloadModalInstance.hide();
    await new Promise(resolve => setTimeout(resolve, 200));

    let doc;
    let arabicFontAdded = false;

    try {
        // --- Create jsPDF Instance & Render ---
        if (downloadType.includes('native')) {
             const isMultiPage = downloadType === 'multi-page-native';
             let format = isMultiPage ? 'a4' : undefined;
             let calculatedHeight = standardA4HeightPt;

             if (!isMultiPage) {
                 // calculateNativePdfHeight now also uses global font info implicitly
                 calculatedHeight = await calculateNativePdfHeight(resumeData, baseMargin, standardA4WidthPt, selectedTemplateId, language);
                 format = [standardA4WidthPt, calculatedHeight];
                 console.log(`Calculated native single-page height (${language}): ${calculatedHeight}pt`);
             }

             doc = new jsPDF({ orientation: 'p', unit: 'pt', format: format });
             console.log(`Created jsPDF document for native render (${language}, ${isMultiPage ? 'A4' : 'Custom'})`);

             // --- Embed Arabic font IF needed using global function ---
             if (language === 'ar' && typeof addArabicFontToVFS === 'function') { // Check if function exists globally
                 console.log("Attempting to add Arabic font via global function...");
                 // REMOVE await here - addArabicFontToVFS is synchronous now
                 arabicFontAdded = addArabicFontToVFS(doc);
                 if (!arabicFontAdded) {
                     console.warn("Proceeding PDF generation without embedded Arabic font (global addArabicFontToVFS failed or font data missing).");
                     showGlobalNotification(`Warning: Arabic font embedding failed. PDF may render incorrectly.`, 'warning', 6000);
                 } else {
                     console.log("Arabic font embedding successful via global function.");
                 }
             } else if (language === 'ar') {
                 console.error("Global function addArabicFontToVFS not found! Cannot add Arabic font.");
                 showGlobalNotification(`Error: Arabic font function missing. PDF will use default font.`, 'danger');
             }

             // --- Render content ---
             // Pass calculatedHeight for both single/multi page, render function handles internally
             await renderNativePdfContent(doc, resumeData, baseMargin, standardA4WidthPt, calculatedHeight, selectedTemplateId, isMultiPage, language);

        } else if (downloadType === 'single-page-html2canvas') {
             const stickyParentSelectorSingle = '.preview-sticky-content';
             doc = await generateSinglePageHtml2CanvasPdf(previewElement, standardA4WidthPt, stickyParentSelectorSingle);
             if (!doc) throw new Error("Failed to generate single-page html2canvas PDF.");

        } else if (downloadType === 'multi-page-html2canvas') {
             doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' }); // A4 default
             const stickyParentSelectorMulti = '.preview-sticky-content';
             await generateMultiPageHtml2CanvasPdf(doc, previewElement, standardA4HeightPt, standardA4WidthPt, stickyParentSelectorMulti);

        } else {
             throw new Error(`Unknown download type: ${downloadType}`);
        }

        // --- Save ---
        if (doc) {
            // Explicitly set document properties for better metadata
            doc.setProperties({
                title: applicationData?.applicationName ? `${applicationData.applicationName} Resume` : 'Resume',
                subject: 'Resume generated by AI Resume Builder',
                author: 'AI Resume Builder', // Or perhaps the user's name if available?
                keywords: 'resume, cv, application',
                creator: 'AI Resume Builder'
            });
            doc.save(fileName);
            showGlobalNotification(`PDF "${fileName}" generated successfully.`, 'success');
        } else {
            throw new Error("PDF document object was not created or returned.");
        }

    } catch (error) {
        console.error(`Error during PDF generation (Resume, ${language}):`, error);
        showGlobalNotification(`Failed to generate PDF: ${error.message || error}`, 'danger');
    }
}


/**
 * Renders the native PDF content for a RESUME onto a jsPDF document.
 * v1.8: Uses globally defined ARABIC_FONT_NAME. Includes full rendering logic.
 *
 * @param {jsPDF} doc - The jsPDF document instance.
 * @param {object} resumeData - The resume data object.
 * @param {number} baseMargin - The margin in points.
 * @param {number} pageWidth - The page width in points.
 * @param {number} pageHeight - The page height in points (relevant for page breaks and single-page height).
 * @param {string} templateId - The selected template ID.
 * @param {boolean} allowMultiPage - Whether to add new pages.
 * @param {string} language - The language code.
 */
async function renderNativePdfContent(doc, resumeData, baseMargin, pageWidth, pageHeight, templateId, allowMultiPage, language) {
    console.log(`Rendering Native PDF Content (Resume Template: ${templateId}, MultiPage: ${allowMultiPage}, Lang: ${language}) - v1.8`);

    const isRTL = language === 'ar';
    const pi = resumeData.personalInfo || {};
    const settings = resumeData.settings || {};
   // const themeColor = settings.themeColor || (templateId === 'modern' ? '#00529b' : '#206bc4'); // Adjusted default modern color
    const themeColor = settings.themeColor; // Adjusted default modern color
    const defaultFontSize = parseFloat(settings.fontSize) || 10;

    // --- Font Selection ---
    const defaultFontName = settings.fontFamily?.toLowerCase().includes('serif') ? 'times' : 'helvetica';
    let useArabicFont = false;
    // Check if global ARABIC_FONT_NAME exists and is in the doc instance
    if (isRTL && typeof ARABIC_FONT_NAME !== 'undefined') {
        try {
            const fontList = doc.getFontList();
            // Check if the font name itself is a key in the list
            if (fontList && fontList[ARABIC_FONT_NAME]) {
                useArabicFont = true;
            } else {
                 console.warn(`Global Arabic font '${ARABIC_FONT_NAME}' not found in jsPDF instance during render, falling back.`);
            }
        } catch (e) { console.error("Error checking font list in render, fallback.", e); }
    }
    const currentFontName = useArabicFont ? ARABIC_FONT_NAME : defaultFontName;
    console.log(`Using font for rendering (${language}): ${currentFontName}`);

    // --- Font Sizes, Line Heights, Margins, RTL adjustments ---
    const getLineHeight = (size, multiplier = 1.35) => size * multiplier;
    const defaultLineHeight = getLineHeight(defaultFontSize);
    const sectionTitleSize = defaultFontSize + (isRTL ? 2.5 : 2);
    const sectionTitleLineHeight = getLineHeight(sectionTitleSize);
    const headingSize = defaultFontSize + (isRTL ? 6.5 : 6);
    const headingLineHeight = getLineHeight(headingSize);
    const subHeadingSize = defaultFontSize + 1;
    const subHeadingLineHeight = getLineHeight(subHeadingSize);
    const descriptionFontSize = defaultFontSize * 0.95;
    const descriptionLineHeight = getLineHeight(descriptionFontSize, 1.5); // Keep increased multiplier
    const smallFontSize = defaultFontSize * 0.9;
    const smallLineHeight = getLineHeight(smallFontSize);

    let y = baseMargin;
    let usableWidth = pageWidth - 2 * baseMargin;
    let sidebarWidth = 0;
    let mainContentMargin = baseMargin; // Left margin for LTR
    let mainContentEndX = pageWidth - baseMargin; // Right margin for LTR

    // Adjust margins for templates if needed
    if (templateId === 'modern') {
        doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageWidth, pageHeight, 'F'); // Use passed pageHeight
        sidebarWidth = 5; doc.setFillColor(themeColor); doc.rect(0, 0, sidebarWidth, pageHeight, 'F'); // Use passed pageHeight
        mainContentMargin = baseMargin + sidebarWidth + 15;
        usableWidth = pageWidth - mainContentMargin - baseMargin;
        mainContentEndX = pageWidth - baseMargin;
    } else { // Default template
        doc.setFillColor(255, 255, 255); doc.rect(0, 0, pageWidth, pageHeight, 'F'); // Use passed pageHeight
    }

    const startX = isRTL ? mainContentEndX : mainContentMargin;
    const endX = isRTL ? mainContentMargin : mainContentEndX;
    const textAlign = isRTL ? 'right' : 'left';
    const oppositeTextAlign = isRTL ? 'left' : 'right';
    const baseTextSplitWidth = usableWidth - 5;

    // --- Setup Base Font ---
    doc.setFont(currentFontName, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(defaultFontSize);

    // --- Helper Functions ---
    const checkAddPage = (spaceNeeded = defaultLineHeight) => {
        // Use the actual page height of the *current* page in the document for comparison
        const currentDocPageHeight = doc.internal.pageSize.getHeight();
        const effectivePageHeight = currentDocPageHeight - baseMargin - 5; // Subtract bottom margin/buffer
        if (allowMultiPage && y + spaceNeeded > effectivePageHeight) {
            doc.addPage();
            // Re-apply background/sidebar for the new page
            doc.setFillColor(255, 255, 255); doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), 'F');
            if (templateId === 'modern') { doc.setFillColor(themeColor); doc.rect(0, 0, sidebarWidth, doc.internal.pageSize.getHeight(), 'F'); }
            y = baseMargin; // Reset Y position
            // Reset font on new page
            doc.setFont(currentFontName, 'normal').setFontSize(defaultFontSize).setTextColor(0, 0, 0);
            console.log(`Added new page (multi-page ${language} native)`);
            return true; // Page was added
        }
        // For single page, or if no page break needed:
        // Check if content would exceed the *originally calculated* pageHeight for single-page mode
        if (!allowMultiPage && y + spaceNeeded > pageHeight - baseMargin - 5) {
             console.warn(`Native single-page content (${language}) exceeding calculated height. Y: ${y.toFixed(2)}, Needed: ${spaceNeeded.toFixed(2)}, Limit: ${(pageHeight - baseMargin - 5).toFixed(2)}`);
             // Don't add page, but signal overflow might occur visually
             return true; // Content exceeds boundary
        }
        return false; // No page added or boundary exceeded (for single page)
    };

    const drawSectionTitle = (titleKey, defaultTitle) => {
        // Ensure translations object is available (should be global or passed)
        const title = (typeof translations !== 'undefined' && translations[language]?.[titleKey])
                      ? translations[language][titleKey]
                      : (typeof translations !== 'undefined' && translations['en']?.[titleKey])
                        ? translations['en'][titleKey] // Fallback to English
                        : defaultTitle; // Fallback to default

        const spaceForTitle = defaultLineHeight * 0.7 + sectionTitleLineHeight * 1.4 + defaultLineHeight * 1.7; // Approx space needed
        if (checkAddPage(spaceForTitle)) { // Check before drawing anything
            // If a page break happened, y is reset, continue drawing on the new page
            console.log(`Page break before section title: ${title}`);
        }
        y += defaultLineHeight * 0.7; // Space before title

        doc.setFontSize(sectionTitleSize); doc.setFont(currentFontName, 'bold'); doc.setTextColor(templateId === 'modern' ? themeColor : 0, 0, 0);

        const titleText = isRTL ? title : (templateId === 'modern' ? title.toUpperCase() : title);
        doc.text(titleText, startX, y, { align: textAlign });
        y += sectionTitleLineHeight * 0.7; // Move past title baseline

        // Line position needs adjustment for RTL
        const lineY = y;
        const lineStartX = isRTL ? startX - usableWidth : startX;
        const lineEndX = isRTL ? startX : startX + usableWidth;
        doc.setDrawColor(templateId === 'modern' ? themeColor : 150, 150, 150);
        doc.setLineWidth(templateId === 'modern' ? 0.7 : 0.5);
        doc.line(lineStartX, lineY, lineEndX, lineY);

        y += defaultLineHeight * 1.7; // Space after line
        doc.setFont(currentFontName, 'normal'); doc.setFontSize(defaultFontSize); doc.setTextColor(0, 0, 0); // Reset font
    };

    const renderFormattedText = (text, widthForDrawing) => {
        if (!text) return;
        // Estimate height roughly first to avoid splitting tiny paragraphs across pages
        const estLines = (text.match(/\n/g) || []).length + 1 + (text.length / 50); // Rough estimate
        if (checkAddPage(estLines * descriptionLineHeight * 0.5)) { // Check rough space first
             console.log("Page break estimated before formatted text block.");
             // If page broke, y is reset, continue on new page
        }

        doc.setFont(currentFontName, 'normal'); // Ensure correct font
        doc.setFontSize(descriptionFontSize); doc.setTextColor(50, 50, 50);

        const paragraphs = text.split('\n');
        let isInsideList = false;

        paragraphs.forEach(paragraph => {
            if (!paragraph.trim()) {
                // Add vertical space for empty lines unless it's right after a list item ending
                 if (!isInsideList) { // Avoid double spacing after list
                     if (checkAddPage(descriptionLineHeight * 0.5)) return; // Check space for the gap
                     y += descriptionLineHeight * 0.5;
                 }
                 isInsideList = false; // Reset list flag
                 return;
            }

            let lineToDraw = paragraph;
            const isListItem = /^\s*[-*+•]\s+/.test(paragraph);
            let effectiveSplitWidth;
            let textStartX;
            let bulletX = isRTL ? startX - 10 : startX + 10; // Bullet position relative to edge

            if (isListItem) {
                lineToDraw = paragraph.replace(/^\s*[-*+•]\s+/, ''); // Remove bullet marker
                effectiveSplitWidth = baseTextSplitWidth - 15; // Width available for text
                textStartX = isRTL ? startX - 15 : startX + 15; // Text starts indented

                if (!isInsideList) {
                     if (checkAddPage(descriptionLineHeight * 0.2)) return; // Space before list
                     y += descriptionLineHeight * 0.2;
                 }
                 isInsideList = true;

                 // Check space for the bullet and *at least* the first line of text
                 if (checkAddPage(descriptionLineHeight)) return;
                 doc.text('•', bulletX, y); // Draw bullet aligned with the first line

            } else { // Normal paragraph
                effectiveSplitWidth = baseTextSplitWidth - 5; // Slightly less indent
                textStartX = isRTL ? startX - 5 : startX + 5;

                if (isInsideList) {
                     if (checkAddPage(descriptionLineHeight * 0.1)) return; // Space after list
                     y += descriptionLineHeight * 0.1;
                 }
                 isInsideList = false; // Not in a list anymore
            }

            effectiveSplitWidth = Math.max(1, effectiveSplitWidth); // Ensure width is positive
            const splitLines = doc.splitTextToSize(lineToDraw, effectiveSplitWidth);

            // Check if the *entire block* of split lines fits before drawing any
            if (checkAddPage(splitLines.length * descriptionLineHeight)) {
                console.log("Page break occurred mid-formatted text paragraph (split lines).");
                // If page broke, the rest of this paragraph won't draw on this page.
                // Ideally, we'd carry the remaining lines to the next page, but jsPDF makes that complex.
                // For now, it might get cut off if multi-page is not allowed.
                return;
            }

            // Draw the lines if they fit
            splitLines.forEach(splitLine => {
                 // No need for checkAddPage inside loop now, we checked the whole block
                 doc.text(splitLine, textStartX, y, { align: textAlign, maxWidth: effectiveSplitWidth });
                 y += descriptionLineHeight;
            });
        });
        // Reset font and add a small gap after the block
        doc.setFont(currentFontName, 'normal');
        doc.setFontSize(defaultFontSize); doc.setTextColor(0, 0, 0);
        y += defaultLineHeight * 0.3;
    };

    // --- 1. Personal Info ---
    doc.setFont(currentFontName, 'normal'); // Ensure correct font
    if (templateId === 'modern') {
        if (pi.name) { if (checkAddPage(headingLineHeight)) return; doc.setFontSize(headingSize).setFont(currentFontName, 'bold').setTextColor(themeColor); doc.text(pi.name, startX, y, { align: textAlign }); y += headingLineHeight * 1.1; }
        if (pi.role) { if (checkAddPage(subHeadingLineHeight)) return; doc.setFontSize(subHeadingSize).setFont(currentFontName, 'normal').setTextColor(50, 50, 50); doc.text(pi.role, startX, y, { align: textAlign }); y += subHeadingLineHeight * 1.2; }
        doc.setFontSize(smallFontSize).setTextColor(80, 80, 80);
        let contactItems = [pi.location, pi.phone, pi.email, pi.website, pi.linkedin, pi.github].filter(Boolean);
        let contactLine = contactItems.join(isRTL ? ' | ' : '  |  '); // Visual separator
        if (contactLine) {
             const contactLines = doc.splitTextToSize(contactLine, baseTextSplitWidth);
             if (checkAddPage(contactLines.length * smallLineHeight)) return; // Check space for all lines
             contactLines.forEach(line => { doc.text(line, startX, y, { align: textAlign }); y += smallLineHeight; });
        }
    } else { // Default template (Centered)
        const centerX = pageWidth / 2;
        if (pi.name) { if (checkAddPage(headingLineHeight)) return; doc.setFontSize(headingSize).setFont(currentFontName, 'bold'); doc.text(pi.name, centerX, y, { align: 'center' }); y += headingLineHeight * 1.1; }
        if (pi.role) { if (checkAddPage(subHeadingLineHeight)) return; doc.setFontSize(subHeadingSize).setFont(currentFontName, 'normal'); doc.text(pi.role, centerX, y, { align: 'center' }); y += subHeadingLineHeight * 1.2; }
        doc.setFontSize(smallFontSize).setTextColor(50, 50, 50);
        let contactItems = [pi.location, pi.phone, pi.email, pi.website, pi.linkedin, pi.github].filter(Boolean);
        let contactLine = contactItems.join(isRTL ? ' | ' : '  |  ');
        if (contactLine) {
             const contactLines = doc.splitTextToSize(contactLine, baseTextSplitWidth);
             if (checkAddPage(contactLines.length * smallLineHeight)) return; // Check space
             contactLines.forEach(line => { doc.text(line, centerX, y, { align: 'center', maxWidth: usableWidth }); y += smallLineHeight; });
        }
    }
    y += defaultLineHeight * 1.7; // Space after header
    doc.setFont(currentFontName, 'normal').setFontSize(defaultFontSize).setTextColor(0, 0, 0); // Reset

    // --- 2. Summary / Objective ---
    if (pi.summary) {
        drawSectionTitle('preview_section_summary', 'Summary');
        renderFormattedText(pi.summary, usableWidth);
    }

    // --- Generic Item Rendering (Handles RTL layout) ---
    const renderGenericItem = (primary, secondary, tertiary, description) => {
        const tempDoc = doc; // Use current doc for measurements
        let primaryTextHeight = 0;
        let secondaryTextHeight = 0;
        let tertiaryTextHeight = 0;

        // Calculate potential heights first
        if (primary) { tempDoc.setFontSize(defaultFontSize).setFont(currentFontName, 'bold'); primaryTextHeight = tempDoc.splitTextToSize(primary || '', baseTextSplitWidth).length * (defaultLineHeight * 1.2); } // Use 1.2 multiplier for primary lines
        if (tertiary) { tempDoc.setFontSize(smallFontSize).setFont(currentFontName, 'normal'); tertiaryTextHeight = tempDoc.splitTextToSize(tertiary || '', baseTextSplitWidth).length * smallLineHeight; }
        if (secondary) { tempDoc.setFontSize(smallFontSize).setFont(currentFontName, 'italic'); secondaryTextHeight = tempDoc.splitTextToSize(secondary || '', baseTextSplitWidth).length * smallLineHeight; }

        // Use internal helper for more accurate description height estimate
        const descHeightEstimate = calculateFormattedTextHeightInternal(description, usableWidth, tempDoc, currentFontName, descriptionFontSize, descriptionLineHeight, isRTL, baseTextSplitWidth, startX);

        // Calculate total space needed before description
        const initialSpace = Math.max(primaryTextHeight, tertiaryTextHeight) // Primary/tertiary line(s) height
                     + (secondary ? (defaultLineHeight * 0.1 + secondaryTextHeight) : 0) // Space + secondary height if exists
                     + defaultLineHeight * 0.3; // Gap before description

        if (checkAddPage(initialSpace + descHeightEstimate + defaultLineHeight * 0.7)) { // Check combined space needed for whole item
            console.log(`Page break estimated before generic item: ${primary}`);
            return; // Skip rendering this item if it won't fit
        }

        // --- Render if it fits ---
        let lineStartY = y; // Y position where the primary/tertiary line starts

        // Draw Tertiary (Date/Location) - Always on the opposite side
        if (tertiary) {
            doc.setFont(currentFontName, 'normal').setTextColor(80, 80, 80).setFontSize(smallFontSize);
            doc.text(tertiary, endX, lineStartY, { align: oppositeTextAlign }); // Draw on opposite edge, same Y as primary
            doc.setTextColor(0, 0, 0); // Reset color
        }

        // Draw Primary (Title/Degree/etc.) - On the main side
        if (primary) {
            doc.setFontSize(defaultFontSize).setFont(currentFontName, 'bold');
            let primaryMaxWidth = usableWidth;
            // Reduce width slightly if tertiary is very long? (Optional refinement)
            // if (tertiary && tempDoc.getTextWidth(tertiary) > usableWidth * 0.4) {
            //     primaryMaxWidth = usableWidth * 0.55;
            // }
            primaryMaxWidth = Math.max(10, primaryMaxWidth);
            const primaryLines = doc.splitTextToSize(primary || '', primaryMaxWidth);
            primaryLines.forEach((line) => {
                // No need to check page break per line, we checked the whole item
                doc.text(line, startX, y, { align: textAlign, maxWidth: primaryMaxWidth });
                y += defaultLineHeight * 1.2; // Move y down for each line of the primary text (use 1.2 multiplier)
            });
             if (!primaryLines.length && tertiary) { // If primary empty but tertiary exists
                 y += defaultLineHeight * 1.2; // Still advance Y to maintain spacing
             }
        } else if (tertiary) { // If only tertiary exists, still move y down
            y += defaultLineHeight * 1.2;
        }

        // Draw Secondary (Company/School) - Below primary, aligned main side
        if (secondary) {
            y += defaultLineHeight * 0.1; // Small gap after primary/tertiary line
            doc.setFontSize(smallFontSize).setFont(currentFontName, 'italic').setTextColor(50, 50, 50);
            const secondaryLines = doc.splitTextToSize(secondary, baseTextSplitWidth);
            secondaryLines.forEach(line => {
                 // No need to check page break per line
                 doc.text(line, startX, y, { align: textAlign });
                 y += smallLineHeight;
            });
            doc.setFont(currentFontName, 'normal').setTextColor(0, 0, 0).setFontSize(defaultFontSize); // Reset
        }

        // Gap and Description
        y += defaultLineHeight * 0.3; // Gap before description
        renderFormattedText(description, usableWidth); // Render description handles its own alignment and page breaks internally
        y += defaultLineHeight * 0.7; // Space after item
    };

    // --- Sections (Work, Education, Projects, etc.) ---
    const renderStandardSection = (key, titleKey, defaultTitle, dataItems, primaryField, secondaryField, tertiaryField, descField, customTertiaryFn = null) => {
        const items = resumeData[key]; // Get data from resumeData object
        if (items?.length > 0) {
             drawSectionTitle(titleKey, defaultTitle);
             items.forEach(item => {
                 const p = item[primaryField] || defaultTitle; // Use default title if primary field missing
                 const s = (secondaryField) ? (typeof secondaryField === 'function' ? secondaryField(item) : item[secondaryField] || '') : '';
                 const t = customTertiaryFn ? customTertiaryFn(item) : (tertiaryField && item[tertiaryField]) ? item[tertiaryField] : '';
                 const d = (descField && item[descField]) ? item[descField] : '';
                 renderGenericItem(p, s, t, d);
             });
        }
    };

    // Define tertiary functions where needed for date ranges etc.
    const getWorkTertiary = (item) => `${item.startDate || ''} - ${item.endDate || (item.current ? (translations[language]?.label_current_job || 'Present') : '')}`;
    const getEduTertiary = (item) => `${item.startDate || ''} - ${item.endDate || (item.current ? (translations[language]?.label_edu_current || 'Present') : '')}`;
    const getVolTertiary = (item) => `${item.startDate || ''} - ${item.endDate || (item.current ? (translations[language]?.label_currently_volunteering || 'Present') : '')}`;
    const getCombinedCompanyLocation = (item) => `${item.company || ''}${item.location ? (isRTL ? ` | ${item.location}` : ` | ${item.location}`) : ''}`;
    const getCombinedSchoolLocationGPA = (item) => `${item.school || ''}${item.location ? (isRTL ? ` | ${item.location}` : ` | ${item.location}`) : ''}${item.gpa ? ` (${translations[language]?.label_gpa || 'GPA'}: ${item.gpa})` : ''}`;


    // Render sections using the functions
    renderStandardSection('workExperience', 'preview_section_work', 'Work Experience', resumeData, 'jobTitle', getCombinedCompanyLocation, null, 'description', getWorkTertiary);
    renderStandardSection('education', 'preview_section_education', 'Education', resumeData, 'degree', getCombinedSchoolLocationGPA, null, 'additionalInfo', getEduTertiary);
    renderStandardSection('projects', 'preview_section_projects', 'Projects', resumeData, 'name', null, 'date', 'description');
    renderStandardSection('trainings', 'preview_section_trainings', 'Trainings & Courses', resumeData, 'name', 'institution', 'date', 'description'); // Corrected title key if needed
    renderStandardSection('certifications', 'preview_section_certifications', 'Certifications', resumeData, 'name', 'issuer', 'issueDate', null);
    renderStandardSection('awards', 'preview_section_awards', 'Awards', resumeData, 'title', 'issuer', 'date', 'description');
    renderStandardSection('publications', 'preview_section_publications', 'Publications', resumeData, 'title', 'publisher', 'date', 'description');
    renderStandardSection('volunteering', 'preview_section_volunteering', 'Volunteering', resumeData, 'role', 'organization', null, 'description', getVolTertiary);


    // --- Skills ---
    if (resumeData.skills?.length > 0) {
        drawSectionTitle('preview_section_skills', 'Skills');
        resumeData.skills.forEach(skillCat => {
            const categoryTitle = `${skillCat.category || (translations[language]?.skills_category_default || 'Skills Category')}:`;
            const skillsText = (skillCat.skillsList || '').split(',').map(s => s.trim()).filter(s => s).join(isRTL ? '، ' : ', '); // Use Arabic comma if RTL

            // Estimate heights
            const catTitleHeight = calculateFormattedTextHeightInternal(categoryTitle, usableWidth, doc, currentFontName, defaultFontSize, defaultLineHeight * 1.4, isRTL, baseTextSplitWidth, startX, 'bold'); // Added bold
            const skillsListHeight = calculateFormattedTextHeightInternal(skillsText, baseTextSplitWidth - 15, doc, currentFontName, descriptionFontSize, descriptionLineHeight, isRTL, baseTextSplitWidth, startX - (isRTL ? 15 : 0));
            const totalSkillBlockHeight = catTitleHeight + defaultLineHeight * 0.4 + skillsListHeight + defaultLineHeight * 0.8;

            if (checkAddPage(totalSkillBlockHeight)) {
                 console.log(`Page break before skills category: ${skillCat.category}`);
                 return; // Skip this category if it doesn't fit
            }

            // Draw Category Title
            doc.setFontSize(defaultFontSize).setFont(currentFontName, 'bold');
            doc.text(categoryTitle, startX, y, { align: textAlign });
            y += defaultLineHeight * 1.4; // Space after title

            // Draw Skills List (indented)
            doc.setFont(currentFontName, 'normal').setTextColor(50, 50, 50).setFontSize(descriptionFontSize);
            const skillSplitWidth = baseTextSplitWidth - 15; // Width reduced by indent
            const skillLines = doc.splitTextToSize(skillsText, Math.max(1, skillSplitWidth));
            const skillStartX = isRTL ? startX - 15 : startX + 15; // Indented start X

            skillLines.forEach(line => {
                // We checked the block fits, so no checkAddPage per line needed now
                doc.text(line, skillStartX, y, { align: textAlign }); // Draw indented
                y += descriptionLineHeight; // Use specific line height for skills list
            });

            doc.setTextColor(0, 0, 0).setFontSize(defaultFontSize).setFont(currentFontName, 'normal'); // Reset font/color
            y += defaultLineHeight * 0.8; // Space between categories
        });
    }

    // --- Languages ---
    if (resumeData.languages?.length > 0) {
        drawSectionTitle('preview_section_languages', 'Languages');
        let langItems = resumeData.languages.map(lang => `${lang.language || ''}${lang.proficiency ? ` (${lang.proficiency})` : ''}`);
        let langLine = langItems.join(isRTL ? ' | ' : '  |  '); // Use appropriate separator

        doc.setFontSize(defaultFontSize).setFont(currentFontName, 'normal');
        const langLines = doc.splitTextToSize(langLine, baseTextSplitWidth);

        if(checkAddPage(langLines.length * defaultLineHeight + defaultLineHeight * 0.5)) { // Check space needed
             console.log("Page break before Languages section content.");
             // If page broke, don't draw the content on this page (drawSectionTitle already handled)
        } else {
             langLines.forEach(line => {
                 doc.text(line, startX, y, { align: textAlign });
                 y += defaultLineHeight;
             });
             y += defaultLineHeight * 0.5; // Space after section
        }
    }

    // --- Interests ---
     if (resumeData.interests?.length > 0) {
        drawSectionTitle('preview_section_interests', 'Interests');
        let interestLine = resumeData.interests.map(i => i.name || '').join(isRTL ? '، ' : ', '); // Arabic comma

        doc.setFontSize(defaultFontSize).setFont(currentFontName, 'normal');
        const interestLines = doc.splitTextToSize(interestLine, baseTextSplitWidth);

        if(checkAddPage(interestLines.length * defaultLineHeight + defaultLineHeight * 0.5)) {
            console.log("Page break before Interests section content.");
        } else {
             interestLines.forEach(line => {
                 doc.text(line, startX, y, { align: textAlign });
                 y += defaultLineHeight;
             });
             y += defaultLineHeight * 0.5; // Space after section
        }
    }

    // --- Custom Sections ---
    renderStandardSection('customSections', 'preview_section_custom', 'More Info', resumeData, 'title', null, null, 'description');

    console.log(`Native resume content rendering finished (v1.8 - ${language}). Final Y: ${y.toFixed(2)}`);
} // End of renderNativePdfContent


/**
 * Calculates the required height for native PDF rendering of a RESUME.
 * v1.8: Uses globally defined font info. Includes full calculation logic.
 *
 * @param {object} resumeData - The resume data object.
 * @param {number} baseMargin - The margin in points.
 * @param {number} pageWidth - The page width in points.
 * @param {string} templateId - The selected template ID.
 * @param {string} language - The language code.
 * @returns {Promise<number>} The calculated required height in points.
 */
async function calculateNativePdfHeight(resumeData, baseMargin, pageWidth, templateId, language) {
    console.log(`Calculating native PDF height for resume (v1.8 - ${language})...`);
    const tempDoc = new jspdf.jsPDF({ unit: 'pt', format: 'a4' });

    const isRTL = language === 'ar';
    const pi = resumeData.personalInfo || {};
    const settings = resumeData.settings || {};
    const defaultFontSize = parseFloat(settings.fontSize) || 10;

    // --- Font Selection for Measurement ---
    const defaultFontName = settings.fontFamily?.toLowerCase().includes('serif') ? 'times' : 'helvetica';
    let useArabicFont = false;
    // Check if global ARABIC_FONT_NAME is defined and attempt to add to temp doc
    if (isRTL && typeof ARABIC_FONT_NAME !== 'undefined' && typeof addArabicFontToVFS === 'function') {
        // REMOVE await - addArabicFontToVFS is synchronous now
        if (addArabicFontToVFS(tempDoc)) { // Call global function on tempDoc
            try {
                const fontList = tempDoc.getFontList();
                if (fontList && fontList[ARABIC_FONT_NAME]) {
                    useArabicFont = true;
                    console.log(`Height Calc (${language}): Using ${ARABIC_FONT_NAME} for measurements.`);
                } else {
                    console.warn(`Height Calc (${language}): ${ARABIC_FONT_NAME} not found in temp doc after add, using default.`);
                }
            } catch(e) { console.error("Error checking font list in height calc.", e); }
        } else if (isRTL) { // If addArabicFontToVFS failed or wasn't found
            console.warn(`Height Calc (${language}): Global addArabicFontToVFS failed or missing, using default font.`);
        }
    }
    const currentFontName = useArabicFont ? ARABIC_FONT_NAME : defaultFontName;

    // --- Font Sizes, Line Heights, Margins ---
    const getLineHeight = (size, multiplier = 1.35) => size * multiplier; const defaultLineHeight = getLineHeight(defaultFontSize);
    const sectionTitleSize = defaultFontSize + (isRTL ? 2.5 : 2); const sectionTitleLineHeight = getLineHeight(sectionTitleSize);
    const headingSize = defaultFontSize + (isRTL ? 6.5 : 6); const headingLineHeight = getLineHeight(headingSize);
    const subHeadingSize = defaultFontSize + 1; const subHeadingLineHeight = getLineHeight(subHeadingSize);
    const descriptionFontSize = defaultFontSize * 0.95; const descriptionLineHeight = getLineHeight(descriptionFontSize, 1.5);
    const smallFontSize = defaultFontSize * 0.9; const smallLineHeight = getLineHeight(smallFontSize);

    let y = baseMargin;
    let usableWidth = pageWidth - 2 * baseMargin;
    let mainContentMargin = baseMargin;
    if (templateId === 'modern') { const sw = 5; mainContentMargin = baseMargin + sw + 15; usableWidth = pageWidth - mainContentMargin - baseMargin; }
    const baseTextSplitWidth = usableWidth - 5;
    const startX = isRTL ? (pageWidth - mainContentMargin) : mainContentMargin; // Use appropriate start for calculations needing it

    // --- Set Font on Temp Doc for all calculations ---
    tempDoc.setFont(currentFontName, 'normal');

    // --- Calculation Helpers ---
    const calculateTextHeight = (text, widthForSplitting, fontSize = defaultFontSize, fontStyle = 'normal', lineHeightMultiplier = 1.35) => {
        if (!text) return 0;
        tempDoc.setFont(currentFontName, fontStyle); // Ensure correct font is set for measurement
        tempDoc.setFontSize(fontSize);

        const lines = tempDoc.splitTextToSize(text.replace(/<br\s*\/?>/gi, '\n'),'\u200E$1\u200F', widthForSplitting);
        return lines.length * (fontSize * lineHeightMultiplier);
    };

    const calculateFormattedTextHeight = (text, widthForDrawing) => {
         return calculateFormattedTextHeightInternal(text, widthForDrawing, tempDoc, currentFontName, descriptionFontSize, descriptionLineHeight, isRTL, baseTextSplitWidth, startX); // Pass startX for indent calculation
    };

    const getSectionTitleHeight = (titleKey, defaultTitle) => {
         // Ensure translations object is available
        const title = (typeof translations !== 'undefined' && translations[language]?.[titleKey])
                      ? translations[language][titleKey]
                      : (typeof translations !== 'undefined' && translations['en']?.[titleKey])
                        ? translations['en'][titleKey] // Fallback to English
                        : defaultTitle; // Fallback to default
         const titleHeight = calculateTextHeight(title, usableWidth, sectionTitleSize, 'bold', 1.35); // Use 1.35 multiplier for title line height
         // Approx height including gaps before/after line
         return (defaultLineHeight * 0.7) + titleHeight + (sectionTitleLineHeight * 0.7) + (defaultLineHeight * 1.7);
    };

    const calculateGenericItemHeight = (primary, secondary, tertiary, description) => {
        let itemHeight = 0;
        const primaryHeight = calculateTextHeight(primary || '', baseTextSplitWidth, defaultFontSize, 'bold', 1.2); // Use 1.2 multiplier
        const tertiaryHeight = calculateTextHeight(tertiary || '', baseTextSplitWidth, smallFontSize, 'normal', 1.35);

        itemHeight += Math.max(primaryHeight, tertiaryHeight); // Height of the primary/tertiary line
        itemHeight += defaultLineHeight * 0.1; // Small gap after primary/tertiary

        if (secondary) {
            itemHeight += calculateTextHeight(secondary, baseTextSplitWidth, smallFontSize, 'italic', 1.35);
        }

        itemHeight += defaultLineHeight * 0.3; // Gap before description
        itemHeight += calculateFormattedTextHeight(description, usableWidth);
        itemHeight += defaultLineHeight * 0.7; // Space after item
        return itemHeight;
    };

    const calculateSectionHeight = (key, titleKey, defaultTitle, items, primaryField, secondaryField, tertiaryField, descField, customTertiaryFn = null) => {
         if (!items || items.length === 0) return 0;
         let sectionHeight = getSectionTitleHeight(titleKey, defaultTitle); // Use specific title height
         items.forEach(item => {
             const p = item[primaryField] || defaultTitle;
             const s = (secondaryField) ? (typeof secondaryField === 'function' ? secondaryField(item) : item[secondaryField] || '') : '';
             const t = customTertiaryFn ? customTertiaryFn(item) : (tertiaryField && item[tertiaryField]) ? item[tertiaryField] : '';
             const d = (descField && item[descField]) ? item[descField] : '';
             sectionHeight += calculateGenericItemHeight(p, s, t, d);
         });
         return sectionHeight;
     };

    // --- Perform Calculations ---
    // 1. Personal Info
     if (templateId === 'modern') {
         if (pi.name) y += headingLineHeight * 1.1;
         if (pi.role) y += subHeadingLineHeight * 1.2;
         let clItems = [pi.location, pi.phone, pi.email, pi.website, pi.linkedin, pi.github].filter(Boolean);
         let cl = clItems.join(isRTL ? ' | ' : '  |  ');
         if (cl) y += calculateTextHeight(cl, baseTextSplitWidth, smallFontSize, 'normal', 1.35);
     } else { // Default
         if (pi.name) y += headingLineHeight * 1.1;
         if (pi.role) y += subHeadingLineHeight * 1.2;
         let clItems = [pi.location, pi.phone, pi.email, pi.website, pi.linkedin, pi.github].filter(Boolean);
         let cl = clItems.join(isRTL ? ' | ' : '  |  ');
         if (cl) y += calculateTextHeight(cl, baseTextSplitWidth, smallFontSize, 'normal', 1.35);
     }
     y += defaultLineHeight * 1.7; // Space after header

    // 2. Summary
     if (pi.summary) {
         y += getSectionTitleHeight('preview_section_summary', 'Summary');
         y += calculateFormattedTextHeight(pi.summary, usableWidth);
     }

    // 3. Standard Sections
    const getWorkTertiary = (item) => `${item.startDate || ''} - ${item.endDate || (item.current ? (translations[language]?.label_current_job || 'Present') : '')}`;
    const getEduTertiary = (item) => `${item.startDate || ''} - ${item.endDate || (item.current ? (translations[language]?.label_edu_current || 'Present') : '')}`;
    const getVolTertiary = (item) => `${item.startDate || ''} - ${item.endDate || (item.current ? (translations[language]?.label_currently_volunteering || 'Present') : '')}`;
    const getCombinedCompanyLocation = (item) => `${item.company || ''}${item.location ? (isRTL ? ` | ${item.location}` : ` | ${item.location}`) : ''}`;
    const getCombinedSchoolLocationGPA = (item) => `${item.school || ''}${item.location ? (isRTL ? ` | ${item.location}` : ` | ${item.location}`) : ''}${item.gpa ? ` (${translations[language]?.label_gpa || 'GPA'}: ${item.gpa})` : ''}`;

    y += calculateSectionHeight('workExperience', 'preview_section_work', 'Work Experience', resumeData.workExperience, 'jobTitle', getCombinedCompanyLocation, null, 'description', getWorkTertiary);
    y += calculateSectionHeight('education', 'preview_section_education', 'Education', resumeData.education, 'degree', getCombinedSchoolLocationGPA, null, 'additionalInfo', getEduTertiary);
    y += calculateSectionHeight('projects', 'preview_section_projects', 'Projects', resumeData.projects, 'name', null, 'date', 'description');
    y += calculateSectionHeight('trainings', 'preview_section_trainings', 'Trainings & Courses', resumeData.trainings, 'name', 'institution', 'date', 'description');
    y += calculateSectionHeight('certifications', 'preview_section_certifications', 'Certifications', resumeData.certifications, 'name', 'issuer', 'issueDate', null);
    y += calculateSectionHeight('awards', 'preview_section_awards', 'Awards', resumeData.awards, 'title', 'issuer', 'date', 'description');
    y += calculateSectionHeight('publications', 'preview_section_publications', 'Publications', resumeData.publications, 'title', 'publisher', 'date', 'description');
    y += calculateSectionHeight('volunteering', 'preview_section_volunteering', 'Volunteering', resumeData.volunteering, 'role', 'organization', null, 'description', getVolTertiary);

    // 4. Skills
    if (resumeData.skills?.length > 0) {
         y += getSectionTitleHeight('preview_section_skills', 'Skills');
         resumeData.skills.forEach(skillCat => {
             const categoryTitle = `${skillCat.category || (translations[language]?.skills_category_default || 'Skills Category')}:`;
             const skillsText = (skillCat.skillsList || '').split(',').map(s => s.trim()).filter(s => s).join(isRTL ? '، ' : ', ');
             const skillSplitWidth = baseTextSplitWidth - 15; // Indented width

             y += calculateTextHeight(categoryTitle, usableWidth, defaultFontSize, 'bold', 1.4); // Height for title + gap after
             // y += defaultLineHeight * 0.4; // Gap after title (included in 1.4 multiplier above)
             y += calculateTextHeight(skillsText, skillSplitWidth, descriptionFontSize, 'normal', 1.5); // Skills list height (use desc line height multiplier)
             y += defaultLineHeight * 0.8; // Space between categories
         });
    }

    // 5. Languages
     if (resumeData.languages?.length > 0) {
         y += getSectionTitleHeight('preview_section_languages', 'Languages');
         let langItems = resumeData.languages.map(l => `${l.language || ''}${l.proficiency ? ` (${l.proficiency})` : ''}`);
         let ll = langItems.join(isRTL ? ' | ' : '  |  ');
         y += calculateTextHeight(ll, baseTextSplitWidth, defaultFontSize, 'normal', 1.35);
         y += defaultLineHeight * 0.5; // Space after section
     }

    // 6. Interests
     if (resumeData.interests?.length > 0) {
         y += getSectionTitleHeight('preview_section_interests', 'Interests');
         let il = resumeData.interests.map(i => i.name || '').join(isRTL ? '، ' : ', ');
         y += calculateTextHeight(il, baseTextSplitWidth, defaultFontSize, 'normal', 1.35);
         y += defaultLineHeight * 0.5; // Space after section
     }

    // 7. Custom Sections
    y += calculateSectionHeight('customSections', 'preview_section_custom', 'More Info', resumeData.customSections, 'title', null, null, 'description');


    const finalHeight = y + baseMargin; // Add bottom margin
    console.log(`Resume height calculation (v1.8 - ${language}) complete. Final Y: ${y.toFixed(2)}, Required Height: ${finalHeight.toFixed(2)}`);
    // Add a slightly larger buffer just in case complex formatting/fonts cause minor variations
    return finalHeight + 45; // Increased buffer
}


/**
 * Internal helper to calculate formatted text height, mirroring renderFormattedText logic.
 * (No changes needed from previous version)
 */
function calculateFormattedTextHeightInternal(text, widthForDrawing, tempDoc, fontName, fontSize, lineHeight, isRTL, baseSplitWidth, startX) {
     if (!text) return 0;
     let height = 0;
     tempDoc.setFont(fontName, 'normal'); // Set font for measurement
     tempDoc.setFontSize(fontSize);

     const paragraphs = text.split('\n');
     let isInsideList = false;

     paragraphs.forEach(paragraph => {
         if (!paragraph.trim()) {
             if (!isInsideList) { height += lineHeight * 0.5; }
             isInsideList = false; return;
         }

         const isListItem = /^\s*[-*+•]\s+/.test(paragraph);
         let effectiveSplitWidth;
         let indentAmount = isListItem ? 15 : 5;

         effectiveSplitWidth = baseSplitWidth - indentAmount; // Width for text splitting
         effectiveSplitWidth = Math.max(1, effectiveSplitWidth);

         if (isListItem) {
             if (!isInsideList) { height += lineHeight * 0.2; } // Gap before list starts
             isInsideList = true;
         } else {
             if (isInsideList) { height += lineHeight * 0.1; } // Gap after list ends
             isInsideList = false;
         }

         const lineToDraw = paragraph.replace(/^\s*[-*+•]\s+/, ''); // Text content only
         const splitLines = tempDoc.splitTextToSize(lineToDraw, effectiveSplitWidth);
         height += splitLines.length * lineHeight; // Add height for each line
     });
     height += (fontSize * 1.35) * 0.3; // Add final gap (use default line height base for gap calculation)
     return height;
}


/**
 * Generates a SINGLE-PAGE PDF using html2canvas.
 * (No changes needed from previous version)
 */
async function generateSinglePageHtml2CanvasPdf(previewElement, pdfWidthPt, stickyParentSelector) {
     console.log(`Generating single-page html2canvas PDF (Resume). Target width: ${pdfWidthPt}pt. Sticky parent: ${stickyParentSelector}`);
     const { jsPDF } = jspdf;
     const stickyParentElement = previewElement.closest(stickyParentSelector);
     if (!stickyParentElement) { console.warn(`Sticky parent element ('${stickyParentSelector}') not found.`); }
     const originalPreviewStyle = { height: previewElement.style.height, maxHeight: previewElement.style.maxHeight, overflow: previewElement.style.overflow, boxShadow: previewElement.style.boxShadow, paddingBottom: previewElement.style.paddingBottom };
     const originalStickyParentStyle = { position: stickyParentElement ? stickyParentElement.style.position : null, overflowY: stickyParentElement ? stickyParentElement.style.overflowY : null, height: stickyParentElement ? stickyParentElement.style.height : null, maxHeight: stickyParentElement ? stickyParentElement.style.maxHeight : null };
     try {
         previewElement.style.height = 'auto'; previewElement.style.maxHeight = 'none'; previewElement.style.overflow = 'visible'; previewElement.style.boxShadow = 'none'; previewElement.style.paddingBottom = '25px'; // Add padding
         if (stickyParentElement) { stickyParentElement.style.position = 'static'; stickyParentElement.style.overflowY = 'visible'; stickyParentElement.style.height = 'auto'; stickyParentElement.style.maxHeight = 'none'; }
         await new Promise(resolve => setTimeout(resolve, 700)); // Render time
         const captureWidth = previewElement.scrollWidth; const captureHeight = previewElement.scrollHeight;
         console.log(`Attempting html2canvas capture with dimensions: ${captureWidth} x ${captureHeight}`);
         const canvas = await html2canvas(previewElement, { scale: 2.5, useCORS: true, logging: true, width: captureWidth, height: captureHeight, windowWidth: captureWidth, windowHeight: captureHeight, scrollX: 0, scrollY: 0 });
         console.log(`Canvas generated. Dimensions: ${canvas.width}x${canvas.height}`);
         const imgData = canvas.toDataURL('image/png', 0.95);
         let imgProps; try { imgProps = jsPDF.prototype.getImageProperties(imgData); } catch (e) { console.warn("Failed getImageProperties, using canvas.", e); imgProps = { width: canvas.width, height: canvas.height }; }
         const pdfPageWidthPt = pdfWidthPt; let pdfPageHeightPt = (imgProps.height * pdfPageWidthPt) / imgProps.width;
         const paddingPx = 25; const canvasScale = 2.5; const paddingCanvasPx = paddingPx * canvasScale; const paddingPtEstimate = (paddingCanvasPx * pdfPageHeightPt) / imgProps.height; const finalPdfPageHeightPt = pdfPageHeightPt - paddingPtEstimate + 3; // Remove padding + buffer
         console.log(`Initial PDF Height: ${pdfPageHeightPt.toFixed(2)}pt. Padding Est: ${paddingPtEstimate.toFixed(2)}pt. Final PDF Height: ${finalPdfPageHeightPt.toFixed(2)}pt`);
         const pdfFormat = [pdfPageWidthPt, finalPdfPageHeightPt];
         const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: pdfFormat });
         doc.addImage(imgData, 'PNG', 0, 0, pdfPageWidthPt, pdfPageHeightPt); // Add full image, let PDF clip
         console.log("Single page PDF content added.");
         return doc;
     } catch (error) {
         console.error("html2canvas or PDF generation failed (single-page resume):", error); showGlobalNotification(`Error generating preview PDF: ${error.message}`, "danger"); return null;
     } finally {
         // Restore original styles
         previewElement.style.height = originalPreviewStyle.height; previewElement.style.maxHeight = originalPreviewStyle.maxHeight; previewElement.style.overflow = originalPreviewStyle.overflow; previewElement.style.boxShadow = originalPreviewStyle.boxShadow; previewElement.style.paddingBottom = originalPreviewStyle.paddingBottom;
         if (stickyParentElement) { stickyParentElement.style.position = originalStickyParentStyle.position; stickyParentElement.style.overflowY = originalStickyParentStyle.overflowY; stickyParentElement.style.height = originalStickyParentStyle.height; stickyParentElement.style.maxHeight = originalStickyParentStyle.maxHeight; }
         console.log("Preview element styles restored.");
     }
 }


/**
 * Generates a MULTI-PAGE PDF using html2canvas based on A4 dimensions.
 * (No changes needed from previous version)
 */
async function generateMultiPageHtml2CanvasPdf(doc, previewElement, pageHeight, pageWidth, stickyParentSelector) {
     console.log("Generating multi-page html2canvas PDF (Resume, A4)...");
     const stickyParentElement = previewElement.closest(stickyParentSelector);
     if (!stickyParentElement) { console.warn(`Sticky parent element ('${stickyParentSelector}') not found.`); }
     const originalPreviewStyle = { height: previewElement.style.height, maxHeight: previewElement.style.maxHeight, overflow: previewElement.style.overflow, boxShadow: previewElement.style.boxShadow };
     const originalStickyParentStyle = { position: stickyParentElement ? stickyParentElement.style.position : null, overflowY: stickyParentElement ? stickyParentElement.style.overflowY : null, height: stickyParentElement ? stickyParentElement.style.height : null, maxHeight: stickyParentElement ? stickyParentElement.style.maxHeight : null };
     try {
         previewElement.style.height = 'auto'; previewElement.style.maxHeight = 'none'; previewElement.style.overflow = 'visible'; previewElement.style.boxShadow = 'none';
         if (stickyParentElement) { stickyParentElement.style.position = 'static'; stickyParentElement.style.overflowY = 'visible'; stickyParentElement.style.height = 'auto'; stickyParentElement.style.maxHeight = 'none'; }
         await new Promise(resolve => setTimeout(resolve, 700));
         const captureWidth = previewElement.scrollWidth; const captureHeight = previewElement.scrollHeight;
         console.log(`Attempting html2canvas capture for multi-page: ${captureWidth} x ${captureHeight}`);
         const canvas = await html2canvas(previewElement, { scale: 2.5, useCORS: true, logging: false, width: captureWidth, height: captureHeight, windowWidth: captureWidth, windowHeight: captureHeight, scrollX: 0, scrollY: 0 });
         console.log(`Canvas generated (multi-page). Dimensions: ${canvas.width}x${canvas.height}`);
         const imgData = canvas.toDataURL('image/png', 0.95);
         let imgProps; try { imgProps = doc.getImageProperties(imgData); } catch (e) { console.warn("Failed getImageProperties (multi-page), using canvas.", e); imgProps = { width: canvas.width, height: canvas.height }; }
         const imgWidth = pageWidth; const imgHeight = (imgProps.height * imgWidth) / imgProps.width; // Scale to page width
         console.log(`Calculated PDF Image Dimensions for A4 width: ${imgWidth.toFixed(2)}pt x ${imgHeight.toFixed(2)}pt`);
         let heightLeft = imgHeight; let position = 0;
         doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); // Add first page
         heightLeft -= pageHeight; console.log(`Added page 1. Height left: ${heightLeft.toFixed(2)}pt`);
         while (heightLeft > 0) { // Add subsequent pages
             position -= pageHeight; doc.addPage(); doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight); heightLeft -= pageHeight;
             console.log(`Added page ${doc.internal.getNumberOfPages()}. Height left: ${heightLeft.toFixed(2)}pt`);
         }
         console.log("Multi-page html2canvas PDF content added.");
     } catch (error) {
         console.error("html2canvas or PDF generation failed (multi-page):", error); throw new Error(`Failed to generate multi-page PDF: ${error.message}`);
     } finally {
         // Restore styles
         previewElement.style.height = originalPreviewStyle.height; previewElement.style.maxHeight = originalPreviewStyle.maxHeight; previewElement.style.overflow = originalPreviewStyle.overflow; previewElement.style.boxShadow = originalPreviewStyle.boxShadow;
         if (stickyParentElement) { stickyParentElement.style.position = originalStickyParentStyle.position; stickyParentElement.style.overflowY = originalStickyParentStyle.overflowY; stickyParentElement.style.height = originalStickyParentStyle.height; stickyParentElement.style.maxHeight = originalStickyParentStyle.maxHeight; }
         console.log("Preview element styles restored (multi-page).");
     }
 }


/**
 * Helper to show notifications. Assumes a global window.showNotification exists.
 * (No changes needed)
 */
function showGlobalNotification(message, type = 'info', duration = 3000) {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type, duration);
    } else {
        console.warn("Global showNotification function not found. Falling back to alert.");
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// --- END OF FILE resumeDownloadPdf.js ---