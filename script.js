// DOM Elements
const totalClasses = document.getElementById('totalClasses');
const attendedClasses = document.getElementById('attendedClasses');
const percentageText = document.getElementById('percentageText');
const progressCircle = document.getElementById('progressCircle');
const statusMessage = document.getElementById('statusMessage');
const bunkSuggestion = document.getElementById('bunkSuggestion');
const glowBackdrop = document.getElementById('glowBackdrop');

const predictBunk = document.getElementById('predictBunk');
const predictedPercent = document.getElementById('predictedPercent');
const aiTriggerBtn = document.getElementById('aiTriggerBtn');
const predictionPanel = document.getElementById('predictionPanel');

const plannerGrid = document.getElementById('plannerGrid');
const plannerPreview = document.getElementById('plannerPreview');
const previewPercent = document.getElementById('previewPercent');
const applyPlannerBtn = document.getElementById('applyPlannerBtn');
const resetPlannerBtn = document.getElementById('resetPlannerBtn');

// SVG setup
const circleCircumference = 2 * Math.PI * 100; // r=100
progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
progressCircle.style.strokeDashoffset = circleCircumference;

let currentAnimatedPercent = 0;

// Load from LocalStorage
function loadData() {
    const total = localStorage.getItem('totalClasses');
    const attended = localStorage.getItem('attendedClasses');
    if (total !== null) totalClasses.value = total;
    if (attended !== null) attendedClasses.value = attended;
    calculateAttendance();
}

// Save to LocalStorage
function saveData() {
    localStorage.setItem('totalClasses', totalClasses.value);
    localStorage.setItem('attendedClasses', attendedClasses.value);
}

// Custom Cursor (Desktop only)
const cursor = document.getElementById('customCursor');
document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
});
// Add hover effect to interactive elements
const interactables = document.querySelectorAll('input, button, .day-cell');
interactables.forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
});

// Core Logic
function calculateAttendance() {
    saveData();
    const total = parseInt(totalClasses.value) || 0;
    const attended = parseInt(attendedClasses.value) || 0;

    let percentage = 0;
    if (total > 0 && attended >= 0 && attended <= total) {
        percentage = (attended / total) * 100;
    } else if (attended > total) {
        percentage = 100;
        statusMessage.textContent = "Error";
        bunkSuggestion.textContent = "Attended cannot be more than Total.";
        setStatusColor('danger');
        updateUI(percentage);
        return;
    } else if (total < 0 || attended < 0) {
        percentage = 0;
        statusMessage.textContent = "Error";
        bunkSuggestion.textContent = "Negative numbers not allowed.";
        setStatusColor('danger');
        updateUI(percentage);
        return;
    }

    if (total === 0) {
        statusMessage.textContent = "Awaiting Input...";
        bunkSuggestion.textContent = "Enter your classes to begin.";
        setStatusColor('safe');
        updateUI(0);
        return;
    }

    // Bunk Logic (75% rule)
    const requiredAttendance = 0.75;
    let suggestion = "";
    
    // How many more can I bunk? 
    // formula: (attended / 0.75) - total
    const maxTotalClassesAllowed = attended / requiredAttendance;
    const classesCanBunk = Math.floor(maxTotalClassesAllowed - total);

    if (classesCanBunk > 0) {
        suggestion = `You can safely bunk ${classesCanBunk} more class${classesCanBunk > 1 ? 'es' : ''} 😈`;
    } else if (classesCanBunk === 0) {
        suggestion = `On the edge! Don't miss next class. 😬`;
    } else {
        // How many to attend to recover?
        // formula: (0.75 * total - attended) / 0.25
        const classesNeeded = Math.ceil((requiredAttendance * total - attended) / (1 - requiredAttendance));
        suggestion = `Attend next ${classesNeeded} class${classesNeeded > 1 ? 'es' : ''} to recover 📚`;
    }

    // Determine status
    if (percentage >= 85) {
        statusMessage.textContent = "Safe hai bro 😎";
        setStatusColor('safe');
    } else if (percentage >= 75) {
        statusMessage.textContent = "Thoda sambhal ke 😬";
        setStatusColor('risk');
    } else {
        statusMessage.textContent = "Class leni padegi Bhai 😭";
        suggestion += " | Contact your CR or Captain for support.";
        setStatusColor('danger');
    }

    bunkSuggestion.textContent = suggestion;
    updateUI(percentage);
    updatePrediction();
}

function updateUI(targetPercent) {
    // Animate Number Count-up
    animateValue(percentageText, currentAnimatedPercent, targetPercent, 600);
    currentAnimatedPercent = targetPercent;
    
    // Animate SVG Stroke
    const offset = circleCircumference - (targetPercent / 100) * circleCircumference;
    progressCircle.style.strokeDashoffset = offset;
}

function setStatusColor(level) {
    // Retrigger glitch animation
    statusMessage.className = `status-${level}`;
    statusMessage.classList.remove('glitch-active');
    void statusMessage.offsetWidth; // trigger reflow
    statusMessage.classList.add('glitch-active');
    setTimeout(() => statusMessage.classList.remove('glitch-active'), 400);

    progressCircle.setAttribute('stroke', `url(#gradient-${level === 'safe' ? 'green' : level === 'risk' ? 'yellow' : 'red'})`);
    
    if (level === 'safe') {
        glowBackdrop.style.background = 'radial-gradient(circle, rgba(0, 255, 136, 0.4) 0%, transparent 70%)';
        document.body.classList.remove('danger-mode-active');
    } else if (level === 'risk') {
        glowBackdrop.style.background = 'radial-gradient(circle, rgba(255, 204, 0, 0.4) 0%, transparent 70%)';
        document.body.classList.remove('danger-mode-active');
    } else if (level === 'danger') {
        glowBackdrop.style.background = 'radial-gradient(circle, rgba(255, 0, 85, 0.4) 0%, transparent 70%)';
        document.body.classList.add('danger-mode-active');
    }
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    obj.classList.add('digital-flicker');

    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing out cubic
        const p = 1 - Math.pow(1 - progress, 3);
        const currentVal = (progress === 1) ? end : start + (end - start) * p;
        // Check for decimal. If exact, use toFixed(1), else limit.
        if(currentVal % 1 === 0 && end % 1 === 0) {
             obj.innerHTML = Math.floor(currentVal);
        } else {
             obj.innerHTML = currentVal.toFixed(1);
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.classList.remove('digital-flicker');
        }
    };
    window.requestAnimationFrame(step);
}

// Auto Predictor Logic
function updatePrediction() {
    const total = parseInt(totalClasses.value) || 0;
    const attended = parseInt(attendedClasses.value) || 0;
    const bunkNext = parseInt(predictBunk.value) || 0;

    if (total === 0) {
        predictedPercent.textContent = '--%';
        return;
    }

    const newTotal = total + bunkNext;
    const newPercent = ((attended / newTotal) * 100).toFixed(1);
    
    predictedPercent.textContent = `${newPercent}%`;
    predictedPercent.classList.remove('fade');
    void predictedPercent.offsetWidth; // trigger reflow
    predictedPercent.classList.add('fade');
    
    if (newPercent >= 75) {
        predictedPercent.style.color = 'var(--neon-green)';
        predictedPercent.style.textShadow = '0 0 5px var(--neon-green)';
    } else {
        predictedPercent.style.color = 'var(--neon-red)';
        predictedPercent.style.textShadow = '0 0 5px var(--neon-red)';
    }
}

// Calendar Planner Logic
const calendarDays = document.getElementById('calendarDays');
const calendarMonthYear = document.getElementById('calendarMonthYear');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const floatingTooltip = document.getElementById('floatingTooltip');

let currentDate = new Date(); // Tracks real-time "Today"
let navMonth = currentDate.getMonth();
let navYear = currentDate.getFullYear();

// object mapping: 'YYYY-MM-DD' -> 'attended' | 'bunked'
let plannerSelections = {};

const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function renderCalendar(transitionType = '') {
    // Add transition effect
    if(transitionType) {
        calendarDays.classList.add('glitch-out');
        setTimeout(() => {
            buildCalendarGrid();
            calendarDays.classList.remove('glitch-out');
        }, 150);
    } else {
        buildCalendarGrid();
    }
}

function buildCalendarGrid() {
    calendarDays.innerHTML = '';
    calendarMonthYear.textContent = `${monthNames[navMonth]} ${navYear}`;
    
    // glitch nav text
    calendarMonthYear.classList.remove('glitch-active');
    void calendarMonthYear.offsetWidth;
    calendarMonthYear.classList.add('glitch-active');
    setTimeout(() => calendarMonthYear.classList.remove('glitch-active'), 400);

    const firstDay = new Date(navYear, navMonth, 1).getDay(); // 0 is Sun, 1 is Mon
    const daysInMonth = new Date(navYear, navMonth + 1, 0).getDate();
    
    // adjust firstDay for Monday start (ISO)
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;

    // Fill empty slots
    for (let i = 0; i < startOffset; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'day-cell empty';
        calendarDays.appendChild(emptyCell);
    }

    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        const cellDate = new Date(navYear, navMonth, i);
        const dateString = `${navYear}-${(navMonth+1).toString().padStart(2,'0')}-${i.toString().padStart(2,'0')}`;
        const dayOfWeek = cellDate.getDay();

        const cell = document.createElement('div');
        cell.className = 'day-cell';
        cell.textContent = i;
        cell.dataset.dateString = dateString;

        // Today check
        if (i === currentDate.getDate() && navMonth === currentDate.getMonth() && navYear === currentDate.getFullYear()) {
            cell.classList.add('today-highlight');
        }

        // Sunday disables
        if (dayOfWeek === 0) {
            cell.classList.add('disabled');
            cell.addEventListener('mouseenter', (e) => showTooltip(e, "No classes (Sunday)"));
            cell.addEventListener('mouseleave', hideTooltip);
        } else {
            // Restore state if exists
            if (plannerSelections[dateString]) {
                cell.classList.add(`state-${plannerSelections[dateString]}`);
            }

            // Bind interactions
            cell.addEventListener('click', (e) => toggleCalendarDay(e, cell, dateString));
            cell.addEventListener('mouseenter', (e) => simulateHover(e, cell, dateString));
            cell.addEventListener('mouseleave', hideTooltip);
            
            // Custom cursor hook
            cell.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
            cell.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
        }

        calendarDays.appendChild(cell);
    }
}

function toggleCalendarDay(e, cell, dateStr) {
    // Add Ripple Effect
    const rect = cell.getBoundingClientRect();
    const circle = document.createElement('span');
    const diameter = Math.max(cell.clientWidth, cell.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple-effect');
    
    const existingRipple = cell.querySelector('.ripple-effect');
    if (existingRipple) existingRipple.remove(); // Remove previous if spam clicking
    cell.appendChild(circle);

    const currentState = plannerSelections[dateStr];
    let nextState = null;
    
    // Cycle: unset -> attended -> bunked -> unset
    if (!currentState) nextState = 'attended';
    else if (currentState === 'attended') nextState = 'bunked';
    else nextState = null;

    if (nextState) {
        plannerSelections[dateStr] = nextState;
    } else {
        delete plannerSelections[dateStr];
    }
    
    cell.className = 'day-cell' + 
                     (cell.classList.contains('today-highlight') ? ' today-highlight' : '') + 
                     (nextState ? ` state-${nextState}` : '');

    // Re-trigger hover preview to reflect new baseline
    // Using current mouse position natively via tooltip tracker
    const rawLeft = floatingTooltip.style.left.replace('px','');
    const rawTop = floatingTooltip.style.top.replace('px','');
    simulateHover({ clientX: rawLeft ? parseInt(rawLeft) : 0, clientY: rawTop ? parseInt(rawTop) : 0 }, cell, dateStr);
}

// Tooltip positioning hook
document.addEventListener('mousemove', (e) => {
    if (floatingTooltip.classList.contains('visible')) {
        floatingTooltip.style.left = e.clientX + 'px';
        floatingTooltip.style.top = e.clientY + 'px';
    }
});

function showTooltip(e, text, isHTML = false) {
    if (isHTML) floatingTooltip.innerHTML = text;
    else floatingTooltip.textContent = text;
    
    floatingTooltip.style.left = e.clientX + 'px';
    floatingTooltip.style.top = e.clientY + 'px';
    // Slight bump upwards
    floatingTooltip.classList.add('visible');
}

function hideTooltip() {
    floatingTooltip.classList.remove('visible');
}

function simulateHover(e, cell, dateStr) {
    const currentState = plannerSelections[dateStr];
    const baseNewTotal = parseInt(totalClasses.value) || 0;
    const baseNewAttended = parseInt(attendedClasses.value) || 0;

    // Sum all current selections first
    let sumAddedTotal = 0;
    let sumAddedAttended = 0;
    for (const key in plannerSelections) {
        sumAddedTotal += 6;
        if (plannerSelections[key] === 'attended') sumAddedAttended += 6;
    }

    // What if they click it? (Preview the NEXT state in the cycle)
    let nextState = null;
    if (!currentState) nextState = 'attended';
    else if (currentState === 'attended') nextState = 'bunked';
    else nextState = null; // Unset
    
    let simulatedTotal = sumAddedTotal;
    let simulatedAttended = sumAddedAttended;

    // Undo current impact
    if (currentState) {
        simulatedTotal -= 6;
        if (currentState === 'attended') simulatedAttended -= 6;
    }
    // Apply next impact
    if (nextState) {
        simulatedTotal += 6;
        if (nextState === 'attended') simulatedAttended += 6;
    }

    const finalTotal = baseNewTotal + simulatedTotal;
    const finalAttended = baseNewAttended + simulatedAttended;

    if (finalTotal === 0) {
        showTooltip(e, "Total classes is 0");
        return;
    }

    const newPercent = ((finalAttended / finalTotal) * 100).toFixed(1);
    let colorClass = newPercent >= 75 ? 'tooltip-green' : 'tooltip-red';
    
    let actionText = '';
    if (nextState === 'attended') actionText = '+6 Classes (Attended)';
    else if (nextState === 'bunked') actionText = '+6 Classes (Bunked)';
    else actionText = 'Remove Selection';

    showTooltip(e, `${actionText} → New: <span class="${colorClass}">${newPercent}%</span>`, true);
}

// Nav events
prevMonthBtn.addEventListener('click', () => {
    navMonth--;
    if (navMonth < 0) { navMonth = 11; navYear--; }
    renderCalendar('prev');
});

nextMonthBtn.addEventListener('click', () => {
    navMonth++;
    if (navMonth > 11) { navMonth = 0; navYear++; }
    renderCalendar('next');
});

// Action Buttons
applyPlannerBtn.addEventListener('click', () => {
    let addedTotal = 0;
    let addedAttended = 0;
    for (const key in plannerSelections) {
        addedTotal += 6;
        if (plannerSelections[key] === 'attended') addedAttended += 6;
    }
    
    if (addedTotal === 0) return; // No selections
    
    const currentTotal = parseInt(totalClasses.value) || 0;
    const currentAttended = parseInt(attendedClasses.value) || 0;
    
    totalClasses.value = currentTotal + addedTotal;
    attendedClasses.value = currentAttended + addedAttended;
    
    // Purge states
    plannerSelections = {};
    renderCalendar(); // cleans UI
    
    calculateAttendance();
    
    // Flash effect on apply
    progressCircle.classList.remove('flash-success');
    void progressCircle.offsetWidth;
    progressCircle.classList.add('flash-success');
    
    applyPlannerBtn.innerHTML = 'Applied! ✨';
    setTimeout(() => applyPlannerBtn.innerHTML = 'Apply to Tracker', 1500);
});

resetPlannerBtn.addEventListener('click', () => {
    plannerSelections = {};
    
    // Micro-shake UI
    resetPlannerBtn.classList.remove('shake-confirm');
    calendarDays.classList.remove('shake-confirm');
    void resetPlannerBtn.offsetWidth;
    
    resetPlannerBtn.classList.add('shake-confirm');
    calendarDays.classList.add('shake-confirm');
    
    setTimeout(() => {
        calendarDays.classList.add('glitch-out');
        setTimeout(() => {
            buildCalendarGrid();
            calendarDays.classList.remove('glitch-out');
        }, 150);
    }, 300);
});

// Event Listeners
totalClasses.addEventListener('input', calculateAttendance);
attendedClasses.addEventListener('input', calculateAttendance);
predictBunk.addEventListener('input', updatePrediction);

// AI Predictor Popup Logic
aiTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    predictionPanel.classList.toggle('active');
});
document.addEventListener('click', (e) => {
    if (!predictionPanel.contains(e.target) && !aiTriggerBtn.contains(e.target)) {
        predictionPanel.classList.remove('active');
    }
});

// Initialization
renderCalendar();
loadData();

// Footer Signature Interaction Logic
const signatureContainer = document.getElementById('signatureContainer');
const signatureSpotlight = document.getElementById('signatureSpotlight');
let revealTimeout;

signatureContainer.addEventListener('mousemove', (e) => {
    const rect = signatureContainer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    signatureSpotlight.style.setProperty('--x', `${x}px`);
    signatureSpotlight.style.setProperty('--y', `${y}px`);
});

signatureContainer.addEventListener('click', () => {
    if (revealTimeout) clearTimeout(revealTimeout);
    
    signatureContainer.classList.add('is-revealed');
    
    // Auto-reset after 3 seconds
    revealTimeout = setTimeout(() => {
        signatureContainer.classList.remove('is-revealed');
    }, 3000);
});

// Change custom cursor to hovering on signature
signatureContainer.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
signatureContainer.addEventListener('mouseleave', () => {
    cursor.classList.remove('hovering');
    // Spotlight naturally fades away via CSS when not hovered
});
