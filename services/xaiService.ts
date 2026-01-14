import { ExtractionResult, DynamicRow } from "../types";
import { SYSTEM_PROMPT } from "../constants";

export const extractDataFromImage = async (
    base64Image: string,
    mimeType: string,
    headers: string[]
): Promise<ExtractionResult> => {
    const apiKey = import.meta.env.VITE_XAI_API_KEY || "";

    if (!apiKey) {
        throw new Error("Missing xAI API Key. Please set VITE_XAI_API_KEY.");
    }

    const prompt = `
    ${SYSTEM_PROMPT}
    
    IMPORTANT: Return ONLY valid JSON.
    
    Map the extracted data to these specific headers: 
    ${JSON.stringify(headers)}
  `;

    // xAI (Grok) API Endpoint
    const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful data extraction assistant. You only respond in valid JSON."
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${base64Image}`,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            model: "grok-2-vision-1212", // Using the vision capable model
            stream: false,
            temperature: 0.1
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`xAI API Error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Clean markdown code blocks if present
    const jsonString = content.replace(/```json\n|\n```/g, "").replace(/```/g, "");

    return JSON.parse(jsonString) as ExtractionResult;
};
