import { ExtractionResult, DynamicRow } from "../types";
import { SYSTEM_PROMPT } from "../constants";

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
    
    IMPORTANT: You must return ONLY valid JSON matching this structure:
    {
      "document_type_guess": "string describing the document type",
      "extracted_text": "any narrative/paragraph text from the document",
      "extracted_table": [
        { ${headers.map(h => `"${h}": "value"`).join(", ")} }
      ],
      "warnings": ["optional array of warnings"]
    }
    
    Map the extracted data EXACTLY to these headers: 
    ${JSON.stringify(headers)}
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

// Helper function to normalize table data
function normalizeTable(table: any[], headers: string[]): DynamicRow[] {
    if (!Array.isArray(table)) {
        return [];
    }

    return table.map((row: any) => {
        const normalizedRow: DynamicRow = {};
        headers.forEach(header => {
            // Try exact match first, then case-insensitive match
            normalizedRow[header] = row[header] ??
                Object.keys(row).find(k => k.toLowerCase() === header.toLowerCase())
                ? row[Object.keys(row).find(k => k.toLowerCase() === header.toLowerCase())!]
                : "";
        });
        return normalizedRow;
    });
}
