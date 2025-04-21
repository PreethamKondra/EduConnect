const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to list available models
async function listAvailableModels() {
  try {
    const result = await genAI.listModels();
    console.log("Available models:", result);
    return result;
  } catch (error) {
    console.error("Error listing models:", error);
    return null;
  }
}

// Converts a buffer to string
function bufferToString(buffer) {
  return buffer.toString("utf-8");
}

// Function to extract JSON from markdown code blocks
function extractJsonFromMarkdown(text) {
  // Look for JSON content between markdown code block markers
  const jsonRegex = /```(?:json)?\s*(\[[\s\S]*?\])\s*```/;
  const match = text.match(jsonRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // If not found with the regex, try a more general approach
  // for cases where the markdown formatting might be different
  const startJson = text.indexOf('[');
  const endJson = text.lastIndexOf(']');
  
  if (startJson !== -1 && endJson !== -1 && endJson > startJson) {
    return text.substring(startJson, endJson + 1).trim();
  }
  
  return text; // Return original text if no JSON structure found
}

exports.generateQuizFromReadableFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const text = bufferToString(req.file.buffer); // read file content as string

    // Use gemini-1.5-flash as it's proven to work in testing
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 0.95,
        maxOutputTokens: 8192,
      }
    });

    const prompt = `Generate 10 multiple choice questions (MCQs) with 4 options each and indicate the correct answer from the following content.
    Your response must be ONLY a JSON array in this exact format with no markdown formatting:
    [
      {
        "question": "Question text here",
        "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
        "correctAnswer": "Correct choice here"
      }
    ]
    
    Content: ${text.substring(0, 8000)}`; // Limit text to avoid token limits

    const result = await model.generateContent(prompt);
    const response = result.response;
    const quizText = response.text();
    
    // Try to parse the response as JSON
    try {
      console.log("Raw response:", quizText.substring(0, 500)); // Log the beginning of the response for debugging
      
      // First try direct parsing
      let questions;
      try {
        questions = JSON.parse(quizText);
      } catch (directParseError) {
        // If direct parsing fails, try to extract JSON from markdown
        const extractedJson = extractJsonFromMarkdown(quizText);
        console.log("Extracted JSON:", extractedJson.substring(0, 500)); // Log the extracted JSON
        questions = JSON.parse(extractedJson);
      }
      
      return res.json({ success: true, questions: questions });
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Fall back to sending raw text
      return res.json({ success: true, rawQuiz: quizText, message: "Quiz generated but not in expected format" });
    }
  } catch (error) {
    console.error("Quiz generation error:", error);
    
    // Fallback strategy using alternative models if the primary one fails
    try {
      console.log("Primary model failed, trying with alternative model...");
      const fallbackModels = ["gemini-1.5-pro", "gemini-1.0-pro"];
      
      for (const modelName of fallbackModels) {
        try {
          console.log(`Attempting with ${modelName}...`);
          const altModel = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
              temperature: 0.7,
              topK: 1,
              topP: 0.95,
              maxOutputTokens: 8192,
            }
          });
          
          const text = bufferToString(req.file.buffer);
          const prompt = `Generate 5 multiple choice questions (MCQs) with 4 options each based on the given content.
          Return ONLY a raw JSON array with no markdown formatting or explanation, using this exact structure:
          [
            {
              "question": "Question text here",
              "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
              "correctAnswer": "Correct choice here"
            }
          ]
          
          Content: ${text.substring(0, 8000)}`;
          
          const result = await altModel.generateContent(prompt);
          const quizText = result.response.text();
          
          try {
            // First try direct parsing
            let questions;
            try {
              questions = JSON.parse(quizText);
            } catch (directParseError) {
              // If direct parsing fails, try to extract JSON from markdown
              const extractedJson = extractJsonFromMarkdown(quizText);
              questions = JSON.parse(extractedJson);
            }
            
            return res.json({ success: true, questions: questions });
          } catch (parseError) {
            return res.json({ success: true, rawQuiz: quizText, message: `Quiz generated with ${modelName} but not in expected format` });
          }
        } catch (modelError) {
          console.error(`Failed with ${modelName}:`, modelError.message);
          continue; // Try next model
        }
      }
      
      // If we get here, all models failed
      throw new Error("All models failed to generate quiz");
    } catch (fallbackError) {
      return res.status(500).json({ 
        success: false, 
        message: "Quiz generation failed with all models", 
        error: error.message
      });
    }
  }
};