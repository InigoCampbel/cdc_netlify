// Cache DOM elements
const DOM = {
    trainerName: document.getElementById('trainerName'),
    trainerCode: document.getElementById('trainerCode'),
    vendorName: document.getElementById('vendorName'),
    dateFilter: document.getElementById('dateFilter'),
    dateSidebar: document.getElementById('dateSidebar'),
    sessionsContainer: document.getElementById('sessionsContainer'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loaderText: document.getElementById('loaderText'),
    toastContainer: document.getElementById('toastContainer'),
    instructionsList: document.getElementById('instructionsList'),
    toggleInstructions: document.getElementById('toggleInstructions'),
    instructionsContainer: document.getElementById('instructionsContainer'),
    toggleIcon: document.getElementById('toggleIcon')
  };
  
  // API endpoint (kept for fallback purposes)
  const SHEET_URL = "https://script.google.com/macros/s/AKfycbzXrnpFlNMjD3OOqJxc_XCKxP9limJhmQaeSfgfysDRHVabITAQ_bgJsUgIHjf-Z_04/exec";
  
  // Training dates
  const trainingDates = [
      { date: "19-05-2025", day: "Monday" },
      { date: "20-05-2025", day: "Tuesday" },
      { date: "21-05-2025", day: "Wednesday" },
      { date: "22-05-2025", day: "Thursday" },
      { date: "23-05-2025", day: "Friday" }
  ];
  
  // Global variables
  let loadingStartTime = 0;
  const MIN_LOADING_TIME = 2000; // Minimum loading time in milliseconds (2 seconds)
  const ANIMATION_DURATION = 300; // Duration of fade animation in milliseconds
  let trainerId;
  let trainerData = { info: {}, sessions: [], instructions: [] };
  
  const sessionTimings = {
      "Session 1": "09:00 AM to 11:00 AM",
      "Session 2": "11:30 AM to 01:30 PM",
      "Session 3": "02:30 PM to 04:30 PM"
  };
  
  document.addEventListener('DOMContentLoaded', () => {
      // Start loading immediately - the overlay is already visible from HTML
      DOM.loaderText.textContent = "Loading dashboard...";
      loadingStartTime = Date.now();
      
      // Check session and initialize the dashboard
      setTimeout(checkSession, 500); // Small delay to ensure loading animation is visible
      
      // Set up filter buttons and event listeners
      document.getElementById('applyFilter').addEventListener('click', applyDateFilter);
      document.getElementById('resetFilter').addEventListener('click', resetDateFilter);
      document.getElementById('logoutBtn').addEventListener('click', logout);
      
      // Setup information board toggle
      setupInformationBoard();
  });
  
  async function checkSession() {
    try {
      const sessionData = JSON.parse(sessionStorage.getItem('trainerPortalSession') || 'null');
      
      if (!sessionData?.userId || sessionData.expires < Date.now()) {
        showToast('Session expired. Redirecting to login...', 'info');
        setTimeout(redirectToLogin, 2000);
        return;
      }
      
      if (sessionData.role.toLowerCase() !== 'trainer') {
        showToast('Access denied. This dashboard is for trainers only.', 'error');
        setTimeout(redirectToLogin, 3000);
        return;
      }
      
      trainerId = sessionData.userId;
      
      // Initialize dashboard with fresh data
      await initDashboard();
      
    } catch (error) {
      console.error("Session check error:", error);
      showToast('Authentication error. Please login again.', 'error');
      setTimeout(redirectToLogin, 2000);
    }
  }
  
  function redirectToLogin() {
      window.location.href = '../../index.html';
  }
  
  function logout() {
      showToast('Logging out...', 'info');
      setTimeout(() => {
          sessionStorage.removeItem('trainerPortalSession');
          redirectToLogin();
      }, 1000);
  }
  
  async function initDashboard() {
    try {
      // Fetch all trainer data in a single request
      const data = await fetchAllTrainerData(trainerId);
      
      // Store the fetched data
      trainerData.info = data.trainerInfo;
      trainerData.sessions = data.sessions;
      trainerData.instructions = data.instructions;
      
      // Update session storage with the latest data
      const sessionData = JSON.parse(sessionStorage.getItem('trainerPortalSession') || '{}');
      sessionData.trainerData = data;
      sessionStorage.setItem('trainerPortalSession', JSON.stringify(sessionData));
      
      // Set up UI components in parallel
      const setupPromises = [
        displayTrainerInfo(trainerData.info),
        setupDateButtons(),
        populateDateFilter(),
        displayTrainerInstructions(trainerData.instructions)
      ];
      
      await Promise.all(setupPromises);
      
      // Display sessions for the first date by default
      if (trainingDates.length > 0) {
        displaySessions(trainingDates[0].date);
      }
      
      // Hide loading and show success toast after minimum loading time
      hideLoading(() => {
        showToast('Dashboard loaded successfully!', 'success');
      });
      
    } catch (error) {
      console.error("Dashboard initialization error:", error);
      hideLoading(() => {
        showToast('Failed to load dashboard. Please try again.', 'error', true);
      });
    }
  }
  
  async function fetchAllTrainerData(trainerId) {
    try {
      if (!trainerId) {
        throw new Error("Trainer ID is required");
      }
      
      // Add timestamp to prevent browser caching of the API request
      const queryParams = new URLSearchParams({
        action: "getAllData",
        trainerId: trainerId,
        cacheBuster: Date.now() // This ensures we get fresh data on each request
      });
      
      const response = await fetch(`${SHEET_URL}?${queryParams}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch trainer data");
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || "Failed to load trainer data");
      }
      
      return result.data;
      
    } catch (error) {
      console.error("Fetch trainer data error:", error);
      throw error;
    }
  }
  
  function displayTrainerInfo(info) {
      DOM.trainerName.textContent = "Welcome, " + info.trainerName || "Unknown Trainer";
      DOM.trainerCode.textContent = info.trainerCode || trainerId;
      DOM.vendorName.textContent = info.vendor || "N/A";
      
      // Add fade-in animation
      document.querySelectorAll('.trainer-info > *').forEach((element, index) => {
          element.classList.add('fade-in');
          element.style.animationDelay = `${index * 0.1}s`;
      });
  }
  
  function displayTrainerInstructions(instructions) {
    const instructionsList = DOM.instructionsList;
    instructionsList.innerHTML = ""; // Clear loading message
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    if (instructions && instructions.length > 0) {
      instructions.forEach(instruction => {
        const li = document.createElement("li");
        li.className = "instruction-item";
        li.textContent = instruction;
        fragment.appendChild(li);
      });
    } else {
      const li = document.createElement("li");
      li.className = "instruction-item";
      li.textContent = "No instructions available at this time.";
      fragment.appendChild(li);
    }
    
    instructionsList.appendChild(fragment);
  }
  
  function setupDateButtons() {
    DOM.dateSidebar.innerHTML = ''; 
    
    // Create and add the header
    const header = document.createElement('h3');
    header.className = 'date-filter-header';
    header.innerText = 'Date Filter';
    DOM.dateSidebar.appendChild(header);
    
    // Create a fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Create buttons for each date
    trainingDates.forEach((dateInfo, index) => {
      const dateBtn = document.createElement('button');
      dateBtn.className = 'date-button fade-in';
      dateBtn.style.animationDelay = `${index * 0.1}s`;
      dateBtn.setAttribute('data-date', dateInfo.date);
      
      // Format the display date
      const [day, month, year] = dateInfo.date.split('-');
      const displayDate = `${day} May 2025`;
      
      dateBtn.innerHTML = `
        <div class="day-name">${dateInfo.day}</div>
        <div class="date-value">${displayDate}</div>
      `;
      
      fragment.appendChild(dateBtn);
    });
    
    // Add all buttons at once
    DOM.dateSidebar.appendChild(fragment);
    
    // Single event listener for all date buttons using event delegation
    DOM.dateSidebar.addEventListener('click', (e) => {
      const dateBtn = e.target.closest('.date-button');
      if (!dateBtn) return;
      
      // Remove active class from all buttons
      document.querySelectorAll('.date-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active class to clicked button
      dateBtn.classList.add('active');
      
      // Show sessions for the selected date
      displaySessions(dateBtn.getAttribute('data-date'));
    });
    
    // Set first button as active by default
    const firstDateButton = DOM.dateSidebar.querySelector('.date-button');
    if (firstDateButton) {
      firstDateButton.classList.add('active');
    }
  }
  
  function populateDateFilter() {
      const dateFilterSelect = DOM.dateFilter;
      
      // Clear any existing options except the first one
      while (dateFilterSelect.options.length > 1) {
          dateFilterSelect.remove(1);
      }
      
      // Add "All Dates" as the first option
      const allDatesOption = dateFilterSelect.options[0];
      allDatesOption.value = "";
      allDatesOption.textContent = "All Dates";
      
      // Use document fragment for better performance
      const fragment = document.createDocumentFragment();
      
      // Extract unique dates from training dates and add them as options
      trainingDates.forEach((dateInfo, index) => {
          const option = document.createElement('option');
          option.value = dateInfo.date;
          option.textContent = `${dateInfo.day} (${dateInfo.date})`;
          
          // Set the first date (19 May 2025) as selected by default
          if (index === 0) {
              option.selected = true;
          }
          
          fragment.appendChild(option);
      });
      
      // Add all options at once
      dateFilterSelect.appendChild(fragment);
      
      // Update the active button in sidebar to match the selected date
      document.querySelectorAll('.date-button').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-date') === trainingDates[0].date);
      });
  }
  
  function applyDateFilter() {
    const selectedDate = DOM.dateFilter.value;
    
    if (selectedDate) {
      // Update active button in sidebar
      document.querySelectorAll('.date-button').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-date') === selectedDate);
      });
      
      // Display sessions for selected date
      displaySessions(selectedDate);
    } else {
      // Show all sessions
      displaySessions();
    }
  }
  
  function resetDateFilter() {
    DOM.dateFilter.value = "";
    displaySessions();
  }
  
  function displaySessions(selectedDate = null) {
    DOM.sessionsContainer.innerHTML = '';
    
    // If specific date selected, only show that date's sessions
    const datesToShow = selectedDate ? 
      [trainingDates.find(d => d.date === selectedDate)] : 
      trainingDates;
      
    if (!datesToShow.length) return;
    
    // Use document fragment for better performance
    const fragment = document.createDocumentFragment();
    
    // Process each date
    datesToShow.forEach(dateInfo => {
      // Create date header
      const dateHeader = document.createElement('div');
      dateHeader.className = 'session-date-header fade-in';
      dateHeader.textContent = `${dateInfo.day} (${dateInfo.date})`;
      fragment.appendChild(dateHeader);
      
      // Find sessions for this date
      const dateSessions = trainerData.sessions.filter(session => session.date === dateInfo.date);
      
      // Create session map for fast lookup
      const sessionMap = new Map();
      dateSessions.forEach(session => {
        sessionMap.set(session.sessionNumber, session);
      });
      
      // Create cards for all three sessions
      for (let i = 1; i <= 3; i++) {
        const sessionNumber = `Session ${i}`;
        const sessionCard = document.createElement('div');
        sessionCard.className = 'session-card fade-in';
        sessionCard.style.animationDelay = `${i * 0.1}s`;
        
        // Check if session exists for this slot
        if (sessionMap.has(sessionNumber)) {
          sessionCard.innerHTML = createSessionCardContent(sessionMap.get(sessionNumber));
        } else {
          sessionCard.className = 'session-card no-session fade-in';
          sessionCard.innerHTML = createEmptySessionCardContent(sessionNumber);
        }
        
        fragment.appendChild(sessionCard);
      }
    });
    
    // Add all elements at once
    DOM.sessionsContainer.appendChild(fragment);
  }
  
  function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.toggle("hidden");
      
      // Close when clicking outside
      if (!modal.classList.contains("hidden")) {
        const closeOnOutsideClick = function(e) {
          if (!modal.contains(e.target) && !e.target.classList.contains('view-departments-btn')) {
            modal.classList.add("hidden");
            document.removeEventListener('click', closeOnOutsideClick);
          }
        };
        
        document.addEventListener('click', closeOnOutsideClick);
      }
    }
  }
  
  function createSessionCardContent(session) {
    const deptArray = (session.departments || "").split("|").map(dep => dep.trim()).filter(Boolean);
    const deptCount = deptArray.length;
    const modalId = `modal-${session.date}-${session.sessionNumber.replace(/\s+/g, '-')}`;
    
    return `
      <div class="session-time">${session.sessionNumber}: ${sessionTimings[session.sessionNumber]}</div>
      <div class="session-details">
        <div class="session-detail">
          <div class="detail-label">Topic: </div>
          <div class="detail-value">${session.topic || 'N/A'}</div>
        </div>
        <div class="session-detail">
          <div class="detail-label">Venue: </div>
          <div class="detail-value">${session.venue || 'N/A'}</div>
        </div>
        <div class="session-detail">
          <div class="detail-label">Duration: </div>
          <div class="detail-value">${session.duration || '0'} hour(s)</div>
        </div>
        <div class="session-detail">
          <div class="detail-label">Batch: </div>
          <div class="detail-value">${session.batch || 'N/A'}</div>
        </div>
        <div class="session-detail">
          <div class="detail-label">Departments: </div>
          <div class="detail-value">${deptCount} department(s)
            <button class="view-departments-btn" onclick="toggleModal('${modalId}')">View</button>
          </div>
        </div>
        <div class="session-detail">
          <div class="detail-label">Student Count: </div>
          <div class="detail-value">${session.studentCount || '0'}</div>
        </div>
      </div>
      ${session.pptLink ? `
        <a href="${session.pptLink}" target="_blank" class="download-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PPT
        </a>
      ` : ''}
  
      <div class="department-modal hidden" id="${modalId}">
        <div class="modal-content">
          <h3>Departments</h3>
          <ul>${deptArray.map(dep => `<li>${dep}</li>`).join('')}</ul>
        </div>
        <button class="modal-close-btn" onclick="toggleModal('${modalId}')">x</button>
      </div>
    `;
  }
  
  function createEmptySessionCardContent(sessionNumber) {
      return `
          <div class="session-time">${sessionNumber}: ${sessionTimings[sessionNumber]}</div>
          <div class="session-detail">
              <div class="detail-value">No session scheduled for this slot</div>
          </div>
      `;
  }
  
  function setupInformationBoard() {
    const toggleBtn = document.getElementById('toggleInstructions');
    const instructionsContainer = document.getElementById('instructionsContainer');
    
    if (!toggleBtn || !instructionsContainer) {
      console.warn("Information board elements not found in the DOM");
      return;
    }
    
    // Remove any existing event listeners by cloning and replacing the button
    const newToggleBtn = toggleBtn.cloneNode(true);
    toggleBtn.parentNode.replaceChild(newToggleBtn, toggleBtn);
    
    // Set initial state from localStorage (default to shown)
    const instructionsHidden = localStorage.getItem("instructionsHidden") === "true";
    if (instructionsHidden) {
      instructionsContainer.classList.add("hidden");
      newToggleBtn.textContent = "View";
    } else {
      instructionsContainer.classList.remove("hidden");
      newToggleBtn.textContent = "Hide";
    }
    
    // Add toggle functionality
    newToggleBtn.addEventListener("click", function() {
      const isHidden = instructionsContainer.classList.toggle("hidden");
      localStorage.setItem("instructionsHidden", isHidden);
      newToggleBtn.textContent = isHidden ? "View" : "Hide";
    });
  }
  
  function hideLoading(successCallback = null) {
      const loadingOverlay = DOM.loadingOverlay;
      const currentTime = Date.now();
      const elapsedTime = currentTime - loadingStartTime;
      
      // Calculate remaining time to meet minimum loading duration
      const remainingTime = Math.max(0, MIN_LOADING_TIME - elapsedTime);
      
      // If we need to wait longer, set a timeout
      if (remainingTime > 0) {
          setTimeout(() => {
              // Apply fade-out animation
              loadingOverlay.classList.add('fade-out');
              
              // After animation completes, hide the overlay
              setTimeout(() => {
                  loadingOverlay.style.display = 'none';
                  loadingOverlay.classList.remove('fade-out');
                  
                  // Execute success callback if provided
                  if (typeof successCallback === 'function') {
                      successCallback();
                  }
              }, ANIMATION_DURATION);
          }, remainingTime);
      } else {
          // If minimum time has already passed, hide immediately with animation
          loadingOverlay.classList.add('fade-out');
          setTimeout(() => {
              loadingOverlay.style.display = 'none';
              loadingOverlay.classList.remove('fade-out');
              
              // Execute success callback if provided
              if (typeof successCallback === 'function') {
                  successCallback();
              }
          }, ANIMATION_DURATION);
      }
  }
  
  function showToast(message, type = 'info', withRetry = false) {
      const toastContainer = DOM.toastContainer;
      
      // Create toast element
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      
      // Add icon based on type
      let icon = '';
      switch(type) {
          case 'success':
              icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
              break;
          case 'error':
              icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
              break;
          default:
              icon = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
      }
      
      // Create toast content
      let toastContent = `
          ${icon}
          <div class="toast-content">${message}</div>
          <button class="toast-close">x</button>
      `;
      
      // Add retry button if needed
      if (withRetry) {
          toastContent += `<button id="retryBtn" class="retry-btn">Retry</button>`;
      }
      
      toast.innerHTML = toastContent;
      
      // Add toast to container
      toastContainer.appendChild(toast);
      
      // Show toast with animation
      setTimeout(() => {
          toast.classList.add('show');
      }, 10);
      
      // Set up close button
      toast.querySelector('.toast-close').addEventListener('click', () => {
          closeToast(toast);
      });
      
      // Set up retry button if present
      if (withRetry) {
          toast.querySelector('#retryBtn').addEventListener('click', () => {
              closeToast(toast);
              initDashboard();
          });
      }
      
      // Auto close after 5 seconds if not an error
      if (type !== 'error') {
          setTimeout(() => {
              if (toastContainer.contains(toast)) {
                  closeToast(toast);
              }
          }, 5000);
      }
  }
  
  function closeToast(toast) {
      toast.classList.remove('show');
      setTimeout(() => {
          if (toast && toast.parentElement) {
              toast.parentElement.removeChild(toast);
          }
      }, 300);
  }
  
  // Expose global functions for inline onclick handlers
  window.toggleModal = toggleModal;