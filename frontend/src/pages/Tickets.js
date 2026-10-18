import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Tickets.css";

const Tickets = ({ env }) => {
  const [tasks, setTasks] = useState([]);
  const apiUrl =
    env === "dev" ? "/api/dev/tickets" : "/api/prod/tickets";
  useEffect(() => {
    axios
      .get(apiUrl)
      .then((response) => setTasks(response.data.tasks))
      .catch((error) => console.error("Error fetching data:", error));
  }, [env]);

  return (
    <div className="tickets-container">
      <h1>{env.toUpperCase()} Tickets</h1>
      <div className="task-container">
        <div className="column completed">
          <h2>Completed Tickets</h2>
          <ul>
            {tasks.filter(task => task.completed).map((task, index) => (
              <li key={index} className="task-item">
                {task.title} ({task.description})
                <br />
                <span className="created-at">Created At: {task.created_at}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="column pending">
          <h2>Pending Tickets</h2>
          <ul>
            {tasks.filter(task => !task.completed).map((task, index) => (
              <li key={index} className="task-item">
                {task.title} ({task.description})
                <br />
                <span className="created-at">Created At: {task.created_at}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Tickets;
