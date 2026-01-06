import { SupabaseClient } from '@supabase/supabase-js';
import { RedisClientType } from 'redis';
import { Database } from '@alexa-multi-agent/shared-types';
import { 
  ExternalRecommendation,
  RecommendationFilter,
  InterestPattern,
  InterestCategory,
  RecommendationSource,
  AgeRange,
  InsightsConfig,
  ParentalNotification,
  NotificationType
} from '../types';

export class ExternalRecommendationService {
  constructor(
    private supabase: SupabaseClient<Database>,
    private redis: RedisClientType,
    private config: InsightsConfig
  ) {}

  async generateRecommendations(
    userId: string,
    interests: InterestPattern[],
    userAge?: number,
    filter?: RecommendationFilter
  ): Promise<ExternalRecommendation[]> {
    const recommendations: ExternalRecommendation[] = [];
    
    // Get user age if not provided
    const age = userAge || await this.getUserAge(userId);
    const ageRange: AgeRange = { min: Math.max(age - 2, 3), max: age + 2 };
    
    // Generate Amazon product recommendations
    if (this.config.external.amazon?.apiKey) {
      const amazonRecs = await this.getAmazonRecommendations(interests, ageRange, filter);
      recommendations.push(...amazonRecs);
    }
    
    // Generate educational resource recommendations
    const educationalRecs = await this.getEducationalRecommendations(interests, ageRange, filter);
    recommendations.push(...educationalRecs);
    
    // Generate library resource recommendations
    const libraryRecs = await this.getLibraryRecommendations(interests, ageRange, filter);
    recommendations.push(...libraryRecs);
    
    // Generate curated content recommendations
    const curatedRecs = await this.getCuratedRecommendations(interests, ageRange, filter);
    recommendations.push(...curatedRecs);
    
    // Filter and sort recommendations
    const filteredRecs = this.filterRecommendations(recommendations, filter);
    const scoredRecs = this.scoreRecommendations(filteredRecs, interests);
    
    return scoredRecs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20); // Limit to top 20 recommendations
  }

  async sendParentalNotification(
    userId: string,
    libraryId: string,
    type: NotificationType,
    title: string,
    message: string,
    insights: string[],
    recommendations: string[],
    severity: 'info' | 'attention' | 'concern' | 'urgent' = 'info'
  ): Promise<void> {
    // Create notification record
    const notification: Omit<ParentalNotification, 'id' | 'createdAt'> = {
      userId,
      libraryId,
      type,
      severity,
      title,
      message,
      insights,
      recommendations,
      actionRequired: severity === 'urgent' || severity === 'concern'
    };

    // Store notification in database
    await this.storeNotification(notification);
    
    // Send email notification if enabled and configured
    if (this.config.notifications.enabled && this.config.notifications.emailService) {
      await this.sendEmailNotification(userId, notification);
    }
  }

  private async getUserAge(userId: string): Promise<number> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('age')
      .eq('id', userId)
      .single();
    
    if (error || !user?.age) {
      return 8; // Default age if not found
    }
    
    return user.age;
  }

  private async getAmazonRecommendations(
    interests: InterestPattern[],
    ageRange: AgeRange,
    filter?: RecommendationFilter
  ): Promise<ExternalRecommendation[]> {
    const recommendations: ExternalRecommendation[] = [];
    
    // This would integrate with Amazon Product Advertising API
    // For now, return mock recommendations based on interests
    
    for (const interest of interests.slice(0, 5)) { // Limit to top 5 interests
      const mockProducts = this.getMockAmazonProducts(interest.category, ageRange);
      
      for (const product of mockProducts) {
        recommendations.push({
          id: `amazon-${interest.category}-${product.id}`,
          type: 'product',
          title: product.title,
          description: product.description,
          url: product.url,
          price: product.price,
          ageRange,
          relevanceScore: interest.confidence * 0.8, // Base score from interest confidence
          basedOnInterests: [interest.category],
          source: 'amazon',
          metadata: {
            category: interest.category,
            keywords: interest.keywords.slice(0, 3),
            amazonASIN: product.asin,
            rating: product.rating,
            reviewCount: product.reviewCount
          }
        });
      }
    }
    
    return recommendations;
  }

  private getMockAmazonProducts(category: InterestCategory, ageRange: AgeRange): any[] {
    const productMap: Record<InterestCategory, any[]> = {
      sports: [
        {
          id: 'soccer-ball-001',
          asin: 'B08XYZ123',
          title: 'Youth Soccer Ball - Size 3',
          description: 'Perfect soccer ball for young players learning the game',
          url: 'https://amazon.com/dp/B08XYZ123',
          price: 19.99,
          rating: 4.5,
          reviewCount: 1250
        },
        {
          id: 'basketball-hoop-001',
          asin: 'B09ABC456',
          title: 'Adjustable Basketball Hoop for Kids',
          description: 'Height-adjustable basketball hoop perfect for developing skills',
          url: 'https://amazon.com/dp/B09ABC456',
          price: 89.99,
          rating: 4.3,
          reviewCount: 890
        }
      ],
      animals: [
        {
          id: 'animal-encyclopedia-001',
          asin: 'B07DEF789',
          title: 'National Geographic Kids Animal Encyclopedia',
          description: 'Comprehensive guide to animals around the world',
          url: 'https://amazon.com/dp/B07DEF789',
          price: 12.99,
          rating: 4.7,
          reviewCount: 2100
        },
        {
          id: 'stuffed-animal-001',
          asin: 'B06GHI012',
          title: 'Realistic Stuffed Dog Plush Toy',
          description: 'Soft and cuddly realistic dog plush for animal lovers',
          url: 'https://amazon.com/dp/B06GHI012',
          price: 24.99,
          rating: 4.6,
          reviewCount: 1580
        }
      ],
      science: [
        {
          id: 'microscope-kit-001',
          asin: 'B05JKL345',
          title: 'Kids Microscope Science Kit',
          description: 'Complete microscope kit with slides and specimens',
          url: 'https://amazon.com/dp/B05JKL345',
          price: 49.99,
          rating: 4.4,
          reviewCount: 920
        },
        {
          id: 'chemistry-set-001',
          asin: 'B04MNO678',
          title: 'Safe Chemistry Experiment Set',
          description: 'Age-appropriate chemistry experiments for young scientists',
          url: 'https://amazon.com/dp/B04MNO678',
          price: 34.99,
          rating: 4.2,
          reviewCount: 750
        }
      ],
      art: [
        {
          id: 'art-supplies-001',
          asin: 'B03PQR901',
          title: 'Complete Kids Art Supply Kit',
          description: 'Everything needed for creative art projects',
          url: 'https://amazon.com/dp/B03PQR901',
          price: 29.99,
          rating: 4.5,
          reviewCount: 1340
        }
      ],
      music: [
        {
          id: 'keyboard-001',
          asin: 'B02STU234',
          title: 'Kids Electronic Keyboard Piano',
          description: 'Perfect first keyboard for young musicians',
          url: 'https://amazon.com/dp/B02STU234',
          price: 79.99,
          rating: 4.3,
          reviewCount: 680
        }
      ],
      technology: [
        {
          id: 'coding-game-001',
          asin: 'B01VWX567',
          title: 'Screen-Free Coding Board Game',
          description: 'Learn programming concepts without screens',
          url: 'https://amazon.com/dp/B01VWX567',
          price: 39.99,
          rating: 4.6,
          reviewCount: 1120
        }
      ],
      nature: [
        {
          id: 'nature-explorer-001',
          asin: 'B00YZA890',
          title: 'Nature Explorer Kit with Magnifying Glass',
          description: 'Complete kit for outdoor nature exploration',
          url: 'https://amazon.com/dp/B00YZA890',
          price: 22.99,
          rating: 4.4,
          reviewCount: 890
        }
      ],
      adventure: [
        {
          id: 'adventure-book-001',
          asin: 'B99BCD123',
          title: 'Choose Your Own Adventure Book Series',
          description: 'Interactive adventure books for young readers',
          url: 'https://amazon.com/dp/B99BCD123',
          price: 8.99,
          rating: 4.7,
          reviewCount: 2300
        }
      ],
      fantasy: [
        {
          id: 'fantasy-costume-001',
          asin: 'B98EFG456',
          title: 'Dragon Knight Costume Set',
          description: 'Complete fantasy costume for imaginative play',
          url: 'https://amazon.com/dp/B98EFG456',
          price: 34.99,
          rating: 4.5,
          reviewCount: 670
        }
      ],
      friendship: [
        {
          id: 'friendship-book-001',
          asin: 'B97HIJ789',
          title: 'Books About Friendship for Kids',
          description: 'Stories that teach the value of friendship',
          url: 'https://amazon.com/dp/B97HIJ789',
          price: 11.99,
          rating: 4.8,
          reviewCount: 1890
        }
      ],
      family: [
        {
          id: 'family-game-001',
          asin: 'B96KLM012',
          title: 'Family Board Game Night Collection',
          description: 'Games perfect for family bonding time',
          url: 'https://amazon.com/dp/B96KLM012',
          price: 45.99,
          rating: 4.6,
          reviewCount: 1450
        }
      ],
      learning: [
        {
          id: 'educational-tablet-001',
          asin: 'B95NOP345',
          title: 'Kids Educational Learning Tablet',
          description: 'Interactive learning tablet with educational games',
          url: 'https://amazon.com/dp/B95NOP345',
          price: 129.99,
          rating: 4.2,
          reviewCount: 980
        }
      ],
      creativity: [
        {
          id: 'craft-kit-001',
          asin: 'B94QRS678',
          title: 'Ultimate Craft Kit for Kids',
          description: 'Hundreds of craft supplies for creative projects',
          url: 'https://amazon.com/dp/B94QRS678',
          price: 39.99,
          rating: 4.4,
          reviewCount: 1230
        }
      ]
    };
    
    return productMap[category] || [];
  }

  private async getEducationalRecommendations(
    interests: InterestPattern[],
    ageRange: AgeRange,
    filter?: RecommendationFilter
  ): Promise<ExternalRecommendation[]> {
    const recommendations: ExternalRecommendation[] = [];
    
    // Generate educational resource recommendations based on interests
    for (const interest of interests.slice(0, 3)) {
      const educationalResources = this.getEducationalResources(interest.category, ageRange);
      
      for (const resource of educationalResources) {
        recommendations.push({
          id: `edu-${interest.category}-${resource.id}`,
          type: 'educational_resource',
          title: resource.title,
          description: resource.description,
          url: resource.url,
          ageRange,
          relevanceScore: interest.confidence * 0.9, // Higher score for educational content
          basedOnInterests: [interest.category],
          source: 'educational_sites',
          metadata: {
            category: interest.category,
            subject: resource.subject,
            difficulty: resource.difficulty,
            duration: resource.duration
          }
        });
      }
    }
    
    return recommendations;
  }

  private getEducationalResources(category: InterestCategory, ageRange: AgeRange): any[] {
    const resourceMap: Record<InterestCategory, any[]> = {
      science: [
        {
          id: 'khan-science-001',
          title: 'Khan Academy Kids Science',
          description: 'Interactive science lessons and experiments',
          url: 'https://www.khanacademy.org/kids',
          subject: 'Science',
          difficulty: 'Beginner',
          duration: '15-30 minutes'
        },
        {
          id: 'nasa-kids-001',
          title: 'NASA Kids Club',
          description: 'Space science activities and games',
          url: 'https://www.nasa.gov/audience/forkids/',
          subject: 'Space Science',
          difficulty: 'Intermediate',
          duration: '20-45 minutes'
        }
      ],
      animals: [
        {
          id: 'natgeo-animals-001',
          title: 'National Geographic Kids Animals',
          description: 'Animal facts, videos, and interactive content',
          url: 'https://kids.nationalgeographic.com/animals/',
          subject: 'Biology',
          difficulty: 'Beginner',
          duration: '10-25 minutes'
        }
      ],
      art: [
        {
          id: 'art-kids-001',
          title: 'Art for Kids Hub',
          description: 'Step-by-step drawing tutorials',
          url: 'https://www.artforkidshub.com/',
          subject: 'Visual Arts',
          difficulty: 'Beginner',
          duration: '15-30 minutes'
        }
      ],
      technology: [
        {
          id: 'scratch-coding-001',
          title: 'Scratch Programming',
          description: 'Visual programming language for kids',
          url: 'https://scratch.mit.edu/',
          subject: 'Computer Science',
          difficulty: 'Beginner',
          duration: '30-60 minutes'
        }
      ],
      learning: [
        {
          id: 'commonlit-001',
          title: 'CommonLit Reading Passages',
          description: 'Age-appropriate reading comprehension',
          url: 'https://www.commonlit.org/',
          subject: 'Reading',
          difficulty: 'Various',
          duration: '20-40 minutes'
        },
        {
          id: 'readworks-001',
          title: 'ReadWorks Comprehension',
          description: 'Research-based reading comprehension',
          url: 'https://www.readworks.org/',
          subject: 'Reading',
          difficulty: 'Various',
          duration: '15-35 minutes'
        }
      ],
      sports: [
        {
          id: 'pe-central-001',
          title: 'PE Central Activities',
          description: 'Physical education games and activities',
          url: 'https://www.pecentral.org/',
          subject: 'Physical Education',
          difficulty: 'Various',
          duration: '20-45 minutes'
        }
      ],
      music: [
        {
          id: 'music-theory-001',
          title: 'Music Theory for Kids',
          description: 'Interactive music theory lessons',
          url: 'https://www.musictheory.net/',
          subject: 'Music',
          difficulty: 'Beginner',
          duration: '15-30 minutes'
        }
      ],
      nature: [
        {
          id: 'nature-watch-001',
          title: 'Nature Watch Activities',
          description: 'Outdoor nature observation activities',
          url: 'https://www.naturewatch.ca/',
          subject: 'Environmental Science',
          difficulty: 'Beginner',
          duration: '30-60 minutes'
        }
      ],
      adventure: [
        {
          id: 'adventure-edu-001',
          title: 'Adventure Education Resources',
          description: 'Outdoor adventure learning activities',
          url: 'https://www.adventureeducation.org/',
          subject: 'Outdoor Education',
          difficulty: 'Intermediate',
          duration: '45-90 minutes'
        }
      ],
      fantasy: [
        {
          id: 'mythology-001',
          title: 'World Mythology for Kids',
          description: 'Stories and lessons from world mythologies',
          url: 'https://www.mythologyteacher.com/',
          subject: 'Literature',
          difficulty: 'Intermediate',
          duration: '20-40 minutes'
        }
      ],
      friendship: [
        {
          id: 'social-skills-001',
          title: 'Social Skills Activities',
          description: 'Activities to develop friendship skills',
          url: 'https://www.socialskillscentral.com/',
          subject: 'Social Studies',
          difficulty: 'Beginner',
          duration: '15-30 minutes'
        }
      ],
      family: [
        {
          id: 'family-studies-001',
          title: 'Family Studies Resources',
          description: 'Understanding family structures and relationships',
          url: 'https://www.familystudies.org/',
          subject: 'Social Studies',
          difficulty: 'Beginner',
          duration: '20-35 minutes'
        }
      ],
      creativity: [
        {
          id: 'creative-writing-001',
          title: 'Creative Writing Prompts',
          description: 'Story starters and writing exercises',
          url: 'https://www.creativewritingforkids.com/',
          subject: 'Language Arts',
          difficulty: 'Various',
          duration: '25-45 minutes'
        }
      ]
    };
    
    return resourceMap[category] || [];
  }

  private async getLibraryRecommendations(
    interests: InterestPattern[],
    ageRange: AgeRange,
    filter?: RecommendationFilter
  ): Promise<ExternalRecommendation[]> {
    const recommendations: ExternalRecommendation[] = [];
    
    // Generate library resource recommendations
    for (const interest of interests.slice(0, 3)) {
      const libraryResources = this.getLibraryResources(interest.category, ageRange);
      
      for (const resource of libraryResources) {
        recommendations.push({
          id: `library-${interest.category}-${resource.id}`,
          type: 'book',
          title: resource.title,
          description: resource.description,
          ageRange,
          relevanceScore: interest.confidence * 0.85,
          basedOnInterests: [interest.category],
          source: 'library_resources',
          metadata: {
            category: interest.category,
            author: resource.author,
            isbn: resource.isbn,
            readingLevel: resource.readingLevel,
            genre: resource.genre
          }
        });
      }
    }
    
    return recommendations;
  }

  private getLibraryResources(category: InterestCategory, ageRange: AgeRange): any[] {
    const bookMap: Record<InterestCategory, any[]> = {
      animals: [
        {
          id: 'where-red-fern-grows',
          title: 'Where the Red Fern Grows',
          description: 'A boy and his hunting dogs in the Ozark Mountains',
          author: 'Wilson Rawls',
          isbn: '9780553274295',
          readingLevel: 'Grade 4-6',
          genre: 'Adventure'
        },
        {
          id: 'charlotte-web',
          title: "Charlotte's Web",
          description: 'The friendship between a pig and a spider',
          author: 'E.B. White',
          isbn: '9780064400558',
          readingLevel: 'Grade 3-5',
          genre: 'Fantasy'
        }
      ],
      adventure: [
        {
          id: 'hatchet',
          title: 'Hatchet',
          description: 'A boy survives alone in the Canadian wilderness',
          author: 'Gary Paulsen',
          isbn: '9781416936473',
          readingLevel: 'Grade 5-7',
          genre: 'Adventure'
        },
        {
          id: 'island-blue-dolphins',
          title: 'Island of the Blue Dolphins',
          description: 'A girl stranded alone on an island',
          author: 'Scott O\'Dell',
          isbn: '9780547328614',
          readingLevel: 'Grade 4-6',
          genre: 'Adventure'
        }
      ],
      science: [
        {
          id: 'magic-school-bus',
          title: 'The Magic School Bus Series',
          description: 'Educational adventures with Ms. Frizzle',
          author: 'Joanna Cole',
          isbn: '9780590414272',
          readingLevel: 'Grade 2-4',
          genre: 'Educational'
        }
      ],
      fantasy: [
        {
          id: 'harry-potter-stone',
          title: "Harry Potter and the Sorcerer's Stone",
          description: 'A young wizard discovers his magical heritage',
          author: 'J.K. Rowling',
          isbn: '9780439708180',
          readingLevel: 'Grade 4-6',
          genre: 'Fantasy'
        },
        {
          id: 'chronicles-narnia',
          title: 'The Lion, the Witch and the Wardrobe',
          description: 'Children discover a magical world in a wardrobe',
          author: 'C.S. Lewis',
          isbn: '9780064404990',
          readingLevel: 'Grade 3-5',
          genre: 'Fantasy'
        }
      ],
      friendship: [
        {
          id: 'bridge-terabithia',
          title: 'Bridge to Terabithia',
          description: 'A friendship that creates an imaginary kingdom',
          author: 'Katherine Paterson',
          isbn: '9780064401845',
          readingLevel: 'Grade 4-6',
          genre: 'Realistic Fiction'
        }
      ],
      family: [
        {
          id: 'little-house-prairie',
          title: 'Little House on the Prairie',
          description: 'Pioneer family life in the American frontier',
          author: 'Laura Ingalls Wilder',
          isbn: '9780064400022',
          readingLevel: 'Grade 3-5',
          genre: 'Historical Fiction'
        }
      ],
      creativity: [
        {
          id: 'art-attack',
          title: 'Art Attack: The Ultimate Art Activity Book',
          description: 'Creative art projects and activities',
          author: 'Neil Buchanan',
          isbn: '9780789434567',
          readingLevel: 'Grade 2-6',
          genre: 'Activity'
        }
      ],
      music: [
        {
          id: 'music-kids',
          title: 'The Story of Music for Kids',
          description: 'Introduction to music history and instruments',
          author: 'Meredith Hamilton',
          isbn: '9781633223691',
          readingLevel: 'Grade 3-6',
          genre: 'Educational'
        }
      ],
      technology: [
        {
          id: 'coding-kids',
          title: 'Coding Games in Scratch',
          description: 'Learn programming through game creation',
          author: 'Jon Woodcock',
          isbn: '9781465439352',
          readingLevel: 'Grade 4-8',
          genre: 'Educational'
        }
      ],
      nature: [
        {
          id: 'my-side-mountain',
          title: 'My Side of the Mountain',
          description: 'A boy learns to survive in the wilderness',
          author: 'Jean Craighead George',
          isbn: '9780141312422',
          readingLevel: 'Grade 4-6',
          genre: 'Adventure'
        }
      ],
      sports: [
        {
          id: 'mike-lupica-series',
          title: 'Heat',
          description: 'A young baseball player chases his dreams',
          author: 'Mike Lupica',
          isbn: '9780142407578',
          readingLevel: 'Grade 4-7',
          genre: 'Sports Fiction'
        }
      ],
      learning: [
        {
          id: 'brain-quest',
          title: 'Brain Quest Grade 3',
          description: 'Educational questions and activities',
          author: 'Chris Welles Feder',
          isbn: '9780761149149',
          readingLevel: 'Grade 3',
          genre: 'Educational'
        }
      ]
    };
    
    return bookMap[category] || [];
  }

  private async getCuratedRecommendations(
    interests: InterestPattern[],
    ageRange: AgeRange,
    filter?: RecommendationFilter
  ): Promise<ExternalRecommendation[]> {
    const recommendations: ExternalRecommendation[] = [];
    
    // Generate curated activity recommendations
    for (const interest of interests.slice(0, 3)) {
      const activities = this.getCuratedActivities(interest.category, ageRange);
      
      for (const activity of activities) {
        recommendations.push({
          id: `curated-${interest.category}-${activity.id}`,
          type: 'activity',
          title: activity.title,
          description: activity.description,
          ageRange,
          relevanceScore: interest.confidence * 0.75,
          basedOnInterests: [interest.category],
          source: 'curated_content',
          metadata: {
            category: interest.category,
            duration: activity.duration,
            materials: activity.materials,
            difficulty: activity.difficulty,
            location: activity.location
          }
        });
      }
    }
    
    return recommendations;
  }

  private getCuratedActivities(category: InterestCategory, ageRange: AgeRange): any[] {
    const activityMap: Record<InterestCategory, any[]> = {
      science: [
        {
          id: 'volcano-experiment',
          title: 'Baking Soda Volcano Experiment',
          description: 'Create a safe volcanic eruption using household items',
          duration: '30 minutes',
          materials: ['Baking soda', 'Vinegar', 'Food coloring', 'Dish soap'],
          difficulty: 'Easy',
          location: 'Indoor/Outdoor'
        },
        {
          id: 'crystal-growing',
          title: 'Grow Your Own Crystals',
          description: 'Learn about crystallization by growing salt crystals',
          duration: '3-7 days',
          materials: ['Salt', 'Hot water', 'String', 'Food coloring'],
          difficulty: 'Medium',
          location: 'Indoor'
        }
      ],
      art: [
        {
          id: 'nature-collage',
          title: 'Nature Collage Art',
          description: 'Create beautiful art using natural materials',
          duration: '45 minutes',
          materials: ['Leaves', 'Flowers', 'Glue', 'Paper', 'Scissors'],
          difficulty: 'Easy',
          location: 'Indoor'
        },
        {
          id: 'rock-painting',
          title: 'Rock Painting Adventure',
          description: 'Paint rocks to create garden decorations or gifts',
          duration: '60 minutes',
          materials: ['Smooth rocks', 'Acrylic paint', 'Brushes', 'Sealant'],
          difficulty: 'Easy',
          location: 'Indoor/Outdoor'
        }
      ],
      cooking: [
        {
          id: 'no-bake-cookies',
          title: 'No-Bake Chocolate Cookies',
          description: 'Make delicious cookies without using an oven',
          duration: '20 minutes',
          materials: ['Oats', 'Cocoa powder', 'Sugar', 'Butter', 'Milk'],
          difficulty: 'Easy',
          location: 'Kitchen'
        }
      ],
      nature: [
        {
          id: 'nature-scavenger-hunt',
          title: 'Backyard Nature Scavenger Hunt',
          description: 'Explore nature by finding specific items outdoors',
          duration: '45 minutes',
          materials: ['Scavenger hunt list', 'Collection bag', 'Magnifying glass'],
          difficulty: 'Easy',
          location: 'Outdoor'
        },
        {
          id: 'bird-watching',
          title: 'Beginner Bird Watching',
          description: 'Learn to identify common birds in your area',
          duration: '60 minutes',
          materials: ['Bird identification guide', 'Binoculars', 'Notebook'],
          difficulty: 'Medium',
          location: 'Outdoor'
        }
      ],
      sports: [
        {
          id: 'obstacle-course',
          title: 'Backyard Obstacle Course',
          description: 'Create a fun physical challenge course',
          duration: '90 minutes',
          materials: ['Cones', 'Jump rope', 'Hula hoops', 'Balls'],
          difficulty: 'Medium',
          location: 'Outdoor'
        }
      ],
      music: [
        {
          id: 'homemade-instruments',
          title: 'Make Musical Instruments',
          description: 'Create instruments from household items',
          duration: '60 minutes',
          materials: ['Empty containers', 'Rice', 'Rubber bands', 'Cardboard'],
          difficulty: 'Medium',
          location: 'Indoor'
        }
      ],
      technology: [
        {
          id: 'simple-coding',
          title: 'Unplugged Coding Activities',
          description: 'Learn programming concepts without computers',
          duration: '45 minutes',
          materials: ['Paper', 'Pencils', 'Activity sheets'],
          difficulty: 'Medium',
          location: 'Indoor'
        }
      ],
      adventure: [
        {
          id: 'treasure-hunt',
          title: 'Neighborhood Treasure Hunt',
          description: 'Follow clues to find hidden treasure',
          duration: '90 minutes',
          materials: ['Clue cards', 'Small prizes', 'Map'],
          difficulty: 'Medium',
          location: 'Outdoor'
        }
      ],
      creativity: [
        {
          id: 'story-writing',
          title: 'Create Your Own Comic Book',
          description: 'Write and illustrate an original comic story',
          duration: '120 minutes',
          materials: ['Paper', 'Colored pencils', 'Markers', 'Ruler'],
          difficulty: 'Medium',
          location: 'Indoor'
        }
      ],
      friendship: [
        {
          id: 'friendship-bracelet',
          title: 'Make Friendship Bracelets',
          description: 'Create colorful bracelets to share with friends',
          duration: '45 minutes',
          materials: ['Embroidery thread', 'Scissors', 'Tape'],
          difficulty: 'Easy',
          location: 'Indoor'
        }
      ],
      family: [
        {
          id: 'family-game-night',
          title: 'Design Your Own Board Game',
          description: 'Create a custom board game for family fun',
          duration: '180 minutes',
          materials: ['Cardboard', 'Markers', 'Dice', 'Game pieces'],
          difficulty: 'Hard',
          location: 'Indoor'
        }
      ],
      fantasy: [
        {
          id: 'fairy-garden',
          title: 'Build a Fairy Garden',
          description: 'Create a magical miniature garden',
          duration: '90 minutes',
          materials: ['Small plants', 'Tiny decorations', 'Soil', 'Container'],
          difficulty: 'Medium',
          location: 'Indoor/Outdoor'
        }
      ],
      learning: [
        {
          id: 'science-journal',
          title: 'Start a Nature Science Journal',
          description: 'Document observations about the natural world',
          duration: 'Ongoing',
          materials: ['Notebook', 'Colored pencils', 'Ruler', 'Magnifying glass'],
          difficulty: 'Easy',
          location: 'Indoor/Outdoor'
        }
      ]
    };
    
    return activityMap[category] || [];
  }

  private filterRecommendations(
    recommendations: ExternalRecommendation[],
    filter?: RecommendationFilter
  ): ExternalRecommendation[] {
    if (!filter) return recommendations;
    
    return recommendations.filter(rec => {
      // Filter by minimum relevance score
      if (rec.relevanceScore < filter.minRelevanceScore) return false;
      
      // Filter by maximum price
      if (filter.maxPrice && rec.price && rec.price > filter.maxPrice) return false;
      
      // Filter by age range
      if (filter.ageRange) {
        const overlap = !(rec.ageRange.max < filter.ageRange.min || rec.ageRange.min > filter.ageRange.max);
        if (!overlap) return false;
      }
      
      // Filter by categories
      if (filter.categories && filter.categories.length > 0) {
        const hasMatchingCategory = rec.basedOnInterests.some(interest => 
          filter.categories!.includes(interest as InterestCategory)
        );
        if (!hasMatchingCategory) return false;
      }
      
      // Filter by sources
      if (filter.sources && filter.sources.length > 0) {
        if (!filter.sources.includes(rec.source)) return false;
      }
      
      return true;
    });
  }

  private scoreRecommendations(
    recommendations: ExternalRecommendation[],
    interests: InterestPattern[]
  ): ExternalRecommendation[] {
    // Create interest strength map
    const interestStrengthMap = new Map<InterestCategory, number>();
    for (const interest of interests) {
      interestStrengthMap.set(interest.category, interest.confidence);
    }
    
    // Adjust relevance scores based on interest patterns
    for (const rec of recommendations) {
      let adjustedScore = rec.relevanceScore;
      
      // Boost score for strong interests
      for (const interestCategory of rec.basedOnInterests) {
        const interestStrength = interestStrengthMap.get(interestCategory as InterestCategory) || 0;
        adjustedScore += interestStrength * 0.2;
      }
      
      // Boost educational content
      if (rec.source === 'educational_sites') {
        adjustedScore += 0.1;
      }
      
      // Boost age-appropriate content
      const ageAppropriateBoost = this.calculateAgeAppropriatenessBoost(rec);
      adjustedScore += ageAppropriateBoost;
      
      rec.relevanceScore = Math.min(adjustedScore, 1); // Cap at 1.0
    }
    
    return recommendations;
  }

  private calculateAgeAppropriatenessBoost(rec: ExternalRecommendation): number {
    // This would calculate how well the recommendation matches the user's age
    // For now, return a small boost for all recommendations
    return 0.05;
  }

  private async storeNotification(notification: Omit<ParentalNotification, 'id' | 'createdAt'>): Promise<void> {
    // Store notification in a notifications table (would need to be added to schema)
    // For now, just log the notification
    console.log('Parental Notification:', {
      ...notification,
      id: `notif-${Date.now()}`,
      createdAt: new Date().toISOString()
    });
  }

  private async sendEmailNotification(
    userId: string,
    notification: Omit<ParentalNotification, 'id' | 'createdAt'>
  ): Promise<void> {
    // Get user email
    const { data: user } = await this.supabase
      .from('users')
      .select('email, parent_email')
      .eq('id', userId)
      .single();
    
    if (!user) return;
    
    const emailAddress = user.parent_email || user.email;
    if (!emailAddress) return;
    
    // This would integrate with SendGrid or similar email service
    // For now, just log the email that would be sent
    console.log('Email Notification:', {
      to: emailAddress,
      subject: `Storytailor Insights: ${notification.title}`,
      body: `
        ${notification.message}
        
        Insights:
        ${notification.insights.map(insight => `• ${insight}`).join('\n')}
        
        Recommendations:
        ${notification.recommendations.map(rec => `• ${rec}`).join('\n')}
        
        Severity: ${notification.severity}
        Action Required: ${notification.actionRequired ? 'Yes' : 'No'}
      `
    });
  }
}