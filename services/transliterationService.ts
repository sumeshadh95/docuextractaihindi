import { DynamicRow } from "../types";

/**
 * Transliterates English text to Hindi (Devanagari script) using Groq API.
 * Uses batch processing to minimize API calls.
 * Returns both the transliterated rows and the original rows for revert functionality.
 */
export const transliterateToHindi = async (
    rows: DynamicRow[],
    columnsToTransliterate: string[]
): Promise<{ transliteratedRows: DynamicRow[], originalRows: DynamicRow[] }> => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || "";

    if (!apiKey) {
        throw new Error("Missing Groq API Key for transliteration.");
    }

    // Store original rows for revert
    const originalRows = rows.map(row => ({ ...row }));

    // Collect all unique texts to transliterate
    const textsToTransliterate: string[] = [];
    const textMap: Map<string, string> = new Map();

    rows.forEach(row => {
        columnsToTransliterate.forEach(col => {
            const value = row[col];
            if (value && typeof value === 'string' && value.trim() && !textMap.has(value)) {
                // Check if it's already in Hindi (Devanagari range: \u0900-\u097F)
                const isAlreadyHindi = /[\u0900-\u097F]/.test(value);
                if (!isAlreadyHindi) {
                    textsToTransliterate.push(value);
                    textMap.set(value, value); // Placeholder
                }
            }
        });
    });

    if (textsToTransliterate.length === 0) {
        return { transliteratedRows: rows, originalRows }; // Nothing to transliterate
    }

    // Batch transliterate using Groq
    const model = "meta-llama/llama-4-scout-17b-16e-instruct";

    const prompt = `
You are an expert Hindi linguist and transliteration specialist. Your task is to convert English/Romanized Indian names and words into accurate, natural Hindi (Devanagari) script.

IMPORTANT RULES FOR ACCURATE TRANSLITERATION:
1. Names should sound EXACTLY the same when spoken aloud in Hindi
2. Pay attention to vowel sounds:
   - "a" at end of names like "Sunita" = आ sound (सुनीता, not सुनित)
   - "i" sound = इ/ई depending on length
   - "ai" = ऐ, "ei" = ए
3. Pay attention to consonant sounds:
   - "Rai" = राय (not राई)
   - "Sharma" = शर्मा
   - "Thapa" = थापा
   - "Gurung" = गुरुंग
4. Common Nepali/Indian name patterns:
   - "Karki" = कार्की
   - "Adhikari" = अधिकारी
   - "Chaudhary" = चौधरी
   - "Magar" = मगर
   - "Bista" = बिस्ता
5. For places, use standard Hindi transliterations:
   - "Kathmandu" = काठमांडू
   - "Pokhara" = पोखरा

Input list (JSON array):
${JSON.stringify(textsToTransliterate)}

CRITICAL: Return ONLY a JSON object with this exact structure (no extra text):
{
  "transliterations": {
    "Sunita Rai": "सुनीता राय",
    "Ramesh Karki": "रमेश कार्की",
    ...
  }
}

Transliterate each text naturally and accurately.
`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "You are a Hindi transliteration expert. You convert Romanized Indian/Nepali names to accurate, natural Devanagari script. Focus on phonetic accuracy - the Hindi text should sound exactly like the English when spoken. Output strict JSON only."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: model,
                temperature: 0.2, // Slightly higher for more natural output
                stream: false,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            let errMsg = response.statusText;
            try {
                const errJson = JSON.parse(errText);
                errMsg = errJson.error?.message || errMsg;
            } catch (e) { }
            throw new Error(`Transliteration Error (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        const jsonString = content.replace(/```json\n|\n```/g, "").replace(/```/g, "");
        const result = JSON.parse(jsonString);

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
                if (originalValue && textMap.has(originalValue)) {
                    newRow[col] = textMap.get(originalValue) || originalValue;
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
