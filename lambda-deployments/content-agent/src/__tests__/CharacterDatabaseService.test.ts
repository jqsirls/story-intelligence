import { CharacterDatabaseService } from '../services/CharacterDatabaseService';
import { createClient } from '@supabase/supabase-js';
import { createLogger } from 'winston';

// Mock Supabase client
const mockSupabase = {
  rpc: jest.fn(),
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        limit: jest.fn(),
        range: jest.fn(),
        order: jest.fn(),
        gte: jest.fn(),
        lte: jest.fn(),
        not: jest.fn(),
        or: jest.fn(),
        neq: jest.fn(),
        ilike: jest.fn()
      }))
    }))
  }))
};

// Mock logger
const mockLogger = createLogger({
  level: 'error',
  silent: true
});

describe('CharacterDatabaseService', () => {
  let service: CharacterDatabaseService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CharacterDatabaseService(mockSupabase as any, mockLogger);
  });

  describe('createCharacter', () => {
    it('should create a character successfully', async () => {
      const mockCharacterId = 'char_123';
      const mockCharacter = {
        id: mockCharacterId,
        library_id: 'lib_123',
        name: 'Test Character',
        traits: {
          name: 'Test Character',
          age: 8,
          species: 'human',
          appearance: {
            eyeColor: 'blue',
            hairColor: 'brown'
          }
        },
        art_prompt: 'A friendly 8-year-old human with blue eyes and brown hair',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      // Mock the RPC call for creation
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockCharacterId,
        error: null
      });

      // Mock the select call for fetching the created character
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockCharacter,
            error: null
          })
        }))
      };
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect)
      });

      const request = {
        libraryId: 'lib_123',
        name: 'Test Character',
        traits: {
          name: 'Test Character',
          age: 8,
          species: 'human',
          appearance: {
            eyeColor: 'blue',
            hairColor: 'brown'
          }
        },
        artPrompt: 'A friendly 8-year-old human with blue eyes and brown hair'
      };

      const result = await service.createCharacter(request);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_character_in_library', {
        p_library_id: request.libraryId,
        p_name: request.name,
        p_traits: request.traits,
        p_art_prompt: request.artPrompt
      });

      expect(result).toEqual({
        id: mockCharacterId,
        libraryId: 'lib_123',
        name: 'Test Character',
        traits: mockCharacter.traits,
        artPrompt: 'A friendly 8-year-old human with blue eyes and brown hair',
        appearanceUrl: undefined,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should handle creation errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission denied' }
      });

      const request = {
        libraryId: 'lib_123',
        name: 'Test Character',
        traits: { name: 'Test Character', age: 8, species: 'human' }
      };

      await expect(service.createCharacter(request)).rejects.toThrow('Failed to create character: Permission denied');
    });
  });

  describe('getCharacter', () => {
    it('should retrieve a character successfully', async () => {
      const mockCharacter = {
        id: 'char_123',
        library_id: 'lib_123',
        name: 'Test Character',
        traits: { name: 'Test Character', age: 8, species: 'human' },
        art_prompt: 'Test prompt',
        appearance_url: 'https://example.com/image.jpg',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: mockCharacter,
            error: null
          })
        }))
      };
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect)
      });

      const result = await service.getCharacter('char_123');

      expect(result).toEqual({
        id: 'char_123',
        libraryId: 'lib_123',
        name: 'Test Character',
        traits: { name: 'Test Character', age: 8, species: 'human' },
        artPrompt: 'Test prompt',
        appearanceUrl: 'https://example.com/image.jpg',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      });
    });

    it('should return null for non-existent character', async () => {
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' } // No rows returned
          })
        }))
      };
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect)
      });

      const result = await service.getCharacter('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateCharacter', () => {
    it('should update a character successfully', async () => {
      const existingCharacter = {
        id: 'char_123',
        library_id: 'lib_123',
        name: 'Test Character',
        traits: { name: 'Test Character', age: 8, species: 'human' },
        art_prompt: 'Test prompt',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const updatedCharacter = {
        ...existingCharacter,
        name: 'Updated Character',
        traits: { ...existingCharacter.traits, age: 9 },
        updated_at: '2024-01-01T01:00:00Z'
      };

      // Mock getting existing character
      const mockSelect = {
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: existingCharacter,
            error: null
          })
        }))
      };
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockSelect)
      });

      // Mock the update RPC call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      // Mock getting updated character
      mockSelect.eq.mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: updatedCharacter,
          error: null
        })
      });

      const request = {
        characterId: 'char_123',
        name: 'Updated Character',
        traits: { age: 9 }
      };

      const result = await service.updateCharacter(request);

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_character', {
        p_character_id: 'char_123',
        p_name: 'Updated Character',
        p_traits: { name: 'Test Character', age: 9, species: 'human' },
        p_art_prompt: undefined,
        p_appearance_url: undefined
      });

      expect(result.name).toBe('Updated Character');
    });
  });

  describe('deleteCharacter', () => {
    it('should delete a character successfully', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: null
      });

      const result = await service.deleteCharacter('char_123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('delete_character', {
        p_character_id: 'char_123'
      });

      expect(result).toBe(true);
    });

    it('should handle deletion errors', async () => {
      mockSupabase.rpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Character not found' }
      });

      await expect(service.deleteCharacter('char_123')).rejects.toThrow('Failed to delete character: Character not found');
    });
  });

  describe('getLibraryCharacters', () => {
    it('should retrieve library characters successfully', async () => {
      const mockCharacters = [
        {
          id: 'char_1',
          name: 'Character 1',
          traits: { name: 'Character 1', age: 8, species: 'human' },
          art_prompt: 'Prompt 1',
          appearance_url: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'char_2',
          name: 'Character 2',
          traits: { name: 'Character 2', age: 10, species: 'animal' },
          art_prompt: 'Prompt 2',
          appearance_url: 'https://example.com/image2.jpg',
          created_at: '2024-01-01T01:00:00Z',
          updated_at: '2024-01-01T01:00:00Z'
        }
      ];

      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockCharacters,
        error: null
      });

      const result = await service.getLibraryCharacters('lib_123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_library_characters', {
        p_library_id: 'lib_123'
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Character 1');
      expect(result[1].name).toBe('Character 2');
    });
  });

  describe('searchCharacters', () => {
    it('should search characters with filters', async () => {
      const mockCharacters = [
        {
          id: 'char_1',
          library_id: 'lib_123',
          name: 'Human Character',
          traits: { name: 'Human Character', age: 8, species: 'human' },
          art_prompt: 'Human prompt',
          appearance_url: null,
          created_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockCharacters,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockQuery)
      });

      const options = {
        libraryId: 'lib_123',
        species: 'human',
        ageRange: { min: 5, max: 10 },
        limit: 10
      };

      const result = await service.searchCharacters(options);

      expect(mockQuery.eq).toHaveBeenCalledWith('library_id', 'lib_123');
      expect(mockQuery.eq).toHaveBeenCalledWith('traits->species', 'human');
      expect(mockQuery.gte).toHaveBeenCalledWith('traits->age', 5);
      expect(mockQuery.lte).toHaveBeenCalledWith('traits->age', 10);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Human Character');
    });
  });

  describe('isCharacterNameUnique', () => {
    it('should return true for unique name', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockQuery)
      });

      const result = await service.isCharacterNameUnique('lib_123', 'Unique Name');

      expect(result).toBe(true);
      expect(mockQuery.eq).toHaveBeenCalledWith('library_id', 'lib_123');
      expect(mockQuery.ilike).toHaveBeenCalledWith('name', 'Unique Name');
    });

    it('should return false for duplicate name', async () => {
      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockResolvedValue({
          data: [{ id: 'existing_char' }],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => mockQuery)
      });

      const result = await service.isCharacterNameUnique('lib_123', 'Duplicate Name');

      expect(result).toBe(false);
    });
  });

  describe('getLibraryCharacterStats', () => {
    it('should calculate character statistics', async () => {
      const mockCharacters = [
        {
          id: 'char_1',
          library_id: 'lib_123',
          name: 'Character 1',
          traits: {
            name: 'Character 1',
            age: 8,
            species: 'human',
            inclusivityTraits: [{ type: 'autism', description: 'Has autism' }]
          },
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: 'char_2',
          library_id: 'lib_123',
          name: 'Character 2',
          traits: {
            name: 'Character 2',
            age: 12,
            species: 'animal',
            inclusivityTraits: []
          },
          created_at: '2024-01-01T01:00:00Z'
        },
        {
          id: 'char_3',
          library_id: 'lib_123',
          name: 'Character 3',
          traits: {
            name: 'Character 3',
            age: 6,
            species: 'human'
          },
          created_at: '2024-01-01T02:00:00Z'
        }
      ];

      // Mock the getLibraryCharacters call
      mockSupabase.rpc.mockResolvedValueOnce({
        data: mockCharacters.map(char => ({
          id: char.id,
          name: char.name,
          traits: char.traits,
          art_prompt: null,
          appearance_url: null,
          created_at: char.created_at,
          updated_at: char.created_at
        })),
        error: null
      });

      const result = await service.getLibraryCharacterStats('lib_123');

      expect(result.totalCharacters).toBe(3);
      expect(result.speciesDistribution).toEqual({
        human: 2,
        animal: 1
      });
      expect(result.ageDistribution).toEqual({
        '4-6': 1,
        '7-9': 1,
        '10-12': 1
      });
      expect(result.inclusivityTraitsCount).toBe(1);
      expect(result.averageAge).toBe(9); // (8 + 12 + 6) / 3 = 8.67 rounded to 9
    });
  });
});