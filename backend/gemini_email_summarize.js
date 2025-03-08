const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-8b",
});

const generationConfig = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
};

async function generateEmailSummary(text) {
  try {
    const prompt = `You will receive user complaints via emails, video transcriptions, or text. Extract and return the summary stating the main reasons for dissatisfaction. Keep it direct, without additional explanations or formatting beyond bolding the negatively impacted aspects.\nExample Input:\n\"I have been trying to reset my password for the past hour, but the link keeps expiring. Your support team is not responding, and this is really frustrating!\"\n\nExample Output:\nPassword reset issues and unresponsive support team caused frustration.\n\nEmails:\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return { summary: response.text() };
  } catch (error) {
    console.error("Error generating email summary:", error);
    return { error: error.message };
  }
}

async function main() {
  const inputText = process.argv[2] ? JSON.parse(process.argv[2]) : "";
  generateEmailSummary(inputText)
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => console.error(JSON.stringify({ error: error.message })));
}

main();