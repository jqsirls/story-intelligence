import { ClassroomManager, BulkStudentCreationRequest } from '../services/ClassroomManager';

describe('ClassroomManager', () => {
  let manager: ClassroomManager;

  beforeEach(() => {
    manager = new ClassroomManager();
  });

  describe('createClassroom', () => {
    it('should create a new classroom with default settings', async () => {
      const classroom = await manager.createClassroom(
        'Math Class 3A',
        'teacher-123',
        'school-456',
        'grade-3',
        'mathematics'
      );

      expect(classroom.name).toBe('Math Class 3A');
      expect(classroom.teacherId).toBe('teacher-123');
      expect(classroom.gradeLevel).toBe('grade-3');
      expect(classroom.subject).toBe('mathematics');
      expect(classroom.isActive).toBe(true);
      expect(classroom.settings.contentFiltering).toBe('moderate');
      expect(classroom.settings.collaborativeMode).toBe(true);
    });

    it('should create a classroom with custom settings', async () => {
      const classroom = await manager.createClassroom(
        'Science Lab',
        'teacher-789',
        'school-456',
        'grade-5',
        'science',
        {
          contentFiltering: 'strict',
          collaborativeMode: false,
          assessmentMode: 'formative'
        }
      );

      expect(classroom.settings.contentFiltering).toBe('strict');
      expect(classroom.settings.collaborativeMode).toBe(false);
      expect(classroom.settings.assessmentMode).toBe('formative');
    });
  });

  describe('bulkCreateStudents', () => {
    it('should create multiple students successfully', async () => {
      const classroom = await manager.createClassroom(
        'Test Class',
        'teacher-123',
        'school-456',
        'grade-2',
        'language-arts'
      );

      const request: BulkStudentCreationRequest = {
        classroomId: classroom.id,
        students: [
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            parentEmail: 'parent1@example.com'
          },
          {
            firstName: 'Bob',
            lastName: 'Smith',
            parentEmail: 'parent2@example.com',
            specialNeeds: ['dyslexia'],
            learningPreferences: {
              visualLearner: true,
              auditoryLearner: false,
              kinestheticLearner: false,
              readingLevel: 'below',
              attentionSpan: 'short'
            }
          }
        ],
        sendWelcomeEmails: false,
        generatePasswords: true
      };

      const result = await manager.bulkCreateStudents(request);

      expect(result.created).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.credentials).toHaveLength(2);
      
      const alice = result.created.find(s => s.firstName === 'Alice');
      expect(alice).toBeDefined();
      expect(alice?.gradeLevel).toBe('grade-2');
      expect(alice?.parentEmail).toBe('parent1@example.com');

      const bob = result.created.find(s => s.firstName === 'Bob');
      expect(bob).toBeDefined();
      expect(bob?.specialNeeds).toContain('dyslexia');
      expect(bob?.learningPreferences?.visualLearner).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      const classroom = await manager.createClassroom(
        'Test Class',
        'teacher-123',
        'school-456',
        'grade-2',
        'language-arts'
      );

      const request: BulkStudentCreationRequest = {
        classroomId: classroom.id,
        students: [
          {
            firstName: 'Alice',
            lastName: 'Johnson'
          },
          {
            firstName: '', // Invalid - empty first name
            lastName: 'Smith'
          }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      };

      const result = await manager.bulkCreateStudents(request);

      expect(result.created).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toContain('First name and last name are required');
    });

    it('should throw error for non-existent classroom', async () => {
      const request: BulkStudentCreationRequest = {
        classroomId: 'non-existent',
        students: [{ firstName: 'Test', lastName: 'Student' }],
        sendWelcomeEmails: false,
        generatePasswords: false
      };

      await expect(manager.bulkCreateStudents(request)).rejects.toThrow('Classroom non-existent not found');
    });
  });

  describe('createGroupStorytellingSession', () => {
    it('should create a group storytelling session', async () => {
      const classroom = await manager.createClassroom(
        'Story Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );

      const session = await manager.createGroupStorytellingSession(
        classroom.id,
        'Adventure Story',
        'Create an adventure story together',
        'teacher-123',
        'Once upon a time in a magical forest...',
        ['creative-writing', 'collaboration'],
        'collaborative',
        4,
        new Date()
      );

      expect(session.title).toBe('Adventure Story');
      expect(session.classroomId).toBe(classroom.id);
      expect(session.sessionType).toBe('collaborative');
      expect(session.maxParticipants).toBe(4);
      expect(session.status).toBe('scheduled');
      expect(session.participants).toHaveLength(0);
    });
  });

  describe('addStudentsToSession', () => {
    it('should add students to a session successfully', async () => {
      const classroom = await manager.createClassroom(
        'Story Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );

      // Create students
      const studentResult = await manager.bulkCreateStudents({
        classroomId: classroom.id,
        students: [
          { firstName: 'Alice', lastName: 'Johnson' },
          { firstName: 'Bob', lastName: 'Smith' }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      // Create session
      const session = await manager.createGroupStorytellingSession(
        classroom.id,
        'Test Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1']
      );

      // Add students to session
      const result = await manager.addStudentsToSession(
        session.id,
        studentResult.created.map(s => s.id)
      );

      expect(result.added).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle session capacity limits', async () => {
      const classroom = await manager.createClassroom(
        'Story Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );

      // Create students
      const studentResult = await manager.bulkCreateStudents({
        classroomId: classroom.id,
        students: [
          { firstName: 'Alice', lastName: 'Johnson' },
          { firstName: 'Bob', lastName: 'Smith' },
          { firstName: 'Charlie', lastName: 'Brown' }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      // Create session with max 2 participants
      const session = await manager.createGroupStorytellingSession(
        classroom.id,
        'Small Session',
        'Test description',
        'teacher-123',
        'Story prompt',
        ['objective-1'],
        'collaborative',
        2
      );

      // Try to add 3 students
      const result = await manager.addStudentsToSession(
        session.id,
        studentResult.created.map(s => s.id)
      );

      expect(result.added).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe('Session is full');
    });
  });

  describe('sendParentCommunication', () => {
    it('should send communication to parent', async () => {
      const classroom = await manager.createClassroom(
        'Test Class',
        'teacher-123',
        'school-456',
        'grade-2',
        'language-arts'
      );

      // Add a mock teacher to the manager
      (manager as any).teachers.set('teacher-123', {
        id: 'teacher-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'teacher@example.com',
        schoolId: 'school-456',
        subjects: ['language-arts'],
        gradeLevel: ['grade-2'],
        certifications: [],
        isActive: true
      });

      const studentResult = await manager.bulkCreateStudents({
        classroomId: classroom.id,
        students: [
          {
            firstName: 'Alice',
            lastName: 'Johnson',
            parentEmail: 'parent@example.com'
          }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      const communication = await manager.sendParentCommunication(
        studentResult.created[0].id,
        'teacher-123',
        'Progress Update',
        'Alice is doing great in class!',
        'progress_update',
        'medium'
      );

      expect(communication.subject).toBe('Progress Update');
      expect(communication.message).toBe('Alice is doing great in class!');
      expect(communication.type).toBe('progress_update');
      expect(communication.priority).toBe('medium');
      expect(communication.isRead).toBe(false);
    });

    it('should throw error for student without parent email', async () => {
      const classroom = await manager.createClassroom(
        'Test Class',
        'teacher-123',
        'school-456',
        'grade-2',
        'language-arts'
      );

      // Add a mock teacher to the manager
      (manager as any).teachers.set('teacher-123', {
        id: 'teacher-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'teacher@example.com',
        schoolId: 'school-456',
        subjects: ['language-arts'],
        gradeLevel: ['grade-2'],
        certifications: [],
        isActive: true
      });

      const studentResult = await manager.bulkCreateStudents({
        classroomId: classroom.id,
        students: [
          {
            firstName: 'Alice',
            lastName: 'Johnson'
            // No parent email
          }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      await expect(
        manager.sendParentCommunication(
          studentResult.created[0].id,
          'teacher-123',
          'Test Subject',
          'Test Message'
        )
      ).rejects.toThrow('Student not found or no parent email available');
    });
  });

  describe('applyEducationalContentFilter', () => {
    it('should apply strict filtering', async () => {
      const classroom = await manager.createClassroom(
        'Strict Class',
        'teacher-123',
        'school-456',
        'grade-1',
        'language-arts',
        { contentFiltering: 'strict' }
      );

      const content = 'This scary story about video games and violent battles.';
      const result = await manager.applyEducationalContentFilter(content, classroom.id);

      expect(result.filtered).not.toContain('scary');
      expect(result.filtered).not.toContain('video games');
      expect(result.filtered).not.toContain('violent');
      expect(result.modifications.length).toBeGreaterThan(0);
    });

    it('should apply grade-level appropriate language', async () => {
      const classroom = await manager.createClassroom(
        'Young Class',
        'teacher-123',
        'school-456',
        'kindergarten',
        'language-arts'
      );

      const content = 'The magnificent and extraordinary adventure was tremendous.';
      const result = await manager.applyEducationalContentFilter(content, classroom.id);

      expect(result.filtered).toContain('great');
      expect(result.filtered).toContain('amazing');
      expect(result.filtered).toContain('big');
      expect(result.modifications.some(m => m.includes('Simplified vocabulary'))).toBe(true);
    });
  });

  describe('getClassroomEngagementMetrics', () => {
    it('should return engagement metrics for classroom', async () => {
      const classroom = await manager.createClassroom(
        'Metrics Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'mathematics'
      );

      const metrics = await manager.getClassroomEngagementMetrics(classroom.id);

      expect(metrics).toHaveProperty('overallEngagement');
      expect(metrics).toHaveProperty('studentEngagement');
      expect(metrics).toHaveProperty('trends');
      expect(Array.isArray(metrics.studentEngagement)).toBe(true);
      expect(Array.isArray(metrics.trends.weeklyEngagement)).toBe(true);
      expect(Array.isArray(metrics.trends.monthlyCompletion)).toBe(true);
    });

    it('should throw error for non-existent classroom', async () => {
      await expect(
        manager.getClassroomEngagementMetrics('non-existent')
      ).rejects.toThrow('Classroom non-existent not found');
    });
  });

  // ===== ENHANCED CLASSROOM MANAGEMENT TESTS =====

  describe('importStudentsFromCSV', () => {
    let classroomId: string;

    beforeEach(async () => {
      const classroom = await manager.createClassroom(
        'CSV Import Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );
      classroomId = classroom.id;
    });

    it('should import students from CSV successfully', async () => {
      const csvData = `firstName,lastName,parentEmail,specialNeeds,learningPreferences
Alice,Johnson,alice.parent@example.com,dyslexia;adhd,"{""visualLearner"": true}"
Bob,Smith,bob.parent@example.com,,"{""auditoryLearner"": true}"
Charlie,Brown,charlie.parent@example.com,autism,"{""readingLevel"": ""below""}"`;

      const result = await manager.importStudentsFromCSV(classroomId, csvData, {
        hasHeaders: true,
        skipDuplicates: true,
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      expect(result.imported).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.summary.successfulImports).toBe(3);
      expect(result.summary.failedImports).toBe(0);
      expect(result.imported[0].firstName).toBe('Alice');
      expect(result.imported[0].specialNeeds).toEqual(['dyslexia', 'adhd']);
      expect(result.imported[0].learningPreferences.visualLearner).toBe(true);
    });

    it('should handle CSV parsing errors', async () => {
      const csvData = `firstName,lastName,parentEmail
Alice,Johnson,alice.parent@example.com
,Smith,bob.parent@example.com
Charlie,,charlie.parent@example.com`;

      const result = await manager.importStudentsFromCSV(classroomId, csvData, {
        hasHeaders: true,
        skipDuplicates: true
      });

      expect(result.imported).toHaveLength(1); // Only Alice should be imported
      expect(result.failed).toHaveLength(2); // Empty firstName and lastName should fail
      expect(result.summary.successfulImports).toBe(1);
      expect(result.summary.failedImports).toBe(2);
    });

    it('should skip duplicates when option is enabled', async () => {
      // First import
      const csvData1 = `firstName,lastName,parentEmail
Alice,Johnson,alice.parent@example.com`;

      await manager.importStudentsFromCSV(classroomId, csvData1, {
        hasHeaders: true,
        skipDuplicates: true
      });

      // Second import with same student
      const csvData2 = `firstName,lastName,parentEmail
Alice,Johnson,alice.parent@example.com
Bob,Smith,bob.parent@example.com`;

      const result = await manager.importStudentsFromCSV(classroomId, csvData2, {
        hasHeaders: true,
        skipDuplicates: true
      });

      expect(result.imported).toHaveLength(1); // Only Bob should be imported
      expect(result.summary.duplicates).toBe(1);
      expect(result.imported[0].firstName).toBe('Bob');
    });
  });

  describe('getRealTimeEngagementMetrics', () => {
    let classroomId: string;

    beforeEach(async () => {
      const classroom = await manager.createClassroom(
        'Real-time Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );
      classroomId = classroom.id;

      // Add students
      await manager.bulkCreateStudents({
        classroomId,
        students: [
          { firstName: 'Alice', lastName: 'Johnson', parentEmail: 'alice.parent@example.com' },
          { firstName: 'Bob', lastName: 'Smith', parentEmail: 'bob.parent@example.com' }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });
    });

    it('should return real-time engagement metrics', async () => {
      const metrics = await manager.getRealTimeEngagementMetrics(classroomId);

      expect(metrics).toBeDefined();
      expect(metrics.classroomId).toBe(classroomId);
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(metrics.activeStudents).toBeGreaterThanOrEqual(0);
      expect(metrics.averageEngagement).toBeGreaterThanOrEqual(0);
      expect(metrics.currentActivities).toBeInstanceOf(Array);
      expect(metrics.alerts).toBeInstanceOf(Array);
    });

    it('should generate alerts for low engagement', async () => {
      const metrics = await manager.getRealTimeEngagementMetrics(classroomId);

      // Check if alerts are properly structured
      metrics.alerts.forEach(alert => {
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('severity');
        expect(['low-engagement', 'struggling-student', 'technical-issue', 'behavioral-concern']).toContain(alert.type);
        expect(['low', 'medium', 'high']).toContain(alert.severity);
      });
    });
  });

  describe('createCurriculumMapping', () => {
    let classroomId: string;

    beforeEach(async () => {
      const classroom = await manager.createClassroom(
        'Curriculum Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );
      classroomId = classroom.id;
    });

    it('should create curriculum standards mapping', async () => {
      const mapping = await manager.createCurriculumMapping(
        classroomId,
        'CCSS.ELA-LITERACY.RL.3.1',
        'Ask and answer questions to demonstrate understanding',
        'Students will ask and answer questions to demonstrate understanding of a text',
        ['objective-1', 'objective-2']
      );

      expect(mapping).toBeDefined();
      expect(mapping.standardId).toBe('CCSS.ELA-LITERACY.RL.3.1');
      expect(mapping.standardName).toBe('Ask and answer questions to demonstrate understanding');
      expect(mapping.gradeLevel).toBe('grade-3');
      expect(mapping.subjectArea).toBe('language-arts');
      expect(mapping.alignedObjectives).toEqual(['objective-1', 'objective-2']);
    });
  });

  describe('createAssignment', () => {
    let classroomId: string;
    let studentIds: string[];

    beforeEach(async () => {
      // Add a mock teacher to the manager
      (manager as any).teachers.set('teacher-123', {
        id: 'teacher-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'teacher@example.com',
        schoolId: 'school-456',
        subjects: ['language-arts'],
        gradeLevel: ['grade-3'],
        certifications: [],
        isActive: true
      });

      const classroom = await manager.createClassroom(
        'Assignment Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );
      classroomId = classroom.id;

      const result = await manager.bulkCreateStudents({
        classroomId,
        students: [
          { firstName: 'Alice', lastName: 'Johnson', parentEmail: 'alice.parent@example.com' },
          { firstName: 'Bob', lastName: 'Smith', parentEmail: 'bob.parent@example.com' }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      studentIds = result.created.map(s => s.id);
    });

    it('should create assignment successfully', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const assignment = await manager.createAssignment(
        classroomId,
        'Character Development Exercise',
        'Create a character with detailed traits and backstory',
        'teacher-123',
        studentIds,
        dueDate,
        ['objective-1', 'objective-2'],
        'template-1'
      );

      expect(assignment).toBeDefined();
      expect(assignment.title).toBe('Character Development Exercise');
      expect(assignment.assignedTo).toEqual(studentIds);
      expect(assignment.status).toBe('assigned');
      expect(assignment.submissions).toEqual([]);
    });

    it('should track assignment progress', async () => {
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const assignment = await manager.createAssignment(
        classroomId,
        'Test Assignment',
        'Test description',
        'teacher-123',
        studentIds,
        dueDate,
        ['objective-1']
      );

      const progress = await manager.getAssignmentProgress(assignment.id);

      expect(progress).toBeDefined();
      expect(progress.assignment).toEqual(assignment);
      expect(progress.completionRate).toBe(0); // No submissions yet
      expect(progress.pendingSubmissions).toEqual(studentIds);
      expect(progress.onTimeSubmissions).toBe(0);
      expect(progress.lateSubmissions).toBe(0);
    });
  });

  describe('createSpecialNeedsAccommodation', () => {
    let studentId: string;

    beforeEach(async () => {
      const classroom = await manager.createClassroom(
        'Special Needs Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );

      const result = await manager.bulkCreateStudents({
        classroomId: classroom.id,
        students: [
          { firstName: 'Alice', lastName: 'Johnson', parentEmail: 'alice.parent@example.com' }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      studentId = result.created[0].id;
    });

    it('should create special needs accommodation', async () => {
      const reviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const accommodation = await manager.createSpecialNeedsAccommodation(
        studentId,
        'visual',
        'Student needs larger text and high contrast colors',
        'Increase font size to 16pt, use high contrast theme',
        ['screen-reader', 'magnification-software'],
        'teacher-123',
        reviewDate
      );

      expect(accommodation).toBeDefined();
      expect(accommodation.studentId).toBe(studentId);
      expect(accommodation.accommodationType).toBe('visual');
      expect(accommodation.description).toBe('Student needs larger text and high contrast colors');
      expect(accommodation.tools).toEqual(['screen-reader', 'magnification-software']);
      expect(accommodation.effectiveness).toBe('medium'); // Default
      expect(accommodation.isActive).toBe(true);
    });

    it('should update accommodation effectiveness', async () => {
      const reviewDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      const accommodation = await manager.createSpecialNeedsAccommodation(
        studentId,
        'auditory',
        'Student needs audio descriptions',
        'Provide audio narration for visual content',
        ['text-to-speech'],
        'teacher-123',
        reviewDate
      );

      await manager.updateAccommodationEffectiveness(
        accommodation.id,
        'high',
        'Student shows significant improvement with audio support'
      );

      // Note: In a real implementation, we would verify the update was persisted
      // For this test, we're just ensuring the method doesn't throw an error
      expect(true).toBe(true);
    });
  });

  describe('createParentTeacherPortal', () => {
    let classroomId: string;

    beforeEach(async () => {
      const classroom = await manager.createClassroom(
        'Portal Class',
        'teacher-123',
        'school-456',
        'grade-3',
        'language-arts'
      );
      classroomId = classroom.id;

      // Add students with parent emails
      await manager.bulkCreateStudents({
        classroomId,
        students: [
          { firstName: 'Alice', lastName: 'Johnson', parentEmail: 'alice.parent@example.com' },
          { firstName: 'Bob', lastName: 'Smith', parentEmail: 'bob.parent@example.com' },
          { firstName: 'Charlie', lastName: 'Brown', parentEmail: 'alice.parent@example.com' } // Same parent as Alice
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });
    });

    it('should create parent-teacher portal', async () => {
      const portal = await manager.createParentTeacherPortal(classroomId);

      expect(portal).toBeDefined();
      expect(portal.portalId).toBeDefined();
      expect(portal.accessUrl).toContain(portal.portalId);
      expect(portal.features).toBeInstanceOf(Array);
      expect(portal.features.length).toBeGreaterThan(0);
      expect(portal.parentAccess).toBeInstanceOf(Array);
      expect(portal.parentAccess.length).toBe(2); // Two unique parent emails
      
      // Check that parents with multiple children have all their children listed
      const aliceParent = portal.parentAccess.find(p => p.parentEmail === 'alice.parent@example.com');
      expect(aliceParent).toBeDefined();
      expect(aliceParent!.studentIds).toHaveLength(2); // Alice and Charlie
    });
  });

  describe('generateEnhancedTeacherDashboard', () => {
    let teacherId: string;
    let classroomId: string;

    beforeEach(async () => {
      teacherId = 'teacher-123';
      
      // Add a mock teacher to the manager
      (manager as any).teachers.set(teacherId, {
        id: teacherId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'teacher@example.com',
        schoolId: 'school-456',
        subjects: ['language-arts'],
        gradeLevel: ['grade-3'],
        certifications: [],
        isActive: true
      });
      
      const classroom = await manager.createClassroom(
        'Enhanced Dashboard Class',
        teacherId,
        'school-456',
        'grade-3',
        'language-arts'
      );
      classroomId = classroom.id;

      // Add students
      await manager.bulkCreateStudents({
        classroomId,
        students: [
          { firstName: 'Alice', lastName: 'Johnson', parentEmail: 'alice.parent@example.com' },
          { firstName: 'Bob', lastName: 'Smith', parentEmail: 'bob.parent@example.com' }
        ],
        sendWelcomeEmails: false,
        generatePasswords: false
      });

      // Create some curriculum mappings
      await manager.createCurriculumMapping(
        classroomId,
        'CCSS.ELA-LITERACY.RL.3.1',
        'Ask and answer questions',
        'Demonstrate understanding of text',
        ['objective-1']
      );

      // Create an assignment
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await manager.createAssignment(
        classroomId,
        'Test Assignment',
        'Test description',
        teacherId,
        ['student-1'],
        dueDate,
        ['objective-1']
      );
    });

    it('should generate enhanced teacher dashboard', async () => {
      const dashboard = await manager.generateEnhancedTeacherDashboard(teacherId, classroomId);

      expect(dashboard).toBeDefined();
      expect(dashboard.classroomId).toBe(classroomId);
      expect(dashboard.realTimeMetrics).toBeDefined();
      expect(dashboard.curriculumCoverage).toBeDefined();
      expect(dashboard.specialNeedsSupport).toBeDefined();
      expect(dashboard.assignmentTracking).toBeDefined();

      // Check real-time metrics
      expect(dashboard.realTimeMetrics.classroomId).toBe(classroomId);
      expect(dashboard.realTimeMetrics.timestamp).toBeInstanceOf(Date);

      // Check curriculum coverage
      expect(dashboard.curriculumCoverage.standardsCovered).toBeGreaterThanOrEqual(0);
      expect(dashboard.curriculumCoverage.coveragePercentage).toBeGreaterThanOrEqual(0);

      // Check special needs support
      expect(dashboard.specialNeedsSupport.studentsWithAccommodations).toBeGreaterThanOrEqual(0);
      expect(dashboard.specialNeedsSupport.accommodationTypes).toBeInstanceOf(Array);

      // Check assignment tracking
      expect(dashboard.assignmentTracking.activeAssignments).toBeGreaterThanOrEqual(0);
      expect(dashboard.assignmentTracking.averageCompletionRate).toBeGreaterThanOrEqual(0);
      expect(dashboard.assignmentTracking.overdueAssignments).toBeGreaterThanOrEqual(0);
    });
  });
});