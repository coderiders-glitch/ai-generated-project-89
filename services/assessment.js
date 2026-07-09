const { Assessment } = require('../models');
const { calculateGAD7Score } = require('../utils/gad7-scoring');
const { calculatePHQ9Score } = require('../utils/phq9-scoring');
const { detectCrisis } = require('./crisis-detection');

class AssessmentService {
  async getAllActiveAssessments() {
    try {
      const assessments = await Assessment.findActiveAssessments();
      return {
        status: 'success',
        data: assessments
      };
    } catch (error) {
      throw new Error(`Failed to fetch assessments: ${error.message}`);
    }
  }

  async getAssessmentById(assessment_id) {
    try {
      const assessment = await Assessment.findById(assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      return {
        status: 'success',
        data: assessment
      };
    } catch (error) {
      throw new Error(`Failed to fetch assessment: ${error.message}`);
    }
  }

  async createAssessment(assessment_data) {
    try {
      const assessment = new Assessment(assessment_data);
      const saved_assessment = await assessment.save();
      return {
        status: 'success',
        data: saved_assessment
      };
    } catch (error) {
      throw new Error(`Failed to create assessment: ${error.message}`);
    }
  }

  async updateAssessment(assessment_id, update_data) {
    try {
      const assessment = await Assessment.findByIdAndUpdate(
        assessment_id,
        update_data,
        { new: true }
      );
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      return {
        status: 'success',
        data: assessment
      };
    } catch (error) {
      throw new Error(`Failed to update assessment: ${error.message}`);
    }
  }

  async addQuestionToAssessment(assessment_id, question_data) {
    try {
      const assessment = await Assessment.findById(assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      await assessment.addQuestion(question_data);
      return {
        status: 'success',
        message: 'Question added successfully'
      };
    } catch (error) {
      throw new Error(`Failed to add question: ${error.message}`);
    }
  }

  async removeQuestionFromAssessment(assessment_id, question_id) {
    try {
      const assessment = await Assessment.findById(assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      await assessment.removeQuestion(question_id);
      return {
        status: 'success',
        message: 'Question removed successfully'
      };
    } catch (error) {
      throw new Error(`Failed to remove question: ${error.message}`);
    }
  }

  async processAssessmentResponse(assessment_id, user_id, responses) {
    try {
      const assessment = await Assessment.findById(assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      let score = 0;
      let severity_level = 'normal';
      let crisis_detected = false;

      // Calculate score based on assessment type
      if (assessment.type === 'GAD-7') {
        const gad7_result = calculateGAD7Score(responses);
        score = gad7_result.score;
        severity_level = gad7_result.severity_level;
      } else if (assessment.type === 'PHQ-9') {
        const phq9_result = calculatePHQ9Score(responses);
        score = phq9_result.score;
        severity_level = phq9_result.severity_level;
        
        // Check for crisis indicators in PHQ-9
        crisis_detected = detectCrisis(responses, 'PHQ-9');
      }

      const result = {
        assessment_id,
        user_id,
        score,
        severity_level,
        crisis_detected,
        responses,
        completed_at: new Date()
      };

      return {
        status: 'success',
        data: result
      };
    } catch (error) {
      throw new Error(`Failed to process assessment: ${error.message}`);
    }
  }

  async deactivateAssessment(assessment_id) {
    try {
      const assessment = await Assessment.findById(assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      await assessment.deactivate();
      return {
        status: 'success',
        message: 'Assessment deactivated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to deactivate assessment: ${error.message}`);
    }
  }

  async activateAssessment(assessment_id) {
    try {
      const assessment = await Assessment.findById(assessment_id);
      if (!assessment) {
        throw new Error('Assessment not found');
      }
      await assessment.activate();
      return {
        status: 'success',
        message: 'Assessment activated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to activate assessment: ${error.message}`);
    }
  }
}

module.exports = new AssessmentService();