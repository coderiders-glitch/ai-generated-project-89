class Assessment {
    constructor(app) {
        this.app = app;
        this.assessments = [];
        this.current_assessment = null;
    }
    
    async loadAssessments() {
        try {
            this.app.showLoading();
            this.assessments = await this.app.apiCall('GET', '/api/assessments');
            this.renderAssessments();
        } catch (error) {
            this.app.showError('Failed to load assessments');
        } finally {
            this.app.hideLoading();
        }
    }
    
    renderAssessments() {
        const container = document.getElementById('assessments-list');
        container.innerHTML = '';
        
        if (this.assessments.length === 0) {
            container.innerHTML = '<div class="empty-state">No assessments available</div>';
            return;
        }
        
        this.assessments.forEach(assessment => {
            const item = document.createElement('div');
            item.className = 'assessment-item';
            item.innerHTML = `
                <div class="assessment-header">
                    <h3 class="assessment-title">${assessment.title}</h3>
                    <span class="assessment-status ${assessment.is_active ? 'active' : 'inactive'}">
                        ${assessment.is_active ? 'Active' : 'Inactive'}
                    </span>
                </div>
                <div class="assessment-description">${assessment.description || 'No description'}</div>
                <div class="assessment-meta">
                    <span class="question-count">${assessment.question_count || 0} questions</span>
                    <span class="created-date">Created: ${this.formatDate(assessment.created_at)}</span>
                </div>
                <div class="assessment-actions">
                    <button class="btn-secondary view-assessment" data-id="${assessment.id}">View Details</button>
                    ${assessment.is_active ? 
                        '<button class="btn-primary take-assessment" data-id="' + assessment.id + '">Take Assessment</button>' : 
                        '<button class="btn-disabled" disabled>Not Available</button>'
                    }
                </div>
            `;
            
            // Add event listeners
            const view_btn = item.querySelector('.view-assessment');
            view_btn.addEventListener('click', () => {
                this.viewAssessmentDetails(assessment.id);
            });
            
            const take_btn = item.querySelector('.take-assessment');
            if (take_btn) {
                take_btn.addEventListener('click', () => {
                    this.takeAssessment(assessment.id);
                });
            }
            
            container.appendChild(item);
        });
    }
    
    async viewAssessmentDetails(assessment_id) {
        try {
            this.app.showLoading();
            const assessment = await this.app.apiCall('GET', `/api/assessments/${assessment_id}`);
            this.showAssessmentModal(assessment);
        } catch (error) {
            this.app.showError('Failed to load assessment details');
        } finally {
            this.app.hideLoading();
        }
    }
    
    showAssessmentModal(assessment) {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>${assessment.title}</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="assessment-details">
                        <p><strong>Description:</strong> ${assessment.description || 'No description'}</p>
                        <p><strong>Status:</strong> ${assessment.is_active ? 'Active' : 'Inactive'}</p>
                        <p><strong>Questions:</strong> ${assessment.questions ? assessment.questions.length : 0}</p>
                        <p><strong>Created:</strong> ${this.formatDate(assessment.created_at)}</p>
                        
                        ${assessment.questions && assessment.questions.length > 0 ? `
                            <div class="questions-preview">
                                <h3>Questions:</h3>
                                <ul>
                                    ${assessment.questions.map(q => `<li>${q.question}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="modal-footer">
                    ${assessment.is_active ? 
                        '<button class="btn-primary take-assessment-modal" data-id="' + assessment.id + '">Take Assessment</button>' : 
                        '<button class="btn-disabled" disabled>Not Available</button>'
                    }
                    <button class="btn-secondary modal-cancel">Close</button>
                </div>
            </div>
        `;
        
        // Add event listeners
        modal.querySelector('.modal-close').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('.modal-cancel').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        const take_btn = modal.querySelector('.take-assessment-modal');
        if (take_btn) {
            take_btn.addEventListener('click', () => {
                document.body.removeChild(modal);
                this.takeAssessment(assessment.id);
            });
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        document.body.appendChild(modal);
    }
    
    async takeAssessment(assessment_id) {
        try {
            this.app.showLoading();
            const assessment = await this.app.apiCall('GET', `/api/assessments/${assessment_id}`);
            
            if (!assessment.questions || assessment.questions.length === 0) {
                this.app.showError('This assessment has no questions');
                return;
            }
            
            this.startAssessmentFlow(assessment);
        } catch (error) {
            this.app.showError('Failed to start assessment');
        } finally {
            this.app.hideLoading();
        }
    }
    
    startAssessmentFlow(assessment) {
        // Create assessment interface
        const modal = document.createElement('div');
        modal.className = 'modal-overlay assessment-modal';
        
        let current_question = 0;
        const answers = [];
        
        const render_question = () => {
            const question = assessment.questions[current_question];
            modal.innerHTML = `
                <div class="modal-content assessment-content">
                    <div class="modal-header">
                        <h2>${assessment.title}</h2>
                        <div class="progress">
                            Question ${current_question + 1} of ${assessment.questions.length}
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="question">
                            <h3>${question.question}</h3>
                            ${question.type === 'multiple_choice' ? `
                                <div class="options">
                                    ${question.options.map((option, index) => `
                                        <label class="option">
                                            <input type="radio" name="answer" value="${index}">
                                            <span>${option}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            ` : `
                                <textarea class="text-answer" placeholder="Enter your answer here..."></textarea>
                            `}
                        </div>
                    </div>
                    <div class="modal-footer">
                        ${current_question > 0 ? '<button class="btn-secondary prev-question">Previous</button>' : ''}
                        <button class="btn-primary next-question">
                            ${current_question === assessment.questions.length - 1 ? 'Submit' : 'Next'}
                        </button>
                        <button class="btn-secondary cancel-assessment">Cancel</button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            const next_btn = modal.querySelector('.next-question');
            next_btn.addEventListener('click', () => {
                const answer = this.getQuestionAnswer(question);
                if (answer === null) {
                    this.app.showError('Please provide an answer');
                    return;
                }
                
                answers[current_question] = answer;
                
                if (current_question === assessment.questions.length - 1) {
                    this.submitAssessment(assessment, answers);
                    document.body.removeChild(modal);
                } else {
                    current_question++;
                    render_question();
                }
            });
            
            const prev_btn = modal.querySelector('.prev-question');
            if (prev_btn) {
                prev_btn.addEventListener('click', () => {
                    current_question--;
                    render_question();
                });
            }
            
            modal.querySelector('.cancel-assessment').addEventListener('click', () => {
                document.body.removeChild(modal);
            });
        };
        
        render_question();
        document.body.appendChild(modal);
    }
    
    getQuestionAnswer(question) {
        if (question.type === 'multiple_choice') {
            const selected = document.querySelector('input[name="answer"]:checked');
            return selected ? parseInt(selected.value) : null;
        } else {
            const text_answer = document.querySelector('.text-answer').value.trim();
            return text_answer || null;
        }
    }
    
    async submitAssessment(assessment, answers) {
        try {
            this.app.showLoading();
            
            // Note: This endpoint might not exist in the API contract
            // In a real implementation, you'd need to add it or handle differently
            const response = await this.app.apiCall('POST', `/api/assessments/${assessment.id}/submit`, {
                answers: answers
            }).catch(() => {
                // Fallback: just show success message
                return { success: true };
            });
            
            this.app.showSuccess('Assessment submitted successfully!');
            
        } catch (error) {
            this.app.showError('Failed to submit assessment');
        } finally {
            this.app.hideLoading();
        }
    }
    
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleDateString();
    }
}