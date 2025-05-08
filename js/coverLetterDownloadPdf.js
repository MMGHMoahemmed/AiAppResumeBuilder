// --- START OF FILE coverLetterDownloadPdf.js ---
console.log("downloadpdf.js loaded - PDF generation functions active (v7 - Native Single Page Height)."); // Version updated

/**
 * Generates a PDF from the application data and preview element.
 *
 * @param {string} downloadType - The selected download type (e.g., 'single-page-native', 'multi-page-html2canvas').
 * @param {object} applicationData - The full application data object.
 * @param {string} previewElementId - The ID of the HTML element containing the content to render.
 */

async function generatePdf(downloadType, applicationData, previewElementId) {
   console.log(`generatePdf called with:
       Type: ${downloadType},
       App Name: ${applicationData?.applicationName || 'N/A'},
       Preview ID: ${previewElementId}`
   );

   // --- Essential Checks ---
   const previewElement = document.getElementById(previewElementId); // Still needed for html2canvas options
   if (!previewElement && downloadType.includes('html2canvas')) { // Check only if needed
       console.error(`Preview element #${previewElementId} not found for html2canvas.`);
       showGlobalNotification(`Error: Could not find content element (#${previewElementId}) for image-based PDF.`, "danger");
       return;
   }
   if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
       console.error("jsPDF library is not loaded.");
       showGlobalNotification("Error: PDF generation library (jsPDF) is missing.", "danger");
       return;
   }
   if (downloadType.includes('html2canvas') && typeof html2canvas === 'undefined') {
       console.error("html2canvas library is not loaded.");
       showGlobalNotification("Error: HTML rendering library (html2canvas) is missing for this option.", "danger");
       return;
   }
   if (!applicationData) {
       console.error("Application data is missing.");
       showGlobalNotification("Error: Cannot generate PDF without application data.", "danger");
       return;
   }

   const fileName = `${applicationData?.applicationName || 'CoverLetter'}_${downloadType}_${new Date().toISOString().split('T')[0]}.pdf`;
   const { jsPDF } = jspdf; // Destructure jsPDF
   const settings = applicationData.settings || {};
   const selectedTemplateId = settings.templateId || 'default'; // Get template ID

   // --- PDF Options ---
   const standardA4WidthPt = 595.28;
   const standardA4HeightPt = 841.89; // Used for multi-page and fallback
   const baseMargin = 40; // points - Base margin

   // Add loading feedback
   showGlobalNotification(`Generating PDF (${downloadType})... Please wait.`, 'info', 5000);
   const downloadModalInstance = bootstrap.Modal.getInstance(document.getElementById('modal-download-options-cl'));
   if(downloadModalInstance) downloadModalInstance.hide();

   await new Promise(resolve => setTimeout(resolve, 200));

   let doc; // Declare doc here

   try {
       // --- Create jsPDF Instance ---
       // For single-page native AND single-page html2canvas, we create the doc *after* calculating dimensions.
       // For multi-page options, we create a standard A4 doc upfront.
       if (downloadType === 'multi-page-native' || downloadType === 'multi-page-html2canvas') {
            doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
           console.log("Created standard A4 jsPDF document for multi-page.");
       } else {
           console.log(`Delaying jsPDF document creation for ${downloadType} (needs dimensions first).`);
       }

       // --- Generate Content ---
       switch (downloadType) {
           case 'single-page-native':
               // 1. Calculate required height
               const calculatedHeight = await calculateNativePdfHeight(applicationData, baseMargin, standardA4WidthPt, selectedTemplateId);
               console.log(`Calculated native height: ${calculatedHeight}pt`);
               // 2. Create custom-sized doc
               doc = new jsPDF({
                   orientation: 'p',
                   unit: 'pt',
                   format: [standardA4WidthPt, calculatedHeight] // Use calculated height
               });
               console.log(`Created custom-sized native PDF: ${standardA4WidthPt} x ${calculatedHeight} pt`);
               // 3. Render content onto the custom doc (allowMultiPage = false)
               await renderNativePdfContent(doc, applicationData, baseMargin, standardA4WidthPt, calculatedHeight, selectedTemplateId, false);
               break;

           case 'multi-page-native':
               // Render content onto the pre-created A4 doc (allowMultiPage = true)
               await renderNativePdfContent(doc, applicationData, baseMargin, standardA4WidthPt, standardA4HeightPt, selectedTemplateId, true);
               break;

           case 'single-page-html2canvas':
               // This case handles its own doc creation with custom height based on A4 width
               const stickyParentSelector = '.sticky-preview';
               doc = await generateSinglePageHtml2CanvasPdf(previewElement, standardA4WidthPt, stickyParentSelector);
               if (!doc) throw new Error("Failed to generate single-page html2canvas PDF document.");
               break;

           case 'multi-page-html2canvas':
                // Render content onto the pre-created A4 doc
                const stickyParentSelectorMulti = '.sticky-preview';
               await generateMultiPageHtml2CanvasPdf(doc, previewElement, standardA4HeightPt, standardA4WidthPt, stickyParentSelectorMulti);
               break;

           default:
               console.error("Unknown download type:", downloadType);
               showGlobalNotification(`Error: Unknown PDF download type selected: ${downloadType}`, "danger");
               return;
       }

       // --- Save ---
       if (doc) {
           doc.save(fileName);
           showGlobalNotification(`PDF "${fileName}" generated successfully.`, 'success');
       } else {
            // This should only happen if single-page generation failed before creating doc
            throw new Error("PDF document object was not properly created or returned.");
       }

   } catch (error) {
       console.error("Error during PDF generation:", error);
       showGlobalNotification(`Failed to generate PDF: ${error.message || error}`, 'danger');
   }
}


/**
 * Calculates the required height for native PDF rendering by simulating text placement.
 *
 * @param {object} appData - The application data.
 * @param {number} baseMargin - The margin in points.
 * @param {number} pageWidth - The page width in points (A4 width).
 * @param {string} templateId - The selected template ID ('default' or 'modern').
 * @returns {Promise<number>} The calculated required height in points.
 */
async function calculateNativePdfHeight(appData, baseMargin, pageWidth, templateId) {
    console.log("Calculating native PDF height...");
    // Use a temporary jsPDF instance just for text splitting calculations
    const tempDoc = new jspdf.jsPDF({ unit: 'pt', format: [pageWidth, 10000] }); // Large height

    const pi = appData.resumeData?.personalInfo || {};
    const clData = appData.coverLetterData || {};
    const settings = appData.settings || {};
    const letterContent = clData.content || '';
    const companyName = appData.companyName || '';
    const hiringManager = appData.hiringManager || '';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let y = baseMargin; // Current Y position
    const defaultFontSize = 11;
    const lineHeight = defaultFontSize * 1.25;
    let currentMargin = baseMargin;
    let usableWidth = pageWidth - 2 * currentMargin;
    const sidebarWidth = 5; // Width of the modern sidebar in points

    if (templateId === 'modern') {
        currentMargin = baseMargin + sidebarWidth + 5;
        usableWidth = pageWidth - currentMargin - baseMargin;
    }

    // --- Simulate Sender Info ---
    if (templateId === 'modern') {
        if (pi.name) y += lineHeight * 1.2; // Name
        const contactLines = [pi.location, pi.phone, pi.email, pi.linkedin ? 'LinkedIn Profile' : null].filter(Boolean);
        y += contactLines.length * lineHeight; // Contact lines
        y += lineHeight; // Space after contact

        // Recipient (simulate max height needed)
        let recipientY = baseMargin + lineHeight * 1.5;
        if (hiringManager) recipientY += lineHeight;
        if (companyName) recipientY += lineHeight;
        y = Math.max(y, recipientY) + lineHeight; // Space after recipient block

    } else {
        const senderBlock = [pi.name, pi.location, pi.phone, pi.email, pi.linkedin ? 'LinkedIn' : null].filter(Boolean);
        let senderY = y;
        senderY += senderBlock.length * lineHeight;
        y = Math.max(y, senderY) + lineHeight * 2; // Space after sender block

        // Date
        y += lineHeight * 2; // Space after date

        // Recipient Info
        if (hiringManager) y += lineHeight;
        if (companyName) y += lineHeight;
        y += lineHeight; // Space after recipient
    }

    // --- Simulate Salutation ---
    y += lineHeight * 2; // Space after salutation

    // --- Simulate Body ---
    // Use the tempDoc to split text accurately
    tempDoc.setFontSize(defaultFontSize);
    const bodyLines = tempDoc.splitTextToSize(letterContent, usableWidth);
    y += bodyLines.length * lineHeight;
    y += lineHeight; // Space after body

    // --- Simulate Closing ---
    y += lineHeight * 3; // Space after closing text ("Sincerely,")

    // --- Simulate Signature ---
    if (pi.name) {
        y += lineHeight; // Signature line
    }

    // --- Final Height ---
    const calculatedHeight = y + baseMargin; // Add bottom margin
    console.log(`Calculation complete. Final Y: ${y.toFixed(2)}, Required Height: ${calculatedHeight.toFixed(2)}`);
    return calculatedHeight;
}









// --- END OF FILE coverLetterDownloadPdf.js ---











/**
 * Renders the native PDF content onto a given jsPDF document instance.
 * Handles page breaks only if allowMultiPage is true.
 * Adds background color (TEMPORARY BLUE for verification).
 *
 * @param {jsPDF} doc - The jsPDF document instance (can be A4 or custom-sized).
 * @param {object} appData - The application data.
 * @param {number} baseMargin - The margin in points.
 * @param {number} pageWidth - The page width in points.
 * @param {number} pageHeight - The page height in points (can be A4 or custom).
 * @param {string} templateId - The selected template ID ('default' or 'modern').
 * @param {boolean} allowMultiPage - Whether to add new pages if content exceeds pageHeight.
 */
async function renderNativePdfContent(doc, appData, baseMargin, pageWidth, pageHeight, templateId, allowMultiPage) {
    console.log(`Rendering Native PDF Content (Template: ${templateId}, MultiPage: ${allowMultiPage}, PageHeight: ${pageHeight}pt)...`);

    const pi = appData.resumeData?.personalInfo || {};
    const clData = appData.coverLetterData || {};
    const settings = appData.settings || {};
    const letterContent = clData.content || '';
    const companyName = appData.companyName || '';
    const hiringManager = appData.hiringManager || '';
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    let y = baseMargin; // Current Y position
    const defaultFontSize = 11;
    const lineHeight = defaultFontSize * 1.25;
    let currentMargin = baseMargin;
    let usableWidth = pageWidth - 2 * currentMargin;
    let themeColor = settings.themeColor || '#206bc4'; // Use themeColor from settings if available
    const sidebarWidth = 5; // Width of the modern sidebar in points


    let backgroundColor = [230, 233, 237]; // Temporary Light Blue

    if (templateId === 'modern') {
         backgroundColor = [230, 233, 237]; 
    } else {
        backgroundColor = [255, 255, 255]; 
    }


    if (templateId === 'modern') {
        currentMargin = baseMargin + sidebarWidth + 5;
        usableWidth = pageWidth - currentMargin - baseMargin;
        themeColor = settings.themeColor || '#00529b'; // Modern default theme color
    }

    // Helper to draw sidebar (only if modern template)
    const drawModernSidebarIfNeeded = (currentDocPageHeight) => {
        if (templateId === 'modern') {
            // Set sidebar color and draw AFTER background
            doc.setFillColor(themeColor);
            doc.rect(0, 0, sidebarWidth, currentDocPageHeight, 'F');
        }
    };

    // Helper to check for page overflow and add page IF allowed
    const checkAddPage = () => {
        // Use the actual height of the current page in the doc object
        const currentDocPageHeight = doc.internal.pageSize.getHeight();
        if (allowMultiPage && y + lineHeight > currentDocPageHeight - baseMargin) {
            doc.addPage();

            // *** ADD BACKGROUND COLOR TO NEW PAGE ***
            doc.setFillColor(...backgroundColor); // Use spread operator for RGB array
            doc.rect(0, 0, pageWidth, currentDocPageHeight, 'F'); // Fill the new page

            y = baseMargin;
            drawModernSidebarIfNeeded(currentDocPageHeight); // Draw sidebar on new page AFTER background
            console.log("Added new page (multi-page native)");
            return true; // Indicates a new page was added
        }
        // For single page, we *don't* add a page, content should fit or will be truncated by jsPDF
        if (!allowMultiPage && y + lineHeight > currentDocPageHeight - baseMargin) {
            console.warn("Native single-page content might exceed calculated height. Content may be truncated by jsPDF.");
            // Don't add page, just signal to stop adding more lines if needed (though jsPDF might handle clipping)
            return true; // Treat as needing to stop adding lines (optional, jsPDF might clip anyway)
        }
        return false; // No new page needed/added
    };

    // --- Draw Page 1 (or only page) ---
    // *** ADD BACKGROUND COLOR TO INITIAL PAGE ***
    doc.setFillColor(...backgroundColor); // Use spread operator for RGB array
    doc.rect(0, 0, pageWidth, pageHeight, 'F'); // Fill the entire page

    // Draw sidebar AFTER background
    drawModernSidebarIfNeeded(pageHeight);

    // Set text properties AFTER background
    doc.setFont('helvetica', 'normal'); // Set default font
    doc.setFontSize(defaultFontSize);
    doc.setTextColor(0, 0, 0); // Default text color black

    // --- Render Sender Info ---
    // ... (Keep the rest of the rendering logic exactly as it was in v8) ...
    if (templateId === 'modern') {
        if (pi.name) {
            if(checkAddPage()) return;
            doc.setFontSize(16).setFont('helvetica', 'bold').setTextColor(themeColor).text(pi.name, currentMargin, y);
            y += lineHeight * 1.2;
        }
        doc.setFontSize(defaultFontSize).setFont('helvetica', 'normal').setTextColor(0, 0, 0);
        const contactLines = [pi.location, pi.phone, pi.email, pi.linkedin ? 'LinkedIn Profile' : null].filter(Boolean);
        contactLines.forEach(line => { if(checkAddPage()) return; doc.text(line, currentMargin, y); y += lineHeight; });
        y += lineHeight;
        if(checkAddPage()) return;
        doc.text(today, pageWidth - baseMargin, baseMargin, { align: 'right' });
        let recipientY = baseMargin + lineHeight * 1.5;
        if (hiringManager) { if(checkAddPage()) return; doc.text(hiringManager, pageWidth - baseMargin, recipientY, { align: 'right' }); recipientY += lineHeight;}
        if (companyName) { if(checkAddPage()) return; doc.text(companyName, pageWidth - baseMargin, recipientY, { align: 'right' }); recipientY += lineHeight;}
        y = Math.max(y, recipientY) + lineHeight;
    } else {
        const senderBlock = [pi.name, pi.location, pi.phone, pi.email, pi.linkedin ? 'LinkedIn' : null].filter(Boolean);
        let senderY = y;
        senderBlock.forEach(line => { if(checkAddPage()) return; doc.text(line, pageWidth - currentMargin, senderY, { align: 'right' }); senderY += lineHeight; });
        y = Math.max(y, senderY) + lineHeight * 2;
        if(checkAddPage()) return;
        doc.text(today, currentMargin, y);
        y += lineHeight * 2;
        if (hiringManager) { if(checkAddPage()) return; doc.text(hiringManager, currentMargin, y); y += lineHeight; }
        if (companyName) { if(checkAddPage()) return; doc.text(companyName, currentMargin, y); y += lineHeight; }
        y += lineHeight;
    }
    if(checkAddPage()) return;
    const salutation = `Dear ${hiringManager || 'Hiring Manager'},`;
    doc.setFont('helvetica', 'bold').text(salutation, currentMargin, y);
    doc.setFont('helvetica', 'normal');
    y += lineHeight * 2;
    const bodyLines = doc.splitTextToSize(letterContent, usableWidth);
    bodyLines.forEach(line => {
        if(checkAddPage()) return;
        doc.text(line, currentMargin, y);
        y += lineHeight;
    });
    y += lineHeight;
    if(checkAddPage()) return;
    doc.setFont('helvetica', 'bold').setTextColor(0, 0, 0).text('Sincerely,', currentMargin, y);
    y += lineHeight * 3;
    if(checkAddPage()) return;
    if (pi.name) {
        if (templateId === 'modern') {
             doc.setFont('helvetica', 'bold').setTextColor(themeColor);
        } else {
             doc.setFont('helvetica', 'bold').setTextColor(0, 0, 0);
        }
         doc.text(pi.name, currentMargin, y);
         doc.setFont('helvetica', 'normal').setTextColor(0, 0, 0);
         y += lineHeight;
    }

    console.log("Native PDF content rendering finished.");
}


/**
 * Generates a SINGLE-PAGE PDF using html2canvas.
 * (No changes needed in this function)
 */
async function generateSinglePageHtml2CanvasPdf(previewElement, pdfWidthPt, stickyParentSelector) {
    // ... (Keep the existing generateSinglePageHtml2CanvasPdf function exactly as it was in v8/v7/v6) ...
    console.log(`Generating single-page html2canvas PDF. Target width: ${pdfWidthPt}pt. Sticky parent: ${stickyParentSelector}`);
    const { jsPDF } = jspdf;
    const stickyParentElement = previewElement.closest(stickyParentSelector);
    if (!stickyParentElement) {
        console.warn(`Sticky parent element ('${stickyParentSelector}') not found. Proceeding without modifying its style.`);
    }
    const originalPreviewStyle = { height: previewElement.style.height, maxHeight: previewElement.style.maxHeight, overflow: previewElement.style.overflow, boxShadow: previewElement.style.boxShadow, paddingBottom: previewElement.style.paddingBottom };
    const originalStickyParentStyle = { position: stickyParentElement ? stickyParentElement.style.position : null, overflowY: stickyParentElement ? stickyParentElement.style.overflowY : null, height: stickyParentElement ? stickyParentElement.style.height : null, maxHeight: stickyParentElement ? stickyParentElement.style.maxHeight : null };
    try {
        console.log("Applying temporary styles for capture...");
        previewElement.style.height = 'auto';
        previewElement.style.maxHeight = 'none';
        previewElement.style.overflow = 'visible';
        previewElement.style.boxShadow = 'none';
        previewElement.style.paddingBottom = '25px';
        if (stickyParentElement) {
            console.log("Temporarily changing sticky parent position to static.");
            stickyParentElement.style.position = 'static';
            stickyParentElement.style.overflowY = 'visible';
            stickyParentElement.style.height = 'auto';
            stickyParentElement.style.maxHeight = 'none';
        }
        await new Promise(resolve => setTimeout(resolve, 700));
        const captureWidth = previewElement.scrollWidth;
        const captureHeight = previewElement.scrollHeight;
        console.log(`Attempting html2canvas capture with dimensions: ${captureWidth} x ${captureHeight}`);
        const canvas = await html2canvas(previewElement, { scale: 2.5, useCORS: true, logging: true, width: captureWidth, height: captureHeight, windowWidth: captureWidth, windowHeight: captureHeight, scrollX: 0, scrollY: 0 });
        console.log(`Canvas generated. Dimensions: ${canvas.width}x${canvas.height}`);
        const imgData = canvas.toDataURL('image/png', 0.95);
        let imgProps;
        try { imgProps = jsPDF.prototype.getImageProperties(imgData); } catch (e) { console.warn("Failed getImageProperties, using canvas dimensions.", e); imgProps = { width: canvas.width, height: canvas.height }; }
        const pdfPageWidthPt = pdfWidthPt;
        let pdfPageHeightPt = (imgProps.height * pdfPageWidthPt) / imgProps.width;
        const paddingPx = 25;
        const canvasScale = 2.5;
        const paddingCanvasPx = paddingPx * canvasScale;
        const paddingPtEstimate = (paddingCanvasPx * pdfPageHeightPt) / imgProps.height;
        const finalPdfPageHeightPt = pdfPageHeightPt - paddingPtEstimate + 3;
        console.log(`Initial PDF Height: ${pdfPageHeightPt.toFixed(2)}pt. Padding Est: ${paddingPtEstimate.toFixed(2)}pt. Final PDF Height: ${finalPdfPageHeightPt.toFixed(2)}pt`);
        const pdfFormat = [pdfPageWidthPt, finalPdfPageHeightPt];
        console.log("Creating jsPDF document with custom format:", pdfFormat);
        const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: pdfFormat });
        console.log(`Adding image to PDF: ${pdfPageWidthPt.toFixed(2)} x ${pdfPageHeightPt.toFixed(2)}`);
        doc.addImage(imgData, 'PNG', 0, 0, pdfPageWidthPt, pdfPageHeightPt);
        console.log("Single page PDF content added (padding clipped).");
        return doc;
    } catch (error) {
        console.error("html2canvas or PDF generation failed:", error);
        showGlobalNotification(`Error generating preview PDF: ${error.message}`, "danger");
        return null;
    } finally {
        console.log("Restoring original styles...");
        previewElement.style.height = originalPreviewStyle.height;
        previewElement.style.maxHeight = originalPreviewStyle.maxHeight;
        previewElement.style.overflow = originalPreviewStyle.overflow;
        previewElement.style.boxShadow = originalPreviewStyle.boxShadow;
        previewElement.style.paddingBottom = originalPreviewStyle.paddingBottom;
        if (stickyParentElement) {
            stickyParentElement.style.position = originalStickyParentStyle.position;
            stickyParentElement.style.overflowY = originalStickyParentStyle.overflowY;
            stickyParentElement.style.height = originalStickyParentStyle.height;
            stickyParentElement.style.maxHeight = originalStickyParentStyle.maxHeight;
            console.log("Sticky parent styles restored.");
        }
        console.log("Preview element styles restored.");
    }
}


/**
 * Generates a MULTI-PAGE PDF using html2canvas.
 * (No changes needed in this function)
 */
async function generateMultiPageHtml2CanvasPdf(doc, previewElement, pageHeight, pageWidth, stickyParentSelector) {
    // ... (Keep the existing generateMultiPageHtml2CanvasPdf function exactly as it was in v8/v7/v6) ...
    console.log("Generating multi-page html2canvas PDF (A4)...");
    const stickyParentElement = previewElement.closest(stickyParentSelector);
    if (!stickyParentElement) { console.warn(`Sticky parent element ('${stickyParentSelector}') not found for multi-page. Proceeding without modifying its style.`); }
    const originalPreviewStyle = { height: previewElement.style.height, maxHeight: previewElement.style.maxHeight, overflow: previewElement.style.overflow, boxShadow: previewElement.style.boxShadow };
    const originalStickyParentStyle = { position: stickyParentElement ? stickyParentElement.style.position : null, overflowY: stickyParentElement ? stickyParentElement.style.overflowY : null, height: stickyParentElement ? stickyParentElement.style.height : null, maxHeight: stickyParentElement ? stickyParentElement.style.maxHeight : null };
    try {
        console.log("Applying temporary styles for multi-page capture...");
        previewElement.style.height = 'auto';
        previewElement.style.maxHeight = 'none';
        previewElement.style.overflow = 'visible';
        previewElement.style.boxShadow = 'none';
        if (stickyParentElement) {
            console.log("Temporarily changing sticky parent position to static for multi-page.");
            stickyParentElement.style.position = 'static';
            stickyParentElement.style.overflowY = 'visible';
            stickyParentElement.style.height = 'auto';
            stickyParentElement.style.maxHeight = 'none';
        }
        await new Promise(resolve => setTimeout(resolve, 700));
        const captureWidth = previewElement.scrollWidth;
        const captureHeight = previewElement.scrollHeight;
        console.log(`Attempting html2canvas capture for multi-page: ${captureWidth} x ${captureHeight}`);
        const canvas = await html2canvas(previewElement, { scale: 2.5, useCORS: true, logging: false, width: captureWidth, height: captureHeight, windowWidth: captureWidth, windowHeight: captureHeight, scrollX: 0, scrollY: 0 });
        console.log(`Canvas generated. Dimensions: ${canvas.width}x${canvas.height}`);
        const imgData = canvas.toDataURL('image/png', 0.95);
        let imgProps;
        try { imgProps = doc.getImageProperties(imgData); } catch (e) { console.warn("Failed getImageProperties (multi-page), using canvas dimensions.", e); imgProps = { width: canvas.width, height: canvas.height }; }
        const imgWidth = pageWidth;
        const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
        console.log(`Calculated PDF Image Dimensions for A4 width: ${imgWidth.toFixed(2)}pt x ${imgHeight.toFixed(2)}pt`);
        let heightLeft = imgHeight;
        let position = 0;
        doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        console.log(`Added page 1. Height left: ${heightLeft.toFixed(2)}pt`);
        while (heightLeft > 0) {
            position -= pageHeight;
            doc.addPage();
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
            console.log(`Added page ${doc.internal.getNumberOfPages()}. Height left: ${heightLeft.toFixed(2)}pt`);
        }
        console.log("Multi-page html2canvas PDF content added.");
    } catch (error) {
        console.error("html2canvas or PDF generation failed (multi-page):", error);
        throw new Error(`Failed to generate multi-page PDF: ${error.message}`);
    } finally {
        console.log("Restoring original styles (multi-page)...");
        previewElement.style.height = originalPreviewStyle.height;
        previewElement.style.maxHeight = originalPreviewStyle.maxHeight;
        previewElement.style.overflow = originalPreviewStyle.overflow;
        previewElement.style.boxShadow = originalPreviewStyle.boxShadow;
        if (stickyParentElement) {
            stickyParentElement.style.position = originalStickyParentStyle.position;
            stickyParentElement.style.overflowY = originalStickyParentStyle.overflowY;
            stickyParentElement.style.height = originalStickyParentStyle.height;
            stickyParentElement.style.maxHeight = originalStickyParentStyle.maxHeight;
            console.log("Sticky parent styles restored (multi-page).");
        }
        console.log("Preview element styles restored (multi-page).");
    }
}




// Helper to ensure showNotification is accessible globally
function showGlobalNotification(message, type = 'info', duration = 3000) {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type, duration);
    } else {
        console.warn("Global showNotification function not found. Falling back to alert.");
        alert(`${type.toUpperCase()}: ${message}`);
    }
}

// --- END OF FILE coverLetterDownloadPdf.js ---
