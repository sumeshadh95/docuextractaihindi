import { ExtractionResult, DynamicRow } from "../types";
import { SYSTEM_PROMPT } from "../constants";

/**
 * Extract structured data from raw text.
 * For TSV/CSV-like data, parse directly without AI.
 * For unstructured text, use AI extraction.
 */
export const extractFromText = async (
    rawText: string,
    headers: string[]
): Promise<ExtractionResult> => {
    // Try to detect and parse tabular data directly
    const tabularResult = parseTabularData(rawText, headers);
    if (tabularResult) {
        return tabularResult;
    }

    // Fall back to AI extraction for unstructured text
    return extractWithAI(rawText, headers);
};

/**
 * Detect and parse TSV/CSV-like tabular data directly.
 * This avoids AI token limits for large datasets.
 */
function parseTabularData(rawText: string, expectedHeaders: string[]): ExtractionResult | null {
    const lines = rawText.trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length < 2) return null; // Need at least header + 1 data row

    // Detect delimiter (tab is most common for pasted data)
    const firstLine = lines[0];
    let delimiter = '\t';
    if (!firstLine.includes('\t')) {
        if (firstLine.includes('|')) delimiter = '|';
        else if (firstLine.includes(',') && !firstLine.includes('\t')) delimiter = ',';
        else return null; // Can't detect format
    }

    // Parse header line
    const headerLine = lines[0].split(delimiter).map(h => h.trim());

    // Check if this looks like tabular data (has multiple columns)
    if (headerLine.length < 3) return null;

    // Find the data start (skip header line)
    let dataStartIndex = 1;

    // Check if there's a metadata line before headers (like the user's data has)
    if (!headerLine.some(h => expectedHeaders.some(eh => h.includes(eh) || eh.includes(h)))) {
        // First line might be metadata, check second line
        if (lines.length > 2) {
            const secondLine = lines[1].split(delimiter).map(h => h.trim());
            if (secondLine.some(h => expectedHeaders.some(eh => h.includes(eh) || eh.includes(h)))) {
                dataStartIndex = 2;
            }
        }
    }

    // Map detected headers to expected headers
    const detectedHeaders = lines[dataStartIndex - 1].split(delimiter).map(h => h.trim());

    // Create header index mapping
    const headerMap: { [key: number]: string } = {};
    detectedHeaders.forEach((dh, idx) => {
        // Find matching expected header
        const match = expectedHeaders.find(eh =>
            eh.toLowerCase() === dh.toLowerCase() ||
            eh.includes(dh) || dh.includes(eh) ||
            normalizeHeader(eh) === normalizeHeader(dh)
        );
        if (match) {
            headerMap[idx] = match;
        } else {
            // Use detected header if no match
            headerMap[idx] = dh;
        }
    });

    // Parse data rows
    const rows: DynamicRow[] = [];
    let lastCompleteRow: DynamicRow | null = null;

    for (let i = dataStartIndex; i < lines.length; i++) {
        const line = lines[i];
        const cells = line.split(delimiter).map(c => c.trim());

        // Skip empty lines
        if (cells.every(c => !c)) continue;

        // Create row object
        const row: DynamicRow = {};
        let hasData = false;

        // Check if this is a continuation row (only crop name filled)
        const snoValue = cells[0];
        const isMainRow = snoValue && /^\d+$/.test(snoValue);

        if (isMainRow) {
            // This is a main data row
            Object.keys(headerMap).forEach(idxStr => {
                const idx = parseInt(idxStr);
                const header = headerMap[idx];
                const value = cells[idx] || '';
                row[header] = value;
                if (value) hasData = true;
            });

            if (hasData) {
                rows.push(row);
                lastCompleteRow = row;
            }
        } else if (lastCompleteRow && cells.some(c => c)) {
            // This might be a sub-row (like "मूंग", "भिन्डी" rows in the user's data)
            // Skip these as they're just crop breakdowns
            continue;
        }
    }

    // If no rows parsed, return null to fall back to AI
    if (rows.length === 0) return null;

    // Extract narrative text (metadata at the top)
    let narrativeText = '';
    if (dataStartIndex > 1) {
        narrativeText = lines.slice(0, dataStartIndex - 1).join('\n');
    }

    return {
        document_type_guess: "tabular_data",
        extracted_text: narrativeText,
        extracted_table: rows,
        warnings: rows.length > 100 ? [`Large dataset: ${rows.length} rows extracted`] : []
    };
}

function normalizeHeader(header: string): string {
    return header.toLowerCase()
        .replace(/[.\s\-_()]/g, '')
        .replace(/s\.no|sno|क्रम।?स।?/gi, 'sno');
}

/**
 * AI-based extraction for unstructured text.
 */
async function extractWithAI(rawText: string, headers: string[]): Promise<ExtractionResult> {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || "";

    if (!apiKey) {
        throw new Error("Missing Groq API Key. Please set VITE_GROQ_API_KEY.");
    }

    const model = "meta-llama/llama-4-scout-17b-16e-instruct";

    // Truncate text if too long to avoid token limits
    const maxChars = 15000;
    const truncatedText = rawText.length > maxChars
        ? rawText.substring(0, maxChars) + "\n... [TRUNCATED]"
        : rawText;

    const prompt = `
    ${SYSTEM_PROMPT}
    
    IMPORTANT: Extract ALL rows from the text. Return ONLY valid JSON matching this structure:
    {
      "document_type_guess": "string",
      "extracted_text": "narrative text if any",
      "extracted_table": [
        { ${headers.map(h => `"${h}": "value"`).join(", ")} }
      ],
      "warnings": []
    }
    
    Headers to use: ${JSON.stringify(headers)}
    
    --- TEXT TO EXTRACT FROM ---
    ${truncatedText}
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
                        content: "You are a data extraction assistant. Extract ALL data rows. Output strict JSON."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: model,
                temperature: 0.1,
                max_tokens: 8000,
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
        const jsonString = content.replace(/```json\n|\n```/g, "").replace(/```/g, "");
        const rawResult = JSON.parse(jsonString);

        return {
            document_type_guess: rawResult.document_type_guess || "Unknown",
            extracted_text: rawResult.extracted_text || "",
            extracted_table: normalizeTable(rawResult.extracted_table || [], headers),
            warnings: rawResult.warnings || []
        };

    } catch (error: any) {
        console.error("Text Extraction Error:", error);
        throw error;
    }
}

function normalizeTable(table: any[], headers: string[]): DynamicRow[] {
    if (!Array.isArray(table)) return [];

    return table.map((row: any) => {
        const normalizedRow: DynamicRow = {};
        headers.forEach(header => {
            normalizedRow[header] = row[header] ??
                Object.keys(row).find(k => k.toLowerCase() === header.toLowerCase())
                ? row[Object.keys(row).find(k => k.toLowerCase() === header.toLowerCase())!]
                : "";
        });
        return normalizedRow;
    });
}
