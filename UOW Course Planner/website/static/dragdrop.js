let accumulatedCredits = 0;

function updateDisplayedCredits() {
    const accumulatedCreditsElement = document.getElementById("accumulated-credits");
    if (accumulatedCreditsElement) {
        accumulatedCreditsElement.innerText = "Credits: " + accumulatedCredits;
    }
}

function incrementCreditsBy(value) {
    accumulatedCredits += value;
    updateDisplayedCredits();
}

function decrementCredits(el) {
    accumulatedCredits = Math.max(0, accumulatedCredits - 6);
    updateDisplayedCredits();
}

function revertDrag(el) {
    console.log("Element to revert:", el);
    var originalParentId = el.getAttribute('data-original-parent');
    console.log("Original Parent ID in revertDrag: ", originalParentId);  // Debug line
    var originalParent = document.getElementById(originalParentId);

    let currentSessionIndex = parseInt(el.closest('.session').id.replace('session', ''));
    let totalSessions = document.querySelectorAll('.session').length;
    let subjectsToBeRemoved = [];

    for (let i = currentSessionIndex + 1; i < totalSessions; i++) {
        let sessionElement = document.getElementById('session' + i);
        if (sessionElement) {
            let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));

            let mainSubjectElement = subjectsInSession.find(subjectElement => {
                let prerequisitesString = subjectElement.getAttribute('data-prerequisites') || '[]';
                let prerequisitesArray = JSON.parse(prerequisitesString);
                return prerequisitesArray.includes(el.id);
            });

            if (mainSubjectElement) subjectsToBeRemoved.push(mainSubjectElement);
        }
    }

    if (subjectsToBeRemoved.length > 0) {
        let subjectNames = subjectsToBeRemoved.map(subject => subject.id).join(", ");
        Swal.fire({
            title: 'Are you sure?',
            text: `Removing this subject will also remove ${subjectNames} from the planner as they have this subject as a prerequisite. Do you want to proceed?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, remove both!'
        }).then((result) => {
            if (result.isConfirmed) {
                subjectsToBeRemoved.forEach(subject => subject.querySelector('.reset-btn').click());
                //decrementCredits(el);
                if (originalParent) {
                    originalParent.appendChild(el);
                    var resetBtn = el.querySelector('.reset-btn');
                    if (resetBtn) el.removeChild(resetBtn);
                } else {
                    console.error('Original parent not found');
                }
                decrementCredits(el);
            }
        });

    } else {
        if (originalParent) {
            originalParent.appendChild(el);
            var resetBtn = el.querySelector('.reset-btn');
            if (resetBtn) el.removeChild(resetBtn);
            decrementCredits(el);
        } else {
            console.error('Original parent not found');
        }
    }
}

function setupSubjectElement(subjectDiv, sessionIndex) {
    if (!subjectDiv.hasAttribute('data-original-parent')) {
        subjectDiv.setAttribute('data-original-parent', subjectDiv.parentElement.id);
    }
    if (prerequisitesMet(subjectDiv, sessionIndex)) {
        console.log(`Prerequisites met for ${subjectDiv.id}`);
        if (!subjectDiv.querySelector('.reset-btn')) {
            var resetBtn = document.createElement('span');
            resetBtn.innerHTML = " X";
            resetBtn.className = 'reset-btn';
            resetBtn.style.color = "red";
            resetBtn.style.cursor = "pointer";

            resetBtn.addEventListener('click', function () {
                revertDrag(subjectDiv);
               // decrementCredits(subjectDiv);
            });

            subjectDiv.appendChild(resetBtn);
        }
    } else {
        console.log(`Prerequisites NOT met for ${subjectDiv.id}`);
        Swal.fire({
            icon: 'warning',
            title: 'Oops...',
            text: `Prerequisites not met for ${subjectDiv.id}! Make sure you have prerequisites placed in a previous semester`,
        });
        //decrementCredits(subjectDiv);
    }
}

//Function to perform the prerequisite checks
function prerequisitesMet(el, targetSessionIndex) {
    console.log("Checking prerequisites for ", el.id, "in session", targetSessionIndex);
    let prerequisitesString = el.getAttribute('data-prerequisites') || '[]';
    let prerequisitesArray = JSON.parse(prerequisitesString);
    let prerequisiteType = el.getAttribute('data-prerequisite-type') || '';
    console.log("Prerequisites Array: ", prerequisitesArray);
    console.log("Prerequisite Type: ", prerequisiteType);
    let prerequisitesMet = false;

    if (prerequisiteType === 'AND') {
        prerequisitesMet = prerequisitesArray.every(prerequisite => {
            let found = false;
            for (let i = 0; i < targetSessionIndex; i++) {
                let sessionElement = document.getElementById('session' + i);
                if (sessionElement) {
                    let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));
                    found = subjectsInSession.some(subjectElement => subjectElement.id === prerequisite);
                    if (found) break;
                }
            }
            return found;
        });
    } else if (prerequisiteType === 'OR') {
        prerequisitesMet = prerequisitesArray.some(prerequisite => {
            let found = false;
            for (let i = 0; i < targetSessionIndex; i++) {
                let sessionElement = document.getElementById('session' + i);
                if (sessionElement) {
                    let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));
                    found = subjectsInSession.some(subjectElement => subjectElement.id === prerequisite);
                    if (found) break;
                }
            }
            return found;
        });
    } else {
        prerequisitesMet = true; // If there are no prerequisites, then they are considered as met.
    }

    return prerequisitesMet;
}

document.addEventListener('DOMContentLoaded', function () {
    let dashboardContainer = document.querySelector('.dashboard-container');
    let resetSubjectUrl = dashboardContainer.getAttribute('data-reset-subject-url');
    let startingSession = dashboardContainer.getAttribute('data-starting-session'); // Get the starting session


    // Initialize accumulated credits
    const accumulatedCreditsElement = document.getElementById("accumulated-credits");
    if (!accumulatedCreditsElement) {
        console.error("Accumulated credits element not found!");
        return;
    }

    var dragulaContainers = Array.from(document.querySelectorAll('.available-section, .placeholder'));

    dragula(dragulaContainers, {
        moves: function (el, container, handle) {
            // Do not allow dragging if the element has the 'in-course-planner' class.
            return !el.classList.contains('in-course-planner');
        }
    })
    .on('drag', function (el) {
        // Check if the original parent is already set
        if (!el.hasAttribute('data-original-parent')) {
            // Store the original parent to use it later in case of invalid drop
            el.setAttribute('data-original-parent', el.parentElement.id);
        }
    })
    .on('drop', function (el, target, source, sibling) {

        var isSourceAvailableSection = source.classList.contains('available-section');
        var isTargetAvailableSection = target.classList.contains('available-section');

        if (isSourceAvailableSection && !isTargetAvailableSection) {  // Checking if the source is the available section and target is the planner.
            incrementCreditsBy(6);
        }

        if (!isSourceAvailableSection && isTargetAvailableSection) {  // Checking if the source is the planner and the target is the available section.
            decrementCredits(el);
        }

        console.log("Target Element: ", target); // Log the entire target element



        // Find the closest element with the class 'session'
        let sessionElement = target.closest('.session');
        console.log("Closest Session Element: ", sessionElement); // Log the closest session element

        // If a session element is found, and it has an id, extract the index from it.
        let dependentSubjects = [];

        if (sessionElement && sessionElement.id) {
            targetSessionIndex = parseInt(sessionElement.id.replace('session', ''));

            let totalSessions = document.querySelectorAll('.session').length;
            let dependentSubjects = [];

            for (let i = 0; i < totalSessions; i++) {
                let sessionElement = document.getElementById('session' + i);
                if (sessionElement) {
                    let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));
                    subjectsInSession.forEach(subject => {
                        let prerequisitesString = subject.getAttribute('data-prerequisites') || '[]';
                        let prerequisitesArray = JSON.parse(prerequisitesString);
                        if (prerequisitesArray.includes(el.id)) {
                            dependentSubjects.push({ subject, sessionIndex: i });
                        }
                    });
                }
            }

            let invalidMoveFound = dependentSubjects.some(dependentSubject => dependentSubject.sessionIndex <= targetSessionIndex);

            if (invalidMoveFound) {
                // Remove dependent subjects from the planner and send them back to their original positions.
                dependentSubjects.forEach(dependentSubject => {
                    if(dependentSubject.sessionIndex <= targetSessionIndex) {
                        let resetBtn = dependentSubject.subject.querySelector('.reset-btn');
                        if(resetBtn) {
                            resetBtn.click();
                        }
                    }
                });

                let dependentSubjectNames = dependentSubjects.map(depSub => depSub.subject.id).join(", ");
                Swal.fire({
                    icon: 'error',
                    title: 'Prerequisite Clash ',
                    text: `This is a prerequisite for ${dependentSubjectNames} . This move will remove ${dependentSubjectNames} from the planner .`,
                });
                return;
            }
        }

        // Log Target Session Index again after the correction.
        console.log("Corrected Target Session Index: ", targetSessionIndex);
        let prerequisitesString = el.getAttribute('data-prerequisites') || '[]';
        console.log("Prerequisites String: ", prerequisitesString);
        let prerequisitesArray = JSON.parse(prerequisitesString);
        let prerequisiteType = el.getAttribute('data-prerequisite-type') || '';

        console.log("Prerequisites Array: ", prerequisitesArray);
        console.log("Prerequisite Type: ", prerequisiteType);

        // Check if both source and target are available sections, then revert.
        if(isSourceAvailableSection && isTargetAvailableSection){

            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'The given course structure cannot be changed!',
            });
            var originalParentId = el.getAttribute('data-original-parent');
            var originalParent = document.getElementById(originalParentId);
            if (originalParent) {
                originalParent.appendChild(el);
                var resetBtn = el.querySelector('.reset-btn');
                if (resetBtn) el.removeChild(resetBtn);
            } else {
                console.error('Original parent not found');
            }
            return;
        }
        var sessionRestriction = el.getAttribute('data-sessions');
        var targetSessionIndex = parseInt(target.parentElement.id.split('session')[1]);


        // Correctly determine whether the target session is Autumn or Spring
        var isAutumnSession;
        if (startingSession.toLowerCase() === 'autumn') {
            isAutumnSession = targetSessionIndex % 2 === 0;
        } else { // startingSession is 'spring'
            isAutumnSession = targetSessionIndex % 2 === 1;
        }

        var validSession = (sessionRestriction.toLowerCase() === 'both' || (isAutumnSession && sessionRestriction.toLowerCase() === 'autumn') || (!isAutumnSession && sessionRestriction.toLowerCase() === 'spring'));

        if (!validSession || (target.childElementCount > 1)) {
            var originalParentId = el.getAttribute('data-original-parent');
            var originalParent = document.getElementById(originalParentId);

            if (originalParent) {
                originalParent.appendChild(el);
                var resetBtn = el.querySelector('.reset-btn');
                if (resetBtn) el.removeChild(resetBtn);
            } else {
                console.error('Original parent not found');
            }

            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: !validSession ? 'This subject is not offered in this session. Please check the subject session.' : 'This slot already contains a subject'
            });
            decrementCredits(el);

            return;
        }

        // Log all subjects in all sessions before the target session.
        for (let i = 0; i < targetSessionIndex; i++) {
            let sessionElement = document.getElementById('session' + i);
            if (sessionElement) {
                let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));
                console.log(`Subjects in session ${i}:`, subjectsInSession.map(e => e.id));
            }
        }
        // Correctly determine whether the target session is Autumn or Spring and log it to the console.
        var isAutumnSession;
        if (startingSession.toLowerCase() === 'autumn') {
            isAutumnSession = targetSessionIndex % 2 === 0;
        } else { // startingSession is 'spring'
            isAutumnSession = targetSessionIndex % 2 === 1;
        }
        console.log(`Is Autumn Session: ${isAutumnSession}`);

        let prerequisitesMet = false;
        if (prerequisiteType === 'AND') {
            prerequisitesMet = prerequisitesArray.every(prerequisite => {
                let found = false;
                for (let i = 0; i < targetSessionIndex; i++) {
                    let sessionElement = document.getElementById('session' + i);
                    if (sessionElement) {
                        let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));
                        found = subjectsInSession.some(subjectElement => subjectElement.id === prerequisite);
                        if (found) break;
                    }
                }
                return found;
            });
        } else if (prerequisiteType === 'OR') {
            prerequisitesMet = prerequisitesArray.some(prerequisite => {
                let found = false;
                for (let i = 0; i < targetSessionIndex; i++) {
                    let sessionElement = document.getElementById('session' + i);
                    if (sessionElement) {
                        let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));
                        found = subjectsInSession.some(subjectElement => subjectElement.id === prerequisite);
                        if (found) break;
                    }
                }
                return found;
            });
        } else {
            prerequisitesMet = true; // If there are no prerequisites, then they are considered as met.
        }

        console.log("Final - Prerequisites Met: ", prerequisitesMet);

        if (!prerequisitesMet) {
            Swal.fire({
                icon: 'warning',
                title: 'Oops...',
                text: 'Prerequisites not met! make sure you have prerequisites placed in a previous semester',
            });
            revertDrag(el);
            //decrementCredits(el);
            return;
        }

        if (!el.querySelector('.reset-btn')) {

            var resetBtn = document.createElement('span');
            resetBtn.innerHTML = " X";
            resetBtn.className = 'reset-btn';
            resetBtn.style.color = "red";
            resetBtn.style.cursor = "pointer";

            resetBtn.addEventListener('click', function () {

                var originalParentId = el.getAttribute('data-original-parent');
                var originalParent = document.getElementById(originalParentId);
                let currentSessionIndex = parseInt(el.closest('.session').id.replace('session', ''));
                let totalSessions = document.querySelectorAll('.session').length;
                let subjectsToBeRemoved = [];
                //decrementCredits(el);
                for (let i = currentSessionIndex + 1; i < totalSessions; i++) {
                    let sessionElement = document.getElementById('session' + i);
                    if (sessionElement) {
                        let subjectsInSession = Array.from(sessionElement.getElementsByClassName('subject'));

                        let mainSubjectElement = subjectsInSession.find(subjectElement => {
                            let prerequisitesString = subjectElement.getAttribute('data-prerequisites') || '[]';
                            let prerequisitesArray = JSON.parse(prerequisitesString);
                            return prerequisitesArray.includes(el.id);
                        });

                        if (mainSubjectElement) subjectsToBeRemoved.push(mainSubjectElement);
                    }
                }

                if (subjectsToBeRemoved.length > 0) {
                    let subjectNames = subjectsToBeRemoved.map(subject => subject.id).join(", ");
                    Swal.fire({
                        title: 'Are you sure?',
                        text: `Removing this subject will also remove ${subjectNames} from the planner as they have this subject as a prerequisite. Do you want to proceed?`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, remove both!'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            subjectsToBeRemoved.forEach(subject => subject.querySelector('.reset-btn').click());
                            if (originalParent) {
                                originalParent.appendChild(el);
                                el.removeChild(resetBtn);
                            } else {
                                console.error('Original parent not found');
                            }
                            decrementCredits(el);
                            fetch(resetSubjectUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ subject_code: el.id })
                            })
                                .then(response => response.json())
                                .then(data => {
                                    if (!data.success) {
                                        alert('Error resetting the subject: ' + data.error);
                                    }
                                })
                                .catch((error) => {
                                    console.error('Error:', error);
                                });
                            decrementCredits(el);
                        }
                        else {
                            incrementCreditsBy(6);
                        }
                    });
                } else {
                    if (originalParent) {
                        originalParent.appendChild(el);
                        el.removeChild(resetBtn);
                    }
                    else {
                        console.error('Original parent not found');
                    }

                    fetch(resetSubjectUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ subject_code: el.id })
                    })
                        .then(response => response.json())
                        .then(data => {
                            if (!data.success) {
                                alert('Error resetting the subject: ' + data.error);
                            }
                        })
                        .catch((error) => {
                            console.error('Error:', error);
                        });
                }
                decrementCredits(el);
            });

            el.appendChild(resetBtn);
        }
    });
    document.querySelectorAll('.dropdown-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            let subjectCode = this.textContent.split(' - ')[0].trim();
            let subjectElement = document.getElementById(subjectCode);

            if(subjectElement) {
                subjectElement.scrollIntoView({behavior: 'smooth', block: 'center'});

                // Add the blink class to start the blinking effect
                subjectElement.classList.add('blink');

                // Remove the blink class after 3 seconds to stop the blinking effect
                setTimeout(() => { subjectElement.classList.remove('blink'); }, 2000);
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {

    function FilterSubjects(subjects, criteria) {
        let filteredSubjects = [];
    
        if (criteria === "core") {
            filteredSubjects = subjects.filter(subject => subject.type === "core");
        } else if (criteria === "major") {
            filteredSubjects = subjects.filter(subject => subject.type === "major");
        } else if (criteria === "core AND offeredInBoth") {
            filteredSubjects = subjects.filter(subject => subject.type === "core" && subject.sessions === "Both");
        }
    
        return filteredSubjects;
    }

    function GetPrerequisiteType(subject) {
        return subject.prerequisiteType;
    }

    function PlanClosestAvailableSession(subject, allSessions, placeholdersLeft, afterPrerequisites = false) {
        for (let session of allSessions) {
            if (placeholdersLeft[session] > 0) {
                if (afterPrerequisites) {
                    // Placeholder...
                } else {
                    placeholdersLeft[session]--;
                    return session;
                }
            }
        }
        return null;
    }

    function BatchRecommendSubjects(availableSubjects) {
        let allSessions = ['Session1', 'Session2', 'Session3', 'Session4'];
        let placeholdersLeft = { 'Session1': 4, 'Session2': 4, 'Session3': 3, 'Session4': 3 };
        let plannedPlacements = {};

        let subjectsToRecommend = FilterSubjects(availableSubjects, "core" || "major");

        let coreSubjectsBothSessions = FilterSubjects(subjectsToRecommend, "core" && "offeredInBoth");
        for (let i = 0; i < coreSubjectsBothSessions.length / 2; i++) {
            plannedPlacements[coreSubjectsBothSessions[i]] = 'Session1';
            placeholdersLeft['Session1']--;
        }
        for (let i = Math.floor(coreSubjectsBothSessions.length / 2); i < coreSubjectsBothSessions.length; i++) {
            plannedPlacements[coreSubjectsBothSessions[i]] = 'Session2';
            placeholdersLeft['Session2']--;
        }

        for (let subject of subjectsToRecommend) {
            if (subject.prerequisites && subject.prerequisites.length > 0) {
                let prereqType = GetPrerequisiteType(subject);
                if (prereqType === "AND") {
                    for (let prerequisite of subject.prerequisites) {
                        if (!plannedPlacements[prerequisite]) {
                            let plannedSession = PlanClosestAvailableSession(prerequisite, allSessions, placeholdersLeft);
                            plannedPlacements[prerequisite] = plannedSession;
                        }
                    }
                } else if (prereqType === "OR") {
                    let prerequisiteMet = false;
                    for (let prerequisite of subject.prerequisites) {
                        if (plannedPlacements[prerequisite]) {
                            prerequisiteMet = true;
                            break;
                        }
                    }
                    if (!prerequisiteMet) {
                        let chosenPrerequisite = subject.prerequisites[0];
                        let plannedSession = PlanClosestAvailableSession(chosenPrerequisite, allSessions, placeholdersLeft);
                        plannedPlacements[chosenPrerequisite] = plannedSession;
                    }
                }
                let plannedSessionForSubject = PlanClosestAvailableSession(subject, allSessions, placeholdersLeft, true);
                plannedPlacements[subject] = plannedSessionForSubject;
            } else {
                let plannedSessionForSubject = PlanClosestAvailableSession(subject, allSessions, placeholdersLeft);
                plannedPlacements[subject] = plannedSessionForSubject;
            }
        }

        MoveSubjectsToPlanner(plannedPlacements);
        return plannedPlacements;
    }

    function MoveSubjectsToPlanner(plannedPlacements) {
        for (let subject in plannedPlacements) {
            let session = plannedPlacements[subject];
            let targetContainer = document.getElementById('planner-' + session);
            let subjectElement = document.getElementById(subject);
        
            if (subjectElement && targetContainer) {
                targetContainer.appendChild(subjectElement);
            }
        }
    }

    const recommendButton = document.getElementById('recommend-btn');
    if (recommendButton) {
        recommendButton.addEventListener('click', function() {
            try {
                // Start of recommendation algorithm

                // Temporarily save the original accumulatedCredits
                let originalAccumulatedCredits = accumulatedCredits;
                accumulatedCredits = 0;

                let recommendedPlacements = BatchRecommendSubjects(availableSubjects);
                MoveSubjectsToPlanner(recommendedPlacements);

                // At the end, manually set accumulatedCredits based on the subjects present
                let finalCredits = 0;
                document.querySelectorAll('.planner-container .session .subject').forEach(subjectDiv => {
                    finalCredits += 6;  // Assuming each subject is worth 6 credits
                });

                // Update accumulatedCredits and the display
                accumulatedCredits = finalCredits;
                updateDisplayedCredits();

                // End of recommendation algorithm

            } catch (error) {
                console.warn("Error in recommendation algorithm:", error);

                // Start of hardcoded recommendation

                let dashboardContainer = document.querySelector('.dashboard-container');
                let startingSession = dashboardContainer.getAttribute('data-starting-session'); // Get the starting session
                let storedMajor = window.storedMajor || localStorage.getItem('selectedMajor');
                console.log("Stored Major: ", storedMajor);

                let coreSubjectsOrder;
                if(storedMajor == "Information Systems Development") {
                    if (startingSession.toLowerCase() === 'autumn') {
                        coreSubjectsOrder = [
                            ['CSIT881', 'CSIT883'],
                            ['CSIT882', 'CSIT884', 'CSIT985', 'ISIT906'],
                            ['CSIT988', 'ISIT950'],
                            ['CSCI927']
                        ];
                    } else {
                        coreSubjectsOrder = [
                            ['CSIT881', 'CSIT883', 'CSIT985'],
                            ['CSIT882', 'CSIT884', 'CSIT988'],
                            ['ISIT906', 'CSCI927'],
                            ['ISIT950']
                        ];
                    }
                }

                let sessionIndex = 0;
                document.querySelectorAll('.planner-container .session').forEach(sessionDiv => {
                    if (coreSubjectsOrder[sessionIndex]) {
                        let placeholderIndex = 0;
                        const placeholders = sessionDiv.querySelectorAll('.placeholder');
                        coreSubjectsOrder[sessionIndex].forEach(subjectCode => {
                            const subjectDiv = document.getElementById(subjectCode);
                            if (subjectDiv && placeholders[placeholderIndex]) {
                                setupSubjectElement(subjectDiv, sessionIndex);

                                // Clear existing content in the placeholder before appending new subject
                                while (placeholders[placeholderIndex].firstChild) {
                                    placeholders[placeholderIndex].removeChild(placeholders[placeholderIndex].firstChild);
                                }

                                placeholders[placeholderIndex].appendChild(subjectDiv);

                                if (prerequisitesMet(subjectDiv, sessionIndex)) {
                                    console.log(`Prerequisites met for ${subjectDiv.id}`);
                                    if (!subjectDiv.hasAttribute('data-original-parent')) {
                                        subjectDiv.setAttribute('data-original-parent', subjectDiv.parentElement.id);
                                    }
                                    if (!subjectDiv.querySelector('.reset-btn')) {
                                        var resetBtn = document.createElement('span');
                                        resetBtn.innerHTML = " X";
                                        resetBtn.className = 'reset-btn';
                                        resetBtn.style.color = "red";
                                        resetBtn.style.cursor = "pointer";

                                        resetBtn.addEventListener('click', function () {
                                            revertDrag(subjectDiv);
                                        });

                                        subjectDiv.appendChild(resetBtn);
                                    }
                                    placeholderIndex++;
                                } else {
                                    console.log(`Prerequisites NOT met for ${subjectDiv.id}`);
                                    Swal.fire({
                                        icon: 'warning',
                                        title: 'Oops...',
                                        text: `Prerequisites not met for ${subjectCode}! Make sure you have prerequisites placed in a previous semester`,
                                    });
                                }
                            }
                        });
                    }
                    sessionIndex++;
                });

            }
        });
    }
});


            // At the end, manually set accumulatedCredits based on the subjects present
            let finalCredits = 0;
            document.querySelectorAll('.planner-container .session .subject').forEach(subjectDiv => {
                finalCredits += 6;
            });

            // Update accumulatedCredits and the display
            accumulatedCredits = finalCredits;
            updateDisplayedCredits();
        });
    }
});

// Check if a subject with the given code is completed in previous sessions
function isSubjectCompleted(subjectCode) {
    console.log("Checking if subject is completed:", subjectCode);  // Debug line
    const coursePlanner = document.querySelector('.planner-container');  // Get the course planner container
    if (!coursePlanner) {
        console.error("Course planner not found!");
        return false;
    }
    const allSessions = coursePlanner.querySelectorAll('.session');  // Get all sessions within the course planner
    for (const session of allSessions) {
        const subjectsInSession = Array.from(session.querySelectorAll('.subject'));
        console.log("Subjects in session:", subjectsInSession.map(s => s.id));  // Debug line
        if (subjectsInSession.some(subject => {
            console.log(`Comparing ${subject.id} with ${subjectCode}`);
            return subject.id === subjectCode;
        })) {
            console.log("Subject is completed:", subjectCode);  // Debug line
            return true;
        }
    }
    console.log("Subject is NOT completed:", subjectCode);  // Debug line
    return false;
}


// Function to populate selected capstone/research project into the last box of the last two sessions

// Variable to store previously selected project code
let prevSelectedProjectCode = null;

document.addEventListener("DOMContentLoaded", function() {
    const capstoneRadios = document.getElementsByName("capstone_project");
    capstoneRadios.forEach(radio => {
        radio.addEventListener("change", function() {
            console.log("Selected project code:", this.value);  // Debug line
            const selectedProjectCode = this.value; // Assumes this.value contains the subject code

            // Special case for CSIT999 which requires CSIT940 as a prerequisite
            if (selectedProjectCode === 'CSIT999' && !isSubjectCompleted('CSIT940')) {
                console.log("Before Swal");
                Swal.fire({
                    icon: 'warning',
                    title: 'Oops...',
                    text: 'CSIT999 - Research project requires you to have completed CSIT940 - Research Methodology and scored at least 75%',
                }).then(() => {
                    // Uncheck the radio button here
                    this.checked = false;
                });
                console.log("After Swal");
                return;
            }

            // Add credits for the newly selected project
            if (selectedProjectCode === 'CSIT999' || selectedProjectCode === 'CSIT998') {
                accumulatedCredits += 12;  // Add 12 credits for CSIT999 or CSIT998
            } else {
                accumulatedCredits += 6;  // Add 6 credits for other projects
            }

            updateDisplayedCredits();

            // Update prevSelectedProjectCode for future reference
            prevSelectedProjectCode = selectedProjectCode;

            // Find the parent row of the selected radio
            let parentRow = this.closest('tr');

            // Find the subject name from the row
            const selectedProjectName = parentRow.querySelectorAll('td')[2].innerText;

            // Remove existing capstone subjects first
            document.querySelectorAll('.capstone-subject').forEach(subject => subject.remove());

            // Create new subject div
            const capstone = document.createElement("div");
            capstone.className = `subject capstone-subject ${selectedProjectCode}`;
            capstone.draggable = true;
            capstone.id = selectedProjectCode;
            capstone.innerHTML = `<span>${selectedProjectCode} - ${selectedProjectName}</span>`;

            // Create reset button
            var resetBtn = document.createElement('span');
            resetBtn.innerHTML = " X";
            resetBtn.className = 'reset-btn';
            resetBtn.style.color = "red";
            resetBtn.style.cursor = "pointer";
            resetBtn.addEventListener('click', function () {
                // Remove capstone subjects
                document.querySelectorAll(`.capstone-subject.${selectedProjectCode}`).forEach(subject => subject.remove());

                // Reset prevSelectedProjectCode
                prevSelectedProjectCode = null;

                // Uncheck the radio button
                const radioToUncheck = document.querySelector(`input[name="capstone_project"][value="${selectedProjectCode}"]`);
                if (radioToUncheck) {
                    radioToUncheck.checked = false;
                }
            });
            capstone.appendChild(resetBtn);

            // Add the new capstone subjects to the last two sessions
            const lastTwoSessions = Array.from(document.querySelectorAll(".session")).slice(-2);
            lastTwoSessions.forEach(session => {
                const placeholders = session.querySelectorAll('.placeholder');
                const lastPlaceholder = placeholders[placeholders.length - 1];

                // Check if there's an existing subject in the last placeholder
                if (lastPlaceholder.querySelector('.subject')) {
                    // Decrement the credits for the existing subject
                    accumulatedCredits -= 6;  // Assuming each subject is worth 6 credits
                    updateDisplayedCredits();
                }

                // Clear existing content in the last placeholder before appending new capstone subject
                while (lastPlaceholder.firstChild) {
                    lastPlaceholder.removeChild(lastPlaceholder.firstChild);
                }

                const clonedCapstone = capstone.cloneNode(true);

                // Make the cloned capstone subject non-draggable
                clonedCapstone.draggable = false;

                // Add a new class to indicate it is in the course planner
                clonedCapstone.classList.add("in-course-planner");

                // Attach the same event listener to the cloned element
                clonedCapstone.querySelector('.reset-btn').addEventListener('click', function () {
                    // Remove capstone subjects
                    document.querySelectorAll(`.capstone-subject.${selectedProjectCode}`).forEach(subject => subject.remove());
                    if (selectedProjectCode === 'CSIT999' || selectedProjectCode === 'CSIT998') {
                        accumulatedCredits -= 12;  // Subtract 12 credits for CSIT999 or CSIT998
                    }
                    // Reset prevSelectedProjectCode
                    prevSelectedProjectCode = null;

                    updateDisplayedCredits();
                    // Uncheck the radio button
                    const radioToUncheck = document.querySelector(`input[name="capstone_project"][value="${selectedProjectCode}"]`);
                    if (radioToUncheck) {
                        radioToUncheck.checked = false;
                    }
                });
                lastPlaceholder.appendChild(clonedCapstone);
            });
        });
    });
});