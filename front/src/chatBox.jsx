import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (input.trim() === "") return;

    const userMessage = { sender: "user", text: input.trim() };
    setMessages([...messages, userMessage]);
    setInput(""); // Clear input immediately after sending
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/gemini-chat", { 
        message: userMessage.text 
      });
      const botMessage = { sender: "bot", text: response.data.reply };
      setMessages((prevMessages) => [...prevMessages, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = { 
        sender: "bot", 
        text: "Sorry, I'm having trouble connecting right now. Please try again." 
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  
    return (
      <div className="min-h-screen bg-[#FFF8F8] py-1 px-4">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FE6059] to-rose-500 sm:text-3xl">
            AI Chat Assistant
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Get instant answers to your questions
          </p>
        </div>
  
        {/* Chat Container */}
        <div className="max-w-3xl mx-auto h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#FE6059]/10">
          {/* Chat Header */}
          <div className="p-4 bg-gradient-to-r from-[#FE6059] to-rose-500 text-white">
            <h2 className="text-xl font-bold flex items-center justify-center">
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              ChatBot
            </h2>
          </div>
  
          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">Start a conversation!</p>
                <p className="text-sm mt-2">Ask me anything, I'm here to help.</p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-4 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FE6059] to-rose-500 flex items-center justify-center text-white mr-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                )}
                <div 
                  className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                    msg.sender === "user" 
                      ? "bg-[#FE6059] text-white rounded-br-none"
                      : "bg-white text-gray-800 shadow-md rounded-bl-none"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.sender === "user" && (
                  <div className="w-8 h-8 rounded-full bg-[#FE6059] flex items-center justify-center text-white ml-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#FE6059] to-rose-500 flex items-center justify-center text-white mr-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                </div>
                <div className="bg-white text-gray-800 px-4 py-2 rounded-2xl rounded-bl-none shadow-md">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
  
          {/* Input Area */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#FE6059] transition-colors"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !isLoading && input.trim() && sendMessage()}
              />
              <button
                className={`px-6 py-3 bg-[#FE6059] text-white rounded-xl transition-all duration-200 flex items-center justify-center min-w-[100px] ${
                  !input.trim() || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#FE6059]/90 hover:-translate-y-0.5 hover:shadow-lg'
                }`}
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Send"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default ChatBox;