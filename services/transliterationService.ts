import { DynamicRow } from "../types";
import { GoogleGenAI } from "@google/genai";

/**
 * Pre-processes text to fix common extraction issues like missing spaces.
 */
function preprocessText(text: string): string {
    if (!text || typeof text !== 'string') return text;

    // Fix CamelCase names (e.g., "RameshKarki" -> "Ramesh Karki")
    // This regex finds lowercase followed by uppercase and inserts a space
    let processed = text.replace(/([a-z])([A-Z])/g, '$1 $2');

    // Fix common patterns like "BRP-101" followed by name without space
    processed = processed.replace(/(\d)([A-Z])/g, '$1 $2');

    // Clean up multiple spaces
    processed = processed.replace(/\s+/g, ' ').trim();

    return processed;
}

/**
 * Transliterates English text to Hindi (Devanagari script) using Gemini API.
 * Uses batch processing to minimize API calls.
 * Returns both the transliterated rows and the original rows for revert functionality.
 */
export const transliterateToHindi = async (
    rows: DynamicRow[],
    columnsToTransliterate: string[]
): Promise<{ transliteratedRows: DynamicRow[], originalRows: DynamicRow[] }> => {
    const apiKey = import.meta.env.VITE_API_KEY || "";

    if (!apiKey) {
        throw new Error("Missing API Key for transliteration. Please set VITE_API_KEY.");
    }

    // Store original rows for revert
    const originalRows = rows.map(row => ({ ...row }));

    // Collect all unique texts to transliterate (after preprocessing)
    const textsToTransliterate: string[] = [];
    const textMap: Map<string, string> = new Map();
    const originalToProcessed: Map<string, string> = new Map();

    rows.forEach(row => {
        columnsToTransliterate.forEach(col => {
            const value = row[col];
            if (value && typeof value === 'string' && value.trim()) {
                // Preprocess to fix spacing issues
                const processedValue = preprocessText(value);

                if (!textMap.has(processedValue)) {
                    // Check if it's already in Hindi (Devanagari range: \u0900-\u097F)
                    const isAlreadyHindi = /[\u0900-\u097F]/.test(processedValue);
                    // Check if it contains any English letters
                    const hasEnglish = /[a-zA-Z]/.test(processedValue);

                    if (!isAlreadyHindi && hasEnglish) {
                        textsToTransliterate.push(processedValue);
                        textMap.set(processedValue, processedValue); // Placeholder
                    } else {
                        // Keep as-is (already Hindi or no English to transliterate)
                        textMap.set(processedValue, processedValue);
                    }
                }
                // Map original value to processed value for later lookup
                originalToProcessed.set(value, processedValue);
            }
        });
    });

    if (textsToTransliterate.length === 0) {
        // Even if nothing to transliterate, apply preprocessing fixes
        const preprocessedRows = rows.map(row => {
            const newRow: DynamicRow = { ...row };
            columnsToTransliterate.forEach(col => {
                const originalValue = row[col];
                if (originalValue && originalToProcessed.has(originalValue)) {
                    newRow[col] = originalToProcessed.get(originalValue) || originalValue;
                }
            });
            return newRow;
        });
        return { transliteratedRows: preprocessedRows, originalRows };
    }

    // Initialize Gemini AI
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert Hindi linguist and transliteration specialist. Your task is to convert English/Romanized Indian names and words into accurate, natural Hindi (Devanagari) script.

IMPORTANT RULES FOR ACCURATE TRANSLITERATION:
1. Names should sound EXACTLY the same when spoken aloud in Hindi
2. Preserve the natural pronunciation - transliterate phonetically

VOWEL SOUNDS:
- "a" at end of names = आ sound (Sunita = सुनीता, Sita = सीता)
- Short "a" in middle = अ (Ram = राम)
- "aa" or long "a" = आ (Sharma = शर्मा)
- "i" = इ (short) or ई (long) based on pronunciation
- "ee" = ई (Seeta = सीता)
- "u" = उ (short) or ऊ (long)
- "ai" = ऐ, "ei" = ए
- "o" = ओ, "oo/ou" = ऊ

CONSONANT SOUNDS:
- "sh" = श (Sharma = शर्मा, Shrestha = श्रेष्ठा)
- "th" = थ (aspirated) (Thapa = थापा)
- "bh" = भ, "dh" = ध, "gh" = घ, "kh" = ख, "ph" = फ
- "ch" = च (Chaudhary = चौधरी)
- "ng" at end = ंग (Gurung = गुरुंग, Tamang = तामांग)
- Double consonants = हलंत usage

COMMON NEPALI/INDIAN NAMES - USE THESE EXACT PATTERNS:
- Karki = कार्की
- Adhikari = अधिकारी  
- Chaudhary = चौधरी
- Magar = मगर
- Bista = बिस्ता
- Thapa = थापा
- Gurung = गुरुंग
- Tamang = तामांग
- Sharma = शर्मा
- Shrestha = श्रेष्ठा
- Lama = लामा
- KC/K.C. = केसी
- BK = बि.के./बीके
- Rai = राय (NOT राई)
- Hari = हरि
- Laxmi/Lakshmi = लक्ष्मी
- Ramesh = रमेश
- Sunita = सुनीता
- Sita = सीता
- Rajesh = राजेश
- Anita = अनिता
- Pooja/Puja = पूजा
- Suman = सुमन
- Nabin/Naveen = नवीन
- Bina/Beena = बीना
- Kiran = किरण
- Prakash = प्रकाश
- Sushma = सुष्मा
- Rushma = रुष्मा
- Dishal = दिशाल
- Bishal/Vishal = बिशाल
- Givina = गिविना
- Tara = तारा
- Milan = मिलान
- Arjun = अर्जुन
- Kamala = कमला
- Bikash = विकाश
- Keshav = केशव
- Mohan = मोहन
- Laxman = लक्ष्मण
- Gopal = गोपाल
- Gosala = गोसाला
- Muskart/Muskan = मुस्कान
- Dorje = दोर्जे
- Ocepak = ओसेपक
- Mijan = मिजान
- D pesh/Dipesh = दीपेश

PLACES:
- Kathmandu = काठमांडू
- Pokhara = पोखरा
- Biratnagar = विराटनगर
- Hetauda = हेटौडा
- Dhangadhi = धनगढी
- Banepa = बनेपा
- Tansen = तानसेन
- Lakeside = लेकसाइड
- Boudha = बौद्धा
- New Road = न्यू रोड
- Jorpatl/Jorpati = जोरपाटी
- Gulariya = गुलरिया
- Bardjya/Bardiya = बर्दिया
- Surkhet = सुर्खेत
- Birendranagar = वीरेन्द्रनगर
- Itahari = इटहरी
- Sunaari/Sunsari = सुनसरी
- Makwanpur = मकवानपुर
- Morang = मोरंग
- Kavre/Kavrepalanchok = काभ्रे
- Palpa = पाल्पा
- Kailali = कैलाली

Input list (JSON array) - transliterate each entry:
${JSON.stringify(textsToTransliterate)}

CRITICAL: Return ONLY a valid JSON object with this exact structure:
{
  "transliterations": {
    "English Text 1": "हिंदी टेक्स्ट 1",
    "English Text 2": "हिंदी टेक्स्ट 2"
  }
}

Transliterate EVERY entry in the input list. Do not skip any.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: {
                parts: [{ text: prompt }],
            },
            config: {
                systemInstruction: "You are a Hindi transliteration expert. You convert Romanized Indian/Nepali names to accurate, natural Devanagari script. Focus on phonetic accuracy - the Hindi text should sound exactly like the English when spoken. Output strict JSON only. Transliterate ALL entries provided.",
                responseMimeType: "application/json",
                temperature: 0.1, // Lower temperature for more consistent output
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response received from Gemini for transliteration.");
        }

        const result = JSON.parse(text);
        const transliterations = result.transliterations || result;

        // Update the map with transliterations
        Object.keys(transliterations).forEach(key => {
            textMap.set(key, transliterations[key]);
        });

        // Apply transliterations to rows
        const transliteratedRows = rows.map(row => {
            const newRow: DynamicRow = { ...row };
            columnsToTransliterate.forEach(col => {
                const originalValue = row[col];
                if (originalValue) {
                    const processedValue = originalToProcessed.get(originalValue) || originalValue;
                    if (textMap.has(processedValue)) {
                        newRow[col] = textMap.get(processedValue) || processedValue;
                    }
                }
            });
            return newRow;
        });

        return { transliteratedRows, originalRows };

    } catch (error: any) {
        console.error("Transliteration Error:", error);
        throw error;
    }
};
