import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

export default function ProjectsPage() {
  const [createdProjects, setCreatedProjects] = useState([]);
  const [assignedProjects, setAssignedProjects] = useState([]);
  const [newProject, setNewProject] = useState({ name: "", description: "" });
  const [selectedProject, setSelectedProject] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMember, setNewMember] = useState({ email: "", task: "", status: "In Progress" });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setLoggedInUserId(decodedToken.userId);
      } catch (error) {
        console.error("Invalid token specified:", error);
      }
    } else {
      console.error("No token found");
    }
  }, []);

  // Fetch notifications, created projects, and assigned projects
  useEffect(() => {
    if (loggedInUserId) {
      const fetchData = async () => {
        try {
          const notificationsResponse = await axios.get(`http://localhost:5000/notifications/${loggedInUserId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          setNotifications(notificationsResponse.data);

          const createdProjectsResponse = await axios.get(`http://localhost:5000/projects/created/${loggedInUserId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          setCreatedProjects(createdProjectsResponse.data);

          const assignedProjectsResponse = await axios.get(`http://localhost:5000/projects/assigned/${loggedInUserId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          setAssignedProjects(assignedProjectsResponse.data);
        } catch (error) {
          console.error("Error fetching data:", error);
        }
      };
      fetchData();
    }
  }, [loggedInUserId]);

  // Handle creating a new project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        "http://localhost:5000/projects",
        { ...newProject, userId: loggedInUserId },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setCreatedProjects([...createdProjects, response.data]);
      setNewProject({ name: "", description: "" });
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  // Handle selecting a project to view details
  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    try {
      const response = await axios.get(`http://localhost:5000/projects/${project._id}/team`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setTeamMembers(response.data.team);
    } catch (error) {
      console.error("Error fetching team members:", error);
    }
  };

  // Handle adding a new team member to the selected project
  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        `http://localhost:5000/projects/${selectedProject._id}/team`,
        newMember,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setTeamMembers(response.data.team);
      setNewMember({ email: "", task: "", status: "In Progress" });
    } catch (error) {
      console.error("Error adding team member:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF8F8] flex flex-col items-center p-8">
      {/* Notifications Section */}
      <div className="mb-4">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="bg-[#FE6059] text-white px-4 py-2 rounded-md"
        >
          {showNotifications ? "Hide Notifications" : "Show Notifications"}
        </button>
        {showNotifications && (
          <div className="bg-white p-4 rounded-md shadow-md mt-2">
            <h3 className="text-lg font-semibold mb-2">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-gray-500">No notifications</p>
            ) : (
              <ul>
                {notifications.map((notification, index) => (
                  <li key={index} className="text-gray-700 mb-1">
                    {notification.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Create Project Section */}
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-4xl w-full mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Create a New Project
        </h2>
        <form onSubmit={handleCreateProject} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name
            </label>
            <input
              type="text"
              placeholder="Enter project name"
              value={newProject.name}
              onChange={(e) =>
                setNewProject({ ...newProject, name: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FE6059] focus:outline-none transition duration-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Description
            </label>
            <textarea
              placeholder="Enter project description"
              value={newProject.description}
              onChange={(e) =>
                setNewProject({ ...newProject, description: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FE6059] focus:outline-none transition duration-200"
              rows="4"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#FE6059] text-white font-semibold py-3 rounded-xl hover:bg-[#E55650] focus:ring-2 focus:ring-[#FE6059] focus:outline-none transition duration-200"
          >
            Create Project
          </button>
        </form>
      </div>

      {/* Created Projects Section */}
      <div className="max-w-4xl w-full mb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Created Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {createdProjects.length === 0 ? (
            <p className="text-gray-500 text-center col-span-full">
              No projects created yet.
            </p>
          ) : (
            createdProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => handleSelectProject(project)}
                className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              >
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  {project.name}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Team Members: {project.team.length}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Assigned Projects Section */}
      <div className="max-w-4xl w-full mb-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Assigned Projects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignedProjects.length === 0 ? (
            <p className="text-gray-500 text-center col-span-full">
              No projects assigned yet.
            </p>
          ) : (
            assignedProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => handleSelectProject(project)}
                className="p-6 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
              >
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  {project.name}
                </h4>
                <p className="text-sm text-gray-500 line-clamp-2">
                  {project.description}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Team Members: {project.team.length}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg max-w-2xl w-full">
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedProject.name}
              </h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-gray-500 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-700 mb-4">{selectedProject.description}</p>

            <div className="max-h-[50vh] overflow-y-auto mb-4 p-2 bg-[#FFF8F8] rounded-xl">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Team Members
              </h3>
              <ul className="space-y-3">
                {teamMembers.map((member, index) => (
                  <li
                    key={index}
                    className="bg-white p-4 rounded-xl shadow-sm transition-all duration-300"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-gray-800 font-medium">{member.email}</p>
                        <p className="text-sm text-gray-500">Task: {member.task}</p>
                      </div>
                      <span
                        className={`px-3 py-1 text-sm font-semibold rounded-full ${
                          member.status === "In Progress"
                            ? "bg-yellow-400 text-yellow-800"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {member.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {selectedProject.createdBy === loggedInUserId && (
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Member Email
                  </label>
                  <input
                    type="email"
                    placeholder="Enter team member's email"
                    value={newMember.email}
                    onChange={(e) =>
                      setNewMember({ ...newMember, email: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FE6059] focus:outline-none transition duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Task
                  </label>
                  <input
                    type="text"
                    placeholder="Enter assigned task"
                    value={newMember.task}
                    onChange={(e) =>
                      setNewMember({ ...newMember, task: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#FE6059] focus:outline-none transition duration-200"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[#FE6059] text-white font-semibold py-2 rounded-xl hover:bg-[#E55650] focus:ring-2 focus:ring-[#FE6059] focus:outline-none transition duration-200"
                >
                  Add Team Member
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}