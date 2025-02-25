import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { addHours, isBefore, startOfDay } from "date-fns";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [note, setNote] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Load saved events from localStorage
  useEffect(() => {
    const savedEvents = JSON.parse(localStorage.getItem("events")) || [];
    setEvents(savedEvents);
  }, []);

  // Save events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
  }, [events]);

  // Function to handle date selection
  const handleSelectDate = ({ start }) => {
    if (isBefore(start, startOfDay(new Date()))) return; // Prevent past dates
    setSelectedDate(start);
    setShowModal(true);
  };

  const handleAddNote = () => {
    if (note.trim() !== "" && selectedDate) {
      const newEvent = {
        title: note,
        start: selectedDate,
        end: addHours(selectedDate, 1),
      };
      setEvents([...events, newEvent]);
      setNote("");
      setShowModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F8] p-10 flex flex-col items-center">
      <h1 className="text-5xl font-extrabold text-[#1E293B] mb-6 animate-fade-in">
        📅 My Calendar
      </h1>
      <p className="text-lg text-[#475569] mb-8 animate-fade-in">
        Plan your important events effortlessly!
      </p>
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-6xl animate-fade-in-up">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          selectable
          defaultView="month"
          views={["month", "week", "day"]}
          onSelectSlot={handleSelectDate}
          eventPropGetter={() => ({
            style: {
              backgroundColor: "#FE6059", 
              border: "none",
              borderRadius: "8px",
              color: "white",
              padding: "8px",
              fontWeight: "600",
              whiteSpace: "pre-wrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            },
          })}
        />
      </div>

      {showModal && selectedDate && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-[#1E293B] mb-6 text-center">
              Add Note for {format(selectedDate, "MMMM d, yyyy")}
            </h2>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note here..."
              className="w-full p-4 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FE6059] focus:border-transparent mb-6"
              rows={6}
              style={{ resize: "vertical", maxHeight: "200px", minHeight: "100px" }}
            />
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowModal(false)}
                className="px-6 py-2 bg-[#E2E8F0] text-[#475569] rounded-lg hover:bg-[#CBD5E1] transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                className="px-6 py-2 bg-[#FE6059] text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}