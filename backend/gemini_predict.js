require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable not set.");
    process.exit(1);
}

const summaryApiKey = process.env.GEMINI_API_KEY;
if (!summaryApiKey) {
    console.warn("GEMINI_SUMMARY_API_KEY environment variable not set. Summarization will not work.");
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

async function generateSummary(text) {
    if (!summaryApiKey) {
        return { summary: "Error: GEMINI_SUMMARY_API_KEY not set" };
    }

    try {
        const genAISummary = new GoogleGenerativeAI(summaryApiKey);
        const model = genAISummary.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Generate a concise summary of the following text:
        "${text}"`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();
        console.log("Raw Gemini summary response:", response);

        // Clean up the response
        return { summary: response.trim() };

    } catch (error) {
        console.error("Gemini Summary API Error:", error);
        return { summary: "Error generating summary", error: error.message };
    }
}

// Handle direct execution
if (require.main === module) {
    const text = process.argv[2];
    const command = process.argv[3]; // New command argument

    if (!text) {
        console.error("Please provide text as an argument");
        process.exit(1);
    }

    if (command === "summarize") {
        generateSummary(text)
            .then(result => {
                process.stdout.write(JSON.stringify(result));
                process.exit(0);
            })
            .catch(error => {
                process.stdout.write(JSON.stringify({ 
                    summary: "Error generating summary", 
                    error: error.message 
                }));
                process.exit(1);
            });
    } else {
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
}

module.exports = { analyzeFrustration, generateSummary };