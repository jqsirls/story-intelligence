import { APLDocument, APLComponent } from '../types/alexa';
import { ConversationContext, ConversationPhase } from '@alexa-multi-agent/shared-types';
import { createLogger } from '../utils/logger';

export class APLRenderer {
  private logger = createLogger('apl-renderer');

  /**
   * Renders APL document based on conversation phase
   */
  async renderForPhase(
    phase: ConversationPhase,
    response: any,
    context: ConversationContext
  ): Promise<APLDocument> {
    try {
      switch (phase) {
        case 'character':
          return this.renderCharacterCreationAPL(response, context);
        case 'story':
          return this.renderStoryCreationAPL(response, context);
        case 'editing':
          return this.renderStoryEditingAPL(response, context);
        case 'finalization':
          return this.renderFinalizationAPL(response, context);
        default:
          return this.renderDefaultAPL(response, context);
      }
    } catch (error) {
      this.logger.error('Failed to render APL document', {
        phase,
        sessionId: context.sessionId,
        error: {
          name: error.name,
          message: error.message
        }
      });
      throw error;
    }
  }

  /**
   * Renders APL for character creation phase
   */
  private renderCharacterCreationAPL(response: any, context: ConversationContext): APLDocument {
    const characterData = response.characterData || {};
    
    return {
      type: 'APL',
      version: '1.8',
      document: {
        type: 'APL',
        version: '1.8',
        mainTemplate: {
          parameters: ['payload'],
          items: [
            {
              type: 'Container',
              width: '100vw',
              height: '100vh',
              direction: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                {
                  type: 'Text',
                  text: 'Creating Your Character',
                  fontSize: '48dp',
                  color: '#4A90E2',
                  textAlign: 'center',
                  fontWeight: 'bold'
                },
                {
                  type: 'Container',
                  width: '80vw',
                  height: '60vh',
                  direction: 'row',
                  alignItems: 'center',
                  justifyContent: 'spaceAround',
                  items: [
                    this.renderCharacterPreview(characterData),
                    this.renderCharacterTraits(characterData)
                  ]
                },
                {
                  type: 'Text',
                  text: response.speech || 'Tell me about your character...',
                  fontSize: '24dp',
                  color: '#333333',
                  textAlign: 'center',
                  maxLines: 3
                }
              ]
            }
          ]
        }
      },
      datasources: {
        characterData: characterData,
        sessionData: {
          sessionId: context.sessionId,
          phase: context.currentPhase
        }
      }
    };
  }

  /**
   * Renders APL for story creation phase
   */
  private renderStoryCreationAPL(response: any, context: ConversationContext): APLDocument {
    const storyData = response.storyData || {};
    
    return {
      type: 'APL',
      version: '1.8',
      document: {
        type: 'APL',
        version: '1.8',
        mainTemplate: {
          parameters: ['payload'],
          items: [
            {
              type: 'Container',
              width: '100vw',
              height: '100vh',
              direction: 'column',
              items: [
                {
                  type: 'Text',
                  text: 'Building Your Story',
                  fontSize: '40dp',
                  color: '#E74C3C',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  paddingTop: '20dp'
                },
                {
                  type: 'Container',
                  width: '90vw',
                  height: '70vh',
                  direction: 'column',
                  alignItems: 'center',
                  items: [
                    this.renderStoryProgress(storyData),
                    this.renderCurrentScene(storyData),
                    this.renderChoiceOptions(storyData.choices || [])
                  ]
                },
                {
                  type: 'Text',
                  text: response.speech || 'What happens next in your story?',
                  fontSize: '20dp',
                  color: '#333333',
                  textAlign: 'center',
                  maxLines: 2,
                  paddingBottom: '20dp'
                }
              ]
            }
          ]
        }
      },
      datasources: {
        storyData: storyData,
        sessionData: {
          sessionId: context.sessionId,
          phase: context.currentPhase
        }
      }
    };
  }

  /**
   * Renders APL for story editing phase
   */
  private renderStoryEditingAPL(response: any, context: ConversationContext): APLDocument {
    return {
      type: 'APL',
      version: '1.8',
      document: {
        type: 'APL',
        version: '1.8',
        mainTemplate: {
          parameters: ['payload'],
          items: [
            {
              type: 'Container',
              width: '100vw',
              height: '100vh',
              direction: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                {
                  type: 'Text',
                  text: 'Editing Your Story',
                  fontSize: '44dp',
                  color: '#F39C12',
                  textAlign: 'center',
                  fontWeight: 'bold'
                },
                {
                  type: 'Text',
                  text: 'You can say things like:',
                  fontSize: '24dp',
                  color: '#666666',
                  textAlign: 'center',
                  paddingTop: '40dp'
                },
                {
                  type: 'Container',
                  width: '80vw',
                  direction: 'column',
                  alignItems: 'center',
                  items: [
                    this.renderEditingSuggestion('"Change the character\'s name to..."'),
                    this.renderEditingSuggestion('"Make the story longer"'),
                    this.renderEditingSuggestion('"Add more adventure"'),
                    this.renderEditingSuggestion('"I\'m done editing"')
                  ]
                },
                {
                  type: 'Text',
                  text: response.speech || 'What would you like to change?',
                  fontSize: '20dp',
                  color: '#333333',
                  textAlign: 'center',
                  maxLines: 3,
                  paddingTop: '40dp'
                }
              ]
            }
          ]
        }
      }
    };
  }

  /**
   * Renders APL for finalization phase
   */
  private renderFinalizationAPL(response: any, context: ConversationContext): APLDocument {
    return {
      type: 'APL',
      version: '1.8',
      document: {
        type: 'APL',
        version: '1.8',
        mainTemplate: {
          parameters: ['payload'],
          items: [
            {
              type: 'Container',
              width: '100vw',
              height: '100vh',
              direction: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                {
                  type: 'Text',
                  text: '🎉 Story Complete! 🎉',
                  fontSize: '48dp',
                  color: '#27AE60',
                  textAlign: 'center',
                  fontWeight: 'bold'
                },
                {
                  type: 'Container',
                  width: '80vw',
                  height: '50vh',
                  direction: 'column',
                  alignItems: 'center',
                  justifyContent: 'spaceAround',
                  items: [
                    {
                      type: 'Text',
                      text: 'Your story is being prepared with:',
                      fontSize: '24dp',
                      color: '#333333',
                      textAlign: 'center'
                    },
                    this.renderAssetGenerationStatus(),
                    {
                      type: 'Text',
                      text: 'You can find your story in your library!',
                      fontSize: '20dp',
                      color: '#666666',
                      textAlign: 'center'
                    }
                  ]
                },
                {
                  type: 'Text',
                  text: response.speech || 'Your amazing story is ready!',
                  fontSize: '20dp',
                  color: '#333333',
                  textAlign: 'center',
                  maxLines: 3
                }
              ]
            }
          ]
        }
      }
    };
  }

  /**
   * Renders default APL when phase is unknown
   */
  private renderDefaultAPL(response: any, context: ConversationContext): APLDocument {
    return {
      type: 'APL',
      version: '1.8',
      document: {
        type: 'APL',
        version: '1.8',
        mainTemplate: {
          parameters: ['payload'],
          items: [
            {
              type: 'Container',
              width: '100vw',
              height: '100vh',
              direction: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              items: [
                {
                  type: 'Text',
                  text: 'Storytailor',
                  fontSize: '56dp',
                  color: '#8E44AD',
                  textAlign: 'center',
                  fontWeight: 'bold'
                },
                {
                  type: 'Text',
                  text: 'Let\'s create amazing stories together!',
                  fontSize: '28dp',
                  color: '#333333',
                  textAlign: 'center',
                  paddingTop: '40dp'
                },
                {
                  type: 'Text',
                  text: response.speech || 'What would you like to do?',
                  fontSize: '20dp',
                  color: '#666666',
                  textAlign: 'center',
                  maxLines: 3,
                  paddingTop: '60dp'
                }
              ]
            }
          ]
        }
      }
    };
  }

  /**
   * Helper: Renders character preview component
   */
  private renderCharacterPreview(characterData: any): APLComponent {
    return {
      type: 'Container',
      width: '40vw',
      height: '50vh',
      direction: 'column',
      alignItems: 'center',
      items: [
        {
          type: 'Image',
          source: characterData.imageUrl || 'https://via.placeholder.com/300x400?text=Character',
          width: '300dp',
          height: '400dp',
          scale: 'best-fit',
          align: 'center'
        },
        {
          type: 'Text',
          text: characterData.name || 'Your Character',
          fontSize: '24dp',
          color: '#333333',
          textAlign: 'center',
          fontWeight: 'bold',
          paddingTop: '10dp'
        }
      ]
    };
  }

  /**
   * Helper: Renders character traits list
   */
  private renderCharacterTraits(characterData: any): APLComponent {
    const traits = characterData.traits || {};
    
    return {
      type: 'Container',
      width: '40vw',
      direction: 'column',
      items: [
        {
          type: 'Text',
          text: 'Character Traits',
          fontSize: '28dp',
          color: '#4A90E2',
          fontWeight: 'bold',
          paddingBottom: '20dp'
        },
        ...Object.entries(traits).map(([key, value]) => ({
          type: 'Text',
          text: `${key}: ${value}`,
          fontSize: '18dp',
          color: '#333333',
          paddingBottom: '8dp'
        }))
      ]
    };
  }

  /**
   * Helper: Renders story progress indicator
   */
  private renderStoryProgress(storyData: any): APLComponent {
    const progress = storyData.progress || 0;
    
    return {
      type: 'Container',
      width: '80vw',
      height: '60dp',
      direction: 'row',
      alignItems: 'center',
      items: [
        {
          type: 'Text',
          text: 'Story Progress:',
          fontSize: '20dp',
          color: '#333333'
        },
        {
          type: 'Frame',
          width: '400dp',
          height: '20dp',
          backgroundColor: '#E0E0E0',
          borderRadius: '10dp',
          paddingLeft: '20dp',
          items: [
            {
              type: 'Frame',
              width: `${progress * 4}dp`,
              height: '20dp',
              backgroundColor: '#E74C3C',
              borderRadius: '10dp'
            }
          ]
        },
        {
          type: 'Text',
          text: `${Math.round(progress)}%`,
          fontSize: '18dp',
          color: '#666666',
          paddingLeft: '20dp'
        }
      ]
    };
  }

  /**
   * Helper: Renders current scene
   */
  private renderCurrentScene(storyData: any): APLComponent {
    return {
      type: 'Container',
      width: '80vw',
      height: '300dp',
      direction: 'column',
      alignItems: 'center',
      items: [
        {
          type: 'Image',
          source: storyData.sceneImage || 'https://via.placeholder.com/600x300?text=Story+Scene',
          width: '600dp',
          height: '200dp',
          scale: 'best-fit',
          align: 'center'
        },
        {
          type: 'Text',
          text: storyData.currentScene || 'Your story is unfolding...',
          fontSize: '18dp',
          color: '#333333',
          textAlign: 'center',
          maxLines: 3,
          paddingTop: '20dp'
        }
      ]
    };
  }

  /**
   * Helper: Renders choice options
   */
  private renderChoiceOptions(choices: string[]): APLComponent {
    if (!choices.length) {
      return { type: 'Container', items: [] };
    }

    return {
      type: 'Container',
      width: '80vw',
      direction: 'column',
      alignItems: 'center',
      items: [
        {
          type: 'Text',
          text: 'You can say:',
          fontSize: '20dp',
          color: '#666666',
          paddingBottom: '10dp'
        },
        ...choices.map((choice, index) => ({
          type: 'Text',
          text: `"${choice}"`,
          fontSize: '16dp',
          color: '#4A90E2',
          paddingBottom: '5dp'
        }))
      ]
    };
  }

  /**
   * Helper: Renders editing suggestion
   */
  private renderEditingSuggestion(suggestion: string): APLComponent {
    return {
      type: 'Text',
      text: suggestion,
      fontSize: '18dp',
      color: '#4A90E2',
      textAlign: 'center',
      paddingBottom: '15dp'
    };
  }

  /**
   * Helper: Renders asset generation status
   */
  private renderAssetGenerationStatus(): APLComponent {
    return {
      type: 'Container',
      width: '60vw',
      direction: 'column',
      alignItems: 'center',
      items: [
        {
          type: 'Text',
          text: '✓ Story illustrations',
          fontSize: '18dp',
          color: '#27AE60',
          paddingBottom: '8dp'
        },
        {
          type: 'Text',
          text: '✓ Audio narration',
          fontSize: '18dp',
          color: '#27AE60',
          paddingBottom: '8dp'
        },
        {
          type: 'Text',
          text: '✓ Fun activities',
          fontSize: '18dp',
          color: '#27AE60',
          paddingBottom: '8dp'
        },
        {
          type: 'Text',
          text: '✓ Printable book',
          fontSize: '18dp',
          color: '#27AE60',
          paddingBottom: '8dp'
        }
      ]
    };
  }
}