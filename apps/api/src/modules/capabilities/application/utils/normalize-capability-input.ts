/**
 * Map common LLM field aliases and drop empty strings so Zod optional/url/email pass.
 */
export function normalizeCapabilityInput(
  toolId: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === '' || value === null) continue;
    next[key] = value;
  }

  const alias = (from: string, to: string) => {
    if (next[from] !== undefined && next[to] === undefined) {
      next[to] = next[from];
      delete next[from];
    }
  };

  switch (toolId) {
    case 'clients.create':
    case 'clients.update':
      alias('name', 'displayName');
      alias('company', 'displayName');
      alias('companyName', 'displayName');
      break;
    case 'leads.create':
    case 'leads.update':
      alias('name', 'companyName');
      alias('company', 'companyName');
      alias('displayName', 'companyName');
      break;
    case 'tasks.create':
    case 'tasks.update':
      alias('name', 'title');
      break;
    case 'content.create':
    case 'content.update':
      alias('name', 'title');
      break;
    case 'calendar.create':
    case 'calendar.update':
      alias('name', 'title');
      break;
    case 'projects.create':
    case 'projects.update':
      alias('title', 'name');
      alias('displayName', 'name');
      break;
    case 'knowledge.create':
    case 'knowledge.update':
      if (typeof next.category === 'string')
        next.category = next.category.toUpperCase();
      break;
    default:
      break;
  }

  return next;
}
