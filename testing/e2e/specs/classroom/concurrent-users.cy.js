describe('Classroom Concurrent Users Testing', () => {
  beforeEach(() => {
    cy.loginAsEducator();
    cy.visit('/classroom');
  });

  it('should handle multiple students creating stories simultaneously', () => {
    const studentCount = 10;
    cy.setupClassroomEnvironment(studentCount);
    
    // Create concurrent story sessions
    cy.testConcurrentUsers(studentCount);
    
    // Verify all sessions are active
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/classroom/active-sessions`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      }
    }).then(response => {
      expect(response.body.activeSessions).to.have.length(studentCount);
      
      response.body.activeSessions.forEach(session => {
        expect(session.status).to.eq('active');
        expect(session.responseTime).to.be.lessThan(800);
      });
    });
  });

  it('should maintain individual conversation contexts', () => {
    const students = [
      { id: 'student_1', name: 'Alice', storyType: 'adventure' },
      { id: 'student_2', name: 'Bob', storyType: 'educational' },
      { id: 'student_3', name: 'Carol', storyType: 'bedtime' }
    ];
    
    // Start conversations for each student
    const sessionPromises = students.map(student => {
      return cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/start`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: {
          intent: 'createStory',
          storyType: student.storyType,
          channel: 'classroom',
          userId: student.id,
          userInput: `I'm ${student.name}, let's create a ${student.storyType} story`
        }
      });
    });
    
    // Verify each conversation maintains separate context
    Promise.all(sessionPromises).then(responses => {
      responses.forEach((response, index) => {
        const student = students[index];
        expect(response.body.conversationContext.userId).to.eq(student.id);
        expect(response.body.conversationContext.storyType).to.eq(student.storyType);
        expect(response.body.response).to.include(student.name);
      });
    });
    
    // Send different messages to each student
    students.forEach((student, index) => {
      const sessionId = responses[index].body.sessionId;
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/message`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: {
          sessionId,
          message: `My character is a ${student.storyType === 'adventure' ? 'brave knight' : 'wise owl'}`,
          userId: student.id
        }
      }).then(response => {
        expect(response.body.conversationContext.userId).to.eq(student.id);
        expect(response.body.response).to.not.contain(
          students.filter(s => s.id !== student.id).map(s => s.name)
        );
      });
    });
  });

  it('should support collaborative storytelling features', () => {
    const groupSize = 4;
    
    // Create collaborative story session
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/classroom/collaborative-story`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      },
      body: {
        groupSize,
        storyType: 'adventure',
        collaborationMode: 'round_robin'
      }
    }).then(response => {
      const groupSessionId = response.body.groupSessionId;
      
      // Each student contributes to the story
      for (let i = 0; i < groupSize; i++) {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/classroom/contribute`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: {
            groupSessionId,
            studentId: `student_${i}`,
            contribution: `Student ${i} adds: The hero finds a magical item.`,
            turn: i
          }
        }).then(contributionResponse => {
          expect(contributionResponse.status).to.eq(200);
          expect(contributionResponse.body.storyProgress).to.exist;
          expect(contributionResponse.body.nextTurn).to.eq((i + 1) % groupSize);
        });
      }
      
      // Verify collaborative story coherence
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/classroom/story/${groupSessionId}`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        }
      }).then(storyResponse => {
        expect(storyResponse.body.story.coherenceScore).to.be.greaterThan(0.7);
        expect(storyResponse.body.story.contributions).to.have.length(groupSize);
      });
    });
  });

  it('should provide real-time teacher dashboard updates', () => {
    const studentCount = 8;
    cy.setupClassroomEnvironment(studentCount);
    
    // Start WebSocket connection for real-time updates
    cy.window().then(win => {
      const ws = new win.WebSocket(`ws://localhost:3000/classroom/dashboard`);
      
      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          classroomId: 'test-classroom-123'
        }));
      };
      
      const dashboardUpdates = [];
      ws.onmessage = (event) => {
        dashboardUpdates.push(JSON.parse(event.data));
      };
      
      // Simulate student activities
      cy.testConcurrentUsers(studentCount);
      
      // Wait for dashboard updates
      cy.wait(2000).then(() => {
        expect(dashboardUpdates.length).to.be.greaterThan(0);
        
        const latestUpdate = dashboardUpdates[dashboardUpdates.length - 1];
        expect(latestUpdate.activeStudents).to.eq(studentCount);
        expect(latestUpdate.averageEngagement).to.be.greaterThan(0.7);
        expect(latestUpdate.storiesInProgress).to.eq(studentCount);
      });
    });
  });

  it('should handle bulk student account management', () => {
    const studentData = [
      { name: 'Alice Johnson', grade: 3, id: 'alice_j' },
      { name: 'Bob Smith', grade: 3, id: 'bob_s' },
      { name: 'Carol Davis', grade: 3, id: 'carol_d' },
      { name: 'David Wilson', grade: 3, id: 'david_w' },
      { name: 'Emma Brown', grade: 3, id: 'emma_b' }
    ];
    
    // Bulk create student accounts
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/classroom/bulk-create-students`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      },
      body: {
        students: studentData,
        classroomId: 'test-classroom-123'
      }
    }).then(response => {
      expect(response.status).to.eq(200);
      expect(response.body.created).to.have.length(studentData.length);
      expect(response.body.failed).to.have.length(0);
      
      // Verify each student account
      response.body.created.forEach((student, index) => {
        expect(student.name).to.eq(studentData[index].name);
        expect(student.grade).to.eq(studentData[index].grade);
        expect(student.status).to.eq('active');
      });
    });
    
    // Test bulk operations
    const studentIds = studentData.map(s => s.id);
    
    // Bulk assign story activity
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/classroom/bulk-assign`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      },
      body: {
        studentIds,
        assignment: {
          type: 'story_creation',
          storyType: 'educational',
          topic: 'science',
          dueDate: '2024-12-31'
        }
      }
    }).then(response => {
      expect(response.status).to.eq(200);
      expect(response.body.assigned).to.have.length(studentIds.length);
    });
  });

  it('should enforce content filtering for educational environments', () => {
    cy.setupClassroomEnvironment(3);
    
    // Test enhanced content filtering
    const inappropriateInputs = [
      'Let\'s create a violent story',
      'My character has a weapon',
      'The story should be scary and frightening'
    ];
    
    inappropriateInputs.forEach(input => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/start`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: {
          intent: 'createStory',
          storyType: 'educational',
          channel: 'classroom',
          userInput: input
        }
      }).then(response => {
        expect(response.body.contentFiltering.applied).to.be.true;
        expect(response.body.contentFiltering.level).to.eq('educational');
        expect(response.body.response).to.not.contain(['violent', 'weapon', 'scary']);
        expect(response.body.response).to.include('appropriate');
      });
    });
  });

  it('should track curriculum alignment and learning outcomes', () => {
    const curriculumTopics = [
      { subject: 'science', topic: 'solar_system', grade: 3 },
      { subject: 'math', topic: 'fractions', grade: 3 },
      { subject: 'history', topic: 'ancient_civilizations', grade: 4 }
    ];
    
    curriculumTopics.forEach(curriculum => {
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/conversation/start`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: {
          intent: 'createStory',
          storyType: 'educational',
          channel: 'classroom',
          curriculumAlignment: curriculum,
          userInput: `Create a story about ${curriculum.topic}`
        }
      }).then(response => {
        expect(response.body.curriculumAlignment.subject).to.eq(curriculum.subject);
        expect(response.body.curriculumAlignment.topic).to.eq(curriculum.topic);
        expect(response.body.curriculumAlignment.gradeLevel).to.eq(curriculum.grade);
        expect(response.body.learningObjectives).to.be.an('array');
        expect(response.body.learningObjectives.length).to.be.greaterThan(0);
      });
    });
  });

  it('should provide engagement metrics and analytics', () => {
    const studentCount = 6;
    cy.setupClassroomEnvironment(studentCount);
    
    // Simulate varied engagement levels
    const engagementScenarios = [
      { studentId: 'student_1', engagement: 'high', messageCount: 15 },
      { studentId: 'student_2', engagement: 'medium', messageCount: 8 },
      { studentId: 'student_3', engagement: 'low', messageCount: 3 }
    ];
    
    engagementScenarios.forEach(scenario => {
      for (let i = 0; i < scenario.messageCount; i++) {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiUrl')}/conversation/message`,
          headers: {
            'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
          },
          body: {
            sessionId: `session_${scenario.studentId}`,
            message: `Message ${i + 1}`,
            userId: scenario.studentId
          }
        });
      }
    });
    
    // Get engagement analytics
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/classroom/analytics/engagement`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      }
    }).then(response => {
      expect(response.body.overallEngagement).to.exist;
      expect(response.body.studentMetrics).to.be.an('array');
      
      response.body.studentMetrics.forEach(metric => {
        expect(metric.studentId).to.exist;
        expect(metric.engagementScore).to.be.a('number');
        expect(metric.messageCount).to.be.a('number');
        expect(metric.sessionDuration).to.be.a('number');
      });
    });
  });

  it('should support parent-teacher communication', () => {
    const studentId = 'student_alice';
    
    // Create story activity
    cy.request({
      method: 'POST',
      url: `${Cypress.env('apiUrl')}/conversation/start`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      },
      body: {
        intent: 'createStory',
        storyType: 'educational',
        channel: 'classroom',
        userId: studentId,
        userInput: 'Let\'s create a science story'
      }
    }).then(response => {
      const sessionId = response.body.sessionId;
      
      // Generate parent communication
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/classroom/parent-communication`,
        headers: {
          'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
        },
        body: {
          studentId,
          sessionId,
          communicationType: 'progress_update',
          includeStoryContent: true
        }
      }).then(commResponse => {
        expect(commResponse.body.parentEmail).to.exist;
        expect(commResponse.body.subject).to.include('Progress Update');
        expect(commResponse.body.content).to.include('educational story');
        expect(commResponse.body.attachments).to.include('story_summary');
      });
    });
  });

  it('should handle system load gracefully during peak usage', () => {
    const peakUserCount = 25;
    
    // Simulate peak classroom usage
    const startTime = Date.now();
    
    cy.testConcurrentUsers(peakUserCount);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Verify system performance under load
    expect(totalTime).to.be.lessThan(5000); // Should handle 25 users in under 5 seconds
    
    // Check system metrics
    cy.request({
      method: 'GET',
      url: `${Cypress.env('apiUrl')}/system/metrics`,
      headers: {
        'Authorization': `Bearer ${window.localStorage.getItem('authToken')}`
      }
    }).then(response => {
      expect(response.body.averageResponseTime).to.be.lessThan(800);
      expect(response.body.errorRate).to.be.lessThan(0.01);
      expect(response.body.activeConnections).to.be.greaterThan(peakUserCount);
    });
  });
});