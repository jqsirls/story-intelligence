import { 
  ParentGuidanceProtocol, 
  ResourceLink, 
  TherapeuticCondition, 
  ParentNotification,
  TherapeuticSession
} from '../types';

export class ParentGuidanceManager {
  private protocols: Map<string, ParentGuidanceProtocol> = new Map();
  private resourceLibrary: Map<string, ResourceLink[]> = new Map();

  constructor() {
    this.initializeGuidanceProtocols();
    this.initializeResourceLibrary();
  }

  private initializeGuidanceProtocols(): void {
    // Anxiety guidance protocol
    this.protocols.set('anxiety', {
      preStoryBriefing: `This therapeutic story addresses anxiety and worry in an age-appropriate way. Your child may relate to the character's experiences with nervous feelings. The story includes coping strategies that your child can learn and practice. Be prepared to offer comfort and validation if your child shares their own worries during or after the story.`,
      
      postStoryDiscussion: [
        'Validate feelings: "It\'s completely normal to feel worried sometimes. Even grown-ups feel worried."',
        'Connect to story: "How did the character feel when they were worried? Have you ever felt like that?"',
        'Practice together: "Let\'s try the breathing technique the character used. Breathe in slowly... and out slowly..."',
        'Encourage application: "Next time you feel worried, you can try this breathing technique or tell me about it."',
        'Praise courage: "I\'m proud of you for listening to this story and learning about feelings."'
      ],
      
      warningSignsToWatch: [
        'Increased avoidance of previously enjoyed activities',
        'Physical complaints without medical cause (headaches, stomachaches)',
        'Persistent sleep difficulties or nightmares',
        'Extreme clinginess or separation difficulties',
        'Regression in developmental milestones',
        'Excessive worry about future events',
        'Panic attacks or intense fear responses'
      ],
      
      followUpActivities: [
        'Practice deep breathing exercises together daily (5-10 minutes)',
        'Create a "worry box" where your child can write or draw their worries',
        'Establish a consistent bedtime routine to improve sleep',
        'Gradually expose your child to feared situations with support',
        'Read books about feelings and emotions together',
        'Model calm responses to stressful situations',
        'Celebrate small acts of bravery and coping'
      ],
      
      whenToSeekProfessionalHelp: [
        'Anxiety significantly interferes with school, friendships, or family life',
        'Your child expresses thoughts of self-harm or hopelessness',
        'Physical symptoms persist despite medical evaluation',
        'You feel overwhelmed and unable to support your child effectively',
        'Anxiety symptoms worsen despite consistent support and strategies',
        'Your child has panic attacks or severe phobic reactions',
        'Family functioning is significantly impacted by your child\'s anxiety'
      ],
      
      resourceLinks: [
        {
          title: 'Anxiety and Depression Association of America - Children',
          url: 'https://adaa.org/living-with-anxiety/children',
          type: 'article',
          ageAppropriate: false
        },
        {
          title: 'Child Mind Institute - Anxiety Disorders',
          url: 'https://childmind.org/guide/anxiety-disorders/',
          type: 'article',
          ageAppropriate: false
        },
        {
          title: 'National Child Traumatic Stress Network',
          url: 'https://www.nctsn.org/what-is-child-trauma/trauma-types/early-childhood-trauma',
          type: 'professional_directory',
          ageAppropriate: false
        }
      ]
    });

    // Grief guidance protocol
    this.protocols.set('grief', {
      preStoryBriefing: `This story addresses loss and grief in a gentle, age-appropriate way. Your child may have strong emotional reactions, including sadness, anger, or confusion. This is completely normal. The story emphasizes that love continues even when someone is no longer with us physically. Be prepared to answer questions about death and provide comfort.`,
      
      postStoryDiscussion: [
        'Validate all emotions: "All feelings about losing someone special are okay. There\'s no wrong way to feel."',
        'Share memories: "What\'s your favorite memory of [person who died]? I\'d love to hear about it."',
        'Maintain connection: "Even though [person] isn\'t here anymore, the love we have for them stays in our hearts."',
        'Answer questions honestly: Use simple, truthful language appropriate for your child\'s age',
        'Offer comfort: "It\'s okay to feel sad. I\'m here with you, and we\'ll get through this together."'
      ],
      
      warningSignsToWatch: [
        'Persistent denial that the death occurred',
        'Extreme behavioral changes (aggression, withdrawal, regression)',
        'Persistent guilt or self-blame about the death',
        'Inability to speak about the deceased after several months',
        'Severe sleep disturbances or persistent nightmares',
        'Loss of interest in all previously enjoyed activities',
        'Persistent physical complaints or changes in appetite'
      ],
      
      followUpActivities: [
        'Create a memory book or scrapbook together with photos and stories',
        'Visit meaningful places when your child feels ready',
        'Maintain family traditions and create new ones to honor the deceased',
        'Allow your child to keep special objects that belonged to the person',
        'Encourage expression through art, writing, or play',
        'Connect with other family members and friends who knew the deceased',
        'Consider age-appropriate memorial activities'
      ],
      
      whenToSeekProfessionalHelp: [
        'Complicated grief lasting more than 6 months without improvement',
        'Your child expresses wishes to die or join the deceased person',
        'Severe depression symptoms that interfere with daily functioning',
        'Persistent trauma symptoms if the death was sudden or traumatic',
        'Your child becomes unable to function at school or with friends',
        'You\'re concerned about your own ability to cope and support your child',
        'Anniversary reactions become overwhelming year after year'
      ],
      
      resourceLinks: [
        {
          title: 'National Alliance for Grieving Children',
          url: 'https://childrengrieve.org',
          type: 'professional_directory',
          ageAppropriate: false
        },
        {
          title: 'Dougy Center - Grief Support for Children',
          url: 'https://www.dougy.org',
          type: 'article',
          ageAppropriate: false
        }
      ]
    });

    // Social skills guidance protocol
    this.protocols.set('social_skills', {
      preStoryBriefing: `This story focuses on building friendship skills and social confidence. Your child will learn about making friends, sharing, taking turns, and understanding others' feelings. The story provides concrete examples of positive social interactions that your child can practice in real life.`,
      
      postStoryDiscussion: [
        'Identify positive behaviors: "What did the character do that made them a good friend?"',
        'Role-play scenarios: "Let\'s practice what you would say if you wanted to join a game."',
        'Discuss feelings: "How do you think the other character felt when someone was kind to them?"',
        'Plan real-life application: "Tomorrow at school, how could you be a good friend to someone?"',
        'Celebrate social successes: "Tell me about a time you were a good friend this week."'
      ],
      
      warningSignsToWatch: [
        'Persistent social isolation or withdrawal from peers',
        'Aggressive responses to social situations',
        'Inability to read basic social cues',
        'Extreme anxiety in social situations',
        'Persistent rejection by peers despite efforts',
        'Bullying behavior toward others',
        'Complete avoidance of group activities'
      ],
      
      followUpActivities: [
        'Arrange structured playdates with one child at a time initially',
        'Practice social skills through board games and cooperative activities',
        'Model positive social interactions in your own relationships',
        'Read books about friendship and social situations together',
        'Role-play different social scenarios at home',
        'Celebrate and acknowledge positive social behaviors',
        'Gradually increase social opportunities as skills improve'
      ],
      
      whenToSeekProfessionalHelp: [
        'Persistent social isolation despite multiple intervention attempts',
        'Aggressive behavior that puts other children at risk',
        'Signs of being bullied or bullying others',
        'Social anxiety that significantly impacts school performance',
        'Inability to form any peer relationships over extended periods',
        'Social skills deficits that may indicate developmental concerns',
        'Your child expresses persistent loneliness or social distress'
      ],
      
      resourceLinks: [
        {
          title: 'Social Skills Training Resources',
          url: 'https://www.understood.org/en/learning-thinking-differences/child-learning-disabilities/social-skills-issues/social-skills-what-you-need-to-know',
          type: 'article',
          ageAppropriate: false
        }
      ]
    });

    // Self-esteem guidance protocol
    this.protocols.set('self_esteem', {
      preStoryBriefing: `This story helps build your child's confidence and self-worth. It emphasizes that everyone has unique strengths and that mistakes are opportunities to learn. Your child may relate to the character's journey of discovering their own special qualities and learning to believe in themselves.`,
      
      postStoryDiscussion: [
        'Identify strengths: "What are some things you\'re really good at? Let\'s make a list together."',
        'Discuss effort: "I noticed how hard you tried today. That effort is what matters most."',
        'Normalize mistakes: "Everyone makes mistakes. What did the character learn from their mistake?"',
        'Encourage growth: "What\'s something new you\'d like to try or learn?"',
        'Express unconditional love: "I love you no matter what, just for being you."'
      ],
      
      warningSignsToWatch: [
        'Persistent negative self-talk ("I\'m stupid," "I can\'t do anything right")',
        'Avoidance of all challenges or new activities',
        'Extreme perfectionism that causes distress',
        'Constant comparison with others leading to feelings of inadequacy',
        'Withdrawal from activities they previously enjoyed',
        'Excessive need for reassurance and approval',
        'Self-harm behaviors or expressions of self-hatred'
      ],
      
      followUpActivities: [
        'Create a "strengths journal" where you record your child\'s positive qualities daily',
        'Set small, achievable goals together and celebrate accomplishments',
        'Focus praise on effort and process rather than just outcomes',
        'Encourage your child to try new activities without pressure to excel',
        'Share stories of your own mistakes and what you learned from them',
        'Display your child\'s artwork and achievements prominently',
        'Practice positive self-talk and affirmations together'
      ],
      
      whenToSeekProfessionalHelp: [
        'Persistent feelings of worthlessness that don\'t improve with support',
        'Self-harm behaviors or expressions of wanting to hurt themselves',
        'Severe perfectionism that interferes with daily functioning',
        'Depression symptoms accompanying low self-esteem',
        'Complete avoidance of social situations due to poor self-image',
        'Eating disorders or body image issues',
        'Your child expresses hopelessness about their future'
      ],
      
      resourceLinks: [
        {
          title: 'Building Self-Esteem in Children',
          url: 'https://www.healthychildren.org/English/ages-stages/gradeschool/Pages/Helping-Your-Child-Develop-A-Healthy-Sense-of-Self-Esteem.aspx',
          type: 'article',
          ageAppropriate: false
        }
      ]
    });
  }

  private initializeResourceLibrary(): void {
    // Crisis resources
    this.resourceLibrary.set('crisis', [
      {
        title: 'National Suicide Prevention Lifeline',
        url: 'tel:988',
        type: 'crisis_hotline',
        ageAppropriate: false
      },
      {
        title: 'Crisis Text Line',
        url: 'sms:741741',
        type: 'crisis_hotline',
        ageAppropriate: false
      },
      {
        title: 'National Child Abuse Hotline',
        url: 'tel:1-800-4-A-CHILD',
        type: 'crisis_hotline',
        ageAppropriate: false
      }
    ]);

    // Professional directories
    this.resourceLibrary.set('professional', [
      {
        title: 'Psychology Today - Child Therapists',
        url: 'https://www.psychologytoday.com/us/therapists/children',
        type: 'professional_directory',
        ageAppropriate: false
      },
      {
        title: 'American Academy of Child & Adolescent Psychiatry',
        url: 'https://www.aacap.org/AACAP/Families_and_Youth/Resource_Centers/CAP_Finder.aspx',
        type: 'professional_directory',
        ageAppropriate: false
      }
    ]);

    // Educational resources
    this.resourceLibrary.set('education', [
      {
        title: 'Child Mind Institute',
        url: 'https://childmind.org',
        type: 'article',
        ageAppropriate: false
      },
      {
        title: 'Zero to Three - Early Childhood Mental Health',
        url: 'https://www.zerotothree.org',
        type: 'article',
        ageAppropriate: false
      }
    ]);
  }

  getProtocol(condition: TherapeuticCondition): ParentGuidanceProtocol | undefined {
    return this.protocols.get(condition);
  }

  generateCustomizedGuidance(
    condition: TherapeuticCondition,
    childAge: number,
    culturalBackground: string[] = [],
    specificConcerns: string[] = []
  ): ParentGuidanceProtocol {
    const baseProtocol = this.getProtocol(condition);
    if (!baseProtocol) {
      throw new Error(`No guidance protocol found for condition: ${condition}`);
    }

    // Customize based on age
    const ageCustomizedProtocol = this.customizeForAge(baseProtocol, childAge);
    
    // Add cultural considerations
    const culturallyAdaptedProtocol = this.adaptForCulture(ageCustomizedProtocol, culturalBackground);
    
    // Address specific concerns
    const finalProtocol = this.addressSpecificConcerns(culturallyAdaptedProtocol, specificConcerns);

    return finalProtocol;
  }

  private customizeForAge(protocol: ParentGuidanceProtocol, age: number): ParentGuidanceProtocol {
    const ageAdaptations: Record<string, (protocol: ParentGuidanceProtocol) => ParentGuidanceProtocol> = {
      'preschool': (p) => ({
        ...p,
        preStoryBriefing: p.preStoryBriefing + ' Use simple language and be prepared for concrete questions.',
        postStoryDiscussion: p.postStoryDiscussion.map(item => 
          item.replace(/complex concepts/g, 'simple ideas')
        )
      }),
      'school-age': (p) => ({
        ...p,
        preStoryBriefing: p.preStoryBriefing + ' Your child may ask detailed questions and want to discuss the story at length.',
        followUpActivities: [...p.followUpActivities, 'Encourage journaling or drawing about feelings']
      }),
      'preteen': (p) => ({
        ...p,
        preStoryBriefing: p.preStoryBriefing + ' Respect your child\'s growing independence while remaining available for support.',
        postStoryDiscussion: [...p.postStoryDiscussion, 'Respect if your child needs time to process before discussing']
      })
    };

    let ageCategory = 'school-age';
    if (age < 6) ageCategory = 'preschool';
    else if (age > 10) ageCategory = 'preteen';

    const adapter = ageAdaptations[ageCategory];
    return adapter ? adapter(protocol) : protocol;
  }

  private adaptForCulture(protocol: ParentGuidanceProtocol, culturalBackground: string[]): ParentGuidanceProtocol {
    // Add cultural considerations to resource links and discussion points
    const culturalResources = this.getCulturalResources(culturalBackground);
    
    return {
      ...protocol,
      resourceLinks: [...protocol.resourceLinks, ...culturalResources],
      postStoryDiscussion: [
        ...protocol.postStoryDiscussion,
        'Consider how your family\'s cultural values and traditions can support your child\'s healing'
      ]
    };
  }

  private getCulturalResources(culturalBackground: string[]): ResourceLink[] {
    // This would be expanded with actual cultural resources
    const culturalResourceMap: Record<string, ResourceLink[]> = {
      'hispanic': [
        {
          title: 'National Alliance on Mental Illness - Latino Mental Health',
          url: 'https://www.nami.org/Your-Journey/Identity-and-Cultural-Dimensions/Latino-Mental-Health',
          type: 'article',
          ageAppropriate: false
        }
      ],
      'african-american': [
        {
          title: 'Black Mental Health Alliance',
          url: 'https://blackmentalhealth.com',
          type: 'article',
          ageAppropriate: false
        }
      ]
    };

    return culturalBackground.flatMap(bg => culturalResourceMap[bg.toLowerCase()] || []);
  }

  private addressSpecificConcerns(protocol: ParentGuidanceProtocol, concerns: string[]): ParentGuidanceProtocol {
    const concernSpecificGuidance: Record<string, string[]> = {
      'school-refusal': [
        'Work with school counselors to develop a gradual return plan',
        'Address any underlying anxiety about school performance or social situations'
      ],
      'sleep-issues': [
        'Establish consistent bedtime routines',
        'Consider if anxiety is interfering with sleep and address accordingly'
      ],
      'aggressive-behavior': [
        'Focus on teaching alternative ways to express frustration',
        'Consider if aggression is masking other emotions like sadness or fear'
      ]
    };

    const additionalGuidance = concerns.flatMap(concern => 
      concernSpecificGuidance[concern.toLowerCase()] || []
    );

    return {
      ...protocol,
      followUpActivities: [...protocol.followUpActivities, ...additionalGuidance]
    };
  }

  createParentNotification(
    type: ParentNotification['type'],
    session: TherapeuticSession,
    customMessage?: string
  ): ParentNotification {
    const protocol = this.protocols.get(session.pathwayId.split('-')[0] as TherapeuticCondition);
    
    const notificationTemplates: Record<ParentNotification['type'], (session: TherapeuticSession) => Partial<ParentNotification>> = {
      'progress_update': (s) => ({
        title: 'Therapeutic Session Update',
        message: customMessage || `Your child completed session ${s.sessionNumber}. They showed good engagement and made progress on their therapeutic goals.`,
        priority: 'medium' as const
      }),
      'concern_alert': (s) => ({
        title: 'Session Concern Alert',
        message: customMessage || `During today's session, we noticed some areas that may need additional attention. Please review the guidance provided.`,
        priority: 'high' as const,
        actionRequired: true
      }),
      'session_summary': (s) => ({
        title: 'Session Summary',
        message: customMessage || `Session ${s.sessionNumber} focused on building coping skills. Your child practiced new techniques and showed positive engagement.`,
        priority: 'low' as const
      }),
      'resource_recommendation': (s) => ({
        title: 'Recommended Resources',
        message: customMessage || `Based on your child's progress, we recommend some additional resources that may be helpful.`,
        priority: 'medium' as const,
        resources: protocol?.resourceLinks || []
      }),
      'crisis_alert': (s) => ({
        title: 'URGENT: Crisis Alert',
        message: customMessage || `We detected concerning indicators during your child's session. Please contact us immediately.`,
        priority: 'urgent' as const,
        actionRequired: true,
        resources: this.resourceLibrary.get('crisis') || []
      })
    };

    const template = notificationTemplates[type];
    const baseNotification = template(session);

    return {
      type,
      priority: baseNotification.priority || 'medium',
      title: baseNotification.title || 'Therapeutic Update',
      message: baseNotification.message || 'Update about your child\'s therapeutic session.',
      actionRequired: baseNotification.actionRequired || false,
      resources: baseNotification.resources || [],
      timestamp: new Date(),
      delivered: false
    };
  }

  getResourcesByCategory(category: string): ResourceLink[] {
    return this.resourceLibrary.get(category) || [];
  }

  addCustomResource(category: string, resource: ResourceLink): void {
    const existing = this.resourceLibrary.get(category) || [];
    existing.push(resource);
    this.resourceLibrary.set(category, existing);
  }

  validateGuidanceProtocol(protocol: ParentGuidanceProtocol): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!protocol.preStoryBriefing || protocol.preStoryBriefing.length < 50) {
      issues.push('Pre-story briefing is too short or missing');
    }

    if (!protocol.postStoryDiscussion || protocol.postStoryDiscussion.length < 3) {
      issues.push('Post-story discussion needs at least 3 discussion points');
    }

    if (!protocol.warningSignsToWatch || protocol.warningSignsToWatch.length < 3) {
      issues.push('Warning signs list needs at least 3 items');
    }

    if (!protocol.whenToSeekProfessionalHelp || protocol.whenToSeekProfessionalHelp.length < 3) {
      issues.push('Professional help criteria needs at least 3 items');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}