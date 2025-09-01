// REPLACE THESE WITH YOUR SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://wetnbnemedzyzudvuihb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldG5ibmVtZWR6eXp1ZHZ1aWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MjM2ODksImV4cCI6MjA3MDQ5OTY4OX0.53iKjcKaImIz10H8hJv0MkDl08R8Pu8OprDcURqSmRQ';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let allSessionData = [];
let filteredSessionData = [];
let currentUser = null;
let userType = null;
let realtimeSubscription = null;

// Filter state
let selectedPartners = [];
let selectedDates = [];
let selectedSessions = []
let selectedBlocks = [];
let selectedVenues = [];
let selectedTrainers = [];
let selectedReached = ['Yes', 'No']; 

// Available options
let availablePartners = [];
let availableDates = [];
let availableBlocks = [];
let availableVenues = [];
let availableTrainers = [];
let availableReached = ['Yes', 'No'];

// DOM elements - cache frequently used elements
const loginContainer = document.getElementById('loginContainer');
const coordinatorIdInput = document.getElementById('coordinatorId');
const loginBtn = document.getElementById('loginBtn');
const clearBtn = document.getElementById('clearBtn');
const logoutBtn = document.getElementById('logoutBtn');
const errorMessage = document.getElementById('errorMessage');
const loadingContainer = document.getElementById('loadingContainer');
const coordinatorInfo = document.getElementById('coordinatorInfo');
const coordinatorName = document.getElementById('coordinatorName');
const coordinatorType = document.getElementById('coordinatorType');

// Filter elements
const trainingPartnerRow = document.getElementById('trainingPartnerRow');
const partnerOptions = document.getElementById('partnerOptions');
const selectAllPartners = document.getElementById('selectAllPartners');
const dateOptions = document.getElementById('dateOptions');
const selectAllDates = document.getElementById('selectAllDates');
const sessionOptions = document.getElementById('sessionOptions');
const selectAllSessions = document.getElementById('selectAllSessions');
const blockOptions = document.getElementById('blockOptions');
const selectAllBlocks = document.getElementById('selectAllBlocks');
const venueOptions = document.getElementById('venueOptions');
const selectAllVenues = document.getElementById('selectAllVenues');
const trainerOptions = document.getElementById('trainerOptions');
const selectAllTrainers = document.getElementById('selectAllTrainers');
const reachedOptions = document.getElementById('reachedOptions');
const selectAllReached = document.getElementById('selectAllReached');

const applyFilterBtn = document.getElementById('applyFilter');
const clearFilterBtn = document.getElementById('clearFilter');
const applySecondaryFilterBtn = document.getElementById('applySecondaryFilter');
const secondaryFilters = document.getElementById('secondaryFilters');

// Table elements
const sessionTableBody = document.getElementById('sessionTableBody');
const totalTrainersEl = document.getElementById('totalTrainers');
const trainersReachedEl = document.getElementById('trainersReached');
const trainersYetToReachEl = document.getElementById('trainersYetToReach');

// Modal elements
const sessionDetailsModal = document.getElementById('sessionDetailsModal');
const closeModalBtn = document.getElementById('closeModal');
const sessionDetailsContent = document.getElementById('sessionDetailsContent');

// Other elements
const toggleInstructionsBtn = document.getElementById('toggleInstructions');
const instructionsContent = document.getElementById('instructionsContent');

function formatDateToDDMMMYYYY(dateString) {
    const date = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

// Enhanced session persistence with mobile browser handling
function saveUserSession(user, userTypeValue) {
    const sessionData = {
        user: user,
        userType: userTypeValue,
        timestamp: Date.now(),
        // Set expiration to 8 hours
        expiresAt: Date.now() + (8 * 60 * 60 * 1000)
    };
    
    // Use both sessionStorage and localStorage for redundancy
    sessionStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('userSession', JSON.stringify(sessionData));
    
    // Also save to a cookie as fallback for extreme cases
    const expires = new Date(Date.now() + (8 * 60 * 60 * 1000)).toUTCString();
    document.cookie = `userSession=${encodeURIComponent(JSON.stringify(sessionData))}; expires=${expires}; path=/; SameSite=Strict`;
}

function getUserSession() {
    // Try sessionStorage first (fastest)
    let savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        return JSON.parse(savedUser);
    }
    
    // Try localStorage
    const sessionData = localStorage.getItem('userSession');
    if (sessionData) {
        const parsed = JSON.parse(sessionData);
        
        // Check if session is still valid
        if (Date.now() < parsed.expiresAt) {
            // Restore to sessionStorage for faster access
            sessionStorage.setItem('currentUser', JSON.stringify(parsed.user));
            return parsed.user;
        } else {
            // Clean up expired session
            localStorage.removeItem('userSession');
        }
    }
    
    // Try cookie as last resort
    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(cookie => cookie.trim().startsWith('userSession='));
    if (sessionCookie) {
        try {
            const sessionData = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));
            if (Date.now() < sessionData.expiresAt) {
                // Restore to both storages
                sessionStorage.setItem('currentUser', JSON.stringify(sessionData.user));
                localStorage.setItem('userSession', JSON.stringify(sessionData));
                return sessionData.user;
            } else {
                // Clean up expired cookie
                document.cookie = 'userSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
            }
        } catch (e) {
            console.error('Error parsing session cookie:', e);
        }
    }
    
    return null;
}

function clearUserSession() {
    // Clear all session data
    sessionStorage.removeItem('currentUser');
    localStorage.removeItem('userSession');
    document.cookie = 'userSession=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    // Also clear saved filters
    sessionStorage.removeItem('savedFilters');
    localStorage.removeItem('savedFilters');
}

// Enhanced page visibility handling for mobile browsers
function handlePageVisibility() {
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page is being hidden - save current state
            if (currentUser) {
                saveUserSession(currentUser, userType);
                
                // Save current filters to localStorage as well
                const filterData = sessionStorage.getItem('savedFilters');
                if (filterData) {
                    localStorage.setItem('savedFilters', filterData);
                }
            }
        } else {
            // Page is visible again - restore state if needed
            if (!currentUser) {
                const savedUser = getUserSession();
                if (savedUser) {
                    currentUser = savedUser;
                    userType = getUserType(currentUser.id);
                    coordinatorName.textContent = currentUser.name;
                    coordinatorType.textContent = userType;
                    showMainContent();
                    setupUserInterface();
                }
            }
        }
    });
}

// Enhanced beforeunload handler for mobile
function handleBeforeUnload() {
    window.addEventListener('beforeunload', function() {
        if (currentUser) {
            saveUserSession(currentUser, userType);
            
            // Save current filters
            const filterData = sessionStorage.getItem('savedFilters');
            if (filterData) {
                localStorage.setItem('savedFilters', filterData);
            }
        }
    });
    
    // Also handle pagehide event which is more reliable on mobile
    window.addEventListener('pagehide', function() {
        if (currentUser) {
            saveUserSession(currentUser, userType);
            
            const filterData = sessionStorage.getItem('savedFilters');
            if (filterData) {
                localStorage.setItem('savedFilters', filterData);
            }
        }
    });
}

// Enhanced filter saving with localStorage backup
function saveCurrentFiltersEnhanced() {
    const filterData = {
        selectedPartners,
        selectedDates,
        selectedSessions,
        selectedBlocks,
        selectedVenues,
        selectedTrainers,
        selectedReached,
        expiresAt: Date.now() + (2 * 60 * 60 * 1000)
    };
    
    // Save to both storages
    sessionStorage.setItem('savedFilters', JSON.stringify(filterData));
    localStorage.setItem('savedFilters', JSON.stringify(filterData));
}

// Enhanced filter restoration
function restoreFiltersFromStorage() {
    let savedFilters = sessionStorage.getItem('savedFilters');
    
    // If not in sessionStorage, try localStorage
    if (!savedFilters) {
        savedFilters = localStorage.getItem('savedFilters');
        if (savedFilters) {
            // Restore to sessionStorage for faster access
            sessionStorage.setItem('savedFilters', savedFilters);
        }
    }
    
    return savedFilters;
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    hideMainContent();
    
    // Set up page visibility and unload handlers
    handlePageVisibility();
    handleBeforeUnload();
    
    // Check for existing session with enhanced method
    const savedUser = getUserSession();
    if (savedUser) {
        currentUser = savedUser;
        userType = getUserType(currentUser.id);
        coordinatorName.textContent = currentUser.name;
        coordinatorType.textContent = userType;
        
        showMainContent();
        setupUserInterface();
    }
});

function initializeEventListeners() {
    loginBtn.addEventListener('click', loginCoordinator);
    clearBtn.addEventListener('click', clearLoginForm);
    logoutBtn.addEventListener('click', logout);
    coordinatorIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') loginCoordinator();
    });
    
    applyFilterBtn.addEventListener('click', applyPrimaryFilters);
    clearFilterBtn.addEventListener('click', clearAllFilters);
    applySecondaryFilterBtn.addEventListener('click', applySecondaryFiltersWithUpdate);
    
    closeModalBtn.addEventListener('click', closeModal);
    toggleInstructionsBtn.addEventListener('click', toggleInstructions);
    
    initializeFilterListeners();
}

// Login functions
function validateCoordinatorId(id) {
    if (!id || id.trim() === '') {
        return { valid: false, message: 'Please enter a Coordinator ID' };
    }
    
    const trimmedId = id.replace(/\s+/g, '').toUpperCase();
    const patterns = [/^FACE\d{2}$/, /^SP\d{2}$/, /^LND\d{2}$/];
    const isValid = patterns.some(pattern => pattern.test(trimmedId));
    
    if (!isValid) {
        return { valid: false, message: 'Invalid Coordinator ID' };
    }
    
    return { valid: true, value: trimmedId };
}

function getUserType(coordinatorId) {
    if (coordinatorId.startsWith('FACE')) return 'FACE';
    if (coordinatorId.startsWith('SP')) return 'SP';
    if (coordinatorId.startsWith('LND')) return 'LND';
    return null;
}

function getTrainingPartnerForUser(userType) {
    switch(userType) {
        case 'FACE': return 'FACE';
        case 'SP': return 'Six Phrase';
        case 'LND': return null;
        default: return null;
    }
}

async function loginCoordinator() {
    const coordinatorIdResult = validateCoordinatorId(coordinatorIdInput.value);
    
    if (!coordinatorIdResult.valid) {
        showError(coordinatorIdResult.message);
        return;
    }
    
    try {
        showLoading('Logging in...');
        
        currentUser = {
            id: coordinatorIdResult.value,
            name: `Coordinator ${coordinatorIdResult.value}`
        };
        
        userType = getUserType(currentUser.id);
        
        // Enhanced session saving
        saveUserSession(currentUser, userType);
        
        coordinatorName.textContent = currentUser.name;
        coordinatorType.textContent = userType;
        
        showMainContent();
        setupUserInterface();
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showError(error.message || 'Login failed. Please try again.');
    }
}

function logout() {
    // Clear all stored data from all storage types
    clearUserSession();
    sessionStorage.removeItem('instructionsHidden');
    sessionStorage.removeItem('filtersHidden');
    
    // Reset state
    currentUser = null;
    userType = null;
    
    clearAllFilters();
    clearLoginForm();
    hideMainContent();
    loginContainer.style.display = 'block';
    
    // Cleanup
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
        realtimeSubscription = null;
    }

    const toggleButton = document.getElementById('toggleFilters');
    if (toggleButton) {
        toggleButton.remove();
    }
    
    // Clear data arrays
    allSessionData = [];
    filteredSessionData = [];
    availablePartners = [];
    availableDates = [];
    availableBlocks = [];
    availableVenues = [];
    availableTrainers = [];
}

function clearLoginForm() {
    coordinatorIdInput.value = '';
    errorMessage.style.display = 'none';
}

// UI functions
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

function showLoading(message = 'Loading...') {
    loadingContainer.querySelector('.loading-text').textContent = message;
    loadingContainer.style.display = 'flex';
}

function hideLoading() {
    loadingContainer.style.display = 'none';
}

function hideMainContent() {
    document.querySelectorAll('.information-board, .filter-section, .secondary-filter-section, .session-table-container, .stats-grid')
        .forEach(el => el.style.display = 'none');
    coordinatorInfo.style.display = 'none';
    logoutBtn.style.display = 'none';
}

function showMainContent() {
    document.querySelectorAll('.information-board, .filter-section')
        .forEach(el => el.style.display = 'block');
    coordinatorInfo.style.display = 'block';
    logoutBtn.style.display = 'block';
    loginContainer.style.display = 'none';
}

function createToggleButton() {
    const filterSection = document.querySelector('.filter-section');
    const secondaryFilterSection = document.querySelector('.secondary-filter-section');

    if (!document.getElementById('toggleFilters')) {
        const toggleButton = document.createElement('button');
        toggleButton.id = 'toggleFilters';
        toggleButton.className = 'toggle-filters-btn';
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Hide Filters';
        
        filterSection.parentNode.insertBefore(toggleButton, filterSection);
        
        toggleButton.addEventListener('click', function() {
            const isHidden = filterSection.style.display === 'none';
            
            if (isHidden) {
                filterSection.style.display = 'block';
                
                const hasLoadedData = allSessionData && allSessionData.length > 0;
                if (hasLoadedData) {
                    secondaryFilterSection.style.display = 'block';
                }
                
                this.innerHTML = '<i class="fas fa-filter"></i> Hide Filters';
                sessionStorage.setItem('filtersHidden', 'false');
            } else {
                filterSection.style.display = 'none';
                secondaryFilterSection.style.display = 'none';
                this.innerHTML = '<i class="fas fa-filter"></i> Show Filters';
                sessionStorage.setItem('filtersHidden', 'true');
            }
        });
    }
}

// FIXED: Simplified setupUserInterface with immediate UI state restoration
function setupUserInterface() {
    // Setup training partner visibility
    if (userType === 'LND') {
        trainingPartnerRow.style.display = 'block';
        availablePartners = ['FACE', 'Six Phrase'];
        selectedPartners = [...availablePartners];
    } else {
        trainingPartnerRow.style.display = 'none';
        availablePartners = [getTrainingPartnerForUser(userType)];
        selectedPartners = [...availablePartners];
    }

    // Create toggle button
    createToggleButton();
    
    // FIXED: Apply UI states IMMEDIATELY before any async operations
    applyStoredUIStates();

    // Load initial options and handle saved filters
    loadInitialFilterOptions().then(() => {
        handleSavedFilters();
    });
}

// FIXED: New function to apply UI states immediately and synchronously
function applyStoredUIStates() {
    // Instructions state
    const instructionsHidden = sessionStorage.getItem('instructionsHidden');
    if (instructionsHidden === 'true') {
        instructionsContent.classList.add('hidden');
        toggleInstructionsBtn.innerHTML = 'Show <i class="fas fa-chevron-down"></i>';
    } else if (instructionsHidden === 'false') {
        instructionsContent.classList.remove('hidden');
        toggleInstructionsBtn.innerHTML = 'Hide <i class="fas fa-chevron-up"></i>';
    }
    
    // Filter visibility state
    const filtersHidden = sessionStorage.getItem('filtersHidden');
    const toggleButton = document.getElementById('toggleFilters');
    const filterSection = document.querySelector('.filter-section');
    const secondaryFilterSection = document.querySelector('.secondary-filter-section');
    
    // Check if saved filters exist to determine if secondary filters should be shown
    const hasSavedFilters = restoreFiltersFromStorage();
    
    if (filtersHidden === 'true' && toggleButton) {
        filterSection.style.display = 'none';
        secondaryFilterSection.style.display = 'none';
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Show Filters';
    } else if (filtersHidden === 'false' && toggleButton && hasSavedFilters) {
        filterSection.style.display = 'block';
        // Don't show secondary filters yet - let the data loading process handle it
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Hide Filters';
    }
}

// Enhanced handleSavedFilters function
function handleSavedFilters() {
    const savedFilters = restoreFiltersFromStorage();
    if (!savedFilters) return;
    
    const filterData = JSON.parse(savedFilters);
    
    // Check expiry
    if (Date.now() >= filterData.expiresAt) {
        sessionStorage.removeItem('savedFilters');
        localStorage.removeItem('savedFilters');
        return;
    }
    
    // Restore filter selections
    selectedPartners = filterData.selectedPartners;
    selectedDates = filterData.selectedDates;
    selectedSessions = filterData.selectedSessions;
    selectedBlocks = filterData.selectedBlocks;
    selectedVenues = filterData.selectedVenues || [];
    selectedTrainers = filterData.selectedTrainers || [];
    selectedReached = filterData.selectedReached || ['Yes', 'No'];
    
    // Restore UI and apply filters
    restorePrimaryFilterUI();
    
    // Apply filters with a small delay to ensure UI is ready
    setTimeout(() => {
        applyPrimaryFilters().then(() => {
            if (selectedVenues.length > 0 || selectedTrainers.length > 0 || selectedReached.length < 2) {
                restoreSecondaryFilterUI();
                applySecondaryFilters();
            }
        });
    }, 100);
}

async function loadInitialFilterOptions() {
    try {
        showLoading('Loading filter options...');
        
        let query = supabase
            .from('training_sessions')
            .select('date, block, training_partner');
        
        if (userType !== 'LND') {
            const partnerFilter = getTrainingPartnerForUser(userType);
            query = query.eq('training_partner', partnerFilter);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        availableDates = [...new Set(data.map(item => item.date))].sort();
        availableBlocks = [...new Set(data.map(item => item.block).filter(Boolean))].sort();
        
        if (selectedDates.length === 0) selectedDates = [];
        if (selectedBlocks.length === 0) selectedBlocks = [];
        
        populateFilterOptions();
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showError('Failed to load filter options: ' + error.message);
    }
}

// FIXED: Consolidated filter population
function populateFilterOptions() {
    populatePartnerFilter();
    populateDateFilter();
    populateBlockFilter();
}

function populatePartnerFilter() {
    if (userType !== 'LND') return;
    
    partnerOptions.innerHTML = '';
    availablePartners.forEach(partner => {
        const isChecked = selectedPartners.includes(partner);
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <input type="checkbox" id="partner-${partner.replace(/\s+/g, '-')}" 
                class="partner-checkbox" value="${partner}" ${isChecked ? 'checked' : ''}>
            <label for="partner-${partner.replace(/\s+/g, '-')}">${partner}</label>
        `;
        partnerOptions.appendChild(option);
    });
    
    selectAllPartners.checked = selectedPartners.length === availablePartners.length;
}

function populateDateFilter() {
    dateOptions.innerHTML = '';
    availableDates.forEach(date => {
        const isChecked = selectedDates.includes(date);
        const formattedDate = formatDateToDDMMMYYYY(date);
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <input type="checkbox" id="date-${date}" 
                class="date-checkbox" value="${date}" ${isChecked ? 'checked' : ''}>
            <label for="date-${date}">${formattedDate}</label>
        `;
        dateOptions.appendChild(option);
    });
    
    selectAllDates.checked = selectedDates.length === availableDates.length;
}

function populateBlockFilter() {
    blockOptions.innerHTML = '';
    availableBlocks.forEach(block => {
        const isChecked = selectedBlocks.includes(block);
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <input type="checkbox" id="block-${block.replace(/\s+/g, '-')}" 
                class="block-checkbox" value="${block}" ${isChecked ? 'checked' : ''}>
            <label for="block-${block.replace(/\s+/g, '-')}">${block}</label>
        `;
        blockOptions.appendChild(option);
    });
    
    selectAllBlocks.checked = selectedBlocks.length === availableBlocks.length;
}

function populateVenueFilter() {
    venueOptions.innerHTML = '';
    
    let filteredVenues = availableVenues;
    if (selectedTrainers.length > 0 && selectedTrainers.length < availableTrainers.length) {
        const venuesFromSelectedTrainers = [...new Set(
            allSessionData
                .filter(session => selectedTrainers.includes(session.name))
                .map(session => session.venue)
                .filter(Boolean)
        )];
        filteredVenues = availableVenues.filter(venue => venuesFromSelectedTrainers.includes(venue));
    }
    
    filteredVenues.forEach(venue => {
        const isChecked = selectedVenues.includes(venue);
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <input type="checkbox" id="venue-${venue.replace(/\s+/g, '-')}" 
                class="venue-checkbox" value="${venue}" ${isChecked ? 'checked' : ''}>
            <label for="venue-${venue.replace(/\s+/g, '-')}">${venue}</label>
        `;
        venueOptions.appendChild(option);
    });
    
    selectAllVenues.checked = selectedVenues.length === filteredVenues.length && filteredVenues.length > 0;
}

function populateTrainerFilter() {
    trainerOptions.innerHTML = '';
    
    let filteredTrainers = availableTrainers;
    if (selectedVenues.length > 0 && selectedVenues.length < availableVenues.length) {
        const trainersFromSelectedVenues = [...new Set(
            allSessionData
                .filter(session => selectedVenues.includes(session.venue))
                .map(session => session.name)
                .filter(Boolean)
        )];
        filteredTrainers = availableTrainers.filter(trainer => trainersFromSelectedVenues.includes(trainer));
    }
    
    filteredTrainers.forEach(trainer => {
        const isChecked = selectedTrainers.includes(trainer);
        const option = document.createElement('div');
        option.className = 'multiselect-option';
        option.innerHTML = `
            <input type="checkbox" id="trainer-${trainer.replace(/\s+/g, '-')}" 
                class="trainer-checkbox" value="${trainer}" ${isChecked ? 'checked' : ''}>
            <label for="trainer-${trainer.replace(/\s+/g, '-')}">${trainer}</label>
        `;
        trainerOptions.appendChild(option);
    });
    
    selectAllTrainers.checked = selectedTrainers.length === filteredTrainers.length && filteredTrainers.length > 0;
}

function restoreSecondaryFilterUI() {
    document.querySelectorAll('.reached-checkbox').forEach(cb => {
        cb.checked = selectedReached.includes(cb.value);
    });
    selectAllReached.checked = selectedReached.length === availableReached.length;
}

function restorePrimaryFilterUI() {
    populateFilterOptions();
    
    document.querySelectorAll('.session-checkbox').forEach(cb => {
        cb.checked = selectedSessions.includes(cb.value);
    });
    selectAllSessions.checked = selectedSessions.length === 3;
}

function applySecondaryFiltersWithUpdate() {
    applySecondaryFilters();
    populateVenueFilter();
    populateTrainerFilter();
    saveCurrentFiltersEnhanced();
}

// Filter event listeners
function initializeFilterListeners() {
    const selectAllConfigs = [
        { element: selectAllPartners, array: () => availablePartners, selected: () => selectedPartners, selector: '.partner-checkbox' },
        { element: selectAllDates, array: () => availableDates, selected: () => selectedDates, selector: '.date-checkbox' },
        { element: selectAllSessions, array: () => ['Session 1', 'Session 2', 'Session 3'], selected: () => selectedSessions, selector: '.session-checkbox' },
        { element: selectAllBlocks, array: () => availableBlocks, selected: () => selectedBlocks, selector: '.block-checkbox' },
        { element: selectAllVenues, array: () => availableVenues, selected: () => selectedVenues, selector: '.venue-checkbox' },
        { element: selectAllTrainers, array: () => availableTrainers, selected: () => selectedTrainers, selector: '.trainer-checkbox' },
        { element: selectAllReached, array: () => ['Yes', 'No'], selected: () => selectedReached, selector: '.reached-checkbox' }
    ];

    selectAllConfigs.forEach(config => {
        config.element.addEventListener('change', function() {
            const targetArray = config.selected();
            targetArray.length = 0;
            if (this.checked) {
                targetArray.push(...config.array());
            }
            document.querySelectorAll(config.selector).forEach(cb => cb.checked = this.checked);
        });
    });
}

// Dynamic event listeners for checkboxes
document.addEventListener('change', function(e) {
    const handlers = {
        'partner-checkbox': () => {
            updateSelectedArray(selectedPartners, e.target.value, e.target.checked);
            selectAllPartners.checked = selectedPartners.length === availablePartners.length;
        },
        'date-checkbox': () => {
            updateSelectedArray(selectedDates, e.target.value, e.target.checked);
            selectAllDates.checked = selectedDates.length === availableDates.length;
        },
        'session-checkbox': () => {
            updateSelectedArray(selectedSessions, e.target.value, e.target.checked);
            selectAllSessions.checked = selectedSessions.length === 3;
        },
        'block-checkbox': () => {
            updateSelectedArray(selectedBlocks, e.target.value, e.target.checked);
            selectAllBlocks.checked = selectedBlocks.length === availableBlocks.length;
        },
        'venue-checkbox': () => {
            updateSelectedArray(selectedVenues, e.target.value, e.target.checked);
            selectAllVenues.checked = selectedVenues.length === document.querySelectorAll('.venue-checkbox').length;
            setTimeout(() => {
                populateTrainerFilter();
                saveCurrentFiltersEnhanced();
            }, 100);
        },
        'trainer-checkbox': () => {
            updateSelectedArray(selectedTrainers, e.target.value, e.target.checked);
            selectAllTrainers.checked = selectedTrainers.length === document.querySelectorAll('.trainer-checkbox').length;
            setTimeout(() => {
                populateVenueFilter();
                saveCurrentFiltersEnhanced();
            }, 100);
        },
        'reached-checkbox': () => {
            updateSelectedArray(selectedReached, e.target.value, e.target.checked);
            selectAllReached.checked = selectedReached.length === availableReached.length;
        }
    };

    // Find matching handler and execute
    const handler = Object.keys(handlers).find(key => e.target.classList.contains(key));
    if (handler) {
        handlers[handler]();
        if (!handler.includes('venue') && !handler.includes('trainer')) {
            saveCurrentFiltersEnhanced();
        }
    }
});

function updateSelectedArray(array, value, isChecked) {
    if (isChecked && !array.includes(value)) {
        array.push(value);
    } else if (!isChecked) {
        const index = array.indexOf(value);
        if (index > -1) {
            array.splice(index, 1);
        }
    }
}

// Filter application functions
async function applyPrimaryFilters() {
    // Validation
    const validationErrors = [];
    if (userType === 'LND' && selectedPartners.length === 0) {
        validationErrors.push('Please select at least one Training Partner');
    }
    if (selectedDates.length === 0) {
        validationErrors.push('Please select at least one Date');
    }
    if (selectedSessions.length === 0) {
        validationErrors.push('Please select at least one Session');
    }
    
    if (validationErrors.length > 0) {
        showError(validationErrors[0]);
        return Promise.reject('Validation failed');
    }
    
    try {
        showLoading('Loading session data...');
        
        let query = supabase.from('training_sessions').select('*');
        
        if (userType !== 'LND') {
            query = query.eq('training_partner', getTrainingPartnerForUser(userType));
        } else {
            query = query.in('training_partner', selectedPartners);
        }
        
        query = query.in('date', selectedDates).in('session', selectedSessions);
        
        if (selectedBlocks.length > 0) {
            query = query.in('block', selectedBlocks);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        allSessionData = data || [];
        
        availableVenues = [...new Set(allSessionData.map(item => item.venue).filter(Boolean))].sort();
        availableTrainers = [...new Set(allSessionData.map(item => item.name).filter(Boolean))].sort();
        
        if (selectedVenues.length === 0) {
            selectedVenues = [...availableVenues];
        }
        if (selectedTrainers.length === 0) {
            selectedTrainers = [...availableTrainers];
        }
        
        populateVenueFilter();
        populateTrainerFilter();
        
        // Only show secondary filters if filters aren't supposed to be hidden
        const filtersHidden = sessionStorage.getItem('filtersHidden');
        if (filtersHidden !== 'true') {
            secondaryFilters.style.display = 'block';
        }
        applySecondaryFilters();

        // Save filters with enhanced method
        saveCurrentFiltersEnhanced();

        setupRealtimeSubscription();
        hideLoading();
        return Promise.resolve();
        
    } catch (error) {
        hideLoading();
        showError('Failed to load data: ' + error.message);
        return Promise.reject(error);
    }
}

function applySecondaryFilters() {
    filteredSessionData = allSessionData.filter(session => {
        const venueMatch = selectedVenues.length === 0 || selectedVenues.includes(session.venue);
        const trainerMatch = selectedTrainers.length === 0 || selectedTrainers.includes(session.name);
        const reachedMatch = selectedReached.length === 0 || selectedReached.includes(session.reached || 'No');
        return venueMatch && trainerMatch && reachedMatch;
    });

    filteredSessionData.sort((a, b) => {
        const venueA = (a.venue || '').toLowerCase();
        const venueB = (b.venue || '').toLowerCase();
        return venueA.localeCompare(venueB);
    });
    
    updateTable();
    updateStats();
    
    document.querySelectorAll('.session-table-container, .stats-grid')
        .forEach(el => el.style.display = 'block');
}

function clearAllFilters() {
    sessionStorage.removeItem('savedFilters');
    localStorage.removeItem('savedFilters');

    selectedPartners = userType === 'LND' ? ['FACE', 'Six Phrase'] : [getTrainingPartnerForUser(userType)];
    selectedDates = [];
    selectedSessions = [];
    selectedBlocks = [];
    selectedVenues = [];
    selectedTrainers = [];
    selectedReached = ['Yes', 'No'];
    
    // Reset UI
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        const checkboxTypes = {
            'partner-checkbox': selectedPartners.includes(cb.value),
            'date-checkbox': selectedDates.includes(cb.value),
            'session-checkbox': selectedSessions.includes(cb.value),
            'block-checkbox': selectedBlocks.includes(cb.value),
            'reached-checkbox': selectedReached.includes(cb.value)
        };
        
        const matchingType = Object.keys(checkboxTypes).find(type => cb.classList.contains(type));
        cb.checked = matchingType ? checkboxTypes[matchingType] : false;
    });
    
    // Update select all checkboxes
    selectAllPartners.checked = selectedPartners.length === availablePartners.length;
    selectAllDates.checked = selectedDates.length === availableDates.length;
    selectAllSessions.checked = selectedSessions.length === 3;
    selectAllReached.checked = selectedReached.length === availableReached.length;
    selectAllBlocks.checked = selectedBlocks.length === availableBlocks.length;
    selectAllVenues.checked = false;
    selectAllTrainers.checked = false;
    
    // Show filters and update toggle button
    const toggleButton = document.getElementById('toggleFilters');
    if (toggleButton) {
        toggleButton.innerHTML = '<i class="fas fa-filter"></i> Hide Filters';
        document.querySelector('.filter-section').style.display = 'block';
        sessionStorage.setItem('filtersHidden', 'false');
    }
    
    // Hide secondary filters and table
    secondaryFilters.style.display = 'none';
    document.querySelectorAll('.session-table-container, .stats-grid')
        .forEach(el => el.style.display = 'none');
    
    // Clear data
    allSessionData = [];
    filteredSessionData = [];
    availableVenues = [];
    availableTrainers = [];
    availableBlocks = [];
}

function updateTable() {
    sessionTableBody.innerHTML = '';
    
    // Show/hide training partner column based on user type
    const partnerColumn = document.getElementById('partnerColumn');
    if (userType === 'LND') {
        partnerColumn.style.display = 'table-cell';
    } else {
        partnerColumn.style.display = 'none';
    }
    
    filteredSessionData.forEach(session => {
        const row = document.createElement('tr');
        if (session.reached === 'Yes') {
            row.className = 'reached';
        }
        
        let rowHTML = `<td class="trainer-name">${session.name}</td>`;
        
        if (userType === 'LND') {
            rowHTML += `<td class="training-partner">${session.training_partner}</td>`;
        }
        
        rowHTML += `
            <td class="venue">${session.venue || 'N/A'}</td>
            <td class="phone-column">
                <a href="tel:${session.mobile_number}" class="phone-call-btn" title="Call">
                    <i class="fas fa-phone"></i>
                </a>
            </td>
            <td class="reach-column">
                <label class="toggle-switch">
                    <input type="checkbox" class="reach-toggle" 
                        data-id="${session.id}"
                        ${session.reached === 'Yes' ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </td>
            <td class="details-column">
                <button class="details-btn" data-id="${session.id}">
                    <i class="fas fa-info-circle"></i>
                </button>
            </td>
        `;
        
        row.innerHTML = rowHTML;
        sessionTableBody.appendChild(row);
    });
    
    // Add event listeners
    document.querySelectorAll('.reach-toggle').forEach(toggle => {
        toggle.addEventListener('change', updateReachedStatus);
    });
    
    document.querySelectorAll('.details-btn').forEach(btn => {
        btn.addEventListener('click', showSessionDetails);
    });
}

async function updateReachedStatus(e) {
    const sessionId = e.target.dataset.id;
    const reached = e.target.checked ? 'Yes' : 'No';
    
    try {
        showLoading('Updating status...');
        
        const istTime = new Date().toLocaleString("en-US", {timeZone: "Asia/Kolkata"});
        const istDate = new Date(istTime).toISOString();
        
        const { error } = await supabase
            .from('training_sessions')
            .update({ 
                reached: reached,
                time_of_updation: istDate
            })
            .eq('id', sessionId);
        
        if (error) throw error;
        
        // Update local data
        const sessionIndex = filteredSessionData.findIndex(s => s.id.toString() === sessionId);
        if (sessionIndex !== -1) {
            filteredSessionData[sessionIndex].reached = reached;
            filteredSessionData[sessionIndex].time_of_updation = istDate;
            
            const row = e.target.closest('tr');
            if (reached === 'Yes') {
                row.classList.add('reached');
            } else {
                row.classList.remove('reached');
            }
        }
        
        updateStats();
        hideLoading();
        
    } catch (error) {
        hideLoading();
        showError('Failed to update status: ' + error.message);
        e.target.checked = !e.target.checked;
    }
}

function showSessionDetails(e) {
    const sessionId = e.target.closest('button').dataset.id;
    const session = filteredSessionData.find(s => s.id.toString() === sessionId);
    
    if (session) {
        const formattedDate = formatDateToDDMMMYYYY(session.date);
        const updatedTime = session.time_of_updation ? 
            new Date(session.time_of_updation).toLocaleString('en-GB') : 'Never';
        
        sessionDetailsContent.innerHTML = `
            <div class="detail-item">
                <span class="detail-label">Trainer Name:</span>
                <span class="detail-value">${session.name}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Training Partner:</span>
                <span class="detail-value">${session.training_partner}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Date:</span>
                <span class="detail-value">${formattedDate}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Session:</span>
                <span class="detail-value">${session.session}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Topic:</span>
                <span class="detail-value">${session.topic || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Department:</span>
                <span class="detail-value">${session.department || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Students:</span>
                <span class="detail-value">${session.no_of_students || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Venue:</span>
                <span class="detail-value">${session.venue || 'N/A'}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Mobile Number:</span>
                <span class="detail-value">
                    <a href="tel:${session.mobile_number}" class="phone-number-link">
                        <i class="fas fa-phone"></i> ${session.mobile_number}
                    </a>
                </span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Last Updated:</span>
                <span class="detail-value">${updatedTime}</span>
            </div>
        `;
        
        sessionDetailsModal.classList.remove('hidden');
    }
}

function closeModal() {
    sessionDetailsModal.classList.add('hidden');
}

// Click outside modal to close
document.addEventListener('click', function(e) {
    if (e.target === sessionDetailsModal) {
        closeModal();
    }
});

function updateStats() {
    const totalSessions = filteredSessionData.length;
    const sessionsReached = filteredSessionData.filter(session => session.reached === 'Yes').length;
    const sessionsYetToReach = totalSessions - sessionsReached;
    
    totalTrainersEl.textContent = totalSessions;
    trainersReachedEl.textContent = sessionsReached;
    trainersYetToReachEl.textContent = sessionsYetToReach;
}

function toggleInstructions() {
    instructionsContent.classList.toggle('hidden');
    
    if (instructionsContent.classList.contains('hidden')) {
        toggleInstructionsBtn.innerHTML = 'Show <i class="fas fa-chevron-down"></i>';
        sessionStorage.setItem('instructionsHidden', 'true');
    } else {
        toggleInstructionsBtn.innerHTML = 'Hide <i class="fas fa-chevron-up"></i>';
        sessionStorage.setItem('instructionsHidden', 'false');
    }
}

function setupRealtimeSubscription() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
    
    realtimeSubscription = supabase
        .channel('training_sessions_changes')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'training_sessions'
        }, (payload) => {
            const updatedSession = payload.new;
            
            const sessionIndex = filteredSessionData.findIndex(s => s.id === updatedSession.id);
            if (sessionIndex !== -1) {
                filteredSessionData[sessionIndex] = updatedSession;
                updateTableRow(updatedSession);
                updateStats();
            }
        })
        .subscribe();
}

function updateTableRow(session) {
    const toggleElement = document.querySelector(`input[data-id="${session.id}"]`);
    if (toggleElement) {
        const wasChecked = toggleElement.checked;
        toggleElement.checked = session.reached === 'Yes';
        
        const row = toggleElement.closest('tr');
        if (session.reached === 'Yes') {
            row.classList.add('reached');
        } else {
            row.classList.remove('reached');
        }
        
        if (wasChecked !== toggleElement.checked) {
            showBriefNotification(`${session.name} status updated by another user`);
        }
    }
}

function showBriefNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 1001;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
