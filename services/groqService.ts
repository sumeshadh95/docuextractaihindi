import { ExtractionResult, DynamicRow } from "../types";
import { SYSTEM_PROMPT } from "../constants";

// Semantic header mappings for flexible column matching
const HEADER_ALIASES: { [key: string]: string[] } = {
    "S.No.": ["S.No", "S.NO", "S.NO.", "क्र.सं.", "क्रम", "क्रम संख्या", "Serial", "Serial No", "Sl.No", "Sl. No.", "क्र."],
    "भी.आर.पी नाम": ["भी.आर.पी नाम", "VRP Name", "BRP Name", "VRP नाम", "भी.आर.पी.", "VRP"],
    "Code": ["Code", "CODE", "कोड", "CHF Code", "CHF", "Farmer Code", "किसान कोड"],
    "किसान नाम": ["किसान नाम", "Farmer Name", "किसान का नाम", "Name", "नाम", "Farmer's Name", "किसान"],
    "पति/पिता का नाम": [
        "पति/पिता का नाम", "पति/पिता", "Father Name", "Father's Name", "Husband Name", "Husband's Name",
        "Father/Husband Name", "पिता का नाम", "पिता/पति का नाम", "पति का नाम", "Parent Name",
        "Guardian Name", "S/O", "D/O", "W/O", "पिता", "पति"
    ],
    "गाँव": ["गाँव", "Village", "गांव", "ग्राम", "Village Name", "Address", "पता", "Gaon"],
    "फसल": ["फसल", "Crop", "Crop Name", "Fasal", "फसल का नाम"],
    "क्षेत्रफल (कट्ठा)": ["क्षेत्रफल (कट्ठा)", "क्षेत्रफल", "Area", "Area (Katha)", "Area (कट्ठा)", "Katha", "कट्ठा", "क्षेत्र"],
    "रोपाई/बुआई तिथि": ["रोपाई/बुआई तिथि", "Date", "Sowing Date", "Transplanting Date", "रोपाई तिथि", "बुआई तिथि", "तिथि", "तारीख"],
    "कुल तोड़ाई (Kg)": ["कुल तोड़ाई (Kg)", "कुल तोड़ाई", "Total Production", "Production", "उत्पादन", "Kg", "तोड़ाई", "Harvest"],
    "कुल आमदनी (रु०)": ["कुल आमदनी (रु०)", "कुल आमदनी", "Total Income", "Income", "आमदनी", "रु०", "Rs", "Amount", "राशि"]
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
    
    CRITICAL EXTRACTION RULES:
    1. Extract the ACTUAL VALUES from the document, NOT the column headers themselves.
    2. For "पति/पिता का नाम" (Father/Husband Name) column - extract the ACTUAL names of fathers/husbands from the document data rows, NOT the header text.
    3. If a column in the document has different heading than our target headers, map the DATA correctly based on semantic meaning.
    4. NEVER put a column header as a cell value. Each cell should contain actual data from the document.
    5. If a field's value is genuinely not present or illegible, use an empty string "".
    
    IMPORTANT: You must return ONLY valid JSON matching this structure:
    {
      "document_type_guess": "string describing the document type",
      "extracted_text": "any narrative/paragraph text from the document",
      "extracted_table": [
        { ${headers.map(h => `"${h}": "actual_extracted_value_not_header"`).join(", ")} }
      ],
      "warnings": ["optional array of warnings"]
    }
    
    Map the extracted data EXACTLY to these target headers: 
    ${JSON.stringify(headers)}
    
    REMEMBER: Extract REAL DATA VALUES, not column headers!
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
                        content: "You are a helpful data extraction assistant. You output strict JSON matching the provided schema."
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
                temperature: 0.1,
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

