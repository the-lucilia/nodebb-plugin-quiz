// We need to initialize on admin quiz page load -> FETCH /api/quiz/{qid}/attempts
// Display student results table with columns:
//      Student Name, Score (X/Y), Percentage, Status (Pass/Fail), Date Submitted, Actions (View Details, Delete)
// View Details -> Modal:
//      Each question answered, what they selected vs correct answer, their explanation (if any)
// Delete Button -> POST to /api/quiz/attempt/{attemptId} with method DELETE
// Export Results -> CSV download (optionally use https://github.com/mholt/PapaParse)
// References:
//      Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch\_API
//      Modal pattern: https://getbootstrap.com/docs/4.0/components/modal/

// Required key functions:
async function loadAttempts(qid) { /* GET /api/quiz/{qid}/attempts */ }
async function deleteAttempt(attemptId) { /* DELETE endpoint */ }
function showAttemptModal(attempt) { /* Display modal with details */ }
function renderResultsTable(attempts) { /* Build HTML table */ }
