// src/utils/format.ts

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format token count to human-readable string
 */
export function formatTokens(tokens: number): string {
  if (tokens === 0) return '0 tokens';

  if (Math.abs(tokens) < 1000) {
    return `${tokens} tokens`;
  }

  if (Math.abs(tokens) < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K tokens`;
  }

  return `${(tokens / 1000000).toFixed(1)}M tokens`;
}
