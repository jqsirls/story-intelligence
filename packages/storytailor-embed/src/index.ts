/**
 * Storytailor Embed - Main Entry Point
 * Beautiful, responsive chat/voice interface for any website
 */

export { StorytalorEmbed, type StorytalorEmbedConfig, type Story, type ChatMessage } from './StorytalorEmbed';

// Re-export components for advanced usage
export { ChatInterface } from './components/ChatInterface';
export { StoryReader } from './components/StoryReader';
export { DesignTokens } from './theme/DesignTokens';

// Default export for UMD builds
import StorytalorEmbed from './StorytalorEmbed';
export default StorytalorEmbed;