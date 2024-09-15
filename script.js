import { db } from "./firebaseConfig.js";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  getDocs,
  query as firestoreQuery, // Use an alias for the query function
  query, // Import query function
  where,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

async function loadTasksFromFirestore() {
  try {
    // Clear existing tasks and headers from the DOM
    document
      .querySelectorAll(".task, .date-header, .task-count")
      .forEach((element) => element.remove());

    const querySnapshot = await getDocs(collection(db, "tasksDetails"));
    const tasksByDate = {}; // Object to group tasks by dueDate
    const existingTasks = {}; // Object to track existing tasks by a unique identifier

    // querySnapshot.forEach((doc) => {
    //   const taskData = doc.data();
    //   console.log("Fetched task data:", taskData); // Log the task data to the console

    //   const dueDate = taskData.dueDate;
    //   const taskIdentifier = `${taskData.clientName}-${taskData.orderNumber}-${taskData.product}`;

    //   if (!tasksByDate[dueDate]) {
    //     tasksByDate[dueDate] = [];
    //   }

    //   // Only add the task if its status is not "deleted" and it's not a duplicate
    //   if (taskData.status !== "deleted" && !existingTasks[taskIdentifier]) {
    //     tasksByDate[dueDate].push({ ...taskData, id: doc.id });
    //     existingTasks[taskIdentifier] = true; // Mark this task as existing
    //   }
    // });

    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      // console.log("Fetched task data:", taskData); // Log the task data to the console

      const dueDate = taskData.dueDate;
      const taskIdentifier = `${taskData.clientName}-${taskData.orderNumber}-${taskData.product}`;

      if (!tasksByDate[dueDate]) {
        tasksByDate[dueDate] = [];
      }

      // Only add the task if its status is not "deleted" and it's not a duplicate
      if (taskData.status !== "deleted" && !existingTasks[taskIdentifier]) {
        // Add logic to ensure fields are present and valid
        taskData.moreThanOneTask = taskData.moreThanOneTask || "no";
        taskData.numberOfTasksForThisOrder =
          taskData.numberOfTasksForThisOrder || 1;
        taskData.TaskCreationNumber = taskData.TaskCreationNumber || 1;

        tasksByDate[dueDate].push({ ...taskData, id: doc.id });
        existingTasks[taskIdentifier] = true; // Mark this task as existing
      }
    });

    // Sort the dates to ensure tasks are displayed in chronological order (oldest first)
    const sortedDates = Object.keys(tasksByDate).sort(
      (a, b) => new Date(a) - new Date(b)
    );

    // Get today's and tomorrow's dates in the correct format (YYYY-MM-DD)
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    // Define the columns where tasks will be placed
    const columns = {
      printing: document.getElementById("printing"),
      finishing: document.getElementById("finishing"),
      update: document.getElementById("update"),
    };

    sortedDates.forEach((date) => {
      let taskCount = tasksByDate[date].length;
      let dateHeader = "";
      if (date === today) {
        dateHeader = `<h3 class="date-header" style="color: purple;">היום (${date})</h3>`;
      } else if (date === tomorrow) {
        dateHeader = `<h3 class="date-header" style="color: purple;">מחר (${date})</h3>`;
      } else {
        dateHeader = `<h3 class="date-header" style="color: purple;">${date}</h3>`;
      }

      tasksByDate[date].reverse(); // Reverse the order so the oldest task is on top

      // Insert the date header and task count
      tasksByDate[date].forEach((taskData, index) => {
        const taskColumn = columns[taskData.status.toLowerCase()];

        if (taskColumn) {
          if (index === 0) {
            taskColumn.insertAdjacentHTML("beforeend", dateHeader);
            taskColumn.insertAdjacentHTML(
              "beforeend",
              `<p class="task-count" style="color: purple;">${taskCount} משימות</p>`
            );
          }

          // Now create the task under the respective date header
          createTask(
            taskData.clientName,
            taskData.orderNumber,
            taskData.product,
            taskData.status,
            taskData.dueDate,
            taskData.files,
            taskData.id,
            taskData.tracking || {},
            taskData.moreThanOneTask || "no",
            taskData.numberOfTasksForThisOrder || 0,
            taskData.TaskCreationNumber || 0,
            taskData.customerEmail || "none", // Use "none" as the default for customerEmail
            taskData.customerPhone || "none", // Use "none" as the default for customerPhone
            taskData.location || "", // Add location here, with an empty string as the default
            taskData.sentReadyMessage || "no", // Add sentReadyMessage here, with "no" as the default
            taskData.comments || "" // Pass comments here, with an empty string as the default
          );

          // No need to create and append trackingDiv here again
        }
      });
    });
  } catch (error) {
    console.error("Error fetching tasks from Firestore:", error);
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  loadTasksFromFirestore(); // Load tasks when the page loads
  removeDuplicatesFromTasks();

  setInterval(() => {
    console.log("Syncing data from Firestore...");
    loadTasksFromFirestore();
    removeDuplicatesFromTasks();
    sortTasksByDate();
    sortTasksByStatus();
  }, 600000); // 300 seconds = 60000 milliseconds
});

// async function updateTaskStatusInFirestore(taskId, newStatus) {
//   try {
//     if (!taskId) {
//       throw new Error("Task ID is undefined or invalid");
//     }

//     const taskRef = doc(db, "tasksDetails", taskId);

//     // Create the tracking update object based on the new status
//     const trackingUpdate = {};
//     trackingUpdate[newStatus] = "some specific status"; // Replace with the actual status you want to save

//     await updateDoc(taskRef, {
//       status: newStatus,
//       [`tracking.${newStatus}`]: trackingUpdate[newStatus], // Update the tracking map in Firestore
//     });

//     console.log("Task status successfully updated in Firestore to:", newStatus);
//   } catch (e) {
//     console.error("Error updating task status:", e);
//   }
// }
async function updateTaskStatusInFirestore(taskId, newStatus) {
  try {
    if (!taskId) {
      throw new Error("Task ID is undefined or invalid");
    }

    const taskRef = doc(db, "tasksDetails", taskId);

    // Create the tracking update object based on the new status
    const trackingUpdate = {};
    trackingUpdate[newStatus] = "some specific status"; // Replace with the actual status you want to save

    await updateDoc(taskRef, {
      status: newStatus,
      [`tracking.${newStatus}`]: trackingUpdate[newStatus], // Update the tracking map in Firestore
    });

    console.log("Task status successfully updated in Firestore to:", newStatus);

    // If the new status is "update," check if the order is ready and send notifications
    if (newStatus === "update") {
      await readyWork(taskId);
    }
  } catch (e) {
    console.error("Error updating task status:", e);
  }
}

let draggedTask = null;

// document.addEventListener("DOMContentLoaded", (event) => {
//   document.querySelectorAll(".task").forEach((task) => {
//     addDragAndDropListeners(task);
//     addDeleteListener(task);
//     addCompleteListener(task);
//   });

//   document.querySelectorAll(".column").forEach((column) => {
//     column.addEventListener("dragover", (event) => {
//       event.preventDefault();
//     });

//     column.addEventListener("drop", (event) => {
//       event.preventDefault();
//       if (draggedTask) {
//         // Remove the task from the original column
//         draggedTask.remove();

//         // Append the task to the new column
//         column.appendChild(draggedTask);

//         // Update the task's status based on the column it was dropped into
//         const status = column.id;
//         updateTaskStatus(draggedTask, status);

//         draggedTask = null;
//       }
//     });
//   });

//   function updateTaskStatus(task, newStatus) {
//     const taskId = task.dataset.taskId; // Assuming the task element has a data-task-id attribute
//     const statusElement = task.querySelector("#status"); // Select by id
//     statusElement.innerHTML = `<strong>סטטוס:</strong> ${newStatus}`;

//     // Update status in Firestore
//     updateTaskStatusInFirestore(taskId, newStatus);
//   }

//   // Example tasks
// });

// entrence rulls

//entrance rules begin 🚪🚪🚪
// document.addEventListener("DOMContentLoaded", (event) => {
//   document.querySelectorAll(".task").forEach((task) => {
//     addDragAndDropListeners(task);
//     addDeleteListener(task);
//     addCompleteListener(task);
//   });

//   document.querySelectorAll(".column").forEach((column) => {
//     column.addEventListener("dragover", (event) => {
//       event.preventDefault();
//     });

//     column.addEventListener("drop", (event) => {
//       event.preventDefault();
//       if (draggedTask) {
//         // Remove the task from the original column
//         draggedTask.remove();

//         // Append the task to the new column
//         column.appendChild(draggedTask);

//         // Update the task's status based on the column it was dropped into
//         const status = column.id;

//         if (status === "finishing") {
//           // Open the finishing modal if the task is dropped into the finishing column
//           const taskId = draggedTask.dataset.taskId;
//           openFinishingModal(taskId);
//         } else if (status === "update") {
//           // Open the update modal if the task is dropped into the updates column
//           const taskId = draggedTask.dataset.taskId;
//           openUpdateModal(taskId);
//         } else {
//           updateTaskStatus(draggedTask, status);
//         }

//         draggedTask = null;
//       }
//     });
//   });

//   function updateTaskStatus(task, newStatus) {
//     const taskId = task.dataset.taskId; // Assuming the task element has a data-task-id attribute
//     const statusElement = task.querySelector("#status"); // Select by id
//     statusElement.innerHTML = `<strong>סטטוס:</strong> ${newStatus}`;

//     // Update status in Firestore
//     updateTaskStatusInFirestore(taskId, newStatus);
//   }

//   function openFinishingModal(taskId) {
//     const modal = document.getElementById("finishingModal");
//     const operatorButtonsContainer = modal.querySelector(".operator-buttons");
//     operatorButtonsContainer.innerHTML = ""; // Clear existing buttons

//     // Populate buttons with the operators from the statusFields
//     statusFields.finishing.operator.forEach((operator) => {
//       const button = document.createElement("button");
//       button.textContent = operator;
//       button.className = "operator-button";

//       // Add click event listener to each button
//       button.addEventListener("click", () => {
//         updateOperatorAndMoveTask(taskId, operator);
//         modal.style.display = "none"; // Close the modal after selection
//       });

//       operatorButtonsContainer.appendChild(button);
//     });

//     modal.style.display = "block";
//   }

//   function updateOperatorAndMoveTask(taskId, operator) {
//     // Update the operator in Firestore
//     updateDoc(doc(db, "tasksDetails", taskId), {
//       "tracking.operator": operator, // Store the selected operator
//       status: "finishing", // Update the status to finishing
//     })
//       .then(() => {
//         console.log(
//           `Task ${taskId} updated with operator ${operator} and moved to finishing.`
//         );
//         // Optionally, you can add more logic here if needed after the update
//       })
//       .catch((error) => {
//         console.error("Error updating task:", error);
//       });
//   }
// });

// document.addEventListener("DOMContentLoaded", (event) => {
//   document.querySelectorAll(".task").forEach((task) => {
//     addDragAndDropListeners(task);
//     addDeleteListener(task);
//     addCompleteListener(task);
//   });

//   document.querySelectorAll(".column").forEach((column) => {
//     column.addEventListener("dragover", (event) => {
//       event.preventDefault();
//     });

//     column.addEventListener("drop", (event) => {
//       event.preventDefault();
//       if (draggedTask) {
//         const status = column.id;

//         if (status === "finishing") {
//           const taskId = draggedTask.dataset.taskId;
//           openFinishingModal(taskId);
//         } else if (status === "update") {
//           const taskId = draggedTask.dataset.taskId;
//           openUpdateModal(taskId);
//         } else {
//           updateTaskStatus(draggedTask, status);
//         }

//         draggedTask = null;
//       }
//     });
//   });

//   function updateTaskStatus(task, newStatus) {
//     const taskId = task.dataset.taskId;
//     const statusElement = task.querySelector("#status");
//     statusElement.innerHTML = `<strong>סטטוס:</strong> ${newStatus}`;

//     // Update status in Firestore
//     updateTaskStatusInFirestore(taskId, newStatus);
//   }
// });

//entrance rules end 🚪🚪🚪

document.addEventListener("DOMContentLoaded", (event) => {
  document.querySelectorAll(".task").forEach((task) => {
    addDragAndDropListeners(task);
    addDeleteListener(task);
    addCompleteListener(task);
  });

  document.querySelectorAll(".column").forEach((column) => {
    column.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    column.addEventListener("drop", (event) => {
      event.preventDefault();
      if (draggedTask) {
        const status = column.id;
        const taskId = draggedTask.dataset.taskId;

        if (status === "finishing") {
          openFinishingModal(taskId, draggedTask);
        } else if (status === "update") {
          openUpdateModal(taskId, draggedTask);
        } else {
          updateTaskStatus(draggedTask, status);
          column.appendChild(draggedTask); // Move the task to the new column
        }

        draggedTask = null;
      }
    });
  });

  function updateTaskStatus(task, newStatus) {
    const taskId = task.dataset.taskId;
    const statusElement = task.querySelector("#status");
    statusElement.innerHTML = `<strong>סטטוס:</strong> ${newStatus}`;

    // Update status in Firestore
    updateTaskStatusInFirestore(taskId, newStatus);
  }
});

function updateOperatorAndMoveTask(taskId, operator, draggedTask) {
  // Update the operator in Firestore
  updateDoc(doc(db, "tasksDetails", taskId), {
    "tracking.operator": operator, // Store the selected operator
    status: "finishing", // Update the status to finishing
  })
    .then(() => {
      console.log(
        `Task ${taskId} updated with operator ${operator} and moved to finishing.`
      );

      // Move the task to the finishing column
      const finishingColumn = document.getElementById("finishing");

      if (finishingColumn && draggedTask) {
        finishingColumn.appendChild(draggedTask); // Move the task to the finishing column
      }

      // Close the modal after selection
      document.getElementById("finishingModal").style.display = "none";
    })
    .catch((error) => {
      console.error("Error updating task:", error);
    });
}

function addDragAndDropListeners(task) {
  task.addEventListener("dragstart", () => {
    draggedTask = task;
    task.classList.add("dragging");
  });

  task.addEventListener("dragend", () => {
    task.classList.remove("dragging");
    draggedTask = null;
  });
}
function addDeleteListener(task) {
  const deleteButton = task.querySelector(".delete-task");
  deleteButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this task?")) {
      const taskId = task.dataset.taskId;

      // Update the status to "deleted" in Firestore
      updateTaskStatusInFirestore(taskId, "deleted");

      // Remove the task from the UI
      task.remove();
    }
  });
}

function createCompletedTask(
  clientName,
  orderNumber,
  product,
  dueDate,
  fileUrls,
  taskId // Add taskId as a parameter
) {
  const task = document.createElement("div");
  task.className = "task completed";
  task.draggable = false; // Completed tasks are not draggable

  // Set the task ID as a data attribute
  task.dataset.taskId = taskId;

  // Build the HTML content for the task, including file URLs if any
  let fileLinks = "";
  if (fileUrls.length > 0) {
    fileLinks = `<strong>קבצים:</strong><ul>`;
    fileUrls.forEach((url) => {
      const fileName = url.split("/").pop().split("?")[0];
      fileLinks += `<li><a href="${url}" target="_blank">${fileName}</a></li>`;
    });
    fileLinks += `</ul>`;
  }

  task.innerHTML = `
          <p><strong>שם לקוח:</strong> ${clientName}</p>
          <p><strong>מספר הזמנה:</strong> ${orderNumber}</p>
          <p><strong>מוצר:</strong> ${product}</p>
          <p><strong>סטטוס:</strong> Completed</p>
          <p><strong>תאריך יעד:</strong> ${dueDate}</p>
          ${fileLinks}
          <button class="restore-task">🔃</button>
      `;

  document.getElementById("completed-tasks").appendChild(task);

  // Add restore button functionality
  addRestoreListener(task);
}

function addCompleteListener(task) {
  const completeButton = task.querySelector(".complete-task");
  completeButton.addEventListener("click", () => {
    const taskId = task.dataset.taskId; // Get the task ID
    console.log("Task ID:", taskId); // Log the task ID to the console

    const clientName = task
      .querySelector("p:nth-child(2)")
      .innerText.replace("שם לקוח: ", "");
    const orderNumber = task
      .querySelector("p:nth-child(3)")
      .innerText.replace("מספר הזמנה: ", "");
    const product = task
      .querySelector("p:nth-child(4)")
      .innerText.replace("מוצר: ", "");
    const dueDate = task
      .querySelector("p:nth-child(5)")
      .innerText.replace("תאריך יעד: ", "");

    // Extract file URLs if any
    const fileUrls = [];
    const fileLinks = task.querySelectorAll("ul li a");
    fileLinks.forEach((link) => {
      fileUrls.push(link.href);
    });

    // Update the status to "Completed" in Firestore
    updateTaskStatusInFirestore(taskId, "Completed");

    // Remove the task from the current board
    task.remove();

    // Create a completed task in the UI with the task ID
    createCompletedTask(
      clientName,
      orderNumber,
      product,
      dueDate, // Pass the due date
      fileUrls, // Pass the file URLs
      taskId // Pass the task ID
    );
  });
}
//@@@
function createTask(
  clientName,
  orderNumber,
  product,
  status,
  dueDate,
  fileUrls = [],
  taskId = null, // Default to null if not provided
  tracking = {}, // Default to an empty object
  moreThanOneTask = "no", // Default value for moreThanOneTask
  numberOfTasksForThisOrder = 0, // Default value for numberOfTasksForThisOrder
  TaskCreationNumber = 0, // Default value for TaskCreationNumber
  customerEmail = "none", // Default value for customerEmail
  customerPhone = "none", // Default value for customerPhone
  location = "",
  sentReadyMessage = "no", // Default value for sentReadyMessage
  comments = "" // Default value for comments
) {
  // console.log("Creating task with ID:", taskId); // Log the taskId

  // If taskId is null or undefined, generate a unique one
  if (!taskId) {
    taskId = `${clientName}_${orderNumber}_${Date.now()}`;
    console.log("Generated task ID:", taskId); // Log the generated taskId
  }

  // Check if a task with the same clientName, orderNumber, and product already exists
  const existingTasks = document.querySelectorAll(".task");
  for (let task of existingTasks) {
    const existingClientNameElement = task.querySelector("p:nth-child(3)");
    const existingOrderNumberElement = task.querySelector("p:nth-child(4)");
    const existingProductElement = task.querySelector(
      "#moreDetails p:nth-child(1)"
    );

    // Ensure the elements exist before trying to access textContent
    if (
      existingClientNameElement &&
      existingOrderNumberElement &&
      existingProductElement &&
      existingClientNameElement.textContent.trim() ===
        `שם לקוח: ${clientName}` &&
      existingOrderNumberElement.textContent.trim() ===
        `מספר הזמנה: ${orderNumber}` &&
      existingProductElement.textContent.trim() === `מוצר: ${product}`
    ) {
      console.log("Duplicate task detected. Task creation aborted.");
      return; // Exit the function if a duplicate is found
    }
  }

  const task = document.createElement("div");
  task.className = "task";
  task.draggable = true;
  task.dataset.taskId = taskId; // Set the task ID as a data attribute

  // Build the HTML content for the task, including file names and URLs if any
  let fileLinks = "";
  if (fileUrls.length > 0) {
    fileLinks = `<strong>קבצים:</strong><ul>`;
    fileUrls.forEach((url) => {
      const fileName = url.split("/").pop().split("?")[0];
      fileLinks += `<li><a href="${url}" target="_blank">${fileName}</a></li>`;
    });
    fileLinks += `</ul>`;
  }

  // Check if the task is overdue
  const today = new Date().toISOString().split("T")[0];
  const isOverdue = dueDate < today;

  task.innerHTML = `
  <button class="complete-task">○</button>
  <div id="taskInDelay" style="display: ${
    isOverdue ? "block" : "none"
  }; margin-right:50px; color: red;">עבודה באיחור</div>
  <button class="duplicate-task" style="margin-right: 25px;color: gray;background-color: transparent; border: none;">
    <i class="fas fa-code-branch"></i>
  </button>

  <button class="toggle-details" style="margin-right: 25px;color: gray;background-color: transparent; border: none;">
    <i class="fas fa-chevron-down"></i>
  </button>
  <button class="edit-task" style="margin-right: 25px;color: gray;background-color: transparent; border: none;"><i class="fas fa-edit"></i></button>

  <p><strong>שם לקוח:</strong> ${clientName}</p>
  <p><strong>מספר הזמנה:</strong> ${orderNumber} <i class="fas fa-copy copy-icon" style="cursor: pointer; color: lightgray;"></i></p>
  ${
    numberOfTasksForThisOrder > 1 // Only display if there is more than one task
      ? `<p id="moreThenOneTask" class="task-creation-info" style="color: green; cursor: pointer;"><strong>משימה ${TaskCreationNumber} מתוך ${numberOfTasksForThisOrder}</strong></p>`
      : ""
  }
  <div id="moreDetails" style="display: none;">
    <p><strong>מוצר:</strong> ${product}</p>
    <p id="status" style="display: none;"><strong>סטטוס:</strong> ${status}</p>
    <p id="dueDate-${taskId}"><strong>תאריך יעד:</strong> ${dueDate}</p>
    ${fileLinks}
    ${
      comments
        ? `
      <div style="background-color: yellow; padding: 5px; border-radius: 3px;">
        <strong>הערות:</strong> ${comments}
      </div>
    `
        : ""
    }
  </div>
  <button class="delete-task">-</button>
`;

  // The rest of the code remains unchanged

  task.innerHTML += `
  <input type="hidden" id="hiddenCustomerEmail-${taskId}" value="${
    customerEmail || "none"
  }">
  <input type="hidden" id="hiddenCustomerPhone-${taskId}" value="${
    customerPhone || "none"
  }">
`;
  // Location Handling
  if (status === "update" && location) {
    const locationDiv = document.createElement("div");
    locationDiv.textContent = `מיקום: ${location}`;
    locationDiv.style.backgroundColor = "yellow";
    locationDiv.style.color = "black";
    locationDiv.style.padding = "5px";
    locationDiv.style.marginTop = "10px";
    locationDiv.style.display = "inline-block";
    locationDiv.style.borderRadius = "3px";
    task.appendChild(locationDiv);

    if (sentReadyMessage === "yes") {
      const updatedDiv = document.createElement("div");
      updatedDiv.textContent = "לקוח עודכן";
      updatedDiv.style.backgroundColor = "green";
      updatedDiv.style.color = "white";
      updatedDiv.style.padding = "5px";
      updatedDiv.style.marginTop = "10px";
      updatedDiv.style.display = "inline-block";
      updatedDiv.style.borderRadius = "3px";
      task.appendChild(updatedDiv);
    }
  }

  if (!status) {
    console.error("Status is undefined or null.");
    status = "printing"; // Provide a default status if undefined
  }
  document.getElementById(status.toLowerCase()).appendChild(task);

  task.querySelector(".duplicate-task").addEventListener("click", function () {
    // Open the modal
    document.getElementById("taskCreationModal").style.display = "block";

    // Pre-fill the form with existing task details
    document.getElementById("taskCreator").value = ""; // Clear for new task creator
    document.getElementById("taskDueDate").value = dueDate;
    document.getElementById("clientName").value = clientName;
    document.getElementById("orderNumber").value = orderNumber;
    document.getElementById("product").value = product;

    // Use hidden fields to populate email and phone, using taskId to correctly reference them
    document.getElementById("customerEmail").value =
      document.getElementById(`hiddenCustomerEmail-${taskId}`).value || "none";
    document.getElementById("customerPhone").value =
      document.getElementById(`hiddenCustomerPhone-${taskId}`).value || "none";

    // Optionally style the clientName input
    const clientNameInput = document.getElementById("clientName");
    clientNameInput.style.color = "blue"; // Make the entire input text blue
  });

  task.querySelector(".copy-icon").addEventListener("click", function () {
    const orderNumberText = this.parentElement.textContent
      .replace("מספר הזמנה:", "")
      .trim();

    navigator.clipboard
      .writeText(orderNumberText)
      .then(() => {
        alert(`Order number copied to clipboard:, ${orderNumberText}`);
      })
      .catch((err) => {
        console.error("Failed to copy order number: ", err);
      });
  });

  document.getElementById(status.toLowerCase()).appendChild(task);
  // Add event listener for the task creation info to open the modal
  // Add event listener for the task creation info to open the modal
  if (numberOfTasksForThisOrder > 1) {
    const taskCreationInfoElement = task.querySelector(".task-creation-info");
    taskCreationInfoElement.addEventListener("click", function () {
      openJLModal(orderNumber); // Pass the orderNumber to openJLModal
    });
  }

  // Add event listeners to the new task
  addDragAndDropListeners(task);
  addDeleteListener(task);
  addCompleteListener(task);

  // Add event listener for toggle button
  task.querySelector(".toggle-details").addEventListener("click", function () {
    const moreDetails = task.querySelector("#moreDetails");
    const icon = this.querySelector("i");

    if (moreDetails.style.display === "none") {
      moreDetails.style.display = "block";
      icon.classList.remove("fa-chevron-down");
      icon.classList.add("fa-chevron-up");
    } else {
      moreDetails.style.display = "none";
      icon.classList.remove("fa-chevron-up");
      icon.classList.add("fa-chevron-down");
    }
  });

  // Add event listener for edit button
  task.querySelector(".edit-task").addEventListener("click", function () {
    openEditModal(taskId);
  });

  // Create the tracking div and append it to the task
  const trackingDiv = createTrackingDiv(status, tracking, taskId);
  task.appendChild(trackingDiv);
}

function toggleCompletedTasks() {
  const completedTasks = document.getElementById("completed-tasks");
  const toggleButton = document.getElementById("completed-tasks-toggle");

  if (completedTasks.style.display === "none") {
    completedTasks.style.display = "block";
    toggleButton.innerHTML = "⬆️ משימות שנגמרו";
  } else {
    completedTasks.style.display = "none";
    toggleButton.innerHTML = "⬇️ משימות שנגמרו";
  }
}
window.toggleCompletedTasks = toggleCompletedTasks;

function addRestoreListener(task) {
  const restoreButton = task.querySelector(".restore-task");
  restoreButton.addEventListener("click", () => {
    const destination = prompt(
      "Enter the column to move the task back to (printing, finishing, update):"
    );

    if (
      destination &&
      ["printing", "finishing", "update"].includes(destination.toLowerCase())
    ) {
      const taskId = task.dataset.taskId; // Get the task ID from the dataset
      console.log("Task ID during restore:", taskId); // Log the task ID

      if (!taskId) {
        console.error("Task ID is undefined or invalid");
        return; // Early exit if taskId is not valid
      }

      const clientName = task
        .querySelector("p:nth-child(2)")
        .innerText.replace("שם לקוח: ", "");
      const orderNumber = task
        .querySelector("p:nth-child(3)")
        .innerText.replace("מספר הזמנה: ", "");
      const product = task
        .querySelector("p:nth-child(4)")
        .innerText.replace("מוצר: ", "");

      const dueDateElement = task.querySelector("p:nth-child(5)");
      const dueDate = dueDateElement
        ? dueDateElement.innerText.replace("תאריך יעד: ", "")
        : "";

      const fileUrls = [];
      const fileLinks = task.querySelectorAll("ul li a");
      fileLinks.forEach((link) => {
        fileUrls.push(link.href);
      });

      updateTaskStatusInFirestore(taskId, destination.toLowerCase())
        .then(() => {
          task.remove(); // Remove the task from the completed section

          // Create a new task in the selected column with the existing details
          createTask(
            clientName,
            orderNumber,
            product,
            destination.toLowerCase(),
            dueDate,
            fileUrls,
            taskId // Pass the task ID to ensure correct tracking
          );
        })
        .catch((error) => {
          console.error("Error updating task status in Firestore:", error);
        });
    } else {
      alert(
        "Invalid column. Please enter 'printing', 'finishing', or 'update'."
      );
    }
  });
}

document.addEventListener("DOMContentLoaded", (event) => {
  const modal = document.getElementById("taskCreationModal");
  const span = document.getElementsByClassName("close")[0];

  const createTaskButton = document.getElementById("createTaskButton");

  // Open the modal when the user clicks the add task button
  window.addTask = function (columnId) {
    modal.style.display = "block";
    modal.dataset.columnId = columnId;
  };

  // Close the modal
  span.onclick = function () {
    modal.style.display = "none";
  };

  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  // createTaskButton.onclick = async function () {
  //   const taskCreator = document.getElementById("taskCreator").value;
  //   const taskDueDate = document.getElementById("taskDueDate").value;
  //   const clientName = document.getElementById("clientName").value;
  //   const orderNumber = document.getElementById("orderNumber").value;
  //   const product = document.getElementById("product").value;
  //   const comments = document.getElementById("taskComments").value; // Get the comments
  //   const files = document.getElementById("taskFiles").files;

  //   if (taskCreator && taskDueDate && clientName && orderNumber && product) {
  //     // Upload files if any
  //     let uploadedFilesUrls = [];
  //     if (files.length > 0) {
  //       try {
  //         uploadedFilesUrls = await uploadFiles(files);
  //         console.log("Uploaded files:", uploadedFilesUrls);
  //       } catch (error) {
  //         console.error("File upload failed:", error);
  //         alert("Failed to upload files. Please try again.");
  //         return;
  //       }
  //     }

  //     const columnId = modal.dataset.columnId;

  //     // Create a task object to store in Firestore
  //     const taskData = {
  //       clientName,
  //       orderNumber,
  //       product,
  //       status: columnId,
  //       dueDate: taskDueDate,
  //       files: uploadedFilesUrls, // Array of file URLs
  //       taskCreator,
  //       creationDate: new Date().toISOString(),
  //       completionDate: "", // To be set when task is completed
  //       comments, // Store the comments
  //       customerEmail: document.getElementById("customerEmail").value,
  //       customerPhone: document.getElementById("customerPhone").value,
  //       tracking: {
  //         status: "ממתין", // Default status
  //       },
  //     };

  //     // Call the function to write to Firestore
  //     const taskId = await addTaskToFirestore(taskData);

  //     // If taskId is null, exit the function
  //     if (!taskId) {
  //       return;
  //     }

  //     // Call createTask to display the task on the board
  //     createTask(
  //       clientName,
  //       orderNumber,
  //       product,
  //       columnId,
  //       taskDueDate,
  //       uploadedFilesUrls,
  //       taskId // Pass the document ID as taskId
  //     );

  //     // Show the alert message
  //     alert(
  //       `משימה חדשה נוספה בהצלחה: ${clientName} - ${product} - ${orderNumber}. היא שובצה לביצוע לפי זמן הביצוע: ${taskDueDate}`
  //     );

  //     modal.style.display = "none";
  //   } else {
  //     alert("Please fill in all fields.");
  //   }
  // };

  createTaskButton.onclick = async function () {
    const taskCreator = document.getElementById("taskCreator").value;
    const taskDueDate = document.getElementById("taskDueDate").value;
    const clientName = document.getElementById("clientName").value;
    const orderNumber = document.getElementById("orderNumber").value;
    const product = document.getElementById("product").value;
    const comments = document.getElementById("taskComments").value; // Get the comments
    const files = document.getElementById("taskFiles").files;

    if (taskCreator && taskDueDate && clientName && orderNumber && product) {
      // Upload files if any
      let uploadedFilesUrls = [];
      if (files.length > 0) {
        try {
          uploadedFilesUrls = await uploadFiles(files);
          console.log("Uploaded files:", uploadedFilesUrls);
        } catch (error) {
          console.error("File upload failed:", error);
          alert("Failed to upload files. Please try again.");
          return;
        }
      }

      const columnId = modal.dataset.columnId;

      // Normalize the customerPhone
      const customerPhone = document.getElementById("customerPhone").value;
      const customerPhoneNormalized = customerPhone.replace(/[^0-9]/g, "");

      // Create a task object to store in Firestore
      const taskData = {
        clientName,
        orderNumber,
        product,
        status: columnId,
        dueDate: taskDueDate,
        files: uploadedFilesUrls, // Array of file URLs
        taskCreator,
        creationDate: new Date().toISOString(),
        completionDate: "", // To be set when task is completed
        comments, // Store the comments
        customerEmail: document.getElementById("customerEmail").value,
        customerPhone: customerPhone, // Original phone number
        customerPhoneNormalized, // Normalized phone number for easier searching
        tracking: {
          status: "ממתין", // Default status
        },
      };

      // Call the function to write to Firestore
      const taskId = await addTaskToFirestore(taskData);

      // If taskId is null, exit the function
      if (!taskId) {
        return;
      }

      // Call createTask to display the task on the board
      createTask(
        clientName,
        orderNumber,
        product,
        columnId,
        taskDueDate,
        uploadedFilesUrls,
        taskId // Pass the document ID as taskId
      );

      // Show the alert message
      alert(
        `משימה חדשה נוספה בהצלחה: ${clientName} - ${product} - ${orderNumber}. היא שובצה לביצוע לפי זמן הביצוע: ${taskDueDate}`
      );

      modal.style.display = "none";
    } else {
      alert("Please fill in all fields.");
    }
  };
});

// File upload function
async function uploadFiles(files) {
  if (files.length === 0) {
    return Promise.resolve([]); // No files to upload
  }
  const uploadPromises = Array.from(files).map((file) => {
    // Get a signed URL from your server
    return fetch(
      "https://us-central1-optimal-doodad-373107.cloudfunctions.net/getSignedUrl",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      }
    )
      .then((response) => response.json())
      .then((data) => {
        // Use the signed URL to upload the file
        return fetch(data.signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        }).then(() => data.url); // Return the URL of the uploaded file
      });
  });

  return Promise.all(uploadPromises);
}

//contacts- just here

// main.js

// async function addTaskToFirestore(taskData) {
//   try {
//     // Ensure that the status is defined and valid
//     if (!taskData.status) {
//       console.error("Status is undefined or null.");
//       taskData.status = "printing"; // Provide a default status if undefined
//     }

//     // Check for duplicates in the database
//     const q = firestoreQuery(
//       collection(db, "tasksDetails"),
//       where("clientName", "==", taskData.clientName),
//       where("orderNumber", "==", taskData.orderNumber),
//       where("product", "==", taskData.product)
//     );

//     const querySnapshot = await getDocs(q);

//     if (!querySnapshot.empty) {
//       // If a duplicate is found, alert the user with the status
//       querySnapshot.forEach((doc) => {
//         const existingTask = doc.data();
//         alert(
//           `זוהתה משימה כפולה. משימה בעלת סטטוס '${existingTask.status}' כבר קיימת עבור הלקוח: ${existingTask.clientName}, הזמנה: ${existingTask.orderNumber}, מוצר: ${existingTask.product}. ⚠️`
//         );
//       });
//       return; // Exit the function to prevent adding the duplicate
//     }

//     // If no duplicate is found, add the task data to the "tasksDetails" collection
//     const docRef = await addDoc(collection(db, "tasksDetails"), taskData);

//     // Update the task with the generated document ID
//     await updateDoc(docRef, {
//       taskId: docRef.id,
//     });

//     console.log("Document written with ID: ", docRef.id);
//   } catch (e) {
//     console.error("Error adding document: ", e);
//   }
// }
async function addTaskToFirestore(taskData) {
  try {
    // Ensure that the status is defined and valid
    if (!taskData.status) {
      console.error("Status is undefined or null.");
      taskData.status = "printing"; // Provide a default status if undefined
    }

    // Check for duplicates in the database, excluding tasks with status "deleted"
    const q = firestoreQuery(
      collection(db, "tasksDetails"),
      where("clientName", "==", taskData.clientName),
      where("orderNumber", "==", taskData.orderNumber),
      where("product", "==", taskData.product)
    );

    const querySnapshot = await getDocs(q);

    let isDuplicate = false;
    querySnapshot.forEach((doc) => {
      const existingTask = doc.data();

      if (existingTask.status !== "deleted") {
        isDuplicate = true;
        alert(
          `Duplicate task detected. A task with status '${existingTask.status}' already exists for client: ${existingTask.clientName}, order: ${existingTask.orderNumber}, product: ${existingTask.product}.`
        );
      }
    });

    // If a duplicate with a non-deleted status is found, exit the function
    if (isDuplicate) {
      return null; // Prevent adding the task to Firestore
    }

    // If no duplicate is found, add the task data to the "tasksDetails" collection
    const docRef = await addDoc(collection(db, "tasksDetails"), taskData);

    // Update the task with the generated document ID
    await updateDoc(docRef, {
      taskId: docRef.id,
    });

    console.log("Document written with ID: ", docRef.id);
    return docRef.id; // Return the task ID if successful
  } catch (e) {
    console.error("Error adding document: ", e);
    return null; // Return null if there's an error
  }
}

async function loadContactsFromJSON() {
  try {
    const response = await fetch("items_with_contacts.json");
    const contactsData = await response.json();

    // Log the data to verify it's loading correctly
    console.log("Contacts loaded:", contactsData);

    // Store contacts data globally for easy access
    window.contacts = contactsData;

    // Populate the datalist with contact names
    populateContactList(contactsData);
  } catch (error) {
    console.error("Error loading contacts from JSON:", error);
  }
}

function populateContactList(contacts) {
  const datalist = document.getElementById("contactList");
  datalist.innerHTML = ""; // Clear existing options

  contacts.forEach((contact) => {
    const option = document.createElement("option");
    option.value = contact.name; // Assumes 'name' is a field in your JSON
    datalist.appendChild(option);
  });
}

function autoFillContact() {
  const clientName = document.getElementById("clientName").value;
  const contact = window.contacts.find(
    (contact) => contact.name === clientName
  );

  if (contact) {
    document.getElementById("customerEmail").value = contact.email || "";
    document.getElementById("customerPhone").value = contact.phone || "";
  } else {
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerPhone").value = "";
  }
}

document.getElementById("clientName").addEventListener("change", function () {
  autoFillContact();
});

// Call loadContactsFromJSON on page load
document.addEventListener("DOMContentLoaded", function () {
  loadContactsFromJSON();
});

//end of contacts

//shurtcut to text input
document.addEventListener("DOMContentLoaded", function () {
  const buttons = document.querySelectorAll(".name-button");
  const clientNameInput = document.getElementById("taskCreator");

  buttons.forEach((button) => {
    button.addEventListener("click", function () {
      const name = this.dataset.name;
      clientNameInput.value = name;
    });
  });
});

//defult date
function addBusinessDays(date, days) {
  let currentDate = new Date(date);
  let businessDaysAdded = 0;

  while (businessDaysAdded < days) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();

    // Exclude Fridays (day 5) and Saturdays (day 6)
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      businessDaysAdded++;
    }
  }

  return currentDate;
}

document.addEventListener("DOMContentLoaded", function () {
  const taskDueDateInput = document.getElementById("taskDueDate");

  // Get the current date
  const today = new Date();

  // Calculate the date 3 business days from today
  const dueDate = addBusinessDays(today, 3);

  // Format the date as YYYY-MM-DD
  const formattedDate = dueDate.toISOString().split("T")[0];

  // Set the default value of the date input field
  taskDueDateInput.value = formattedDate;
});

// edit modal
// function openEditModal(taskId) {
//   if (!taskId) {
//     console.error("Task ID is undefined");
//     return;
//   }

//   // Fetch the document reference using the taskId
//   const taskRef = doc(db, "tasksDetails", taskId);
//   console.log("Fetching document reference:", taskRef);

//   // Fetch the document from Firestore
//   getDoc(taskRef)
//     .then((docSnapshot) => {
//       if (docSnapshot.exists()) {
//         const data = docSnapshot.data();

//         // Populate the modal with data
//         document.getElementById("editClientName").value = data.clientName;
//         document.getElementById("editOrderNumber").value = data.orderNumber;
//         document.getElementById("editProduct").value = data.product;
//         document.getElementById("editDueDate").value = data.dueDate;
//         document.getElementById("editStatus").value = data.status;
//         document.getElementById("editComments").value = data.comments || ""; // Handle the case where comments might be undefined

//         // Show the modal
//         document.getElementById("editTaskModal").style.display = "block";
//       } else {
//         console.error("No such document!");
//       }
//     })
//     .catch((error) => {
//       console.error("Error fetching document:", error);
//     });
// }
function openEditModal(taskId) {
  const modal = document.getElementById("editTaskModal");
  const form = document.getElementById("editTaskForm");

  // Fetch task data from Firestore using taskId
  const taskRef = doc(db, "tasksDetails", taskId);
  getDoc(taskRef).then((docSnap) => {
    if (docSnap.exists()) {
      const taskData = docSnap.data();

      // Populate form with task data
      form.editClientName.value = taskData.clientName;
      form.editOrderNumber.value = taskData.orderNumber;
      form.editProduct.value = taskData.product;
      form.editDueDate.value = taskData.dueDate;
      form.editStatus.value = taskData.status;
      form.editComments.value = taskData.comments || "";

      // Show the modal
      modal.style.display = "block";
    } else {
      console.log("No such document!");
    }
  });

  // Handle form submission
  form.onsubmit = function (e) {
    e.preventDefault();

    // Get updated values from the form
    const updatedTaskData = {
      clientName: form.editClientName.value,
      orderNumber: form.editOrderNumber.value,
      product: form.editProduct.value,
      dueDate: form.editDueDate.value,
      status: form.editStatus.value,
      comments: form.editComments.value,
    };

    // Update task in Firestore
    updateDoc(taskRef, updatedTaskData)
      .then(() => {
        console.log("Task updated successfully!");
        modal.style.display = "none"; // Close the modal
        location.reload(); // Reload the page to reflect changes (optional)
      })
      .catch((error) => {
        console.error("Error updating task: ", error);
      });
  };

  // Close modal when the user clicks the close button or outside the modal
  document.querySelector(".close").onclick = function () {
    modal.style.display = "none";
  };
  window.onclick = function (event) {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}

document.getElementById("close").addEventListener("click", function () {
  document.getElementById("editTaskModal").style.display = "none";
});

// search begin
// Event listener for search input
document.getElementById("searchInput").addEventListener("input", function () {
  const query = this.value.trim();

  if (query.length > 0) {
    searchTasks(query);
  } else {
    document.getElementById("searchResults").style.display = "none";
  }
});

// async function searchTasks(queryText) {
//   const resultsContainer = document.getElementById("searchResults");
//   resultsContainer.innerHTML = ""; // Clear previous results

//   const tasksRef = collection(db, "tasksDetails");

//   let queries = [];

//   // Normalize the query text to ignore hyphens for phone number searches
//   const normalizedQueryText = queryText.replace(/-/g, "");

//   if (/^\d+$/.test(normalizedQueryText)) {
//     // If the query is numeric, search by exact order number
//     queries.push(
//       firestoreQuery(
//         tasksRef,
//         where("orderNumber", "==", normalizedQueryText),
//         where("status", "in", ["printing", "finishing", "update"])
//       )
//     );

//     // Add queries for phone number search with and without hyphens
//     queries.push(
//       firestoreQuery(
//         tasksRef,
//         where("customerPhoneNormalized", "==", normalizedQueryText),
//         where("status", "in", ["printing", "finishing", "update"])
//       )
//     );

//     queries.push(
//       firestoreQuery(
//         tasksRef,
//         where("customerPhone", "==", queryText),
//         where("status", "in", ["printing", "finishing", "update"])
//       )
//     );
//   } else {
//     // Split the query text by spaces to search for individual words in the client name
//     const queryWords = normalizedQueryText.split(" ");

//     // Search by client name (for each word in the client name)
//     queryWords.forEach((word) => {
//       queries.push(
//         firestoreQuery(
//           tasksRef,
//           where("status", "in", ["printing", "finishing", "update"]),
//           where("clientName", ">=", word),
//           where("clientName", "<=", word + "\uf8ff")
//         )
//       );
//     });

//     // Additional queries for email (normalized)
//     queries.push(
//       firestoreQuery(
//         tasksRef,
//         where("status", "in", ["printing", "finishing", "update"]),
//         where("customerEmail", ">=", normalizedQueryText),
//         where("customerEmail", "<=", normalizedQueryText + "\uf8ff")
//       )
//     );
//   }

//   // Execute all queries in parallel
//   const querySnapshots = await Promise.all(queries.map((q) => getDocs(q)));

//   // Merge and deduplicate results
//   const allDocs = [];
//   querySnapshots.forEach((snapshot) => {
//     snapshot.docs.forEach((doc) => {
//       allDocs.push(doc);
//     });
//   });

//   const uniqueDocs = new Map(); // To store unique results by orderNumber

//   // Add all documents into the uniqueDocs map to ensure uniqueness
//   allDocs.forEach((doc) => {
//     const taskData = doc.data();
//     uniqueDocs.set(doc.id, taskData);
//   });

//   const finalResults = Array.from(uniqueDocs.values()); // Convert back to array

//   if (finalResults.length === 0) {
//     console.log("No tasks found matching the query.");
//     resultsContainer.style.display = "none";
//   } else {
//     finalResults.forEach((taskData) => {
//       const taskDiv = createTaskElement(taskData);
//       resultsContainer.appendChild(taskDiv);
//     });
//     resultsContainer.style.display = "block";

//     // Call the function to remove duplicates
//     removeDuplicateTasksSearch();
//   }
// }
async function searchTasks(queryText) {
  const resultsContainer = document.getElementById("searchResults");
  resultsContainer.innerHTML = ""; // Clear previous results

  const tasksRef = collection(db, "tasksDetails");

  let queries = [];

  // Normalize the query text to ignore hyphens for phone number searches
  const normalizedQueryText = queryText.replace(/-/g, "");

  // If the query is numeric, search by exact order number
  if (/^\d+$/.test(normalizedQueryText)) {
    queries.push(
      firestoreQuery(
        tasksRef,
        where("orderNumber", "==", normalizedQueryText),
        where("status", "in", ["printing", "finishing", "update"])
      )
    );

    // Add queries for phone number search with and without hyphens
    queries.push(
      firestoreQuery(
        tasksRef,
        where("customerPhoneNormalized", "==", normalizedQueryText),
        where("status", "in", ["printing", "finishing", "update"])
      )
    );

    queries.push(
      firestoreQuery(
        tasksRef,
        where("customerPhone", "==", queryText),
        where("status", "in", ["printing", "finishing", "update"])
      )
    );
  }

  // Always add email search queries
  queries.push(
    firestoreQuery(
      tasksRef,
      where("customerEmail", ">=", queryText),
      where("customerEmail", "<=", queryText + "\uf8ff"),
      where("status", "in", ["printing", "finishing", "update"])
    )
  );

  // Always add the status query to retrieve tasks with the given statuses
  queries.push(
    firestoreQuery(
      tasksRef,
      where("status", "in", ["printing", "finishing", "update"])
    )
  );

  // Execute all queries in parallel
  const querySnapshots = await Promise.all(queries.map((q) => getDocs(q)));

  // Merge and deduplicate results
  const allDocs = [];
  querySnapshots.forEach((snapshot) => {
    snapshot.docs.forEach((doc) => {
      allDocs.push(doc);
    });
  });

  const filteredResults = [];

  allDocs.forEach((doc) => {
    const taskData = doc.data();

    // Check for exact match in order number or phone number
    if (/^\d+$/.test(normalizedQueryText)) {
      if (
        taskData.orderNumber === normalizedQueryText ||
        taskData.customerPhoneNormalized === normalizedQueryText ||
        taskData.customerPhone === queryText
      ) {
        filteredResults.push(taskData);
      }
    } else {
      // For non-numeric queries, check if the client name or email contains the query text
      if (taskData.clientName && taskData.clientName.includes(queryText)) {
        filteredResults.push(taskData);
      } else if (
        taskData.customerEmail &&
        taskData.customerEmail.includes(queryText)
      ) {
        filteredResults.push(taskData);
      }
    }
  });

  if (filteredResults.length === 0) {
    console.log("No tasks found matching the query.");
    resultsContainer.style.display = "none";
  } else {
    filteredResults.forEach((taskData) => {
      const taskDiv = createTaskElement(taskData);
      resultsContainer.appendChild(taskDiv);
    });
    resultsContainer.style.display = "block";

    // Call the function to remove duplicates
    removeDuplicateTasksSearch();
  }
}

document.querySelector(".search-icon").addEventListener("click", function () {
  const queryText = document.getElementById("searchInput").value.trim();
  if (queryText) {
    searchTasks(queryText);
  }
});

function removeDuplicateTasksSearch() {
  const resultsContainer = document.getElementById("searchResults");
  const tasks = resultsContainer.querySelectorAll(".task");

  // Convert NodeList to an array to allow the use of array methods
  const taskArray = Array.from(tasks);

  // Array to hold the serialized HTML of each task
  const seenTasks = [];

  taskArray.forEach((task) => {
    const taskHTML = task.outerHTML.trim();

    if (seenTasks.includes(taskHTML)) {
      // If the task is a duplicate, remove it from the DOM
      task.remove();
    } else {
      // Otherwise, add the task's HTML to the seenTasks array
      seenTasks.push(taskHTML);
    }
  });
}

function mapHebrewListToEnglish(hebrewList) {
  const mapping = {
    הדפסה: "printing",
    גימורים: "finishing",
    עדכון: "update",
  };
  return mapping[hebrewList] || hebrewList; // Return the mapped value or the original if not found
}

// function searchingListeners(taskElement, taskData) {
//   console.log("Attaching listeners to task:", taskElement);
//   const taskId = taskElement.dataset.taskId;

//   // Attach complete task listener
//   taskElement.querySelector(".complete-task").addEventListener("click", () => {
//     completeTask(taskId);
//   });

//   // Attach toggle details listener
//   taskElement.querySelector(".toggle-details").addEventListener("click", () => {
//     const moreDetails = taskElement.querySelector("#moreDetails");
//     const icon = taskElement.querySelector(".toggle-details i");
//     if (moreDetails.style.display === "none") {
//       moreDetails.style.display = "block";
//       icon.classList.remove("fa-chevron-down");
//       icon.classList.add("fa-chevron-up");
//     } else {
//       moreDetails.style.display = "none";
//       icon.classList.remove("fa-chevron-up");
//       icon.classList.add("fa-chevron-down");
//     }
//   });

//   // Attach edit task listener
//   taskElement.querySelector(".edit-task").addEventListener("click", () => {
//     openEditModal(taskId);
//   });

//   // Attach delete task listener
//   taskElement.querySelector(".delete-task").addEventListener("click", () => {
//     if (confirm("Are you sure you want to delete this task?")) {
//       deleteTask(taskId);
//       taskElement.remove(); // Remove from the DOM
//     }
//   });

//   // Attach copy order number listener
//   taskElement.querySelector(".copy-icon").addEventListener("click", () => {
//     const orderNumberText = taskElement
//       .querySelector("p:nth-child(4)")
//       .textContent.replace("מספר הזמנה:", "")
//       .trim();
//     navigator.clipboard
//       .writeText(orderNumberText)
//       .then(() => alert(`Order number copied to clipboard: ${orderNumberText}`))
//       .catch((err) => console.error("Failed to copy order number: ", err));
//   });

//   // Attach status dropdown listener
//   taskElement
//     .querySelector("select[name='status']")
//     .addEventListener("change", function () {
//       const newStatus = this.value;
//       updateTaskStatusInFirestore(taskId, newStatus);
//       // Move the task to the correct list based on the new status
//       const newColumn = document.getElementById(newStatus.toLowerCase());
//       if (newColumn) {
//         taskElement.remove();
//         newColumn.appendChild(taskElement);
//       }
//     });
// }

// Function to create task element for display in search results
// function createTaskElement(taskData) {
//   console.log("Creating task element with data:", taskData);
//   const task = document.createElement("div");
//   task.className = "task";
//   task.draggable = false; // Not draggable in search results

//   // Build the HTML content for the task, including file names and URLs if any
//   let fileLinks = "";
//   if (taskData.files && taskData.files.length > 0) {
//     fileLinks = `<strong>קבצים:</strong><ul>`;
//     taskData.files.forEach((url) => {
//       const fileName = url.split("/").pop().split("?")[0];
//       fileLinks += `<li><a href="${url}" target="_blank">${fileName}</a></li>`;
//     });
//     fileLinks += `</ul>`;
//   }
//   console.log("Task Data:", taskData);
//   let backgroundColor = "";

//   if (taskData.status === "printing") {
//     backgroundColor = "background-color: yellow;";
//   } else if (taskData.status === "finishing") {
//     backgroundColor = "background-color: orange;";
//   } else if (taskData.status === "update") {
//     backgroundColor = "background-color: lightgreen;";
//   }
//   task.innerHTML = `
//   <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #ccc; margin-bottom: 10px;">
//     <div style="display: flex; align-items: center;">
//       <button class="complete-task" style="background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; margin-right: 10px; cursor: pointer;">○</button>
//       <button class="toggle-details" style="margin-right: 10px; background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; cursor: pointer;">
//         <i class="fas fa-chevron-down"></i>
//       </button>
//       <button class="edit-task" style="background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; cursor: pointer;">
//         <i class="fas fa-edit"></i>
//       </button>
//     </div>
//     <div style="text-align: center; flex-grow: 1;">
//       <p style="margin: 5px 0; font-size: 14px;"><strong>שם לקוח:</strong> ${
//         taskData.clientName
//       }</p>
//       <p style="margin: 5px 0; font-size: 14px;"><strong>מספר הזמנה:</strong> ${
//         taskData.orderNumber
//       } <i class="fas fa-copy copy-icon" style="cursor: pointer; color: lightgray; margin-left: 5px;"></i></p>
//       <div id="moreDetails" style="display: none; text-align: center;">
//         <p style="margin: 5px 0; font-size: 14px;"><strong>מוצר:</strong> ${
//           taskData.product
//         }</p>
//         <p style="margin: 5px 0; font-size: 14px;"><strong>תאריך יעד:</strong> ${
//           taskData.dueDate
//         }</p>
//         ${fileLinks}
//       </div>
//     </div>
//     <div style="text-align: right;">
//       <p style="margin: 5px 0; font-size: 14px; text-align: right;"><strong>רשימה:</strong>
//     <select name="status" style="width: 120px; padding: 5px; border-radius: 5px; margin: 5px 0; ${backgroundColor}">
//   <option value="printing" ${
//     taskData.status === "printing" ? "selected" : ""
//   }>הדפסה</option>
//   <option value="finishing" ${
//     taskData.status === "finishing" ? "selected" : ""
//   }>גימורים</option>
//   <option value="update" ${
//     taskData.status === "update" ? "selected" : ""
//   }>עדכון</option>
// </select>

//       </p>
//     </div>
//     <div>
//       <button class="delete-task" style="background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; margin-left: 10px; cursor: pointer;">-</button>
//     </div>
//   </div>
// `;

//   // console.log("Created task element:", task.outerHTML);

//   // Add event listeners for status change and copying order number

//   // 1. Change status listener
//   task
//     .querySelector("select[name='status']")
//     .addEventListener("change", function () {
//       const newStatus = this.value;
//       updateTaskStatusInFirestore(taskData.taskId, newStatus);
//       // Optionally, move the task to the correct list in the UI based on the new status
//       const newColumn = document.getElementById(newStatus.toLowerCase());
//       if (newColumn) {
//         task.remove();
//         newColumn.appendChild(task);
//       }
//     });

//   // 2. Copy order number listener
//   task.querySelector(".copy-icon").addEventListener("click", function () {
//     const orderNumberText = taskData.orderNumber;
//     navigator.clipboard
//       .writeText(orderNumberText)
//       .then(() => alert(`Order number copied to clipboard: ${orderNumberText}`))
//       .catch((err) => console.error("Failed to copy order number: ", err));
//   });

//   // Add event listeners to the new task
//   addDragAndDropListeners(task); // In case you want to allow dragging in search results
//   addDeleteListener(task);
//   addCompleteListener(task);

//   // Add event listener for toggle button
//   task.querySelector(".toggle-details").addEventListener("click", function () {
//     const moreDetails = task.querySelector("#moreDetails");
//     const icon = this.querySelector("i");

//     if (moreDetails.style.display === "none") {
//       moreDetails.style.display = "block";
//       icon.classList.remove("fa-chevron-down");
//       icon.classList.add("fa-chevron-up");
//     } else {
//       moreDetails.style.display = "none";
//       icon.classList.remove("fa-chevron-up");
//       icon.classList.add("fa-chevron-down");
//     }
//   });

//   // Add event listener for edit button
//   task.querySelector(".edit-task").addEventListener("click", function () {
//     openEditModal(taskData.taskId);
//   });

//   // Add this inside your createTaskElement function where you set up event listeners:
//   task.querySelector(".delete-task").addEventListener("click", () => {
//     if (confirm("Are you sure you want to delete this task?")) {
//       const taskId = taskData.taskId;

//       // Update the status to "deleted" in Firestore
//       updateTaskStatusInFirestore(taskId, "deleted");

//       // Remove the task from the UI
//       task.remove();
//     }
//   });

//   // Create the tracking div and append it to the task
//   const trackingDiv = createTrackingDiv(
//     taskData.status,
//     taskData.tracking,
//     taskData.taskId
//   );
//   task.appendChild(trackingDiv);

//   return task;
// }
function createTaskElement(taskData) {
  console.log("Creating task element with data:", taskData);
  const task = document.createElement("div");
  task.className = "task";
  task.draggable = false; // Not draggable in search results

  // Build the HTML content for the task, including file names and URLs if any
  let fileLinks = "";
  if (taskData.files && taskData.files.length > 0) {
    fileLinks = `<strong>קבצים:</strong><ul>`;
    taskData.files.forEach((url) => {
      const fileName = url.split("/").pop().split("?")[0];
      fileLinks += `<li><a href="${url}" target="_blank">${fileName}</a></li>`;
    });
    fileLinks += `</ul>`;
  }

  let backgroundColor = "";
  if (taskData.status === "printing") {
    backgroundColor = "background-color: yellow;";
  } else if (taskData.status === "finishing") {
    backgroundColor = "background-color: orange;";
  } else if (taskData.status === "update") {
    backgroundColor = "background-color: lightgreen;";
  }

  // Additional content like location, comments, and more
  let locationDiv = "";
  let commentsDiv = "";
  let moreTasksDiv = "";
  let sentReadyMessageDiv = "";

  if (taskData.location && taskData.status === "update") {
    locationDiv = `
      <div style="background-color: yellow; color: black; padding: 5px; margin-top: 10px; display: inline-block; border-radius: 3px;">
        מיקום: ${taskData.location}
      </div>`;
    if (taskData.sentReadyMessage === "yes") {
      sentReadyMessageDiv = `
        <div style="background-color: green; color: white; padding: 5px; margin-top: 10px; display: inline-block; border-radius: 3px;">
          לקוח עודכן
        </div>`;
    }
  }

  if (taskData.comments) {
    commentsDiv = `
      <div style="background-color: yellow; padding: 5px; border-radius: 3px;">
        <strong>הערות:</strong> ${taskData.comments}
      </div>`;
  }

  if (taskData.numberOfTasksForThisOrder > 1) {
    moreTasksDiv = `
      <p id="moreThenOneTask" class="task-creation-info" style="color: green; cursor: pointer;">
        <strong>משימה ${taskData.TaskCreationNumber} מתוך ${taskData.numberOfTasksForThisOrder}</strong>
      </p>`;
  }

  task.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background-color: #f9f9f9; border-radius: 10px; border: 1px solid #ccc; margin-bottom: 10px;">
    <div style="display: flex; align-items: center;">
      <button class="complete-task" style="background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; margin-right: 10px; cursor: pointer;">○</button>
     <button class="toggle-details" style="margin-right: 10px; background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; cursor: pointer; display: inline-block; visibility: visible; z-index: 2000;">
  <i class="fas fa-chevron-down" style="font-size: 16px; color: #333;"></i>
</button>

      <button class="edit-task" style="background-color: #f0f0f0; border: none; border-radius: 50%; padding: 8px; cursor: pointer;">
        <i class="fas fa-edit"></i>
      </button>
    </div>
    <div style="text-align: center; flex-grow: 1;">
      <p style="margin: 5px 0; font-size: 14px;"><strong>שם לקוח:</strong> ${
        taskData.clientName
      }</p>
      <p style="margin: 5px 0; font-size: 14px;"><strong>מספר הזמנה:</strong> ${
        taskData.orderNumber
      } <i class="fas fa-copy copy-icon" style="cursor: pointer; color: lightgray; margin-left: 5px;"></i></p>
      ${moreTasksDiv}
      <div id="moreDetails" style="display: none; text-align: center;">
        <p style="margin: 5px 0; font-size: 14px;"><strong>מוצר:</strong> ${
          taskData.product
        }</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>תאריך יעד:</strong> ${
          taskData.dueDate
        }</p>
        ${fileLinks}
        ${commentsDiv}
      </div>
    </div>
    <div style="text-align: right;">
      <p style="margin: 5px 0; font-size: 14px; text-align: right;"><strong>רשימה:</strong> 
        <select name="status" style="width: 120px; padding: 5px; border-radius: 5px; margin: 5px 0; ${backgroundColor}">
          <option value="printing" ${
            taskData.status === "printing" ? "selected" : ""
          }>הדפסה</option>
          <option value="finishing" ${
            taskData.status === "finishing" ? "selected" : ""
          }>גימורים</option>
          <option value="update" ${
            taskData.status === "update" ? "selected" : ""
          }>עדכון</option>
        </select>
      </p>
    </div>
    <div>
<button class="delete-task" style="background-color: red; border: none; border-radius: 50%; padding: 8px; margin-left: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px;">-</button>
    </div>
  </div>
  ${locationDiv}
  ${sentReadyMessageDiv}
`;

  task.innerHTML += `
  <input type="hidden" id="hiddenCustomerEmail-${taskData.taskId}" value="${
    taskData.customerEmail || "none"
  }">
  <input type="hidden" id="hiddenCustomerPhone-${taskData.taskId}" value="${
    taskData.customerPhone || "none"
  }">
`;

  // Add event listeners for status change and copying order number
  task
    .querySelector("select[name='status']")
    .addEventListener("change", function () {
      const newStatus = this.value;
      updateTaskStatusInFirestore(taskData.taskId, newStatus);
      const newColumn = document.getElementById(newStatus.toLowerCase());
      if (newColumn) {
        task.remove();
        newColumn.appendChild(task);
      }
    });

  task.querySelector(".copy-icon").addEventListener("click", function () {
    const orderNumberText = taskData.orderNumber;
    navigator.clipboard
      .writeText(orderNumberText)
      .then(() => alert(`Order number copied to clipboard: ${orderNumberText}`))
      .catch((err) => console.error("Failed to copy order number: ", err));
  });

  task.querySelector(".delete-task").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete this task?")) {
      const taskId = taskData.taskId;
      updateTaskStatusInFirestore(taskId, "deleted");
      task.remove();
    }
  });

  task.querySelector(".toggle-details").addEventListener("click", function () {
    const moreDetails = task.querySelector("#moreDetails");
    const icon = this.querySelector("i");
    if (moreDetails.style.display === "none") {
      moreDetails.style.display = "block";
      icon.classList.remove("fa-chevron-down");
      icon.classList.add("fa-chevron-up");
    } else {
      moreDetails.style.display = "none";
      icon.classList.remove("fa-chevron-up");
      icon.classList.add("fa-chevron-down");
    }
  });

  task.querySelector(".edit-task").addEventListener("click", function () {
    openEditModal(taskData.taskId);
  });

  // Create the tracking div and append it to the task
  const trackingDiv = createTrackingDiv(
    taskData.status,
    taskData.tracking,
    taskData.taskId
  );
  task.appendChild(trackingDiv);

  return task;
}

// Function to focus on the task in the main UI
function focusTaskInMainUI(taskId) {
  // Implement logic to focus on the task in the main UI if needed
  console.log("Task ID clicked in search results:", taskId);
}

// Another event listener to ensure the search results disappear when the input is cleared
document.getElementById("searchInput").addEventListener("input", function () {
  const query = this.value.trim();
  const resultsContainer = document.getElementById("searchResults");

  if (query.length === 0) {
    resultsContainer.style.display = "none";
  }
});

// Close the search results when the "X" button is clicked
document.getElementById("closeResults").addEventListener("click", function () {
  document.getElementById("searchResults").style.display = "none";
});

// Close the search results when clicking outside of the search container
window.addEventListener("click", function (event) {
  const resultsContainer = document.getElementById("searchResults");

  // If the clicked element is not the search results container or a descendant of it, close the results
  if (
    !resultsContainer.contains(event.target) &&
    event.target.id !== "searchInput"
  ) {
    resultsContainer.style.display = "none";
  }
});

// search ends

// delete duplications
function removeDuplicatesFromTasks() {
  const columns = ["printing", "finishing", "update"];
  const taskMap = new Map();

  columns.forEach((columnId) => {
    const columnElement = document.getElementById(columnId);
    const tasks = columnElement.querySelectorAll(".task");

    tasks.forEach((task) => {
      const clientName = task
        .querySelector("p:nth-child(3)")
        .textContent.trim();
      const orderNumber = task
        .querySelector("p:nth-child(4)")
        .textContent.trim();
      const product = task
        .querySelector("#moreDetails p:nth-child(1)")
        .textContent.trim();

      const taskKey = `${clientName}-${orderNumber}-${product}`;

      if (taskMap.has(taskKey)) {
        // If the task is a duplicate, remove it from the DOM
        task.remove();

        // Optionally, delete the task from Firestore
        const taskId = task.dataset.taskId;
        deleteTaskFromFirestore(taskId);
      } else {
        // Add the unique task to the map
        taskMap.set(taskKey, true);
      }
    });
  });
}

// Function to delete a task from Firestore
async function deleteTaskFromFirestore(taskId) {
  try {
    const taskDocRef = doc(db, "tasksDetails", taskId);
    await deleteDoc(taskDocRef);
    console.log(`Task with ID ${taskId} deleted from Firestore.`);
  } catch (error) {
    console.error("Error deleting task from Firestore:", error);
  }
}

// Call the function after loading tasks or adding a new task
removeDuplicatesFromTasks();

// end of delete duplications

// Function to create a tracking div based on status

const statusFields = {
  printing: {
    machine: [
      "ממתין",
      "4070",
      "4070-1",
      "6120",
      "3070",
      "mutho",
      "dika",
      "hp",
      "I-ECHO",
      "לייזר",
      "בירור",
    ],
  },
  finishing: {
    operator: ["ארז", "מנשה", "ישי", "נועם"],
  },
  update: {
    status: ["לא עודכן", "עודכן"],
  },
};

// function createTrackingDiv(status, tracking = {}, taskId) {
//   const trackingDiv = document.createElement("div");
//   trackingDiv.className = "tracking";

//   const options = statusFields[status.toLowerCase()] || {};

//   for (const key in options) {
//     if (Array.isArray(options[key])) {
//       const select = document.createElement("select");
//       select.name = key;
//       options[key].forEach((option) => {
//         const opt = document.createElement("option");
//         opt.value = option;
//         opt.textContent = option;
//         select.appendChild(opt);
//       });

//       // Set the select value from the tracking data
//       if (tracking[key]) {
//         select.value = tracking[key];
//       }

//       // Add event listener to update Firestore on change
//       select.addEventListener("change", function () {
//         updateTrackingInFirestore(taskId, key, select.value);
//         // Highlight the select if it's not "ממתין" or "בירור"
//         if (
//           status.toLowerCase() === "printing" &&
//           select.value !== "ממתין" &&
//           select.value !== "בירור"
//         ) {
//           select.style.backgroundColor = "lightgreen"; // Mark the selection with bright green
//         } else {
//           select.style.backgroundColor = ""; // Remove the background color for other statuses
//         }
//       });

//       // Initial highlighting if already set
//       if (
//         status.toLowerCase() === "printing" &&
//         select.value !== "ממתין" &&
//         select.value !== "בירור"
//       ) {
//         select.style.backgroundColor = "lightgreen";
//       }

//       trackingDiv.appendChild(select);
//     }
//   }

//   return trackingDiv;
// }
function createTrackingDiv(status, tracking = {}, taskId) {
  const trackingDiv = document.createElement("div");
  trackingDiv.className = "tracking";

  const options = statusFields[status.toLowerCase()] || {};

  for (const key in options) {
    if (Array.isArray(options[key])) {
      const select = document.createElement("select");
      select.name = key;
      options[key].forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
      });

      // Set the select value from the tracking data
      if (tracking[key]) {
        select.value = tracking[key];
      }

      // Add event listener to update Firestore on change
      select.addEventListener("change", function () {
        updateTrackingInFirestore(taskId, key, select.value);
        // Highlight the select for "printing" status
        if (
          status.toLowerCase() === "printing" &&
          select.value !== "ממתין" &&
          select.value !== "בירור"
        ) {
          select.style.backgroundColor = "lightgreen"; // Mark the selection with bright green for printing
        }
        // Highlight the select for "update" status
        else if (
          status.toLowerCase() === "update" &&
          select.value === "עודכן"
        ) {
          select.style.backgroundColor = "lightgreen"; // Mark the selection with bright green for update
        }
        // Reset background color if conditions are not met
        else {
          select.style.backgroundColor = ""; // Remove the background color for other statuses
        }
      });

      // Initial highlighting if already set
      if (
        (status.toLowerCase() === "printing" &&
          select.value !== "ממתין" &&
          select.value !== "בירור") ||
        (status.toLowerCase() === "update" && select.value === "עודכן")
      ) {
        select.style.backgroundColor = "lightgreen";
      }

      trackingDiv.appendChild(select);
    }
  }

  return trackingDiv;
}

async function updateTrackingInFirestore(taskId, field, value) {
  try {
    const taskRef = doc(db, "tasksDetails", taskId);
    await updateDoc(taskRef, {
      [`tracking.${field}`]: value,
    });
    console.log(`Updated ${field} to ${value} for task ${taskId}`);
  } catch (error) {
    console.error("Error updating tracking in Firestore:", error);
  }
}

// end status field

// sorter-begin🚦
function populateSorters() {
  const columns = Object.keys(statusFields);

  columns.forEach((columnId) => {
    const sorter = document.querySelector(
      `select[data-column-id="${columnId}"]`
    );
    if (sorter) {
      // Clear existing options
      sorter.innerHTML = '<option value="all">כולם</option>';

      // Populate based on status fields
      const fieldKeys = Object.keys(statusFields[columnId]);

      fieldKeys.forEach((fieldKey) => {
        const options = statusFields[columnId][fieldKey];
        options.forEach((option) => {
          const optElement = document.createElement("option");
          optElement.value = option;
          optElement.textContent = option;
          sorter.appendChild(optElement);
        });
      });
    }
  });
}

function sortTasksByStatus(columnId, selectedStatus) {
  const tasks = document.querySelectorAll(`#${columnId} .task`);
  let visibleTaskCount = 0;

  tasks.forEach((task) => {
    const taskTrackingDiv = task.querySelector(".tracking");

    if (taskTrackingDiv) {
      let taskMatches = false;

      // Check if the selected status matches any of the dropdowns in the tracking div
      const selects = taskTrackingDiv.querySelectorAll("select");
      selects.forEach((select) => {
        if (select.value === selectedStatus || selectedStatus === "all") {
          taskMatches = true;
        }
      });

      // Show or hide the task based on whether it matches
      if (taskMatches) {
        task.style.display = "block";
        visibleTaskCount++;
      } else {
        task.style.display = "none";
      }
    }
  });

  // Update the header with the visible task count
  const header = document.querySelector(`#${columnId} .listHeader h2`);
  header.textContent = `${
    header.textContent.split(" ")[0]
  } (${visibleTaskCount})`;
}

document.addEventListener("DOMContentLoaded", () => {
  populateSorters();

  document.querySelectorAll(".status-sorter").forEach((sorter) => {
    sorter.addEventListener("change", function () {
      const columnId = this.getAttribute("data-column-id");
      const selectedStatus = this.value;
      sortTasksByStatus(columnId, selectedStatus);
    });
  });
});

//sort withc checkbox-
document.addEventListener("DOMContentLoaded", () => {
  // Add event listener to the "בתהליך" checkbox
  const inProcessCheckbox = document.getElementById("inProcessCheckbox");
  inProcessCheckbox.addEventListener("change", function () {
    const columnId = "printing";
    filterTasksByInProcess(columnId, this.checked);
  });
});

function filterTasksByInProcess(columnId, inProcess) {
  const tasks = document.querySelectorAll(`#${columnId} .task`);
  let visibleTaskCount = 0;

  tasks.forEach((task) => {
    const taskTrackingDiv = task.querySelector(".tracking");

    if (taskTrackingDiv) {
      let taskMatches = true;

      // If "בתהליך" is checked, hide tasks with status "ממתין" or "בירור"
      if (inProcess) {
        const selectValue = taskTrackingDiv.querySelector("select").value;
        if (selectValue === "ממתין" || selectValue === "בירור") {
          taskMatches = false;
        }
      }

      // Show or hide the task based on whether it matches
      if (taskMatches) {
        task.style.display = "block";
        visibleTaskCount++;
      } else {
        task.style.display = "none";
      }
    }
  });

  // Update the header with the visible task count
  const header = document.querySelector(`#${columnId} .listHeader h2`);
  header.textContent = `${
    header.textContent.split(" ")[0]
  } (${visibleTaskCount})`;
}
//end sort with checkbox
// sorter-end

//clear modal

document
  .getElementById("clearFieldsButton")
  .addEventListener("click", function () {
    document.getElementById("taskCreator").value = "";
    document.getElementById("taskDueDate").value = "";
    document.getElementById("clientName").value = "";
    document.getElementById("customerEmail").value = "";
    document.getElementById("customerPhone").value = "";
    document.getElementById("orderNumber").value = "";
    document.getElementById("product").value = "";
    document.getElementById("taskFiles").value = "";
    document.getElementById("taskComments").value = "";
  });

//end clear modal

//time sorter begin⏰⏰
// function sortTasksByDate(columnId, selectedDate) {
//   const tasks = document.querySelectorAll(`#${columnId} .task`);
//   const today = new Date().toISOString().split("T")[0];
//   const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
//   const dayAfterTomorrow = new Date(Date.now() + 172800000)
//     .toISOString()
//     .split("T")[0];

//   tasks.forEach((task) => {
//     const dueDateElement = task.querySelector("#moreDetails p:nth-child(3)"); // Adjust the selector as needed
//     if (dueDateElement) {
//       const dueDateText = dueDateElement.textContent
//         .replace("תאריך יעד: ", "")
//         .trim();
//       let showTask = false;

//       if (selectedDate === "all") {
//         showTask = true;
//       } else if (selectedDate === "pastDue") {
//         showTask = dueDateText < today;
//       } else if (selectedDate === "today") {
//         showTask = dueDateText === today;
//       } else if (selectedDate === "tomorrow") {
//         showTask = dueDateText === tomorrow;
//       } else if (selectedDate === "dayAfterTomorrow") {
//         showTask = dueDateText === dayAfterTomorrow;
//       }

//       task.style.display = showTask ? "block" : "none";
//     }
//   });
// }
function sortTasksByDate(columnId, selectedDate) {
  const tasks = document.querySelectorAll(`#${columnId} .task`);
  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  // Calculate two business days from today
  let twoBusinessDays = new Date(Date.now());
  let businessDaysAdded = 0;

  while (businessDaysAdded < 2) {
    twoBusinessDays.setDate(twoBusinessDays.getDate() + 1);
    const dayOfWeek = twoBusinessDays.getDay();
    if (dayOfWeek !== 5 && dayOfWeek !== 6) {
      // Skip Friday (5) and Saturday (6)
      businessDaysAdded++;
    }
  }

  const dayAfterTomorrow = twoBusinessDays.toISOString().split("T")[0];

  tasks.forEach((task) => {
    const dueDateElement = task.querySelector("#moreDetails p:nth-child(3)"); // Adjust the selector as needed
    if (dueDateElement) {
      const dueDateText = dueDateElement.textContent
        .replace("תאריך יעד: ", "")
        .trim();
      let showTask = false;

      if (selectedDate === "all") {
        showTask = true;
      } else if (selectedDate === "pastDue") {
        if (dueDateText < today) {
          showTask = true;
        }
      } else if (selectedDate === "today") {
        showTask = dueDateText === today;
      } else if (selectedDate === "tomorrow") {
        showTask = dueDateText === tomorrow;
      } else if (selectedDate === "dayAfterTomorrow") {
        showTask = dueDateText === dayAfterTomorrow;
      }

      task.style.display = showTask ? "block" : "none";
    }
  });
}

document.querySelectorAll(".date-sorter").forEach((sorter) => {
  sorter.addEventListener("change", function () {
    const selectedDate = this.value;
    const columnId = this.dataset.columnId;
    sortTasksByDate(columnId, selectedDate);
  });
});

//time sorte ends

//statistics begin📅
function countTasksInColumnDelayed(columnId, delay = 1000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const tasks = document.querySelectorAll(`#${columnId} .task`);
      let count = 0;
      const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

      tasks.forEach((task) => {
        const taskId = task.getAttribute("data-task-id");
        const dueDateElement = document.getElementById(`dueDate-${taskId}`);
        if (dueDateElement) {
          const dueDate = dueDateElement.textContent
            .replace("תאריך יעד:", "")
            .trim();
          if (dueDate <= today) {
            count++;
          }
        }
      });

      console.log(`Total tasks due in column ${columnId}: ${count}`);
      resolve(count);
    }, delay);
  });
}

async function updateHeaderCounts() {
  const printCount = await countTasksInColumnDelayed("printing");
  const finishingCount = await countTasksInColumnDelayed("finishing");
  const updateCount = await countTasksInColumnDelayed("update");

  document.getElementById("printCount").textContent = printCount;
  document.getElementById("finishingCount").textContent = finishingCount;
  document.getElementById("updateCount").textContent = updateCount;
}

document.addEventListener("DOMContentLoaded", () => {
  updateHeaderCounts();

  // Update the counts whenever a task is dragged and dropped
  document.querySelectorAll(".column").forEach((column) => {
    column.addEventListener("drop", () => {
      updateHeaderCounts();
    });
  });

  // Update the counts periodically to ensure data is up-to-date
  setInterval(() => {
    updateHeaderCounts();
  }, 60000); // Update every minute
});

//statistics end📅

// JONATHAN TIMER BEGIN⏱⏱⏱⏱
document.addEventListener("keydown", function (event) {
  if (event.key === "End") {
    const timerModal = document.getElementById("timerModal");
    timerModal.style.display = "block";
  }
});

document
  .getElementById("closeTimerButton")
  .addEventListener("click", function () {
    const timerModal = document.getElementById("timerModal");
    timerModal.style.display = "none";
  });

let countdownInterval;

document
  .getElementById("startTimerButton")
  .addEventListener("click", function () {
    const input = document.getElementById("timerInput").value;
    const countdownDisplay = document.getElementById("countdownDisplay");
    const [minutes, seconds] = input.split(":").map(Number);

    let totalSeconds = minutes * 60 + seconds;

    if (isNaN(totalSeconds)) {
      countdownDisplay.textContent = "Invalid Input";
      return;
    }

    clearInterval(countdownInterval); // Clear any existing timer

    countdownInterval = setInterval(() => {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;

      countdownDisplay.textContent = `${String(mins).padStart(2, "0")}:${String(
        secs
      ).padStart(2, "0")}`;

      if (totalSeconds <= 0) {
        clearInterval(countdownInterval);
        countdownDisplay.textContent = "Time's up!";
        const audio = new Audio("https://www.soundjay.com/button/beep-07.wav");
        audio.play();
      }

      totalSeconds -= 1;
    }, 1000);
  });

document
  .getElementById("resetTimerButton")
  .addEventListener("click", function () {
    clearInterval(countdownInterval); // Clear any existing timer
    document.getElementById("timerInput").value = "";
    document.getElementById("countdownDisplay").textContent = "00:00";
  });

// Make the modal draggable
dragElement(document.getElementById("timerModal"));

function dragElement(elmnt) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;
  const header = document.getElementById(elmnt.id + "Header");
  if (header) {
    header.onmousedown = dragMouseDown;
  } else {
    elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    elmnt.style.top = elmnt.offsetTop - pos2 + "px";
    elmnt.style.left = elmnt.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// JONATHAN TIMER END⏱⏱⏱⏱

// statusmodal begin
// Function to open the modal
// Function to open the modal
async function openJLModal(orderNumber) {
  document.getElementById("jl-order-status-modal").style.display = "block";
  await populateJLOrderStatusTable(orderNumber); // Pass the orderNumber to the table population function
}

// Function to close the modal
function closeJLModal() {
  document.getElementById("jl-order-status-modal").style.display = "none";
}

// Attach a click event listener directly to the overlay
document.getElementById("jl-order-status-modal").onclick = function (event) {
  // Close the modal if the overlay (but not the content) is clicked
  if (event.target === document.getElementById("jl-order-status-modal")) {
    closeJLModal();
  }
};

// Close modal when clicking the close button
document.getElementById("jl-close-modal").onclick = function () {
  closeJLModal();
};

// Function to populate the order status table
// async function populateJLOrderStatusTable(orderNumber) {
//   const tableBody = document
//     .getElementById("jl-order-status-table")
//     .querySelector("tbody");
//   tableBody.innerHTML = ""; // Clear existing rows

//   try {
//     // Query the database for tasks with the same order number
//     const q = firestoreQuery(
//       collection(db, "tasksDetails"),
//       where("orderNumber", "==", orderNumber)
//     );

//     const querySnapshot = await getDocs(q);

//     querySnapshot.forEach((doc) => {
//       const taskData = doc.data();

//       const row = document.createElement("tr");

//       const taskNumberCell = document.createElement("td");
//       taskNumberCell.textContent = taskData.TaskCreationNumber || "N/A";
//       row.appendChild(taskNumberCell);

//       const productCell = document.createElement("td");
//       productCell.textContent = taskData.product || "N/A";
//       row.appendChild(productCell);

//       const statusCell = document.createElement("td");
//       statusCell.textContent = taskData.status || "N/A";
//       row.appendChild(statusCell);

//       tableBody.appendChild(row);
//     });
//   } catch (error) {
//     console.error("Error fetching tasks:", error);
//   }
// }
async function populateJLOrderStatusTable(orderNumber) {
  const tableBody = document
    .getElementById("jl-order-status-table")
    .querySelector("tbody");
  tableBody.innerHTML = ""; // Clear existing rows

  try {
    // Query the database for tasks with the same order number
    const q = firestoreQuery(
      collection(db, "tasksDetails"),
      where("orderNumber", "==", orderNumber),
      where("status", "in", ["printing", "finishing", "update"]) // Only include specific statuses
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      let customerName = "";
      let firstTaskData = querySnapshot.docs[0].data();

      if (firstTaskData && firstTaskData.clientName) {
        customerName = firstTaskData.clientName;
      }

      // Update the modal title with order number and customer name
      document.querySelector(
        ".jl-modal-content h2"
      ).textContent = `מצב הזמנה: ${orderNumber} - ${customerName}`;

      // Status translation map
      const statusTranslation = {
        printing: "הדפסה",
        finishing: "גימורים",
        update: "מוכן",
      };

      querySnapshot.forEach((doc) => {
        const taskData = doc.data();

        const row = document.createElement("tr");

        const taskNumberCell = document.createElement("td");
        taskNumberCell.textContent = taskData.TaskCreationNumber || "N/A";
        row.appendChild(taskNumberCell);

        const productCell = document.createElement("td");
        productCell.textContent = taskData.product || "N/A";
        row.appendChild(productCell);

        const statusCell = document.createElement("td");

        // Apply different background colors based on status
        if (taskData.status === "update") {
          statusCell.innerHTML = `<span style="background-color: lightgreen; color: black; padding: 2px 5px; border-radius: 3px;">${
            statusTranslation[taskData.status]
          }</span>`;
        } else if (taskData.status === "finishing") {
          statusCell.innerHTML = `<span style="background-color: orange; color: black; padding: 2px 5px; border-radius: 3px;">${
            statusTranslation[taskData.status]
          }</span>`;
        } else if (taskData.status === "printing") {
          statusCell.innerHTML = `<span style="background-color: yellow; color: black; padding: 2px 5px; border-radius: 3px;">${
            statusTranslation[taskData.status]
          }</span>`;
        } else {
          statusCell.textContent =
            statusTranslation[taskData.status] || taskData.status || "N/A";
        }
        row.appendChild(statusCell);

        tableBody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
  }
}

// statusmodal end

//finishing modal-begin ⚒️⚒️⚒️⚒️
// Function to open the finishing modal
// function openFinishingModal(taskId) {
//   const modal = document.getElementById("finishingModal");
//   const operatorButtonsContainer = document.querySelector(".operator-buttons");

//   // Clear any existing buttons
//   operatorButtonsContainer.innerHTML = "";

//   // Create buttons based on the operator options in statusFields.finishing.operator
//   statusFields.finishing.operator.forEach((operator) => {
//     const button = document.createElement("button");
//     button.textContent = operator;
//     button.className = "operator-button fas fa-user"; // Add Font Awesome icon

//     // Add event listener to each button
//     button.addEventListener("click", function () {
//       // Store the selected operator in Firestore for the task
//       updateTrackingInFirestore(taskId, "finishing", operator);

//       // Close the modal after selection
//       closeFinishingModal();
//     });

//     operatorButtonsContainer.appendChild(button);
//   });

//   // Show the modal
//   modal.style.display = "block";
// }
function openFinishingModal(taskId, draggedTask) {
  const modal = document.getElementById("finishingModal");
  const operatorButtonsContainer = modal.querySelector(".operator-buttons");
  operatorButtonsContainer.innerHTML = ""; // Clear existing buttons

  // Populate buttons with the operators from the statusFields
  statusFields.finishing.operator.forEach((operator) => {
    const button = document.createElement("button");
    button.textContent = operator;
    button.className = "operator-button";

    // Add click event listener to each button
    button.addEventListener("click", () => {
      updateOperatorAndMoveTask(taskId, operator, draggedTask);
    });

    operatorButtonsContainer.appendChild(button);
  });

  modal.style.display = "block";
}

// Function to close the finishing modal
function closeFinishingModal() {
  const modal = document.getElementById("finishingModal");
  modal.style.display = "none";
}

// Add event listener to the close button
document
  .getElementById("closeFinishingModal")
  .addEventListener("click", closeFinishingModal);

// Example: Open the modal when dragging a task to the finishing area
function handleTaskDropInFinishingArea(taskId) {
  openFinishingModal(taskId);
}

// Your existing code to handle the drag and drop should call `handleTaskDropInFinishingArea(taskId)` when a task is dropped into the finishing area.

//finishing modal-end

// 🚛🚛🚛 Begin Update Modal Logic 🚛🚛🚛

function openUpdateModal(taskId) {
  const updateModal = document.getElementById("updateModal");
  updateModal.style.display = "block";

  // Add event listeners for the location buttons
  const locationButtonsContainer = document.querySelector(
    "#updateModal .location-buttons"
  );

  // Clear previous buttons if any
  locationButtonsContainer.innerHTML = "";

  // Create buttons for locations א-ת
  const letters = "אבגדהוזחטיכלמנסעפצקרשת".split("");
  letters.forEach((letter) => {
    const letterButton = document.createElement("button");
    letterButton.textContent = letter;
    letterButton.onclick = function () {
      updateTaskLocation(taskId, this.textContent);
    };
    locationButtonsContainer.appendChild(letterButton);
  });

  // Create a textbox and a button for a custom location
  const customLocationContainer = document.createElement("div");

  const customLocationInput = document.createElement("input");
  customLocationInput.type = "text";
  customLocationInput.placeholder = "הכנס מקום אחר";

  const confirmButton = document.createElement("button");
  confirmButton.textContent = "אשר מקום אחר";
  confirmButton.onclick = function () {
    const customLocation = customLocationInput.value.trim();
    if (customLocation) {
      updateTaskLocation(taskId, customLocation);
    }
  };

  customLocationContainer.appendChild(customLocationInput);
  customLocationContainer.appendChild(confirmButton);
  locationButtonsContainer.appendChild(customLocationContainer);

  // Add a listener to close the modal
  const closeUpdateModal = document.getElementById("closeUpdateModal");
  closeUpdateModal.onclick = function () {
    updateModal.style.display = "none";
  };

  // Add a listener to close the modal if the user clicks outside of it
  window.onclick = function (event) {
    if (event.target === updateModal) {
      updateModal.style.display = "none";
    }
  };
}

// function updateTaskLocation(taskId, location) {
//   // Function to update the task location in Firestore or any database
//   updateTaskFieldInFirestore(taskId, "location", location)
//     .then(() => {
//       // Move the task to its next status or list here if needed
//       // You can also close the modal after updating
//       document.getElementById("updateModal").style.display = "none";
//       console.log(`Task ${taskId} location updated to ${location}`);
//     })
//     .catch((error) => {
//       console.error("Error updating task location: ", error);
//     });
// }
function updateTaskLocation(taskId, location) {
  // Function to update the task location in Firestore
  updateTaskFieldInFirestore(taskId, "location", location)
    .then(() => {
      console.log(`Task ${taskId} location updated to ${location}`);
      // Move the task to its next status or list here if needed
      document.getElementById("updateModal").style.display = "none";

      // Update the task's status to "update" after the location is selected
      updateTaskStatusInFirestore(taskId, "update").then(() => {
        // Optionally, update the task on the UI
        const task = document.querySelector(`[data-task-id="${taskId}"]`);
        const statusElement = task.querySelector("#status");
        statusElement.innerHTML = `<strong>סטטוס:</strong> update`;

        // Optionally, move the task to the "update" column in the UI
        const updateColumn = document.getElementById("update");
        updateColumn.appendChild(task);
      });
    })
    .catch((error) => {
      console.error("Error updating task location: ", error);
    });
}
function updateTaskFieldInFirestore(taskId, fieldName, fieldValue) {
  return updateDoc(doc(db, "tasksDetails", taskId), {
    [fieldName]: fieldValue, // Create or update the field with the specified value
  });
}

// 🚛🚛🚛 End Update Modal Logic 🚛🚛🚛

//comunication functions☎️☎️☎️☎️📲📲###- begin
// async function readyWork(taskId) {
//   try {
//     const taskDoc = await getDoc(doc(db, "tasksDetails", taskId));
//     const taskData = taskDoc.data();

//     if (!taskData) {
//       console.error("Task data not found for taskId:", taskId);
//       return;
//     }

//     // Step 1: Check if the customer has already been informed
//     if (
//       taskData.notificationInfo &&
//       taskData.notificationInfo.sentReadyMessage === "yes"
//     ) {
//       console.log("Customer has already been informed for this task.");
//       return;
//     }

//     const orderNumber = taskData.orderNumber;
//     const clientName = taskData.clientName;
//     const customerEmail = taskData.customerEmail || "none";
//     const customerPhone = taskData.customerPhone || "none";
//     const product = taskData.product || "No product information";
//     const moreThanOneTask = taskData.moreThanOneTask === "yes";

//     // Step 2: Handle the `moreThanOneTask` logic
//     if (moreThanOneTask) {
//       const tasksQuery = query(
//         collection(db, "tasksDetails"),
//         where("orderNumber", "==", orderNumber)
//       );
//       const tasksSnapshot = await getDocs(tasksQuery);

//       let allTasksReady = true;

//       tasksSnapshot.forEach((doc) => {
//         const data = doc.data();
//         if (data.status === "printing" || data.status === "finishing") {
//           allTasksReady = false;
//         }
//       });

//       // If not all tasks are ready, don't send the message
//       if (!allTasksReady) {
//         console.log(`Not all tasks are ready for order number ${orderNumber}.`);
//         return;
//       }
//     }

//     // Build the description with product information
//     const description = `מספר הזמנה: ${orderNumber}, תיאור: ${product}`;

//     const notificationData = {
//       email: customerEmail,
//       phone: customerPhone,
//       name: clientName,
//       description,
//     };

//     const response = await fetch(
//       "https://us-central1-jltaskboard.cloudfunctions.net/readyWorkNotify",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(notificationData),
//       }
//     );

//     const result = await response.text();

//     let sentReadyMessage = "yes";
//     if (result === "wasentSent") {
//       console.error("Failed to send any notification");
//       sentReadyMessage = "no";
//     } else {
//       console.log(
//         `Notification sent for order number ${orderNumber}. Result: ${result}`
//       );
//       // Add this block to update the tracking status to "עודכן"
//       const taskRef = doc(db, "tasksDetails", taskId);
//       await updateDoc(taskRef, {
//         "tracking.status": "עודכן",
//       });
//     }

//     // Add notification data as a nested object in the same document
//     const notificationInfo = {
//       notificationResult: result,
//       sentReadyMessage,
//       timestamp: new Date().toISOString(),
//     };

//     await updateDoc(doc(db, "tasksDetails", taskId), {
//       notificationInfo,
//     });
//   } catch (error) {
//     console.error("Error in readyWork function:", error);
//   }
// }

async function readyWork(taskId) {
  try {
    const taskDoc = await getDoc(doc(db, "tasksDetails", taskId));
    const taskData = taskDoc.data();

    if (!taskData) {
      console.error("Task data not found for taskId:", taskId);
      return;
    }

    // Step 1: Check if the customer has already been informed
    if (
      taskData.notificationInfo &&
      taskData.notificationInfo.sentReadyMessage === "yes"
    ) {
      console.log("Customer has already been informed for this task.");
      return;
    }

    const orderNumber = taskData.orderNumber;
    const clientName = taskData.clientName;
    const customerEmail = taskData.customerEmail || "none";
    const customerPhone = taskData.customerPhone || "none";

    // Initialize a Set to store unique products
    let productsSet = new Set([taskData.product || "No product information"]);
    const moreThanOneTask = taskData.moreThanOneTask === "yes";

    // Step 2: Handle the `moreThanOneTask` logic and collect all unique product descriptions
    if (moreThanOneTask) {
      const tasksQuery = query(
        collection(db, "tasksDetails"),
        where("orderNumber", "==", orderNumber)
      );
      const tasksSnapshot = await getDocs(tasksQuery);

      let allTasksReady = true;

      tasksSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === "printing" || data.status === "finishing") {
          allTasksReady = false;
        }
        if (data.status !== "deleted") {
          productsSet.add(data.product || "No product information");
        }
      });

      // If not all tasks are ready, don't send the message
      if (!allTasksReady) {
        console.log(`Not all tasks are ready for order number ${orderNumber}.`);
        return;
      }
    }

    // Convert the Set to an Array and build the description with unique product information
    const products = Array.from(productsSet);
    const description = `מספר הזמנה: ${orderNumber}, תיאור: ${products.join(
      ", "
    )}`;

    const notificationData = {
      email: customerEmail,
      phone: customerPhone,
      name: clientName,
      description,
    };

    const response = await fetch(
      "https://us-central1-jltaskboard.cloudfunctions.net/readyWorkNotify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationData),
      }
    );

    const result = await response.text();

    let sentReadyMessage = "yes";
    if (result === "wasentSent") {
      console.error("Failed to send any notification");
      sentReadyMessage = "no";
    } else {
      console.log(
        `Notification sent for order number ${orderNumber}. Result: ${result}`
      );
      // Add this block to update the tracking status to "עודכן"
      const taskRef = doc(db, "tasksDetails", taskId);
      await updateDoc(taskRef, {
        "tracking.status": "עודכן",
      });
    }

    // Add notification data as a nested object in the same document
    const notificationInfo = {
      notificationResult: result,
      sentReadyMessage,
      timestamp: new Date().toISOString(),
    };

    await updateDoc(doc(db, "tasksDetails", taskId), {
      notificationInfo,
    });
  } catch (error) {
    console.error("Error in readyWork function:", error);
  }
}

//comunication functions☎️☎️☎️☎️📲📲###- end

//files urls-new🔗🔗-begin
document.getElementById("addUrlLink").addEventListener("click", function () {
  const tableBody = document.querySelector("#urlLinksTable tbody");
  const row = document.createElement("tr");

  // Create 'קישור ל:' input field
  const linkToCell = document.createElement("td");
  const linkToInput = document.createElement("input");
  linkToInput.type = "text";
  linkToInput.placeholder = "הקלד תיאור לקישור";
  linkToCell.appendChild(linkToInput);

  // Create file input for selecting a file
  const fileInputCell = document.createElement("td");
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.addEventListener("change", function () {
    const filePath = prompt(
      "Enter the full file path:",
      fileInput.files[0].path || fileInput.value
    );

    if (filePath) {
      // Create a clickable link that sends the file path to the server
      const link = document.createElement("a");
      link.textContent = filePath.split("\\").pop(); // Display only the file name
      link.title = "לחץ כדי לפתוח את הקובץ";
      link.style.cursor = "pointer";
      link.onclick = function (e) {
        e.preventDefault();

        // Send the file path to the server to open it
        fetch("http://localhost:3000/open-file", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: filePath }),
        })
          .then((response) => {
            if (response.ok) {
              console.log("File opened successfully");
            } else {
              console.error("Error opening file");
            }
          })
          .catch((error) => {
            console.error("Error opening file:", error);
          });
      };

      // Replace the file input with the clickable link
      fileInputCell.innerHTML = "";
      fileInputCell.appendChild(link);
    }
  });
  fileInputCell.appendChild(fileInput);

  // Create 'מחק' button
  const removeCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.textContent = "מחק";
  removeButton.style.backgroundColor = "#f0f0f0";
  removeButton.style.border = "none";
  removeButton.style.borderRadius = "5px";
  removeButton.style.padding = "5px";
  removeButton.style.cursor = "pointer";
  removeButton.addEventListener("click", function () {
    row.remove();
  });
  removeCell.appendChild(removeButton);

  // Create 'ערוך' button
  const editCell = document.createElement("td");
  const editButton = document.createElement("button");
  editButton.textContent = "ערוך";
  editButton.style.backgroundColor = "#f0f0f0";
  editButton.style.border = "none";
  editButton.style.borderRadius = "5px";
  editButton.style.padding = "5px";
  editButton.style.cursor = "pointer";
  editButton.addEventListener("click", function () {
    linkToInput.disabled = !linkToInput.disabled;
  });
  editCell.appendChild(editButton);

  // Append all cells to the row
  row.appendChild(linkToCell);
  row.appendChild(fileInputCell);
  row.appendChild(removeCell);
  row.appendChild(editCell);

  // Append the row to the table body
  tableBody.appendChild(row);
});

//files urls-new🔗🔗-end
