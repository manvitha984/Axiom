const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-8b",
  systemInstruction: "You are a dedicated customer care chatbot for organization/business. Your expertise is limited to providing information about our products and handling customer support inquiries. If a user asks you about anything other than our product or customer care, please reply: 'I'm sorry, I can only help with product and customer care queries. Could you please ask something related to that?' Always ensure your responses are friendly, concise, and directly address the user's query about our product or customer care.",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function getChatbotResponse(userMessage) {
  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          { text: userMessage },
        ],
      },
    ],
  });

  const result = await chatSession.sendMessage(userMessage);
  return result.response.text();
}

if (require.main === module) {
  const userMessage = process.argv[2];
  getChatbotResponse(userMessage).then(response => {
    console.log(response);
  }).catch(error => {
    console.error("Error:", error);
  });
}

module.exports = { getChatbotResponse };