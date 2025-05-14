/**
 * SEED Training Portal - Trainer Login JavaScript
 * Optimized for performance with smooth transitions
 * Enhanced with API fallback support
 */

// UI Helper Functions - Enhanced with transitions
const UI = {
    errorEl: null,
    errorContainerEl: null,
    overlayEl: null,
    loginBtnEl: null,
    loaderTextEl: null,
    pageContainerEl: null,
    progressContainer: null,
    progressBar: null,
    loginStatus: null,
    
    // Initialize UI references once
    init: function() {
        this.errorEl = document.getElementById('errorMessage');
        this.overlayEl = document.getElementById('loadingOverlay');
        this.loginBtnEl = document.getElementById('loginBtn');
        this.loaderTextEl = document.getElementById('loaderText');
        this.pageContainerEl = document.getElementById('pageContainer');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBar = document.getElementById('progressBar');
        this.loginStatus = document.getElementById('loginStatus');
    },
    
    showError: function(message) {
        this.errorEl.textContent = message;
        this.errorEl.classList.add('show');
    },
    
    hideError: function() {
        this.errorEl.textContent = '';
        this.errorEl.classList.remove('show');
    },
    
    showLoader: function(message = 'Loading...') {
        this.overlayEl.classList.add('show');
        this.loginBtnEl.disabled = true;
        this.loaderTextEl.textContent = message;
    },

    updateLoader: function(message) {
        this.loaderTextEl.textContent = message;
    },
    
    hideLoader: function() {
        this.overlayEl.classList.remove('show');
        this.loginBtnEl.disabled = false;
    },
    
    // Method for showing progress
    showProgress: function() {
        this.progressContainer.classList.add('show');
        this.loginStatus.textContent = 'Authenticating...';
        this.loginBtnEl.disabled = true;
        document.getElementById('clearBtn').disabled = true;
        
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
            if (progress > 90) clearInterval(progressInterval);
            this.progressBar.style.width = progress + '%';
            return progressInterval;
        }, 150);
        
        return progressInterval;
    },
    
    completeProgress: function(progressInterval, success, message, errorCallback = null) {
        clearInterval(progressInterval);
        this.progressBar.style.width = '100%';
        
        setTimeout(() => {
            this.progressContainer.classList.remove('show');
            this.progressBar.style.width = '0%';
            this.loginStatus.textContent = success ? message : '';
            this.loginBtnEl.disabled = false;
            document.getElementById('clearBtn').disabled = false;
            
            // Execute error callback after progress bar is hidden, if provided
            if (!success && errorCallback) {
                setTimeout(() => {
                    errorCallback();
                }, 100); // Small additional delay after progress bar is hidden
            }
        }, 500);
    },
    
    // Method for smooth page transition
    transitionToPage: function(url) {
        this.pageContainerEl.classList.add('page-exit');
        setTimeout(() => {
            window.location.href = url;
        }, 300); // Match CSS transition time
    }
};

// Simplified Date Helper Functions
const DateUtils = {
    formatDateForInput: function(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
    },

    formatDateForAPI: function(dateString) {
        const date = new Date(dateString);
        return [
            String(date.getDate()).padStart(2, '0'),
            String(date.getMonth() + 1).padStart(2, '0'),
            date.getFullYear()
        ].join('-'); // DD-MM-YYYY
    }
};

// Session Helper - Simplified
const SessionUtils = {
    createSession: function(key, data, hours = 2) {
        const sessionData = {
            ...data,
            expires: Date.now() + (hours * 60 * 60 * 1000)
        };
        sessionStorage.setItem(key, JSON.stringify(sessionData));
    },
    
    clearAllSessions: function() {
        sessionStorage.clear();
    }
};

// Enhanced API Helper with fallback support
const ApiUtils = {
    // New method to try multiple URLs with fallback support
    async fetchWithFallback(urls, options = {}, timeout = 15000) {
        let lastError = null;
        
        // Try each URL in sequence
        for (let i = 0; i < urls.length; i++) {
            try {
                UI.updateLoader(`Authenticating`);
                const response = await this.fetchWithTimeout(urls[i], options, timeout);
                return response; // Return the first successful response
            } catch (error) {
                lastError = error;
                console.warn(`API endpoint ${i + 1} failed:`, error.message);
                // Continue to next URL
            }
        }
        
        // If we've tried all URLs and all failed, throw the last error
        throw lastError || new Error("All API endpoints failed");
    },
    
    async fetchWithTimeout(url, options = {}, timeout = 15000) {
        // Add cache buster to URL
        const cacheBuster = Date.now();
        const urlWithCache = url + (url.includes('?') ? '&' : '?') + `cb=${cacheBuster}`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(urlWithCache, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    },
    
    async processJsonResponse(response) {
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const text = await response.text();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            if (text.includes("Error") || text.trim() === "") {
                throw new Error("Invalid response from server");
            }
            
            try {
                return JSON.parse(text.replace(/[\n\r]/g, ''));
            } catch (e2) {
                throw new Error("Unable to process data from server");
            }
        }
    }
};

// Validation - Optimized with regex caching
const ValidationUtils = {
    // Cached regex patterns for better performance
    TRAINER_PATTERN: /^TR[0-9]{3}$/,
    
    validateTrainerId: function(trainerId) {
        if (!trainerId || typeof trainerId !== 'string') {
            return { valid: false, message: "Please enter a valid Trainer ID" };
        }
        
        // Normalize input
        trainerId = trainerId.trim().toUpperCase();
        
        // Quick length check for early rejection
        if (trainerId.length !== 5) {
            return { valid: false, message: "Please enter a valid trainer id" };
        }
        
        // Updated Trainer ID validation (TR followed by 3 numbers)
        if (!this.TRAINER_PATTERN.test(trainerId)) {
            return { valid: false, message: "Please enter a valid trainer id" };
        }
        
        return { valid: true, value: trainerId };
    }
};

// Enhanced Trainer Authentication with multiple API endpoints
const TrainerAuth = {
    // Primary and fallback API URLs
    API_URLS: [
        "https://script.google.com/macros/s/AKfycbyk6W0QL2PXaatWzU3Y2DXd-I4CRNFUkdig6L4q1zZZGm9Tclv17yTg1D1TEwBGOJZFtg/exec",
        "https://script.google.com/macros/s/AKfycbx4u5GHFeTu3_wzJPqqT7SjTOPRZJ6XNBSzJV1ufO5TDZK6qw_APFkRLImDDbUDj1FH/exec"
    ],
    SESSION_KEY: 'trainerPortalSession',
    
    authenticate: async function(trainerId, dob) {
        try {
            // Validate trainer ID
            const validationResult = ValidationUtils.validateTrainerId(trainerId);
            if (!validationResult.valid) {
                return { success: false, error: validationResult.message };
            }
            
            // Start progress bar
            const progressInterval = UI.showProgress();
            
            let apiSuccess = false;
            let apiResult = null;
            let apiError = null;
            
            try {
                // Build query parameters
                const queryParams = `?action=authenticate&userId=${encodeURIComponent(trainerId)}&dob=${encodeURIComponent(dob)}`;
                
                // Create an array of full URLs with parameters
                const fullUrls = this.API_URLS.map(url => url + queryParams);
                
                // Attempt to fetch with fallback support
                const response = await ApiUtils.fetchWithFallback(fullUrls);
                apiResult = await ApiUtils.processJsonResponse(response);
                
                if (!apiResult || !apiResult.success) {
                    throw new Error(apiResult?.message || "Invalid credentials");
                }
                
                apiSuccess = true;
            } catch (error) {
                apiError = error;
                console.error("Trainer authentication failed:", error);
            }
            
            // Store the error message for later use
            const errorMessage = apiError ? (apiError.message || "Authentication failed") : null;
            
            if (!apiSuccess) {
                // Complete progress bar with error callback if failed
                UI.completeProgress(
                    progressInterval, 
                    false, 
                    '',
                    () => {
                        // This will execute only after the progress bar is hidden
                        console.log("Authentication failed, showing error after progress completion");
                    }
                );
                
                // Return result after progress bar animation
                return { success: false, error: errorMessage };
            } else {
                // Complete progress with success
                UI.completeProgress(progressInterval, true, 'Login successful!');
            }
            
            // Create trainer session
            SessionUtils.createSession(this.SESSION_KEY, {
                userId: trainerId,
                role: 'trainer',
                trainerData: apiResult
            });
            
            // Return result with redirect
            return {
                success: true,
                redirect: 'trainer/trainer.html'
            };
            
        } catch (error) {
            return { success: false, error: error.message || "Authentication failed" };
        }
    }
};

// Main Application - Optimized with smooth transitions
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI components
    UI.init();
    
    // Add entrance animation class if coming from another page
    if (performance.navigation.type !== 1) { // Not a page refresh
        document.body.classList.add('page-enter');
    }
    
    // Clear cache on page load
    SessionUtils.clearAllSessions();
    
    // Cache DOM elements
    const userIdInput = document.getElementById('userId');
    const dobInput = document.getElementById('dob');
    const loginForm = document.getElementById('loginForm');
    const clearBtn = document.getElementById('clearBtn');
    
    // Set default date to January 1, 2000
    const defaultDate = new Date(2000, 0, 1);
    const today = new Date();
    
    // Set minimum date to January 1, 1960
    const minDate = new Date(1960, 0, 1);
    
    dobInput.min = DateUtils.formatDateForInput(minDate);
    dobInput.max = DateUtils.formatDateForInput(today);
    dobInput.value = DateUtils.formatDateForInput(defaultDate);
    
    // Clear form data
    clearBtn.addEventListener('click', function() {
        userIdInput.value = '';
        dobInput.value = DateUtils.formatDateForInput(defaultDate);
        UI.hideError();
    });
    
    // Form submission handler
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        processLogin();
    });
    
    // Format trainer ID to uppercase as the user types
    userIdInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
        UI.hideError();
    });
    
    // Login processor function - optimized for trainers only
    async function processLogin() {
        try {
            UI.hideError();
            
            // Get form values
            const trainerId = userIdInput.value.trim().toUpperCase();
            const dobValue = dobInput.value;
            
            // Quick validation
            if (!trainerId || !dobValue) {
                UI.showError('Please enter both Trainer ID and Date of Birth');
                return;
            }
            
            // Pre-validate trainer ID format
            const validationResult = ValidationUtils.validateTrainerId(trainerId);
            if (!validationResult.valid) {
                UI.showError(validationResult.message);
                return;
            }
            
            // Format date for API (DD-MM-YYYY)
            const dob = DateUtils.formatDateForAPI(dobValue);
            
            // Authenticate trainer
            const result = await TrainerAuth.authenticate(trainerId, dob);
            
            // Handle authentication result with smooth transition
            if (result.success) {
                // Short delay to show success message before transition
                setTimeout(() => {
                    // Use smooth transition to next page
                    UI.transitionToPage(result.redirect);
                }, 500);
            } else {
                // Only show error after authentication process is fully complete
                // Add a small delay to ensure UI updates are complete
                setTimeout(() => {
                    UI.showError(result.error);
                }, 600); // Delay error message display until progress bar is completely hidden
            }
        } catch (error) {
            UI.hideError();
            UI.showError('Login error: ' + (error.message || 'Please try again'));
        }
    }
    
    // Add page visibility change listener for better transition when returning to the page
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            // Reset the page transition when returning to the page
            document.body.classList.remove('page-exit');
        }
    });
});