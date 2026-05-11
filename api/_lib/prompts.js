import fs from 'fs';
import path from 'path';

/**
 * api/_prompts/report-agents/*.md 파일들을 읽어와서 에이전트명: 프롬프트 맵으로 반환합니다.
 */
export function loadAgentPrompts() {
  const promptsDir = path.join(process.cwd(), 'api', '_prompts', 'report-agents');
  const agentPromptsMap = {};

  const REQUIRED_AGENTS = [
    'resolver',
    'analyst-financial',
    'analyst-strategy',
    'analyst-news',
    'critic',
    'composer'
  ];

  try {
    if (!fs.existsSync(promptsDir)) {
      throw new Error(`Prompts directory not found: ${promptsDir}`);
    }

    const files = fs.readdirSync(promptsDir);
    files.forEach(file => {
      if (file.endsWith('.md')) {
        const agentName = file.replace('.md', '');
        const content = fs.readFileSync(path.join(promptsDir, file), 'utf8');
        agentPromptsMap[agentName] = content;
      }
    });

    // 필수 에이전트 검증
    const missingAgents = REQUIRED_AGENTS.filter(name => !agentPromptsMap[name]);
    if (missingAgents.length > 0) {
      const errorMsg = `[Prompts] Missing required report agents: ${missingAgents.join(', ')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }

  } catch (err) {
    console.error('[Prompts] Failed to load agent prompts:', err.message);
    throw err; // 상위 호출자에게 에러 전달
  }

  return agentPromptsMap;
}
