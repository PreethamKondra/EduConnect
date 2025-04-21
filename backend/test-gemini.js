require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  try {
    console.log("Testing Gemini API with updated configuration...");
    
    // Initialize the API with the correct API key
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    // Try with the model name without the "models/" prefix and explicitly setting the apiVersion
    console.log("Attempting generation with explicit apiVersion...");
    
    // Try different model options
    const modelOptions = [
      { model: "gemini-pro" },
      { model: "gemini-1.5-flash" },
      { model: "gemini-1.5-pro" },
      { model: "gemini-1.0-pro" }
    ];
    
    for (const option of modelOptions) {
      try {
        console.log(`Trying model: ${option.model}`);
        const model = genAI.getGenerativeModel(option);
        const result = await model.generateContent("Hello, what's 2+2?");
        console.log(`SUCCESS with ${option.model}! Response:`, result.response.text());
        break; // Exit the loop if successful
      } catch (error) {
        console.error(`Failed with ${option.model}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testGemini();