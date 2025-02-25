require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable not set.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function analyzeFrustration(text) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `Analyze this email for frustration level (0 to 1):
        "${text}"
        Respond with ONLY a number between 0 and 1 in this exact format:
        {"confidence": 0.7}`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        console.log("Raw Gemini response:", response);

        // Clean up the response
        const cleanResponse = response.replace(/```json\s*|\s*```/g, '').trim();
        console.log("Cleaned response:", cleanResponse);

        const parsed = JSON.parse(cleanResponse);
        
        if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
            throw new Error(`Invalid confidence value: ${parsed.confidence}`);
        }

        return parsed;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return { confidence: 0.5, error: error.message };
    }
}

// Handle direct execution
if (require.main === module) {
    const text = process.argv[2];
    if (!text) {
        console.error("Please provide email text as an argument");
        process.exit(1);
    }
    
    analyzeFrustration(text)
        .then(result => {
            console.log(JSON.stringify(result));
            process.exit(0);
        })
        .catch(error => {
            console.error(error);
            console.log(JSON.stringify({ confidence: 0.5, error: error.message }));
            process.exit(1);
        });
}

module.exports = { analyzeFrustration };