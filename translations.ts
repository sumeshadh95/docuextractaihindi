// Language translations for the app
export type Language = 'en' | 'hi';

export const translations = {
    en: {
        // Header
        appName: 'Farmer OCR',
        appSubtitle: 'Data Extraction Tool',

        // Mode selector
        image: 'Image',
        batch: 'Batch',
        pdf: 'PDF',

        // Upload section
        uploadImage: 'Upload Image',
        uploadImageDesc: 'Upload a photo or scan of your document',
        batchProcessing: 'Batch Processing',
        batchProcessingDesc: 'Upload multiple images to extract all at once',
        pdfToImage: 'PDF to Image',
        pdfToImageDesc: 'Upload PDF, select a page, then extract',
        preview: 'Preview',
        page: 'Page',
        imagesSelected: 'image(s) selected',

        // Buttons
        extractData: 'Extract Data',
        extractImages: 'Extract {count} Images',
        analyzing: 'Analyzing...',

        // Progress
        preparing: 'Preparing...',
        aiAnalyzing: 'AI is analyzing...',
        finishingUp: 'Finishing up...',
        processing: 'Processing',

        // Results
        noDataYet: 'No Data Extracted Yet',
        noDataYetDesc: 'Upload a document and click "Extract Data"',
        noDataBatchDesc: 'Upload multiple images and click "Extract"',
        noDataPdfDesc: 'Upload a PDF, select a page, and extract',
        table: 'Table',
        text: 'Text',

        // Table view
        extractedData: 'Extracted Data',
        structuredData: 'Structured data',
        hindiMode: 'Hindi Mode',
        addRow: 'Add Row',
        english: 'English',
        hindi: 'हिंदी',
        exportExcel: 'Export Excel',
        converting: 'Converting...',
        noData: 'No data extracted. Add a row or upload an image.',

        // API warnings
        missingApiKey: 'Missing API Key',
        setApiKey: 'Set VITE_API_KEY in .env.local',

        // Notes
        notes: 'Notes',

        // History
        viewHistory: 'View History',

        // Footer
        copyright: '© {year} Farmer OCR • Agricultural Data Collection Tool',

        // Language toggle
        language: 'Language',
        switchToHindi: 'हिंदी में देखें',
        switchToEnglish: 'View in English',
    },
    hi: {
        // Header
        appName: 'किसान OCR',
        appSubtitle: 'डेटा निष्कर्षण उपकरण',

        // Mode selector
        image: 'छवि',
        batch: 'बैच',
        pdf: 'PDF',

        // Upload section
        uploadImage: 'छवि अपलोड करें',
        uploadImageDesc: 'अपने दस्तावेज़ की फोटो या स्कैन अपलोड करें',
        batchProcessing: 'बैच प्रोसेसिंग',
        batchProcessingDesc: 'एक साथ निकालने के लिए कई छवियां अपलोड करें',
        pdfToImage: 'PDF से छवि',
        pdfToImageDesc: 'PDF अपलोड करें, पेज चुनें, फिर निकालें',
        preview: 'पूर्वावलोकन',
        page: 'पेज',
        imagesSelected: 'छवि(यां) चयनित',

        // Buttons
        extractData: 'डेटा निकालें',
        extractImages: '{count} छवियां निकालें',
        analyzing: 'विश्लेषण...',

        // Progress
        preparing: 'तैयारी...',
        aiAnalyzing: 'AI विश्लेषण कर रहा है...',
        finishingUp: 'पूरा हो रहा है...',
        processing: 'प्रोसेसिंग',

        // Results
        noDataYet: 'अभी तक कोई डेटा नहीं निकाला गया',
        noDataYetDesc: 'दस्तावेज़ अपलोड करें और "डेटा निकालें" पर क्लिक करें',
        noDataBatchDesc: 'कई छवियां अपलोड करें और "निकालें" पर क्लिक करें',
        noDataPdfDesc: 'PDF अपलोड करें, पेज चुनें और निकालें',
        table: 'तालिका',
        text: 'टेक्स्ट',

        // Table view
        extractedData: 'निकाला गया डेटा',
        structuredData: 'संरचित डेटा',
        hindiMode: 'हिंदी मोड',
        addRow: 'पंक्ति जोड़ें',
        english: 'English',
        hindi: 'हिंदी',
        exportExcel: 'Excel निर्यात',
        converting: 'परिवर्तित हो रहा है...',
        noData: 'कोई डेटा नहीं निकाला गया। पंक्ति जोड़ें या छवि अपलोड करें।',

        // API warnings
        missingApiKey: 'API Key गायब है',
        setApiKey: '.env.local में VITE_API_KEY सेट करें',

        // Notes
        notes: 'नोट्स',

        // History
        viewHistory: 'इतिहास देखें',

        // Footer
        copyright: '© {year} किसान OCR • कृषि डेटा संग्रह उपकरण',

        // Language toggle
        language: 'भाषा',
        switchToHindi: 'हिंदी में देखें',
        switchToEnglish: 'View in English',
    }
};

export const useTranslation = (lang: Language) => {
    const t = (key: keyof typeof translations['en'], replacements?: Record<string, string | number>): string => {
        let text = translations[lang][key] || translations['en'][key] || key;
        if (replacements) {
            Object.entries(replacements).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    };
    return { t };
};
