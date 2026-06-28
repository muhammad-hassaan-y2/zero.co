import 'server-only';
import { nanoid } from 'nanoid';
import { pool } from '@/db';
import { embedTextWithBedrock } from '@/lib/bedrock';

type MemoryInput = {
  workspaceId: string;
  agentId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  content: string;
  metadata?: Record<string, unknown>;
};

function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (!length) return 0;
  let dot = 0;
  let aNorm = 0;
  let bNorm = 0;
  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    aNorm += a[index] * a[index];
    bNorm += b[index] * b[index];
  }
  return aNorm && bNorm ? dot / (Math.sqrt(aNorm) * Math.sqrt(bNorm)) : 0;
}

export async function storeAgentMemory(input: MemoryInput) {
  const content = input.content.trim();
  if (!content) return null;
  let embedding: number[] = [];
  try {
    embedding = await embedTextWithBedrock(content);
  } catch {
    embedding = [];
  }
  const result = await pool.query(
    `insert into agent_memories (id, workspace_id, agent_id, source_type, source_id, content, embedding, metadata)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [
      nanoid(),
      input.workspaceId,
      input.agentId || null,
      input.sourceType,
      input.sourceId || null,
      content.slice(0, 5000),
      JSON.stringify(embedding),
      JSON.stringify(input.metadata || {}),
    ],
  );
  return result.rows[0];
}

export async function searchAgentMemories(workspaceId: string, query: string, limit = 6) {
  const cleaned = query.trim();
  if (!cleaned) return [];
  let queryEmbedding: number[] = [];
  try {
    queryEmbedding = await embedTextWithBedrock(cleaned);
  } catch {
    queryEmbedding = [];
  }

  const result = await pool.query(
    `select id, content, source_type, source_id, embedding, metadata, created_at
     from agent_memories
     where workspace_id = $1
     order by created_at desc
     limit 250`,
    [workspaceId],
  );

  return result.rows
    .map((row) => {
      const embedding = Array.isArray(row.embedding) ? row.embedding.map(Number) : [];
      const score = queryEmbedding.length && embedding.length
        ? cosineSimilarity(queryEmbedding, embedding)
        : String(row.content).toLowerCase().includes(cleaned.toLowerCase()) ? 0.35 : 0;
      return { ...row, score };
    })
    .filter((row) => row.score > 0 || !queryEmbedding.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
