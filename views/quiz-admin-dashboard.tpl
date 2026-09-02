<div class="quiz-admin-container" style="padding: 20px;">
    <div class="quiz-header" style="margin-bottom: 30px;">
        <h1 style="font-size: 2em; margin-bottom: 10px;">Quiz Management Dashboard</h1>
        <p style="color: #666; margin-bottom: 20px;">Create and manage quizzes for your community</p>
        <a href="/admin/plugins/quiz/create" class="btn btn-primary" style="padding: 10px 20px; background: #0084b4; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">
            <i class="fa fa-plus"></i> Create New Quiz
        </a>
    </div>

    <div class="quiz-list" style="background: #fff; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
        {#if quizzes.length === 0}
            <div style="padding: 40px; text-align: center; color: #999;">
                <p>No quizzes created yet. <a href="/admin/plugins/quiz/create">Create your first quiz</a></p>
            </div>
        {:else}
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                    <tr>
                        <th style="padding: 12px; text-align: left; font-weight: bold;">Quiz Title</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold;">Status</th>
                        <th style="padding: 12px; text-align: center; font-weight: bold;">Questions</th>
                        <th style="padding: 12px; text-align: center; font-weight: bold;">Attempts</th>
                        <th style="padding: 12px; text-align: left; font-weight: bold;">Last Updated</th>
                        <th style="padding: 12px; text-align: center; font-weight: bold;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {#each quizzes as quiz (quiz.qid)}
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 12px;">
                                <strong>{quiz.title}</strong>
                                {#if quiz.description}
                                    <p style="font-size: 0.9em; color: #666; margin: 5px 0 0 0;">{quiz.description}</p>
                                {/if}
                            </td>
                            <td style="padding: 12px;">
                                <span style="padding: 4px 8px; border-radius: 3px; font-size: 0.85em; font-weight: bold;
                                    {#if quiz.status === 'draft'}
                                        background: #fff3cd; color: #856404;
                                    {:else if quiz.status === 'active'}
                                        background: #d4edda; color: #155724;
                                    {:else}
                                        background: #f8d7da; color: #721c24;
                                    {/if}
                                ">
                                    {quiz.status}
                                </span>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <span data-quiz-id="{quiz.qid}" data-field="questionCount">—</span>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <span data-quiz-id="{quiz.qid}" data-field="attemptCount">—</span>
                            </td>
                            <td style="padding: 12px;">
                                <small style="color: #666;">{new Date(quiz.updatedAt).toLocaleDateString()}</small>
                            </td>
                            <td style="padding: 12px; text-align: center;">
                                <div style="display: flex; gap: 8px; justify-content: center;">
                                    <a href="/admin/plugins/quiz/{quiz.qid}" class="btn btn-sm" style="padding: 6px 12px; background: #0084b4; color: white; text-decoration: none; border-radius: 3px; font-size: 0.85em;">
                                        Edit
                                    </a>
                                    <button class="btn btn-sm quiz-view-results" data-quiz-id="{quiz.qid}" style="padding: 6px 12px; background: #17a2b8; color: white; border: none; border-radius: 3px; font-size: 0.85em; cursor: pointer;">
                                        Results
                                    </button>
                                    {#if quiz.status === 'draft'}
                                        <button class="btn btn-sm quiz-publish" data-quiz-id="{quiz.qid}" style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 3px; font-size: 0.85em; cursor: pointer;">
                                            Publish
                                        </button>
                                    {/if}
                                    <button class="btn btn-sm quiz-delete" data-quiz-id="{quiz.qid}" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 3px; font-size: 0.85em; cursor: pointer;">
                                        Delete
                                    </button>
                                </div>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

<!-- Results Modal -->
<div id="quiz-results-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center;">
    <div style="background: white; border-radius: 8px; max-width: 900px; width: 90%; max-height: 80vh; overflow: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0;">Quiz Attempts</h2>
            <button id="close-results-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div id="results-modal-content" style="padding: 20px;">
            <!-- Content loaded via JavaScript -->
        </div>
    </div>
</div>

<!-- Attempt Details Modal -->
<div id="attempt-details-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1001; align-items: center; justify-content: center;">
    <div style="background: white; border-radius: 8px; max-width: 800px; width: 90%; max-height: 80vh; overflow: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="margin: 0;">Attempt Details</h2>
            <button id="close-details-modal" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div id="details-modal-content" style="padding: 20px;">
            <!-- Content loaded via JavaScript -->
        </div>
    </div>
</div>

<script>
require(['jquery'], function($) {
    // Load quiz-admin.js functionality
    require(['./quiz-admin'], function(quizAdmin) {
        quizAdmin.init();
    });
});
</script>
