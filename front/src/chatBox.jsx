import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Send, User, Bot, Clock, MessageCircle } from "lucide-react";

const ChatBox = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (input.trim() === "") return;

    const userMessage = { sender: "user", text: input.trim() };
    setMessages([...messages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/api/gemini-chat", {
        message: userMessage.text
      });
      const botMessage = { sender: "bot", text: response.data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        sender: "bot",
        text: "Sorry, I'm having trouble connecting right now. Please try again."
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F8] to-[#FFF0F0] py-8 px-4 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-3 rounded-full shadow-lg">
            <MessageCircle size={32} className="text-[#FE6059]" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-800 sm:text-4xl mb-2">
          AI Chat Assistant
        </h1>
        <div className="h-1 w-16 bg-gradient-to-r from-[#FE6059] to-rose-500 mx-auto rounded-full mb-4"></div>
        <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
          Ask me anything related to the product
        </p>
      </div>

      {/* Chat Container */}
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden border border-gray-100">
        {/* Chat Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#FE6059] to-rose-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bot size={22} className="text-white" />
              <h2 className="ml-2 text-lg font-bold text-white">Axiom Assistant</h2>
            </div>
            <div className="bg-white/20 py-1 px-3 rounded-full">
              <span className="text-xs font-medium text-white">AI Powered</span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 min-h-[500px] max-h-[500px]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot size={32} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                How can I help you today?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                {[
                  "What are the services offered by your website?",
                  "How can I return my purchase?",
                  "Do you offer free shipping?",
        "Can you tell me more about your product?"
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInput(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-4 py-2 text-sm text-left text-gray-700 bg-white rounded-lg border border-gray-200 hover:border-[#FE6059]/30 hover:bg-gray-50 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`mb-6 flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "bot" && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FE6059] to-rose-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
                  <Bot size={18} />
                </div>
              )}

              <div
                className={`px-4 py-3 rounded-2xl max-w-[75%] shadow-sm ${
                  msg.sender === "user"
                    ? "bg-[#FE6059] text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <div
                  className={`text-xs mt-1 flex items-center ${
                    msg.sender === "user"
                      ? "text-white/70 justify-end"
                      : "text-gray-400"
                  }`}
                >
                  <Clock size={12} className="mr-1" />
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {msg.sender === "user" && (
                <div className="w-9 h-9 rounded-full bg-[#FE6059] flex items-center justify-center text-white ml-3 flex-shrink-0">
                  <User size={18} />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start mb-6">
              <div className="w-9 h-9 rounded-full bg-gradient-to-r from-[#FE6059] to-rose-500 flex items-center justify-center text-white mr-3 flex-shrink-0">
                <Bot size={18} />
              </div>
              <div className="px-4 py-4 rounded-2xl rounded-bl-none bg-white text-gray-500 shadow-sm border border-gray-100">
                <div className="flex space-x-2 items-center">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"
                    style={{ animationDelay: "0.3s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"
                    style={{ animationDelay: "0.6s" }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (input.trim() && !isLoading) sendMessage();
            }}
            className="flex items-center space-x-3"
          >
            <input
              ref={inputRef}
              type="text"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-[#FE6059] transition-colors placeholder-gray-400"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              className={`p-3 rounded-xl transition-all duration-200 ${
                !input.trim() || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#FE6059] text-white hover:bg-[#FE6059]/90 hover:shadow-md'
              }`}
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Send size={20} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatBox;