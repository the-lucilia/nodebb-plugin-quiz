// This is our main area for the actual admin dashboard so it is not optional.

// We need:
//  Header -> Quiz Management Dashboard
//  Create Quiz Button -> Link to /admin/plugins/quiz/create
//  Quizzes table with columns:
//      Quiz Title, Status (Draft, Active, Closed), Question Pool,
//      Total Attempts, Last Updated, Actions (Edit, View Results, Publish, Delete)
// Loop through quizzes array and render each row
// View Results link -> /admin/plugins/quiz/{qid}/results
// Reference: https://github.com/NodeBB/NodeBB/wiki/Creating-themes-&-templates

// Structure Example:
<!-- FOR quizzes -->
<tr>
    <td>{quizzes.title}</td>
    <td>{quizzes.status}</td>
</tr>
<!-- ENDFOR -->