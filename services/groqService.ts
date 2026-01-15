import { ExtractionResult, DynamicRow } from "../types";
import { SYSTEM_PROMPT } from "../constants";

// Semantic header mappings for flexible column matching
const HEADER_ALIASES: { [key: string]: string[] } = {
    "क्र संख्या": ["क्र संख्या", "क्र.संख्या", "क्र.सं.", "क्रम", "क्रम संख्या", "S.No", "S.NO", "S.NO.", "S.No.", "Serial", "Serial No", "Sl.No", "Sl. No.", "क्र.", "क्रमांक"],
    "भी.आर.पी नाम": ["भी.आर.पी नाम", "भी.आर.पी. नाम", "VRP Name", "BRP Name", "VRP नाम", "भी.आर.पी.", "VRP", "BRP"],
    "Code": ["Code", "CODE", "कोड", "CHF Code", "CHF", "Farmer Code", "किसान कोड", "CHF."],
    "किसान नाम": ["किसान नाम", "किसान का नाम", "किसान दीदी का नाम", "किसान दीदी नाम", "Farmer Name", "Farmer's Name", "Name", "नाम", "किसान", "Kisan Name", "Kisan Naam", "किसान दीदी"],
    "पति/पिता का नाम": [
        "पति/पिता का नाम", "पति/पिता", "पति / पिता का नाम", "पति पिता का नाम",
        "Father Name", "Father's Name", "Husband Name", "Husband's Name",
        "Father/Husband Name", "पिता का नाम", "पिता/पति का नाम", "पति का नाम",
        "Parent Name", "Guardian Name", "S/O", "D/O", "W/O", "पिता", "पति",
        "पिता नाम", "Pita Ka Naam", "Pati Ka Naam"
    ],
    "गाँव": ["गाँव", "गांव", "Village", "ग्राम", "Village Name", "Address", "पता", "Gaon", "Gram"],
    "फसल": ["फसल", "Crop", "Crop Name", "Fasal", "फसल का नाम"],
    "क्षेत्रफल (कट्ठा)": ["क्षेत्रफल (कट्ठा)", "क्षेत्रफल", "Area", "Area (Katha)", "Area (कट्ठा)", "Katha", "कट्ठा", "क्षेत्र", "Kshetrafal"],
    "रोपाई/बुआई तिथि": ["रोपाई/बुआई तिथि", "रोपाई तिथि", "बुआई तिथि", "Date", "Sowing Date", "Transplanting Date", "तिथि", "तारीख", "Tithi"],
    "कुल तोड़ाई (Kg)": ["कुल तोड़ाई (Kg)", "कुल तोड़ाई", "Total Production", "Production", "उत्पादन", "Kg", "तोड़ाई", "Harvest", "Todai"],
    "कुल आमदनी (रु०)": ["कुल आमदनी (रु०)", "कुल आमदनी", "Total Income", "Income", "आमदनी", "रु०", "Rs", "Amount", "राशि", "Aamdani"]
};

export const extractDataFromImage = async (
    base64Image: string,
    mimeType: string,
    headers: string[]
): Promise<ExtractionResult> => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || "";

    if (!apiKey) {
        throw new Error("Missing Groq API Key. Please set VITE_GROQ_API_KEY.");
    }

    // Llama 4 Scout (Latest Vision Model on Groq)
    const model = "meta-llama/llama-4-scout-17b-16e-instruct";

    const prompt = `
    ${SYSTEM_PROMPT}
    
    ⚠️ CRITICAL: STRICT OCR EXTRACTION - NO HALLUCINATION ALLOWED ⚠️
    
    You are performing OCR on a handwritten Hindi document. Your ONLY job is to READ and TRANSCRIBE what is ACTUALLY WRITTEN in the document.
    
    ABSOLUTE RULES - VIOLATION IS UNACCEPTABLE:
    1. ONLY extract text that is PHYSICALLY VISIBLE in the image - do NOT invent, guess, or fabricate ANY data.
    2. If handwriting is unclear, transcribe your BEST interpretation of what's written - do NOT make up different names.
    3. DO NOT generate random or made-up Hindi names. Every name must come from the actual document.
    4. If a cell is empty or illegible, use "" (empty string) - do NOT fill it with invented data.
    5. "किसान दीदी का नाम" means "Female Farmer's Name" - these are women farmers, transcribe their actual names.
    6. Column headers should NEVER appear as cell values.
    
    READ THE ACTUAL HANDWRITING:
    - Look at each row carefully
    - Transcribe the EXACT Hindi text written there
    - Do not substitute with different names
    - Preserve the actual spelling from the document
    
    Return ONLY valid JSON:
    {
      "document_type_guess": "NGO Farmer Registration/Data Collection Form",
      "extracted_text": "any header text or narrative from the document",
      "extracted_table": [
        { ${headers.map(h => `"${h}": "exact_text_from_document"`).join(", ")} }
      ],
      "warnings": ["any issues with legibility"]
    }
    
    Target headers to map data to: ${JSON.stringify(headers)}
    
    ⚠️ REMEMBER: TRANSCRIBE ONLY WHAT YOU SEE. NO FABRICATION! ⚠️
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
                        content: "You are a STRICT OCR transcription assistant. Your ONLY job is to READ and TRANSCRIBE the EXACT text visible in handwritten Hindi documents. NEVER invent, fabricate, or guess any names or data. If you cannot read something clearly, use empty string. NEVER substitute with different names. Output strict JSON."
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`
                                }
                            }
                        ]
                    }
                ],
                model: model,
                temperature: 0,
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
            throw new Error(`Groq API Error (${response.status}): ${errMsg}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        // Clean any potentially Markdown code blocks
        const jsonString = content.replace(/```json\n|\n```/g, "").replace(/```/g, "");

        // Parse the raw response
        const rawResult = JSON.parse(jsonString);

        // NORMALIZE the response to guarantee expected structure
        const normalizedResult: ExtractionResult = {
            document_type_guess: rawResult.document_type_guess || rawResult.documentType || rawResult.type || "Unknown",
            extracted_text: rawResult.extracted_text || rawResult.extractedText || rawResult.text || "",
            extracted_table: normalizeTable(rawResult.extracted_table || rawResult.extractedTable || rawResult.table || rawResult.data || rawResult.rows || [], headers),
            warnings: rawResult.warnings || []
        };

        return normalizedResult;

    } catch (error: any) {
        console.error("Groq Extraction Error:", error);
        throw error;
    }
};

// Helper function to find a value using semantic header matching
function findValueBySemanticMatch(row: any, targetHeader: string, allHeaders: string[]): string {
    // 1. Try exact match first
    if (row[targetHeader] !== undefined && row[targetHeader] !== null) {
        const value = String(row[targetHeader]).trim();
        // Check if the value is not a header (common issue where AI puts header as value)
        if (!isLikelyHeader(value, allHeaders)) {
            return value;
        }
    }

    // 2. Try case-insensitive match
    const rowKeys = Object.keys(row);
    const caseInsensitiveKey = rowKeys.find(k => k.toLowerCase() === targetHeader.toLowerCase());
    if (caseInsensitiveKey && row[caseInsensitiveKey] !== undefined) {
        const value = String(row[caseInsensitiveKey]).trim();
        if (!isLikelyHeader(value, allHeaders)) {
            return value;
        }
    }

    // 3. Try semantic alias matching
    const aliases = HEADER_ALIASES[targetHeader] || [];
    for (const alias of aliases) {
        // Check exact alias match
        if (row[alias] !== undefined && row[alias] !== null) {
            const value = String(row[alias]).trim();
            if (!isLikelyHeader(value, allHeaders)) {
                return value;
            }
        }
        // Check case-insensitive alias match
        const aliasKey = rowKeys.find(k => k.toLowerCase() === alias.toLowerCase());
        if (aliasKey && row[aliasKey] !== undefined) {
            const value = String(row[aliasKey]).trim();
            if (!isLikelyHeader(value, allHeaders)) {
                return value;
            }
        }
    }

    // 4. Try partial match (contains)
    for (const key of rowKeys) {
        const keyLower = key.toLowerCase();
        const targetLower = targetHeader.toLowerCase();
        if (keyLower.includes(targetLower) || targetLower.includes(keyLower)) {
            const value = String(row[key]).trim();
            if (!isLikelyHeader(value, allHeaders)) {
                return value;
            }
        }
    }

    return "";
}

// Helper function to check if a value is likely a header (not actual data)
function isLikelyHeader(value: string, allHeaders: string[]): boolean {
    if (!value || value.length === 0) return false;

    const valueLower = value.toLowerCase().trim();

    // Check if value matches any known header
    for (const header of allHeaders) {
        if (valueLower === header.toLowerCase()) {
            return true;
        }
    }

    // Check against all known aliases
    for (const aliases of Object.values(HEADER_ALIASES)) {
        for (const alias of aliases) {
            if (valueLower === alias.toLowerCase()) {
                return true;
            }
        }
    }

    return false;
}

// Helper function to normalize table data with smart header matching
function normalizeTable(table: any[], headers: string[]): DynamicRow[] {
    if (!Array.isArray(table)) {
        return [];
    }

    return table.map((row: any) => {
        const normalizedRow: DynamicRow = {};
        headers.forEach(header => {
            normalizedRow[header] = findValueBySemanticMatch(row, header, headers);
        });
        return normalizedRow;
    });
}

