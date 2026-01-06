/**
 * Multi-Child Library Manager
 * Handles voice-based child selection and library routing
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface ChildProfile {
  libraryId: string;
  firstName: string;
  avatarType?: string;
  createdAt: string;
}

export class MultiChildLibraryManager {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get all children for a family account
   */
  async getFamilyChildren(parentLibraryId: string): Promise<ChildProfile[]> {
    const { data: subLibraries, error } = await this.supabase
      .from('libraries')
      .select(`
        id,
        name,
        created_at,
        sub_library_avatars (
          avatar_type
        )
      `)
      .eq('parent_library', parentLibraryId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to get family children:', error);
      return [];
    }

    return (subLibraries || []).map(lib => ({
      libraryId: lib.id,
      firstName: lib.name,
      avatarType: (lib as any).sub_library_avatars?.[0]?.avatar_type,
      createdAt: lib.created_at
    }));
  }

  /**
   * Create disambiguation question for voice
   */
  createChildSelectionPrompt(children: ChildProfile[]): string {
    if (children.length === 0) {
      return "What's your child's first name? Let's create their library!";
    }

    if (children.length === 1) {
      return `Hi ${children[0].firstName}! Ready to create a story?`;
    }

    const names = children.map(c => c.firstName).join(', or ');
    return `Who are we creating a story for today: ${names}?`;
  }

  /**
   * Match user input to child (fuzzy matching for voice)
   */
  matchChildFromInput(input: string, children: ChildProfile[]): ChildProfile | null {
    const normalizedInput = input.toLowerCase().trim();
    
    // Exact match
    for (const child of children) {
      if (child.firstName.toLowerCase() === normalizedInput) {
        return child;
      }
    }

    // Partial match (for voice recognition errors)
    for (const child of children) {
      const name = child.firstName.toLowerCase();
      if (name.includes(normalizedInput) || normalizedInput.includes(name)) {
        return child;
      }
    }

    return null;
  }

  /**
   * Create new child library
   */
  async createChildLibrary(
    parentLibraryId: string,
    childFirstName: string,
    userId: string
  ): Promise<ChildProfile> {
    const { data: newLibrary, error } = await this.supabase
      .from('libraries')
      .insert({
        owner: userId,
        name: childFirstName,
        parent_library: parentLibraryId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create child library: ${error.message}`);
    }

    // Create default avatar for child
    await this.supabase
      .from('sub_library_avatars')
      .insert({
        library_id: newLibrary.id,
        avatar_type: 'character', // They'll create their own character
        avatar_data: { firstName: childFirstName }
      });

    return {
      libraryId: newLibrary.id,
      firstName: childFirstName,
      createdAt: newLibrary.created_at
    };
  }

  /**
   * Get active child context from session
   */
  getActiveChildFromSession(memoryState: any): string | null {
    return memoryState.activeChildLibraryId || memoryState.libraryId;
  }

  /**
   * Set active child in session
   */
  setActiveChild(memoryState: any, childLibraryId: string, childName: string): void {
    memoryState.activeChildLibraryId = childLibraryId;
    memoryState.activeChildName = childName;
  }

  /**
   * Check if input is attempting to switch children
   */
  isChildSwitchIntent(userInput: string): boolean {
    const switchPhrases = [
      'for emma',
      'for liam',
      'switch to',
      'change to',
      'make one for',
      'create for',
      "it's for"
    ];

    const normalized = userInput.toLowerCase();
    return switchPhrases.some(phrase => normalized.includes(phrase));
  }

  /**
   * Determine if we need to ask which child
   */
  async shouldAskWhichChild(
    parentLibraryId: string,
    memoryState: any
  ): Promise<boolean> {
    // Already have active child
    if (memoryState.activeChildLibraryId) {
      return false;
    }

    // Check how many children
    const children = await this.getFamilyChildren(parentLibraryId);
    
    // No children yet or only one - no need to ask
    if (children.length <= 1) {
      return false;
    }

    // Multiple children and no active selection
    return true;
  }
}

