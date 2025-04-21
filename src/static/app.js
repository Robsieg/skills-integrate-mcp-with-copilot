document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Toolbar elements
  const searchBar = document.getElementById("search-bar");
  const categoryFilter = document.getElementById("category-filter");
  const sortOptions = document.getElementById("sort-options");

  // Add Activity button and modal elements
  const addActivityButton = document.getElementById("add-activity-button");
  const addActivityModal = document.getElementById("add-activity-modal");
  const addActivityForm = document.getElementById("add-activity-form");

  // Function to filter and sort activities
  function filterAndSortActivities(activities) {
    const searchQuery = searchBar.value.toLowerCase();
    const selectedCategory = categoryFilter.value;
    const sortBy = sortOptions.value;

    let filteredActivities = Object.entries(activities).filter(([name, details]) => {
      const matchesSearch = name.toLowerCase().includes(searchQuery) || details.description.toLowerCase().includes(searchQuery);
      const matchesCategory = !selectedCategory || details.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortBy === "name") {
      filteredActivities.sort(([nameA], [nameB]) => nameA.localeCompare(nameB));
    } else if (sortBy === "schedule") {
      filteredActivities.sort(([, detailsA], [, detailsB]) => detailsA.schedule.localeCompare(detailsB.schedule));
    }

    return Object.fromEntries(filteredActivities);
  }

  // Update activities list on filter/sort change
  function updateActivitiesDisplay() {
    fetchActivities();
  }

  searchBar.addEventListener("input", updateActivitiesDisplay);
  categoryFilter.addEventListener("change", updateActivitiesDisplay);
  sortOptions.addEventListener("change", updateActivitiesDisplay);

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      const filteredAndSortedActivities = filterAndSortActivities(activities);

      // Clear loading message
      activitiesList.innerHTML = "";

      // Clear existing options in the dropdown
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(filteredAndSortedActivities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Updated handleUnregister to check login status before allowing unregistration
  async function handleUnregister(event) {
    const isTeacherLoggedIn = localStorage.getItem('isTeacherLoggedIn') === 'true';

    if (!isTeacherLoggedIn) {
        alert('You must be logged in as a teacher to unregister participants.');
        return;
    }

    const button = event.target;
    const activity = button.getAttribute('data-activity');
    const email = button.getAttribute('data-email');

    try {
        const response = await fetch(
            `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
            {
                method: 'DELETE',
            }
        );

        const result = await response.json();

        if (response.ok) {
            messageDiv.textContent = result.message;
            messageDiv.className = 'success';

            // Refresh activities list to show updated participants
            fetchActivities();
        } else {
            messageDiv.textContent = result.detail || 'An error occurred';
            messageDiv.className = 'error';
        }

        messageDiv.classList.remove("hidden");

        // Hide message after 5 seconds
        setTimeout(() => {
            messageDiv.classList.add("hidden");
        }, 5000);
    } catch (error) {
        messageDiv.textContent = 'Failed to unregister. Please try again.';
        messageDiv.className = 'error';
        messageDiv.classList.remove("hidden");
        console.error('Error unregistering:', error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Function to toggle the login modal
  function toggleLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
  }

  // Toggle Add Activity modal
  function toggleAddActivityModal() {
    addActivityModal.style.display = addActivityModal.style.display === "block" ? "none" : "block";
  }

  // Display a brief message for invalid login
  function showTemporaryMessage(message, duration = 3000) {
    const loginError = document.getElementById('login-error');
    loginError.textContent = message;
    loginError.style.display = 'block';

    setTimeout(() => {
        loginError.style.display = 'none';
    }, duration);
  }

  // Handle login form submission
  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const passwordField = document.getElementById('password');
    const password = passwordField.value;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        toggleLoginModal();
        localStorage.setItem('isTeacherLoggedIn', 'true');
        location.reload(); // Reload the page
      } else {
        showTemporaryMessage(result.message); // Show invalid login message briefly
        passwordField.value = ''; // Clear the password field
      }
    } catch (error) {
      console.error('Error logging in:', error);
    }
  });

  // Ensure the toggleLoginModal function is properly attached to the user icon
  const userIcon = document.getElementById('user-icon');
  if (userIcon) {
      userIcon.addEventListener('click', toggleLoginModal);
  }

  // Ensure the close button in any modal properly closes the respective modal
  const closeModalButtons = document.querySelectorAll('.modal .close');
  closeModalButtons.forEach(button => {
      button.addEventListener('click', (event) => {
          const modal = event.target.closest('.modal');
          if (modal) {
              modal.style.display = 'none';
          }
      });
  });

  // Toggle login mode between login and logout
  const loginButton = document.getElementById('login-button');
  if (loginButton) {
      loginButton.addEventListener('click', () => {
          const isTeacherLoggedIn = localStorage.getItem('isTeacherLoggedIn') === 'true';
          if (isTeacherLoggedIn) {
              localStorage.setItem('isTeacherLoggedIn', 'false'); // Log out
              alert('You have been logged out.');
              restrictActions(); // Update UI based on login status
          } else {
              toggleLoginModal(); // Show login modal
          }
      });
  }

  // Update Add Activity form layout to include start and end time fields
  addActivityForm.innerHTML = `
    <label for="activity-name">Name:</label>
    <input type="text" id="activity-name" name="activity-name" required>

    <label for="activity-description">Description:</label>
    <textarea id="activity-description" name="activity-description" required></textarea>

    <label for="activity-start-time">Start Time:</label>
    <input type="text" id="activity-start-time" name="activity-start-time" required>

    <label for="activity-end-time">End Time:</label>
    <input type="text" id="activity-end-time" name="activity-end-time" required>

    <label for="activity-category">Category:</label>
    <select id="activity-category" name="activity-category" required>
      <option value="">-- Select a category --</option>
    </select>

    <label for="activity-max-participants">Max Participants:</label>
    <input type="number" id="activity-max-participants" name="activity-max-participants" required>

    <button type="submit">Add Activity</button>
  `;

  // Handle Add Activity form submission
  addActivityForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("activity-name").value;
    const description = document.getElementById("activity-description").value;
    const startTime = document.getElementById("activity-start-time").value;
    const endTime = document.getElementById("activity-end-time").value;
    const category = document.getElementById("activity-category").value;
    const maxParticipants = document.getElementById("activity-max-participants").value;

    try {
      const response = await fetch("/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          start_time: startTime,
          end_time: endTime,
          category,
          max_participants: parseInt(maxParticipants, 10),
        }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(result.message);
        toggleAddActivityModal();
        fetchActivities(); // Refresh activities list
      } else {
        alert(result.detail || "Failed to add activity.");
      }
    } catch (error) {
      console.error("Error adding activity:", error);
      alert("An error occurred. Please try again.");
    }
  });

  // Attach event listener to Add Activity button
  addActivityButton.addEventListener("click", () => {
    toggleAddActivityModal();
    populateCategoryDropdown();
  });

  // Updated restrictActions to ensure delete buttons are properly hidden
  function restrictActions() {
    const isTeacherLoggedIn = localStorage.getItem("isTeacherLoggedIn") === "true";
    addActivityButton.style.display = isTeacherLoggedIn ? "inline-block" : "none";

    // Select all restricted buttons (e.g., delete buttons)
    const restrictedButtons = document.querySelectorAll('.delete-btn');
    // Show or hide buttons based on login status

    restrictedButtons.forEach(button => {
        if (isTeacherLoggedIn) {
            button.style.display = 'inline-block'; // Show buttons for logged-in teachers
        } else {
            button.style.display = 'none'; // Hide buttons for non-logged-in users
        }
    });
  }

  // Call restrictActions on page load and after login/logout
  window.onload = restrictActions;

  // Function to populate category dropdown
  async function populateCategoryDropdown() {
    try {
      const response = await fetch('/activities');
      const activities = await response.json();

      const categories = new Set();
      Object.values(activities).forEach(activity => {
        if (activity.category) {
          categories.add(activity.category);
        }
      });

      const categoryDropdown = document.getElementById('activity-category');
      categoryDropdown.innerHTML = '<option value="">-- Select a category --</option>';

      categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categoryDropdown.appendChild(option);
      });
    } catch (error) {
      console.error('Error fetching activities for categories:', error);
    }
  }

  // Initialize app
  fetchActivities();

  // Update Add Activity form layout to include start and end time fields
  addActivityForm.innerHTML = `
    <label for="activity-name">Name:</label>
    <input type="text" id="activity-name" name="activity-name" required>

    <label for="activity-description">Description:</label>
    <textarea id="activity-description" name="activity-description" required></textarea>

    <label for="activity-start-time">Start Time:</label>
    <input type="text" id="activity-start-time" name="activity-start-time" required>

    <label for="activity-end-time">End Time:</label>
    <input type="text" id="activity-end-time" name="activity-end-time" required>

    <label for="activity-category">Category:</label>
    <select id="activity-category" name="activity-category" required>
      <option value="">-- Select a category --</option>
    </select>

    <label for="activity-max-participants">Max Participants:</label>
    <input type="number" id="activity-max-participants" name="activity-max-participants" required>

    <button type="submit">Add Activity</button>
  `;

  // Initialize Flatpickr for the start and end time input fields
  flatpickr("#activity-start-time", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
  });

  flatpickr("#activity-end-time", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:i",
  });

  addActivityForm.style.display = "flex";
  addActivityForm.style.flexDirection = "column";
  addActivityForm.style.gap = "15px";
});
