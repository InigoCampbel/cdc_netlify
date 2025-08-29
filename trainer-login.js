/**
 * SEED Training Portal - Trainer Login JavaScript
 * Optimized for performance with smooth transitions
 * Enhanced with API fallback support
 */

// Enhanced Smart Date Input System with Date Picker Logic
const SmartDateInput = {
    // Check if a year is a leap year
    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    },
    
    // Get maximum days for a given month/year
    getMaxDays(month, year) {
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (month === 2 && this.isLeapYear(year)) {
            return 29;
        }
        return daysInMonth[month - 1] || 31;
    },
    
    // Format input with intelligent auto-completion like a date picker
    formatInput(value, cursorPosition) {
        // Remove all non-numeric characters except hyphens
        let cleaned = value.replace(/[^\d-]/g, '');
        
        // Split by existing hyphens to understand current structure
        let parts = cleaned.split('-');
        let result = '';
        let newCursorPosition = cursorPosition;
        
        // Handle day part (first part)
        if (parts[0]) {
            let day = parts[0];
            
            // If day is more than 2 digits, truncate
            if (day.length > 2) {
                day = day.substring(0, 2);
            }
            
            // Smart day completion
            if (day.length === 1) {
                const dayNum = parseInt(day);
                // If user types 4-9, auto-pad with 0 (04-09)
                // If user types 0-3, wait for second digit unless they move to next field
                if (dayNum >= 4) {
                    day = '0' + day;
                    result += day;
                    if (parts.length === 1) {
                        result += '-';
                        newCursorPosition = result.length;
                    }
                } else {
                    result += day;
                }
            } else if (day.length === 2) {
                const dayNum = parseInt(day);
                // Validate day range
                if (dayNum > 31) {
                    day = '31';
                } else if (dayNum < 1) {
                    day = '01';
                }
                result += day;
                
                // Auto-add hyphen after valid day if user hasn't added it yet
                if (parts.length === 1 && cleaned.length === 2) {
                    result += '-';
                    newCursorPosition = result.length;
                }
            }
        }
        
        // Handle month part (second part)
        if (parts.length > 1 && parts[1] !== undefined) {
            if (result && !result.endsWith('-')) {
                result += '-';
            }
            
            let month = parts[1];
            
            // If month is more than 2 digits, truncate
            if (month.length > 2) {
                month = month.substring(0, 2);
            }
            
            // Smart month completion
            if (month.length === 1) {
                const monthNum = parseInt(month);
                // If user types 2-9, auto-pad with 0 (02-09) and move to year
                // If user types 0-1, wait for second digit
                if (monthNum >= 2) {
                    month = '0' + month;
                    result += month;
                    if (parts.length === 2) {
                        result += '-';
                        newCursorPosition = result.length;
                    }
                } else {
                    result += month;
                }
            } else if (month.length === 2) {
                const monthNum = parseInt(month);
                // Validate month range
                if (monthNum > 12) {
                    month = '12';
                } else if (monthNum < 1) {
                    month = '01';
                }
                result += month;
                
                // Auto-add hyphen after valid month if user hasn't added it yet
                if (parts.length === 2 && !cleaned.includes('-', cleaned.indexOf('-') + 1)) {
                    result += '-';
                    newCursorPosition = result.length;
                }
            }
        }
        
        // Handle year part (third part)
        if (parts.length > 2 && parts[2] !== undefined) {
            if (result && !result.endsWith('-')) {
                result += '-';
            }
            
            let year = parts[2];
            
            // Limit year to 4 digits
            if (year.length > 4) {
                year = year.substring(0, 4);
            }
            
            result += year;
        }
        
        return { formatted: result, cursorPosition: newCursorPosition };
    },
    
    // Handle special key behaviors
    handleSpecialKeys(event, currentValue, cursorPosition) {
        const key = event.key;
        
        // Handle forward slash or period as separator
        if (key === '/' || key === '.') {
            event.preventDefault();
            
            const parts = currentValue.split('-');
            
            // If we're in day part and it's not complete, complete it
            if (parts.length === 1 && parts[0].length === 1) {
                const day = parts[0];
                const dayNum = parseInt(day);
                if (dayNum >= 1 && dayNum <= 3) {
                    return this.formatInput(currentValue + '-', cursorPosition + 1);
                }
            }
            
            // If we're in month part and it's not complete, complete it
            if (parts.length === 2 && parts[1].length === 1) {
                const month = parts[1];
                const monthNum = parseInt(month);
                if (monthNum >= 1 && monthNum <= 1) {
                    return this.formatInput(currentValue + '-', cursorPosition + 1);
                }
            }
            
            // Otherwise, just add a hyphen
            return this.formatInput(currentValue + '-', cursorPosition + 1);
        }
        
        // Handle backspace to remove separators intelligently
        if (key === 'Backspace') {
            if (cursorPosition > 0 && currentValue[cursorPosition - 1] === '-') {
                // Remove the hyphen and the character before it if it exists
                const newValue = currentValue.substring(0, cursorPosition - 2) + currentValue.substring(cursorPosition);
                return { formatted: newValue, cursorPosition: Math.max(0, cursorPosition - 2) };
            }
        }
        
        return null;
    },
    
    // Validate complete date
    validateDate(dateString) {
        if (!dateString || dateString.length !== 10) {
            return { valid: false, message: "Please enter date in DD-MM-YYYY format" };
        }
        
        const parts = dateString.split('-');
        if (parts.length !== 3) {
            return { valid: false, message: "Please enter date in DD-MM-YYYY format" };
        }
        
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        
        // Check for valid numbers
        if (isNaN(day) || isNaN(month) || isNaN(year)) {
            return { valid: false, message: "Please enter a valid date" };
        }
        
        // Check year range
        if (year < 1960 || year > 2024) {
            if (year > 2024) {
                return { valid: false, message: "Date cannot be in the future" };
            }
            return { valid: false, message: "Please enter a valid year (1960-2024)" };
        }
        
        // Check month range
        if (month < 1 || month > 12) {
            return { valid: false, message: "Please enter a valid month (01-12)" };
        }
        
        // Check day range
        if (day < 1 || day > 31) {
            return { valid: false, message: "Please enter a valid day" };
        }
        
        // Check day against month
        const maxDays = this.getMaxDays(month, year);
        if (day > maxDays) {
            return { valid: false, message: "Invalid day for the selected month" };
        }
        
        // Check if date is in the future
        const inputDate = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today
        
        if (inputDate > today) {
            return { valid: false, message: "Date cannot be in the future" };
        }
        
        return { valid: true, date: inputDate };
    },
    
    // Handle partial date validation for visual feedback
    getPartialValidationState(dateString) {
        if (!dateString) return 'neutral';
        
        const length = dateString.length;
        
        // If complete date, do full validation
        if (length === 10) {
            const validation = this.validateDate(dateString);
            return validation.valid ? 'valid' : 'invalid';
        }
        
        // For partial input, do basic checks
        const parts = dateString.split('-');
        
        // Check partial day
        if (parts[0]) {
            const day = parseInt(parts[0], 10);
            if (parts[0].length === 2 && (day < 1 || day > 31)) return 'invalid';
            if (parts[0].length === 1 && (day < 0 || day > 9)) return 'invalid';
        }
        
        // Check partial month
        if (parts[1]) {
            const month = parseInt(parts[1], 10);
            if (parts[1].length === 2 && (month < 1 || month > 12)) return 'invalid';
            if (parts[1].length === 1 && (month < 0 || month > 9)) return 'invalid';
        }
        
        // Check partial year
        if (parts[2]) {
            if (parts[2].length >= 2) {
                const year = parseInt(parts[2], 10);
                if (parts[2].length === 4 && (year < 1960 || year > 2024)) {
                    return 'invalid';
                }
                // For 2-digit years, check if they could be valid when completed
                if (parts[2].length === 2) {
                    const currentYear = new Date().getFullYear();
                    const century = Math.floor(currentYear / 100) * 100; // 2000
                    const fullYear = century + year;
                    if (fullYear > currentYear) {
                        // Try previous century
                        const prevCentury = century - 100; // 1900
                        const prevFullYear = prevCentury + year;
                        if (prevFullYear < 1960) return 'invalid';
                    }
                }
            }
        }
        
        return 'neutral';
    }
};



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
        "https://script.google.com/macros/s/AKfycbwoqQiR-uRLNlCF6-cE8mIiwN4AwNTqGreEaYlq6jbgqzCU6TiSq5_u_IL3vB7NsImzcw/exec",
        "https://script.google.com/macros/s/AKfycbwoqQiR-uRLNlCF6-cE8mIiwN4AwNTqGreEaYlq6jbgqzCU6TiSq5_u_IL3vB7NsImzcw/exec" // Duplicate for testing fallback
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
    

    dobInput.value = '';
    
    // Clear form data
    clearBtn.addEventListener('click', function() {
        userIdInput.value = '';
        dobInput.value = '';
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

    // Add smart date input handling for DOB field
    dobInput.addEventListener('input', function(e) {
        const cursorPosition = e.target.selectionStart;
        const result = SmartDateInput.formatInput(e.target.value, cursorPosition);
        
        e.target.value = result.formatted;
        e.target.setSelectionRange(result.cursorPosition, result.cursorPosition);
        
        UI.hideError();
    });

    dobInput.addEventListener('keydown', function(e) {
        const cursorPosition = e.target.selectionStart;
        const specialResult = SmartDateInput.handleSpecialKeys(e, e.target.value, cursorPosition);
        
        if (specialResult) {
            e.preventDefault();
            e.target.value = specialResult.formatted;
            e.target.setSelectionRange(specialResult.cursorPosition, specialResult.cursorPosition);
        }
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

            // Validate date format using smart date input
            const dateValidation = SmartDateInput.validateDate(dobValue);
            if (!dateValidation.valid) {
                UI.showError(dateValidation.message);
                return;
            }
            
            // Pre-validate trainer ID format
            const validationResult = ValidationUtils.validateTrainerId(trainerId);
            if (!validationResult.valid) {
                UI.showError(validationResult.message);
                return;
            }
            
            // Date is already in DD-MM-YYYY format from smart input
            const dob = dobValue;
            
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
