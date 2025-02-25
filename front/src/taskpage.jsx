import { useState } from "react";

const initialTasks = [
  { id: "#T119", title: "Make an automatic payment system", openedBy: "Yash Gori", daysAgo: 10, progress: 75, timeLeft: "7h 5h", status: "In Progress" },
  { id: "#T120", title: "Build secure payment gateway", openedBy: "Yash Gori", daysAgo: 10, progress: 75, timeLeft: "1d 2h", status: "In Progress" },
  { id: "#T121", title: "Optimize database queries", openedBy: "Yash Gori", daysAgo: 10, progress: 75, timeLeft: "2d 5h", status: "In Progress" },
  { id: "#T122", title: "UI/UX design improvements", openedBy: "Yash Gori", daysAgo: 10, progress: 75, timeLeft: "3d 4h", status: "In Progress" },
  { id: "#T124", title: "Implement OAuth authentication", openedBy: "Yash Gori", daysAgo: 5, progress: 40, timeLeft: "4d 12h", status: "In Progress" },
  { id: "#T125", title: "Improve query efficiency", openedBy: "Yash Gori", daysAgo: 3, progress: 20, timeLeft: "6d 8h", status: "In Progress" },
];

const priorityColors = {
  High: "bg-red-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

const calculatePriority = (timeLeft) => {
  let totalHours = 0;

  const daysMatch = timeLeft.match(/(\d+)d/);
  const hoursMatch = timeLeft.match(/(\d+)h/);

  if (daysMatch) totalHours += parseInt(daysMatch[1]) * 24;
  if (hoursMatch) totalHours += parseInt(hoursMatch[1]);

  if (totalHours < 24) return "High";
  if (totalHours <= 48) return "Medium";
  return "Low";
};

export default function TaskPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const [message, setMessage] = useState(null);

  const handleMarkAsDone = (taskId) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status: "Under Review" } : task
      )
    );

    setMessage(`Task ${taskId} has been sent for review.`);
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F8] p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Tasks</h1>

      {message && (
        <div className="mb-4 bg-green-100 text-green-700 p-3 rounded-lg shadow-md text-center transition-opacity duration-500">
          {message}
        </div>
      )}

      <div className="space-y-6">
        {tasks.map((task) => {
          const priority = calculatePriority(task.timeLeft);
          return (
            <div
              key={task.id}
              className="flex items-center bg-white p-6 rounded-lg shadow-md relative"
            >
              {/* Progress Meter */}
              <div className="w-4 h-full bg-gray-200 rounded-lg overflow-hidden mr-4">
                <div
                  className={`h-full ${priorityColors[priority]} transition-all duration-500`}
                  style={{ height: `${task.progress}%` }}
                ></div>
              </div>

              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900">{task.title}</h2>
                <p className="text-gray-600 text-sm">
                  {task.id} - Opened {task.daysAgo} days ago by {task.openedBy}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      task.status === "Under Review" ? "text-[#FE6059]" : "text-gray-700"
                    }`}
                  >
                    {task.status}
                  </span>
                </p>
              </div>

              <span
                className={`text-white text-sm font-medium px-3 py-1 rounded-full ${priorityColors[priority]}`}
              >
                {priority}
              </span>

              <div className="ml-6 text-gray-700 font-semibold text-lg">
                ⏳ {task.timeLeft}
              </div>

              {task.status === "In Progress" && (
                <button
                  onClick={() => handleMarkAsDone(task.id)}
                  className="ml-6 px-4 py-2 bg-[#FE6059] text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
                >
                  Done
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}