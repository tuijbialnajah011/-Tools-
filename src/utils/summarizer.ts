import { GenerateContentResponse } from "@google/genai";
import { getGenAI, getAllKeysCount } from "../services/geminiService";

export async function generateNotes(
  text: string, 
  length: 'short' | 'medium' | 'long',
  onProgress?: (text: string) => void,
  mode: 'paste' | 'prompt' = 'paste',
  language: string = 'English'
): Promise<string> {
  if (!text || text.trim().length === 0) return "";

  try {
    let ai = getGenAI();
    const totalKeys = getAllKeysCount();
    let keyAttempts = 0;
    
    let lengthInstruction = "CRITICAL: The summary MUST be extremely concise, aiming for an 80% reduction of the source text (roughly 20% of the original length). Focus ONLY on the absolute most critical points.";
    if (length === 'medium') lengthInstruction = "CRITICAL: The summary should be moderately detailed, aiming for a 60% reduction of the source text (roughly 40% of the original length). Provide a balanced summary with key details and important context.";
    if (length === 'long') lengthInstruction = "CRITICAL: The summary should be comprehensive, aiming for only a 30% reduction of the source text (roughly 70% of the original length). Capture all nuances, important data points, and detailed explanations.";

    let contextInstruction = `I will provide you with raw text extracted from a document.
Your task is to generate highly organized, beautifully designed, and structured notes using Markdown in ${language}.`;
    
    let inputData = `Text to analyze:
"""
${text.substring(0, 30000)}
"""`;

    if (mode === 'prompt') {
      contextInstruction = `The user has provided a topic or a prompt. 
Your task is to FIRST generate comprehensive, high-quality information about this topic, and THEN structure it into beautifully designed notes using Markdown in ${language}.`;
      inputData = `Topic/Prompt: "${text}"`;
      lengthInstruction = `CRITICAL: The generated content should be ${length} in length. 
- If short: Provide a high-level overview with 3-4 key sections.
- If medium: Provide a detailed guide with 5-7 key sections.
- If long: Provide an exhaustive deep-dive with 8+ sections, tables, and detailed explanations.`;
    }

    const prompt = `
You are an expert, professional note-taker, researcher, and document analyst. 
${contextInstruction}

**CRITICAL: YOUR OUTPUT MUST BE PURE MARKDOWN ONLY. DO NOT INCLUDE ANY INTRODUCTORY TEXT, CONVERSATIONAL FILLER, OR "HERE ARE YOUR NOTES".**

Guidelines for Premium Document Design:
1. **Title**: Start with a clear H1 (#) title. Example: "# Financial Report 2024"
2. **TL;DR**: Right below the title, provide a 1-2 sentence TL;DR inside a blockquote (>).
3. **Hierarchy**: 
   - Use H2 (##) for major sections.
   - Use H3 (###) for sub-sections.
   - ALWAYS put a space after the # symbols (e.g., "## Section" NOT "##Section").
   - Add a relevant emoji to every heading.
4. **Data Visualization (Tables)**: 
   - **MANDATORY**: If the topic contains any numerical data, comparisons, or lists with multiple attributes, you **MUST** use Markdown Tables.
   - **TABLE SYNTAX**: Ensure the header row and separator row are on separate lines.
     Example:
     | Header 1 | Header 2 |
     | :--- | :--- |
     | Value 1 | Value 2 |
5. **Structure & Spacing**:
   - Use \`## Section Title\` for major topics (these become cinematic sections).
   - Use \`### Card Title\` for specific sub-topics (these become animated cards).
   - Use \`**Term**: Definition\` for key concepts (these become definition boxes).
   - Use \`> Important Note\` for callouts (these become info boxes).
   - **MANDATORY**: Use DOUBLE NEWLINES (\\n\\n) between every block element.
   - Use horizontal rules (---) between major sections.
   - Use bullet points (-) for lists.
6. **Highlights**: Use blockquotes (>) for critical takeaways or "Pro-Tips".
7. **FLOWCHARTS**: Whenever explaining a process, timeline, sequence, or step-by-step concept, you MUST insert a Flowchart. Use this EXACT format:
   \`\`\`markdown
   ### 🔄 FLOW: [Name of Process]
   1. **[Step 1 Name]**: [Short description]
   2. **[Step 2 Name]**: [Short description]
   3. **[Step 3 Name]**: [Short description]
   \`\`\`
   Place these flowcharts between regular cards to break up the text visually.
8. **VISUAL CARDS**: For key concepts, definitions, or "Did you know" facts, use a Visual Card. Use this EXACT format:
    \`\`\`markdown
    ### 🎨 VISUAL: [Topic Name]
    - EMOJI: [One relevant emoji]
    - ITEM: [Icon: sparkles|info|check|zap|star|target] | [Short descriptive text]
    - ITEM: [Icon: sparkles|info|check|zap|star|target] | [Short descriptive text]
    \`\`\`
    Include 2-4 items per visual card.
 9. ${lengthInstruction}
10. Fix obvious OCR typos.
11. **NO LATEX OR MATH SYMBOLS**: Do NOT use LaTeX formatting like $a+b$ or \\n. Use plain text for math equations or symbols. Avoid unnecessary special characters.
12. **NO WEIRD SYMBOLS**: Do NOT use unnecessary symbols like $¥®^¥ or any other decorative characters that are not standard Markdown.
13. **INTERACTIVE QUIZ (HARDCODED DATA)**: At the very end of your response, you MUST include a JSON block enclosed in \`\`\`json ... \`\`\` containing exactly 20 MCQs (10 easy, 5 medium, 5 hard) and 5 "Match the Following" pairs based on the notes.
    **CRITICAL**: The interaction logic is already hardcoded in the app. You ONLY need to provide the DATA in this JSON format.
Use this EXACT JSON structure:
\`\`\`json
{
  "mcqs": [
    { "question": "...", "options": ["...", "...", "...", "..."], "answerIndex": 0, "difficulty": "easy", "explanation": "..." }
  ],
  "matching": [
    { "left": "...", "right": "..." }
  ],
  "flashcards": [
    { "term": "...", "definition": "..." }
  ],
  "mindMap": {
    "nodes": [
      { "id": "1", "label": "Main Topic", "type": "root" },
      { "id": "2", "label": "Subtopic 1", "type": "sub" }
    ],
    "edges": [
      { "from": "1", "to": "2" }
    ]
  }
}
\`\`\`
Ensure valid JSON. Do not include any text after the JSON block. Keep questions and options concise to avoid token limits.
For flashcards, include 5-10 key terms. For the mind map, create a hierarchical structure (root -> sub -> sub-sub) with 8-12 nodes.

${inputData}
    `;

    const modelsToTry = [
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-1.5-pro",
      "gemini-1.5-flash"
    ];

    if (onProgress) {
      let fullText = "";
      let success = false;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        // Reset key attempts for each model
        keyAttempts = 0;
        
        while (keyAttempts < totalKeys) {
          try {
            const responseStream = await ai.models.generateContentStream({
              model: modelName,
              contents: prompt,
            });

            fullText = ""; // Reset for this attempt
            for await (const chunk of responseStream) {
              const c = chunk as GenerateContentResponse;
              if (c.text) {
                fullText += c.text;
                onProgress(fullText);
              }
            }
            success = true;
            break; // Success, exit the key retry loop
          } catch (err: any) {
            console.warn(`Model ${modelName} failed with key attempt ${keyAttempts + 1}:`, err.message);
            lastError = err;
            
            const errMsg = err.message || "";
            const is403 = errMsg.includes('403') || errMsg.toLowerCase().includes('permission');
            const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');

            if ((is403 || isQuotaError) && keyAttempts < totalKeys - 1) {
              console.log(`Rotating to next API key due to ${is403 ? 'permission' : 'quota'} error...`);
              ai = getGenAI();
              keyAttempts++;
              continue; // Retry same model
            }
            
            break; // Try next model
          }
        }
        
        if (success) break;
      }

      if (!success) {
        if (lastError?.message?.includes('429') || lastError?.message?.includes('403')) {
          throw new Error("API_KEY_REQUIRED");
        }
        throw lastError || new Error("All models failed to generate content.");
      }
      return fullText;
    } else {
      let responseText = "";
      let success = false;
      let lastError: any = null;

      for (const modelName of modelsToTry) {
        // Reset key attempts for each model
        keyAttempts = 0;
        
        while (keyAttempts < totalKeys) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
            });

            if (response.text) {
              responseText = response.text;
              success = true;
              break; // Success, exit the key retry loop
            }
          } catch (err: any) {
            console.warn(`Model ${modelName} failed with key attempt ${keyAttempts + 1}:`, err.message);
            lastError = err;
            
            const errMsg = err.message || "";
            const is403 = errMsg.includes('403') || errMsg.toLowerCase().includes('permission');
            const isQuotaError = errMsg.includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('resource_exhausted');

            if ((is403 || isQuotaError) && keyAttempts < totalKeys - 1) {
              console.log(`Rotating to next API key due to ${is403 ? 'permission' : 'quota'} error...`);
              ai = getGenAI();
              keyAttempts++;
              continue; // Retry same model
            }
            
            break; // Try next model
          }
        }
        
        if (success) break;
      }

      if (!success || !responseText) {
        if (lastError?.message?.includes('429') || lastError?.message?.includes('403')) {
          throw new Error("API_KEY_REQUIRED");
        }
        throw lastError || new Error("All models failed to generate content or returned empty response.");
      }

      return responseText;
    }
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    
    // Fallback to basic extraction if API fails
    const fallbackText = generateBasicNotes(text, length, error.message || "Unknown error");
    
    if (onProgress) {
      let currentText = "";
      const words = fallbackText.split(" ");
      for (const word of words) {
        currentText += word + " ";
        onProgress(currentText);
        await new Promise(r => setTimeout(r, 30)); // Simulate typing delay
      }
    }
    
    return fallbackText;
  }
}

// Fallback function in case API fails
function generateBasicNotes(text: string, length: 'short' | 'medium' | 'long', errorMsg: string): string {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length <= 5) return lines.map(l => `- ${l}`).join('\n');

  const isHeading = (line: string) => (line.length < 50 && line === line.toUpperCase() && line.match(/[A-Z]/)) || (line.length < 60 && line.endsWith(':'));

  const totalLines = lines.length;
  let maxLines = Math.max(5, Math.floor(totalLines * 0.2)); // Short: 20% (80% reduction)
  if (length === 'medium') maxLines = Math.max(10, Math.floor(totalLines * 0.4)); // Medium: 40% (60% reduction)
  if (length === 'long') maxLines = Math.max(20, Math.floor(totalLines * 0.7)); // Long: 70% (30% reduction)

  const finalLines: string[] = [];
  let count = 0;

  for (const line of lines) {
    if (count >= maxLines) break;
    if (isHeading(line)) {
      finalLines.push(`\n### ${line.replace(/:$/, '')}\n`);
    } else {
      if (line.includes(':') && line.split(':')[0].length < 30) {
        const parts = line.split(':');
        finalLines.push(`- **${parts[0].trim()}**: ${parts.slice(1).join(':').trim()}`);
      } else {
        finalLines.push(`- ${line}`);
      }
      count++;
    }
  }
  return finalLines.join('\n').trim() + `\n\n> ⚠️ **Note:** Generated using offline fallback because the AI model failed to load. (Error: ${errorMsg})`;
}
