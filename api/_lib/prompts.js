import fs from 'fs';
import path from 'path';

/**
 * .agent/agents/*.md 파일들을 읽어와서 에이전트명: 프롬프트 맵으로 반환합니다.
 */
export function loadAgentPrompts() {
  const promptsDir = path.join(process.cwd(), '.agent', 'agents');
  const agentPromptsMap = {};

  try {
    const files = fs.readdirSync(promptsDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const agentName = file.replace('.md', '');
        const content = fs.readFileSync(path.join(promptsDir, file), 'utf8');
        agentPromptsMap[agentName] = content;
      }
    });
  } catch (err) {
    console.error('[Prompts] Failed to load agent prompts:', err);
  }

  return agentPromptsMap;
}
