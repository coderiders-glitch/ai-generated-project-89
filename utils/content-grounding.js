const axios = require('axios');

class ContentGroundingService {
  constructor() {
    this.fact_check_api_url = process.env.FACT_CHECK_API_URL;
    this.fact_check_api_key = process.env.FACT_CHECK_API_KEY;
    this.enable_grounding = process.env.ENABLE_CONTENT_GROUNDING === 'true';
  }

  async groundContent(content) {
    try {
      if (!this.enable_grounding) {
        return content;
      }
      
      if (!content || typeof content !== 'string') {
        return content;
      }
      
      // Extract claims from content
      const claims = this.extractClaims(content);
      
      if (claims.length === 0) {
        return content;
      }
      
      // Verify claims
      const verified_claims = await this.verifyClaims(claims);
      
      // Apply grounding annotations
      const grounded_content = this.applyGroundingAnnotations(content, verified_claims);
      
      return grounded_content;
    } catch (error) {
      console.error('Content grounding failed:', error.message);
      // Return original content if grounding fails
      return content;
    }
  }

  extractClaims(content) {
    try {
      const claims = [];
      
      // Simple claim extraction patterns
      const claim_patterns = [
        // Factual statements
        /\b(?:studies show|research indicates|according to|data shows|statistics reveal)\s+([^.!?]+[.!?])/gi,
        // Numerical claims
        /\b\d+(?:\.\d+)?\s*(?:%|percent|million|billion|thousand)\s+(?:of|are|were|have|show)\s+([^.!?]+[.!?])/gi,
        // Comparative claims
        /\b(?:more|less|higher|lower|better|worse|faster|slower)\s+than\s+([^.!?]+[.!?])/gi,
        // Causal claims
        /\b(?:causes|leads to|results in|due to|because of)\s+([^.!?]+[.!?])/gi
      ];
      
      claim_patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const claim_text = match[0].trim();
          if (claim_text.length > 10 && claim_text.length < 500) {
            claims.push({
              text: claim_text,
              start_index: match.index,
              end_index: match.index + claim_text.length,
              type: this.classifyClaim(claim_text)
            });
          }
        }
      });
      
      // Remove duplicates
      const unique_claims = claims.filter((claim, index, self) => 
        index === self.findIndex(c => c.text === claim.text)
      );
      
      return unique_claims.slice(0, 10); // Limit to 10 claims
    } catch (error) {
      console.error('Claim extraction failed:', error.message);
      return [];
    }
  }

  classifyClaim(claim_text) {
    const text_lower = claim_text.toLowerCase();
    
    if (/\b\d+(?:\.\d+)?\s*(?:%|percent|million|billion|thousand)/.test(text_lower)) {
      return 'statistical';
    }
    
    if (/\b(?:causes|leads to|results in|due to|because of)/.test(text_lower)) {
      return 'causal';
    }
    
    if (/\b(?:more|less|higher|lower|better|worse|faster|slower)\s+than/.test(text_lower)) {
      return 'comparative';
    }
    
    if (/\b(?:studies|research|data|statistics|survey)/.test(text_lower)) {
      return 'research';
    }
    
    return 'general';
  }

  async verifyClaims(claims) {
    try {
      const verified_claims = [];
      
      for (const claim of claims) {
        let verification_result;
        
        if (this.fact_check_api_url && this.fact_check_api_key) {
          verification_result = await this.verifyClaimWithAPI(claim);
        } else {
          verification_result = await this.verifyClaimLocally(claim);
        }
        
        verified_claims.push({
          ...claim,
          verification: verification_result
        });
        
        // Add delay to avoid rate limiting
        await this.delay(100);
      }
      
      return verified_claims;
    } catch (error) {
      console.error('Claim verification failed:', error.message);
      return claims.map(claim => ({
        ...claim,
        verification: {
          status: 'unverified',
          confidence: 0,
          sources: []
        }
      }));
    }
  }

  async verifyClaimWithAPI(claim) {
    try {
      const response = await axios.post(
        this.fact_check_api_url,
        {
          claim: claim.text,
          type: claim.type
        },
        {
          headers: {
            'Authorization': `Bearer ${this.fact_check_api_key}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );
      
      return {
        status: response.data.status || 'unverified',
        confidence: response.data.confidence || 0,
        sources: response.data.sources || [],
        explanation: response.data.explanation || ''
      };
    } catch (error) {
      console.error('API fact check failed:', error.message);
      return {
        status: 'unverified',
        confidence: 0,
        sources: []
      };
    }
  }

  async verifyClaimLocally(claim) {
    try {
      // Simple local verification based on patterns
      const text_lower = claim.text.toLowerCase();
      
      // Check for obviously false patterns
      const false_patterns = [
        /100% of people/,
        /never happens/,
        /always true/,
        /impossible to/
      ];
      
      const suspicious_patterns = [
        /\b(?:miracle|amazing|incredible|unbelievable)\b/,
        /\b(?:secret|hidden|they don't want you to know)\b/,
        /\b(?:guaranteed|proven|definitely|absolutely)\b/
      ];
      
      if (false_patterns.some(pattern => pattern.test(text_lower))) {
        return {
          status: 'questionable',
          confidence: 0.2,
          sources: [],
          explanation: 'Contains absolute statements that are rarely accurate'
        };
      }
      
      if (suspicious_patterns.some(pattern => pattern.test(text_lower))) {
        return {
          status: 'needs_verification',
          confidence: 0.4,
          sources: [],
          explanation: 'Contains language that often indicates unverified claims'
        };
      }
      
      // Check for research-backed claims
      if (/\b(?:peer.reviewed|published|journal|study|research)\b/.test(text_lower)) {
        return {
          status: 'likely_accurate',
          confidence: 0.7,
          sources: [],
          explanation: 'References research or published sources'
        };
      }
      
      return {
        status: 'unverified',
        confidence: 0.5,
        sources: []
      };
    } catch (error) {
      console.error('Local verification failed:', error.message);
      return {
        status: 'unverified',
        confidence: 0,
        sources: []
      };
    }
  }

  applyGroundingAnnotations(content, verified_claims) {
    try {
      let grounded_content = content;
      
      // Sort claims by start index in reverse order to avoid index shifting
      const sorted_claims = verified_claims.sort((a, b) => b.start_index - a.start_index);
      
      for (const claim of sorted_claims) {
        const annotation = this.generateAnnotation(claim);
        
        if (annotation) {
          const before = grounded_content.substring(0, claim.end_index);
          const after = grounded_content.substring(claim.end_index);
          
          grounded_content = before + annotation + after;
        }
      }
      
      return grounded_content;
    } catch (error) {
      console.error('Annotation application failed:', error.message);
      return content;
    }
  }

  generateAnnotation(claim) {
    const verification = claim.verification;
    
    if (!verification || verification.status === 'unverified') {
      return '';
    }
    
    let annotation_text = '';
    let annotation_class = '';
    
    switch (verification.status) {
      case 'verified':
      case 'likely_accurate':
        annotation_class = 'grounding-verified';
        annotation_text = '✓ Verified';
        break;
      case 'questionable':
      case 'needs_verification':
        annotation_class = 'grounding-questionable';
        annotation_text = '⚠ Needs verification';
        break;
      case 'false':
      case 'misleading':
        annotation_class = 'grounding-false';
        annotation_text = '✗ Questionable';
        break;
      default:
        return '';
    }
    
    const sources_text = verification.sources && verification.sources.length > 0 
      ? ` Sources: ${verification.sources.slice(0, 2).join(', ')}` 
      : '';
    
    const explanation_text = verification.explanation 
      ? ` (${verification.explanation})` 
      : '';
    
    return ` <span class="${annotation_class}" title="${annotation_text}${sources_text}${explanation_text}">[${annotation_text}]</span>`;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async validateContent(content) {
    try {
      if (!content || typeof content !== 'string') {
        return {
          is_valid: false,
          issues: ['Content must be a non-empty string']
        };
      }
      
      const issues = [];
      
      // Check content length
      if (content.length < 10) {
        issues.push('Content is too short');
      }
      
      if (content.length > 50000) {
        issues.push('Content is too long');
      }
      
      // Check for spam patterns
      const spam_patterns = [
        /\b(?:buy now|click here|limited time|act now)\b/gi,
        /\$\d+(?:\.\d{2})?\s*(?:only|now|today)/gi,
        /\b(?:free|win|winner|congratulations)\b.*\b(?:click|call|visit)\b/gi
      ];
      
      if (spam_patterns.some(pattern => pattern.test(content))) {
        issues.push('Content contains potential spam patterns');
      }
      
      // Check for excessive capitalization
      const caps_ratio = (content.match(/[A-Z]/g) || []).length / content.length;
      if (caps_ratio > 0.3) {
        issues.push('Content contains excessive capitalization');
      }
      
      return {
        is_valid: issues.length === 0,
        issues: issues
      };
    } catch (error) {
      console.error('Content validation failed:', error.message);
      return {
        is_valid: false,
        issues: ['Content validation failed']
      };
    }
  }
}

module.exports = new ContentGroundingService();