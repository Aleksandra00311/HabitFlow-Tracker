/**
 * HabitFlow OS V2 - Chronological 1-31 Month Calendar Core Engine
 * File path: js/habits.js
 */

(function () {
    "use strict";

    // --- 1. CONFIGURATION REGISTRY ---
    const BEHAVIOR_REGISTRY = {
        "Fitness": { emoji: "💪", color: "#3b82f6", subcategories: ["Weightlifting 🏋️", "Cardio Session 🏃‍♂️", "Yoga & Mobility 🧘", "Swimming 🏊"] },
        "Study": { emoji: "📚", color: "#8b5cf6", subcategories: ["LeetCode Grind 💻", "Technical Reading 📚", "Language Practice 🗣️", "Deep Research 🔬"] },
        "Health": { emoji: "🍏", color: "#22c55e", subcategories: ["Meal Prep 🥗", "8 Hours Sleep 😴", "Hydration Target 💧", "Meditation 🧠"] },
        "Career": { emoji: "💼", color: "#f59e0b", subcategories: ["Networking Outreach 🤝", "Portfolio Work 🎨", "Resume Tuning 📄", "Inbox Zero 📥"] }
    };

    const DYNAMIC_COLOR_PALETTE = ["#ec4899", "#06b6d4", "#14b8a6", "#f43f5e", "#10b981", "#6366f1"];
    const TARGET_XP_LEVEL_CAP = 1000;
    const currentUser = localStorage.getItem("currentUser") || "guest@domain.com";

    // --- 2. GLOBAL SYSTEM STATE INITIALIZER ---
    let appState = {
        profile: { level: 1, xp: 0 },
        habits: [],
        frictionPoints: { "Too Busy ⏳": 0, "Low Energy 🪫": 0, "Forgot 🧠": 0, "Away from Home 🚗": 0, "Not Motivated 📉": 0 },
        portfolio: {},
        timeblocks: { "zone-0800": null, "zone-1200": null, "zone-1600": null, "zone-2000": null },
        customRegistry: {}
    };

    let isCustomInputMode = false;
    let frictionChartInstance = null;
    let portfolioChartInstance = null;

    // Helper utility to calculate clean forward numerical calendar order from day 1
    function getPast30DaysTimeline() {
        const datesTimeline = [];
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0 = Jan, 1 = Feb, etc.

        // Get total number of days in the current calendar month dynamically
        const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        // Loop forward sequentially from Day 1 to the end of the month
        for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
            const calculatedDate = new Date(currentYear, currentMonth, dayNum);
            datesTimeline.push({
                dayLabel: calculatedDate.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0), // 'M', 'T', etc.
                dateNumber: dayNum, // Reads sequentially: 1, 2, 3... 31
                formattedStr: `${dayNum}/${currentMonth + 1}`
            });
        }
        return datesTimeline;
    }

    // --- 3. LIFECYCLE ROUTER ---
    document.addEventListener("DOMContentLoaded", () => {
        try {
            loadStateFromStorage();
            initializeSystemCore();
        } catch (error) {
            console.error("CRITICAL_CORE_FAILURE // Initialization aborted:", error);
        }
    });

    function initializeSystemCore() {
        bindGlobalEventActionHandlers();
        populateCategorySelectors();
        updateSubCategoryOptions();
        startTelemetryClock();
        
        try {
            generateAnalyticsCharts();
        } catch(e) { 
            console.error("CHART_LOAD_ERR", e); 
        }
        
        renderHabitWorkspace();
        recalculateSystemMetrics();
    }

    // --- 4. DATA PERSISTENCE LAYER & ANTI-CRASH MIGRATION ENGINE ---
    function loadStateFromStorage() {
        const structuralBackup = localStorage.getItem(`habitflow_state_${currentUser}`);
        const currentMonthLength = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

        if (structuralBackup) {
            try {
                appState = JSON.parse(structuralBackup);
                appState.portfolio = appState.portfolio || {};
                appState.timeblocks = appState.timeblocks || { "zone-0800": null, "zone-1200": null, "zone-1600": null, "zone-2000": null };
                appState.customRegistry = appState.customRegistry || {};
                appState.habits = appState.habits || [];
                
                // Force legacy history maps to scale to the correct month size automatically
                appState.habits.forEach(h => {
                    if (!h.history || !Array.isArray(h.history) || h.history.length !== currentMonthLength) {
                        const newHistory = Array(currentMonthLength).fill(null);
                        if (h.history && Array.isArray(h.history)) {
                            for (let i = 0; i < Math.min(h.history.length, currentMonthLength); i++) {
                                newHistory[i] = h.history[i];
                            }
                        }
                        h.history = newHistory;
                    }
                    if (typeof h.streak !== 'number') h.streak = 0;
                });
            } catch (e) {
                console.warn("STATE_CORRUPTION // Restoring system defaults.");
                resetStateToDefaults();
            }
        } else {
            resetStateToDefaults();
        }
    }

    function resetStateToDefaults() {
        appState = {
            profile: { level: 1, xp: 0 },
            habits: [],
            frictionPoints: { "Too Busy ⏳": 0, "Low Energy 🪫": 0, "Forgot 🧠": 0, "Away from Home 🚗": 0, "Not Motivated 📉": 0 },
            portfolio: {},
            timeblocks: { "zone-0800": null, "zone-1200": null, "zone-1600": null, "zone-2000": null },
            customRegistry: {}
        };
        Object.keys(BEHAVIOR_REGISTRY).forEach(category => {
            appState.portfolio[category] = 0;
        });
    }

    function persistStateToStorage() {
        localStorage.setItem(`habitflow_state_${currentUser}`, JSON.stringify(appState));
    }

    // --- 5. COMPONENT INTERACTION BINDINGS ---
    function bindGlobalEventActionHandlers() {
        const logoutBtn = document.getElementById("logoutBtn");
        if (logoutBtn) {
            logoutBtn.addEventListener("click", () => {
                localStorage.removeItem("currentUser");
                window.location.href = "login.html";
            });
        }
        window.updateSubCategoryOptions = updateSubCategoryOptions;
        window.addHabit = addHabit;
        window.triggerManualRecovery = triggerManualRecovery;
        window.executeModalFrictionSubmission = executeModalFrictionSubmission;
        window.closeModal = closeModal;
        window.openNodeExecutionMenu = openNodeExecutionMenu;
        window.decommissionHabit = decommissionHabit;
        window.allowDrop = allowDrop;
        window.handleTimeBlockDrop = handleTimeBlockDrop;
        window.generateWeeklyReview = generateWeeklyReview;
        window.askAiCoach = askAiCoach;
        window.toggleCategoryMode = toggleCategoryMode;
    }

    function toggleCategoryMode() {
        isCustomInputMode = !isCustomInputMode;
        const presetCatWrap = document.getElementById("presetCategoryWrapper");
        const customCatWrap = document.getElementById("customCategoryWrapper");
        const presetActWrap = document.getElementById("presetActivityWrapper");
        const customActWrap = document.getElementById("customActivityWrapper");
        const interfaceActionBtn = document.getElementById("toggleCustomCategoryBtn");

        if (isCustomInputMode) {
            if (presetCatWrap) presetCatWrap.style.display = "none";
            if (presetActWrap) presetActWrap.style.display = "none";
            if (customCatWrap) customCatWrap.style.display = "block";
            if (customActWrap) customActWrap.style.display = "block";
            if (interfaceActionBtn) {
                interfaceActionBtn.textContent = "📋 Use Presets";
                interfaceActionBtn.style.background = "var(--primary)";
                interfaceActionBtn.style.color = "#ffffff";
            }
        } else {
            if (presetCatWrap) presetCatWrap.style.display = "block";
            if (presetActWrap) presetActWrap.style.display = "block";
            if (customCatWrap) customCatWrap.style.display = "none";
            if (customActWrap) customActWrap.style.display = "none";
            if (interfaceActionBtn) {
                interfaceActionBtn.textContent = "➕ Add Custom";
                interfaceActionBtn.style.background = "#f1f5f9";
                interfaceActionBtn.style.color = "var(--text-dark)";
            }
            updateSubCategoryOptions();
        }
    }

    function populateCategorySelectors() {
        const catSelect = document.getElementById("categorySelect");
        if (!catSelect) return;
        catSelect.innerHTML = "";
        Object.keys(BEHAVIOR_REGISTRY).forEach(key => {
            const opt = document.createElement("option");
            opt.value = key; opt.textContent = `${key} ${BEHAVIOR_REGISTRY[key].emoji}`; catSelect.appendChild(opt);
        });
    }

    function updateSubCategoryOptions() {
        const catSelect = document.getElementById("categorySelect");
        const subSelect = document.getElementById("subCategorySelect");
        if (!catSelect || !subSelect) return;
        subSelect.innerHTML = "";
        const availableActivities = BEHAVIOR_REGISTRY[catSelect.value]?.subcategories || [];
        availableActivities.forEach(activity => {
            const opt = document.createElement("option");
            opt.value = activity; opt.textContent = activity; subSelect.appendChild(opt);
        });
    }

    function startTelemetryClock() {
        const clockConsole = document.getElementById("liveSystemClock");
        if (!clockConsole) return;
        const updateClock = () => { clockConsole.textContent = `SYS_TIME // ${new Date().toLocaleTimeString()}`; };
        updateClock(); setInterval(updateClock, 1000);
    }

    function getCategoryMeta(categoryName) {
        if (BEHAVIOR_REGISTRY[categoryName]) return BEHAVIOR_REGISTRY[categoryName];
        if (appState.customRegistry[categoryName]) return appState.customRegistry[categoryName];
        const freshColor = DYNAMIC_COLOR_PALETTE[Object.keys(appState.customRegistry).length % DYNAMIC_COLOR_PALETTE.length];
        appState.customRegistry[categoryName] = { emoji: "⚙️", color: freshColor };
        return appState.customRegistry[categoryName];
    }

    function addHabit() {
        let category = isCustomInputMode ? document.getElementById("customCategoryInput").value.trim() : document.getElementById("categorySelect").value;
        let activity = isCustomInputMode ? document.getElementById("customActivityInput").value.trim() : document.getElementById("subCategorySelect").value;
        const tiny = document.getElementById("tierTinyInput").value.trim();
        const standard = document.getElementById("tierStandardInput").value.trim();
        const advanced = document.getElementById("tierAdvancedInput").value.trim();

        if (!category || !activity || !tiny || !standard || !advanced) {
            renderFormNotification("Configuration failed: All fields must be completed.", "var(--danger)", "#fee2e2");
            return;
        }

        const currentMonthLength = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

        const blueprint = {
            id: `flow-node-${Date.now()}`,
            category, activity,
            tiers: { tiny, standard, advanced },
            history: Array(currentMonthLength).fill(null),
            streak: 0
        };

        appState.habits.push(blueprint);
        appState.portfolio[category] = (appState.portfolio[category] || 0) + 1;

        document.getElementById("tierTinyInput").value = ""; 
        document.getElementById("tierStandardInput").value = ""; 
        document.getElementById("tierAdvancedInput").value = "";
        if (isCustomInputMode) toggleCategoryMode();

        processExperienceAwards(60); 
        persistStateToStorage(); 
        renderHabitWorkspace(); 
        recalculateSystemMetrics(); 
        refreshAnalyticalMatrices();
        renderFormNotification(`System core "${activity}" successfully deployed!`, "#16a34a", "#dcfce7");
    }

    function renderFormNotification(text, border, background) {
        const noticeBox = document.getElementById("blueprintFormNotification");
        if (!noticeBox) return;
        noticeBox.textContent = text; noticeBox.style.display = "block"; noticeBox.style.borderLeft = `4px solid ${border}`; noticeBox.style.backgroundColor = background; noticeBox.style.color = border;
        setTimeout(() => noticeBox.style.display = "none", 4000);
    }

    // --- 7. INDUSTRIAL WORKSPACE CALENDAR RENDERING ENGINE ---
    function renderHabitWorkspace() {
        const listWrapper = document.getElementById("habitList");
        if (!listWrapper) return;
        listWrapper.innerHTML = "";

        if (!appState.habits || appState.habits.length === 0) {
            listWrapper.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 40px; width:100%;">No blueprints active. Add blueprints using the control panel variables grid.</li>`;
            return;
        }

        const timelineData = getPast30DaysTimeline();

        appState.habits.forEach((habit, hIdx) => {
            const currentMeta = getCategoryMeta(habit.category);
            const cardNode = document.createElement("li");
            cardNode.className = "habit-card-item";
            cardNode.style.borderLeft = `4px solid ${currentMeta.color}`;
            cardNode.draggable = true;

            cardNode.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/plain", habit.id); });

            let monthGridHTML = "";
            habit.history.forEach((nodeState, dayIdx) => {
                let statusVariant = "day-node-empty";
                if (nodeState === "tiny") statusVariant = "day-node-tiny";
                if (nodeState === "standard") statusVariant = "day-node-standard";
                if (nodeState === "advanced") statusVariant = "day-node-advanced";
                if (nodeState === "friction") statusVariant = "day-node-friction";

                const currentDay = timelineData[dayIdx];

                monthGridHTML += `
                    <div class="calendar-day-cell" title="${currentDay.formattedStr}">
                        <span class="day-txt-header">${currentDay.dayLabel}</span>
                        <span class="date-txt-num">${currentDay.dateNumber}</span>
                        <div class="calendar-node-indicator ${statusVariant}" onclick="openNodeExecutionMenu(${hIdx}, ${dayIdx})"></div>
                    </div>
                `;
            });

            cardNode.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                    <div>
                        <h4 style="margin:0 0 2px 0; font-size:15px; font-weight:700; color:var(--text-dark);">${habit.activity}</h4>
                        <span style="font-size:9px; font-weight:700; background:${currentMeta.color}15; color:${currentMeta.color}; padding:1px 5px; border-radius:4px;">${habit.category.toUpperCase()}</span>
                    </div>
                    <button onclick="decommissionHabit('${habit.id}')" style="background:none; border:none; color:var(--danger); font-size:11px; cursor:pointer; font-weight:600;">✕ Kill Unit</button>
                </div>
                
                <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
                    <div style="font-size:10px; background:#f8fafc; padding:6px; border-radius:6px; display:flex; gap:12px; flex: 1; min-width: 200px;">
                        <span style="color:#16a34a; font-weight:600;">🟢 Tiny: ${habit.tiers.tiny}</span>
                        <span style="color:var(--primary); font-weight:600;">🔵 Ideal: ${habit.tiers.standard}</span>
                        <span style="color:#b45309; font-weight:600;">🟠 Max: ${habit.tiers.advanced}</span>
                    </div>
                    <div style="font-size:11px; font-weight:700; color:var(--text-muted);">Streak: 🔥 <span style="color:var(--text-dark);">${habit.streak} Days</span></div>
                </div>
                
                <div class="calendar-month-matrix">
                    ${monthGridHTML}
                </div>
            `;
            listWrapper.appendChild(cardNode);
        });

        syncTimeblockInterface();
    }

    function decommissionHabit(targetId) {
        const index = appState.habits.findIndex(h => h.id === targetId);
        if (index === -1) return;
        appState.portfolio[appState.habits[index].category] = Math.max(0, (appState.portfolio[appState.habits[index].category] || 1) - 1);
        appState.habits.splice(index, 1);
        Object.keys(appState.timeblocks).forEach(slot => { if (appState.timeblocks[slot] === targetId) appState.timeblocks[slot] = null; });
        persistStateToStorage(); renderHabitWorkspace(); recalculateSystemMetrics(); refreshAnalyticalMatrices();
    }

    // --- 8. HISTORICAL Node ROTATION ENGINE ---
    function openNodeExecutionMenu(habitIndex, dayIndex) {
        const entry = appState.habits[habitIndex];
        if (!entry) return;

        const currentState = entry.history[dayIndex];
        let nextState = null; let xpScore = 0;

        if (currentState === null) { nextState = "tiny"; xpScore = 15; }
        else if (currentState === "tiny") { nextState = "standard"; xpScore = 15; }
        else if (currentState === "standard") { nextState = "advanced"; xpScore = 30; }
        else if (currentState === "advanced") {
            document.getElementById("modalHabitIndex").value = habitIndex;
            document.getElementById("modalDayIndex").value = dayIndex;
            document.getElementById("obstacleModal").style.display = "flex";
            return;
        } 
        else if (currentState === "friction") { nextState = null; xpScore = 0; }

        entry.history[dayIndex] = nextState;
        reconcileStreakTelemetry(entry);
        if (xpScore > 0) processExperienceAwards(xpScore);
        persistStateToStorage(); renderHabitWorkspace(); recalculateSystemMetrics();
    }

    function executeModalFrictionSubmission() {
        const hIdx = document.getElementById("modalHabitIndex").value;
        const dIdx = document.getElementById("modalDayIndex").value;
        const bottleneckReason = document.getElementById("skipReasonSelect").value;
        const habitElement = appState.habits[hIdx];
        if (habitElement) {
            habitElement.history[dIdx] = "friction";
            appState.frictionPoints[bottleneckReason] = (appState.frictionPoints[bottleneckReason] || 0) + 1;
            reconcileStreakTelemetry(habitElement);
        }
        closeModal(); persistStateToStorage(); renderHabitWorkspace(); recalculateSystemMetrics(); refreshAnalyticalMatrices();
    }

    function closeModal() { document.getElementById("obstacleModal").style.display = "none"; }

    function reconcileStreakTelemetry(habit) {
        let runningCount = 0; let absoluteMax = 0;
        for (let i = 0; i < habit.history.length; i++) {
            if (["tiny", "standard", "advanced"].includes(habit.history[i])) {
                runningCount++; if (runningCount > absoluteMax) absoluteMax = runningCount;
            } else { runningCount = 0; }
        }
        habit.streak = absoluteMax;
    }

    // --- 9. REWARD TELEMETRY WIDGETS ---
    function processExperienceAwards(points) {
        appState.profile.xp += points;
        while (appState.profile.xp >= TARGET_XP_LEVEL_CAP) {
            appState.profile.xp -= TARGET_XP_LEVEL_CAP; appState.profile.level += 1;
        }
        syncRewardWidgets();
    }

    function syncRewardWidgets() {
        const levelNode = document.getElementById("userLevel");
        const numericNode = document.getElementById("currentXp");
        const timelineProgressBar = document.getElementById("xpProgressBar");
        if (levelNode) levelNode.textContent = appState.profile.level;
        if (numericNode) numericNode.textContent = appState.profile.xp;
        if (timelineProgressBar) { timelineProgressBar.style.width = `${(appState.profile.xp / TARGET_XP_LEVEL_CAP) * 100}%`; }
    }

    function allowDrop(event) { event.preventDefault(); }
    function handleTimeBlockDrop(event, targetZoneIdentifier) {
        event.preventDefault(); const incomingHabitId = event.dataTransfer.getData("text/plain");
        if (appState.habits.some(h => h.id === incomingHabitId) && appState.timeblocks.hasOwnProperty(targetZoneIdentifier)) {
            appState.timeblocks[targetZoneIdentifier] = incomingHabitId; persistStateToStorage(); syncTimeblockInterface();
        }
    }

    function syncTimeblockInterface() {
        Object.keys(appState.timeblocks).forEach(zoneId => {
            const cell = document.getElementById(zoneId); if (!cell) return;
            const habitObject = appState.habits.find(h => h.id === appState.timeblocks[zoneId]);
            if (habitObject) {
                const currentMeta = getCategoryMeta(habitObject.category);
                cell.innerHTML = `<span style="color:#0f172a; font-weight:700; font-size:11px;">${habitObject.activity}</span>`;
                cell.style.background = `${currentMeta.color}18`; cell.style.border = `1px solid ${currentMeta.color}`;
            } else {
                cell.innerHTML = "— Empty —"; cell.style.background = "var(--f8fafc)"; cell.style.border = "1px dashed var(--border)";
            }
        });
    }

    // --- 12. DATA CALCULATORS & PREDICTIVE TELEMETRY ---
    function recalculateSystemMetrics() {
        if (appState.habits.length === 0) { updateDashboardTelemetryFields(0, 0, "Low", "Standard"); toggleWarningConsole(false); return; }
        let completedNodeCount = 0; let frictionNodeCount = 0;
        
        appState.habits.forEach(h => {
            h.history.forEach(status => {
                if (["tiny", "standard", "advanced"].includes(status)) completedNodeCount++;
                if (status === "friction") frictionNodeCount++;
            });
        });

        const totalOperationalCells = appState.habits.length * appState.habits[0].history.length;
        const analyticalMomentum = Math.round((completedNodeCount / totalOperationalCells) * 100);
        const processingBounceBack = (completedNodeCount + frictionNodeCount) === 0 ? 0 : Math.round((completedNodeCount / (completedNodeCount + frictionNodeCount)) * 100);
        let riskAssessment = "Low"; let recommendedStrategy = "Standard Workspace Mode";

        if (analyticalMomentum < 35) { riskAssessment = "Critical Risk Vector"; recommendedStrategy = "Emergency Tiny Mode 🟢"; }
        else if (analyticalMomentum < 65) { riskAssessment = "Elevated Risk Vector"; recommendedStrategy = "Friction Reduction Strategy"; }
        else if (analyticalMomentum > 85) { recommendedStrategy = "Advanced Optimization 🟠"; }

        updateDashboardTelemetryFields(analyticalMomentum, processingBounceBack, riskAssessment, recommendedStrategy);
        if (riskAssessment !== "Low") { toggleWarningConsole(true, `⚠️ SYSTEM RADAR WARNING: Consistency drop identified. Strategic advice points toward tasks over to "${recommendedStrategy}".`); }
        else { toggleWarningConsole(false); }
    }

    function updateDashboardTelemetryFields(momentum, bounce, risk, targetMode) {
        const momentumEl = document.getElementById("sysMomentum");
        const recoveryEl = document.getElementById("sysRecovery");
        const riskIndicator = document.getElementById("sysRisk");
        const modeEl = document.getElementById("sysMode");

        if (momentumEl) momentumEl.textContent = `${momentum}/100`;
        if (recoveryEl) recoveryEl.textContent = `${bounce}%`;
        if (riskIndicator) {
            riskIndicator.textContent = risk;
            riskIndicator.className = "bm-value " + (risk.includes("Critical") ? "text-danger" : risk.includes("Elevated") ? "text-warning" : "text-success");
        }
        if (modeEl) modeEl.textContent = targetMode;
        syncRewardWidgets();
    }

    function toggleWarningConsole(visible, diagnosticMessage = "") {
        const consoleLayout = document.getElementById("predictiveWarningConsole"); if (!consoleLayout) return;
        consoleLayout.textContent = diagnosticMessage; consoleLayout.style.display = visible ? "block" : "none";
    }

    function triggerManualRecovery() { alert("CRITICAL OVERRIDE SYNC ENGAGED // Activating Bounce-Back Protocols. All operational objectives re-assigned to Tiny Baselines."); }

    // --- 13. GRAPHICAL VISUALIZATION ENGINES (CHART.JS) ---
    function generateAnalyticsCharts() {
        const canvasFriction = document.getElementById("frictionAnalyticsChart");
        const canvasPortfolio = document.getElementById("portfolioAnalyticsChart");
        if (canvasFriction) {
            if (frictionChartInstance) frictionChartInstance.destroy();
            frictionChartInstance = new Chart(canvasFriction, {
                type: 'bar',
                data: { labels: Object.keys(appState.frictionPoints), datasets: [{ data: Object.values(appState.frictionPoints), backgroundColor: '#ef4444', borderRadius: 4 }] },
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { stepSize: 1 } }, y: { grid: { display: false } } } }
            });
        }
        if (canvasPortfolio) {
            if (portfolioChartInstance) portfolioChartInstance.destroy();
            portfolioChartInstance = new Chart(canvasPortfolio, {
                type: 'doughnut',
                data: { labels: Object.keys(appState.portfolio), datasets: [{ data: Object.values(appState.portfolio), backgroundColor: Object.keys(appState.portfolio).map(cat => getCategoryMeta(cat).color) }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } } } }
            });
        }
    }

    function refreshAnalyticalMatrices() {
        if (frictionChartInstance) { frictionChartInstance.data.datasets[0].data = Object.values(appState.frictionPoints); frictionChartInstance.update(); }
        if (portfolioChartInstance) {
            portfolioChartInstance.data.labels = Object.keys(appState.portfolio); portfolioChartInstance.data.datasets[0].data = Object.values(appState.portfolio);
            portfolioChartInstance.data.datasets[0].backgroundColor = Object.keys(appState.portfolio).map(cat => getCategoryMeta(cat).color); portfolioChartInstance.update();
        }
    }

    // --- 14. INTEL REPORTING AND CORE COACH SYSTEMS ---
    function generateWeeklyReview() {
        const executionLogDisplay = document.getElementById("weeklyReviewContent"); if (!executionLogDisplay) return;
        if (appState.habits.length === 0) { executionLogDisplay.innerHTML = `<span style="color:var(--danger)">Compilation aborted: Processing parameters require at least 1 active blueprint.</span>`; return; }
        let apexHabitNode = appState.habits[0]; appState.habits.forEach(h => { if (h.streak > apexHabitNode.streak) apexHabitNode = h; });
        executionLogDisplay.innerHTML = `<strong>📊 Month Calendar Performance Diagnostic:</strong><br>• System Operations Active: <strong>${appState.habits.length} functional modules</strong>.<br>• Max Month Consistency: <strong>${apexHabitNode.activity}</strong> keeping an unbroken anchor link of <strong>${apexHabitNode.streak} days</strong>.`;
        processExperienceAwards(40);
    }

    function askAiCoach() {
        const analyticalQuerySelection = document.getElementById("aiQuerySelect").value;
        const aiResponseDisplayNode = document.getElementById("aiResponseBox"); if (!aiResponseDisplayNode) return;
        aiResponseDisplayNode.style.display = "block"; aiResponseDisplayNode.innerHTML = `<em>Querying neural behavioral intelligence framework nodes...</em>`;
        setTimeout(() => {
            let modelOutput = "";
            if (analyticalQuerySelection === "obstacles") modelOutput = `🔮 <strong>Predictive 30-Day Failure Analysis:</strong> Late-month transitions show an elevated drops correlation. Setting mid-month targets increases persistence by 28%.`;
            else if (analyticalQuerySelection === "keystone") modelOutput = `⚙️ <strong>Keystone Architecture Identification:</strong> Physical tracking routines show structural correlation with downstream cognitive modules. Prioritize anchoring your core routines first.`;
            else modelOutput = `🧠 <strong>Tactical Coaching Loop:</strong> Your month completion latency requires stabilization. Apply atomic loops to keep grid nodes checked green even on lowest energy days.`;
            aiResponseDisplayNode.innerHTML = modelOutput;
        }, 750);
    }

})();