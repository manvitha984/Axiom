import { useState } from "react";

export default function Messages() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const contacts = [
    { id: 1, name: "John Doe", role: "Manager", unread: true },
    { id: 2, name: "Jane Smith", role: "Co-worker", unread: false },
    { id: 3, name: "Mark Wilson", role: "Senior Developer", unread: true },
  ];

  const messages = {
    1: [
      { sender: "John Doe", text: "Hello! Can we discuss the project?", time: "10:30 AM" },
      { sender: "You", text: "Sure! Let me know when you're free.", time: "10:32 AM" },
    ],
    2: [
      { sender: "Jane Smith", text: "Hey, did you check the latest design?", time: "Yesterday" },
    ],
    3: [
      { sender: "Mark Wilson", text: "We need to refactor the codebase.", time: "Monday" },
    ],
  };

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-1/3 bg-white shadow-lg p-4 border-r">
        <h2 className="text-xl font-semibold mb-4">Messages</h2>
        
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search..."
            className="w-full p-2 pl-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FE6059]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <svg className="absolute left-3 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m-1.82-2.49a7 7 0 1 0-9.9 0 7 7 0 0 0 9.9 0z"></path>
          </svg>
        </div>

        <div className="space-y-3 overflow-y-auto max-h-[75vh]">
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`p-3 rounded-lg flex justify-between items-center cursor-pointer transition ${
                  selectedChat === contact.id ? "bg-gray-200" : "hover:bg-gray-100"
                }`}
                onClick={() => setSelectedChat(contact.id)}
              >
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.role}</p>
                </div>
                {contact.unread && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">New</span>}
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No contacts found</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white shadow-lg">
        {selectedChat ? (
          <>
            <div className="p-4 border-b flex items-center justify-between bg-gray-100">
              <h2 className="text-lg font-semibold">
                {contacts.find((c) => c.id === selectedChat)?.name}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages[selectedChat]?.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${
                    msg.sender === "You" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`p-3 max-w-xs rounded-lg shadow-md ${
                      msg.sender === "You"
                        ? "bg-blue-500 text-white rounded-br-none"
                        : "bg-gray-200 text-black rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <span className="text-xs text-gray-600 block mt-1">{msg.time}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t p-4 flex bg-gray-100">
              <input
                type="text"
                placeholder="Type a message..."
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#FE6059]"
              />
              <button className="ml-2 bg-[#FE6059] text-white px-4 py-2 rounded-md hover:bg-[#e1504e] transition">
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}