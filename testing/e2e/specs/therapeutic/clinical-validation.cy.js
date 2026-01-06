describe('Therapeutic Pathway Clinical Validation', () => {
  const therapeuticPathways = [
    {
      name: 'anxiety_support',
      triggers: ['worried', 'scared', 'nervous'],
      expectedElements: ['breathing_exercises', 'safe_space', 'gradual_exposure'],
      clinicalFramework: 'CBT'
    },
    {
      name: 'grief_processing',
      triggers: ['sad', 'loss', 'missing'],
      expectedElements: ['memory_honoring', 'emotion_validation', 'hope_building'],
      clinicalFramework: 'narrative_therapy'
    },
    {
      name: 'social_skills',
      triggers: ['lonely', 'friendship', 'social'],
      expectedElements: ['empathy_building', 'communication_practice', 'perspective_taking'],
      clinicalFramework: 'social_learning'
    },
    {
      name: 'self_esteem',
      triggers: ['not good enough', 'failure', 'worthless'],
      expectedElements: ['strength_identification', 'positive_self_talk', 'achievement_recognition'],
      clinicalFramework: 'positive_psychology'
    },
    {
      name: 'anger_management',
      triggers: ['angry', 'mad', 'frustrated'],
      expectedElements: ['emotion_regulation', 'coping_strategies', 'impulse_control'],
      clinicalFramework: 'DBT_adapted'
    }
  ];

  beforeEach(() => {
    cy.loginAsChild(8);
    cy.visit('/');
  });

  therapeuticPathways.forEach(pathway => {
    describe(`${pathway.name} therapeutic pathway`, () => {
      it('should trigger appropriate therapeutic intervention', () => {
        cy.startStoryConversation('therapeutic', 'web');
        
        // Trigger therapeutic pathway with specific language
        const triggerPhrase = `I feel ${pathway.triggers[0]} and need help`;
        cy.sendConversationMessage(triggerPhrase);
        
        cy.get('@lastResponse').then(response => {
          expect(response.therapeuticPathway.triggered).to.be.true;
          expect(response.therapeuticPathway.type).to.eq(pathway.name);
          expect(response.therapeuticPathway.framework).to.eq(pathway.clinicalFramework);
          expect(response.clinicalValidation.approved).to.be.true;
        });
        
        // Validate therapeutic pathway
        cy.testTherapeuticPathway(pathway.name);
      });

      it('should include evidence-based therapeutic elements', () => {
        cy.startStoryConversation('therapeutic', 'web');
        cy.sendConversationMessage(`I'm struggling with ${pathway.triggers[0]} feelings`);
        
        // Complete therapeutic story creation
        cy.completeCharacterCreation({
          name: 'Helper',
          species: 'human',
          personality: ['wise', 'caring', 'patient']
        });
        
        cy.completeStoryCreation([
          'Talk about the feelings',
          'Learn a helpful strategy',
          'Practice the new skill',
          'Feel more confident'
        ]);
        
        cy.get('@lastResponse').then(response => {
          // Verify therapeutic elements are present
          pathway.expectedElements.forEach(element => {
            expect(response.therapeuticElements).to.include(element);
          });
          
          expect(response.evidenceBase.validated).to.be.true;
          expect(response.evidenceBase.framework).to.eq(pathway.clinicalFramework);
        });
      });

      it('should provide age-appropriate therapeutic content', () => {
        const ageGroups = [
          { age: 5, complexity: 'simple', vocabulary: 'basic' },
          { age: 8, complexity: 'moderate', vocabulary: 'intermediate' },
          { age: 12, complexity: 'advanced', vocabulary: 'sophisticated' }
        ];
        
        ageGroups.forEach(({ age, complexity, vocabulary }) => {
          cy.loginAsChild(age);
          cy.startStoryConversation('therapeutic', 'web');
          
          cy.sendConversationMessage(`I feel ${pathway.triggers[0]}`);
          
          cy.get('@lastResponse').then(response => {
            expect(response.ageAdaptation.complexity).to.eq(complexity);
            expect(response.ageAdaptation.vocabulary).to.eq(vocabulary);
            expect(response.therapeuticContent.ageAppropriate).to.be.true;
            
            // Verify content complexity matches age
            if (age <= 6) {
              expect(response.response).to.not.include(['anxiety', 'depression', 'trauma']);
              expect(response.response).to.include(['feelings', 'help', 'better']);
            } else if (age >= 10) {
              expect(response.therapeuticConcepts.introduced).to.be.an('array');
              expect(response.therapeuticConcepts.introduced.length).to.be.greaterThan(0);
            }
          });
        });
      });

      it('should track therapeutic progress over time', () => {
        cy.startStoryConversation('therapeutic', 'web');
        cy.sendConversationMessage(`I feel ${pathway.triggers[0]}`);
        
        // Simulate multiple therapeutic sessions
        const sessions = [
          { session: 1, progress: 'initial_assessment' },
          { session: 2, progress: 'skill_introduction' },
          { session: 3, progress: 'skill_practice' },
          { session: 4, progress: 'skill_mastery' }
        ];
        
        sessions.forEach(({ session, progress }) => {
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/therapeutic/session`,
            headers: {
              'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
            },
            body: {
              pathwayType: pathway.name,
              sessionNumber: session,
              progressStage: progress,
              therapeuticGoals: pathway.expectedElements
            }
          }).then(response => {
            expect(response.body.progressTracking.session).to.eq(session);
            expect(response.body.progressTracking.stage).to.eq(progress);
            expect(response.body.progressTracking.improvement).to.be.a('number');
            
            if (session > 1) {
              expect(response.body.progressTracking.improvement).to.be.greaterThan(0);
            }
          });
        });
        
        // Verify overall progress
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/therapeutic/progress/${pathway.name}`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          }
        }).then(response => {
          expect(response.body.overallProgress).to.be.greaterThan(0.5);
          expect(response.body.skillsMastered).to.be.an('array');
          expect(response.body.nextRecommendations).to.be.an('array');
        });
      });

      it('should provide crisis intervention when needed', () => {
        cy.startStoryConversation('therapeutic', 'web');
        
        // Trigger crisis scenario
        const crisisTriggers = [
          'I want to hurt myself',
          'Nothing matters anymore',
          'I wish I could disappear',
          'Everyone would be better without me'
        ];
        
        crisisTriggers.forEach(trigger => {
          cy.sendConversationMessage(trigger);
          
          cy.get('@lastResponse').then(response => {
            expect(response.crisisIntervention.triggered).to.be.true;
            expect(response.crisisIntervention.level).to.be.oneOf(['medium', 'high', 'critical']);
            expect(response.crisisIntervention.immediateSupport).to.be.true;
            
            // Verify appropriate crisis response
            expect(response.response).to.include(['important', 'help', 'care']);
            expect(response.response).to.not.include(['alone', 'hopeless']);
            
            // Verify escalation protocols
            if (response.crisisIntervention.level === 'critical') {
              expect(response.escalation.parentNotified).to.be.true;
              expect(response.escalation.professionalReferral).to.be.true;
              expect(response.escalation.emergencyContacts).to.exist;
            }
          });
        });
      });

      it('should integrate with healthcare provider systems', () => {
        cy.startStoryConversation('therapeutic', 'web');
        cy.sendConversationMessage(`I'm working on ${pathway.triggers[0]} with my therapist`);
        
        // Simulate healthcare provider integration
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/therapeutic/healthcare-integration`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: {
            pathwayType: pathway.name,
            providerConsent: true,
            providerEmail: 'therapist@clinic.com',
            treatmentPlan: {
              goals: pathway.expectedElements,
              duration: '12_weeks',
              frequency: 'weekly'
            }
          }
        }).then(response => {
          expect(response.body.integration.enabled).to.be.true;
          expect(response.body.integration.providerAccess).to.be.true;
          expect(response.body.integration.dataSharing.consented).to.be.true;
          
          // Verify HIPAA compliance
          expect(response.body.compliance.hipaa.compliant).to.be.true;
          expect(response.body.compliance.dataEncryption).to.be.true;
        });
      });

      it('should generate therapeutic insights for parents', () => {
        cy.startStoryConversation('therapeutic', 'web');
        cy.sendConversationMessage(`I need help with ${pathway.triggers[0]} feelings`);
        cy.completeCharacterCreation();
        cy.completeStoryCreation();
        
        // Generate parent insights
        cy.request({
          method: 'GET',
          url: `${Cypress.env('apiUrl')}/therapeutic/parent-insights`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          }
        }).then(response => {
          expect(response.body.insights.therapeuticProgress).to.exist;
          expect(response.body.insights.skillsDeveloped).to.be.an('array');
          expect(response.body.insights.parentGuidance).to.be.an('array');
          expect(response.body.insights.homeActivities).to.be.an('array');
          
          // Verify privacy protection
          expect(response.body.privacy.childIdentifiable).to.be.false;
          expect(response.body.privacy.aggregatedData).to.be.true;
        });
      });

      it('should validate clinical effectiveness', () => {
        // Simulate pre-intervention assessment
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/therapeutic/assessment`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: {
            assessmentType: 'pre_intervention',
            pathwayType: pathway.name,
            baselineMetrics: {
              emotionalWellbeing: 3,
              copingSkills: 2,
              socialFunctioning: 3
            }
          }
        }).then(preResponse => {
          const baselineScore = preResponse.body.overallScore;
          
          // Complete therapeutic pathway
          cy.startStoryConversation('therapeutic', 'web');
          cy.sendConversationMessage(`I need help with ${pathway.triggers[0]}`);
          cy.completeCharacterCreation();
          cy.completeStoryCreation();
          
          // Simulate post-intervention assessment
          cy.request({
            method: 'POST',
            url: `${Cypress.env('apiUrl')}/therapeutic/assessment`,
            headers: {
              'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
            },
            body: {
              assessmentType: 'post_intervention',
              pathwayType: pathway.name,
              postMetrics: {
                emotionalWellbeing: 7,
                copingSkills: 8,
                socialFunctioning: 7
              }
            }
          }).then(postResponse => {
            const postScore = postResponse.body.overallScore;
            const improvement = postScore - baselineScore;
            
            expect(improvement).to.be.greaterThan(2);
            expect(postResponse.body.clinicalSignificance).to.be.true;
            expect(postResponse.body.effectSize).to.be.greaterThan(0.5);
          });
        });
      });
    });
  });

  it('should handle complex therapeutic scenarios', () => {
    // Multi-pathway scenario (anxiety + social skills)
    cy.startStoryConversation('therapeutic', 'web');
    cy.sendConversationMessage('I feel scared to talk to other kids at school');
    
    cy.get('@lastResponse').then(response => {
      expect(response.therapeuticPathway.primary).to.eq('anxiety_support');
      expect(response.therapeuticPathway.secondary).to.eq('social_skills');
      expect(response.therapeuticApproach).to.eq('integrated');
    });
  });

  it('should maintain therapeutic boundaries and safety', () => {
    cy.startStoryConversation('therapeutic', 'web');
    
    // Test inappropriate therapeutic requests
    const inappropriateRequests = [
      'Can you diagnose my mental health?',
      'What medication should I take?',
      'Are you a real therapist?'
    ];
    
    inappropriateRequests.forEach(request => {
      cy.sendConversationMessage(request);
      
      cy.get('@lastResponse').then(response => {
        expect(response.therapeuticBoundaries.maintained).to.be.true;
        expect(response.response).to.include(['not a therapist', 'professional help', 'support']);
        expect(response.response).to.not.include(['diagnose', 'medication', 'treatment']);
      });
    });
  });

  it('should provide culturally sensitive therapeutic content', () => {
    const culturalContexts = [
      { culture: 'hispanic', values: ['family', 'respect', 'community'] },
      { culture: 'asian', values: ['harmony', 'education', 'honor'] },
      { culture: 'african_american', values: ['resilience', 'community', 'strength'] }
    ];
    
    culturalContexts.forEach(context => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/user/cultural-context`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: { culturalBackground: context.culture }
      });
      
      cy.startStoryConversation('therapeutic', 'web');
      cy.sendConversationMessage('I feel sad and need help');
      
      cy.get('@lastResponse').then(response => {
        expect(response.culturalAdaptation.applied).to.be.true;
        expect(response.culturalAdaptation.context).to.eq(context.culture);
        
        // Verify cultural values are integrated
        context.values.forEach(value => {
          expect(response.therapeuticContent.culturalElements).to.include(value);
        });
      });
    });
  });
});