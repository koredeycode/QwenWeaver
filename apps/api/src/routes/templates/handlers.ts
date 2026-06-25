import { randomUUID } from 'node:crypto';
import { getQueryProvider } from '@qwenweaver/database';
import { CreateTemplateBody, RateTemplateBody } from './schema.js';
import type { Variables } from '../../index.js';
import type { Context } from 'hono';

type C = Context<{ Variables: Variables }>;

function paramId(c: C): string {
  const id = c.req.param('id');
  if (!id) throw new Error('Missing id param');
  return id;
}

async function enrichTemplate(tpl: any, provider: ReturnType<typeof getQueryProvider>) {
  const user = tpl.authorId ? await provider.getUserById(tpl.authorId) : null;
  let category = null;
  if (tpl.categoryId) {
    const cats = await provider.listTemplateCategories();
    category = cats.find((c: any) => c.id === tpl.categoryId) ?? null;
  }
  return {
    ...tpl,
    authorName: user?.email?.split('@')[0] ?? 'Unknown',
    category,
  };
}

export async function handleListTemplates(c: C) {
  const provider = getQueryProvider();
  const url = new URL(c.req.url);
  const categoryId = url.searchParams.get('categoryId') ?? undefined;
  const featured = url.searchParams.get('featured') === 'true' ? true : undefined;
  const search = url.searchParams.get('search') ?? undefined;
  const limit = parseInt(url.searchParams.get('limit') ?? '50');
  const offset = parseInt(url.searchParams.get('offset') ?? '0');

  const templates = await provider.listTemplates({ categoryId, featured, search, limit, offset });
  const total = await provider.countTemplates({ categoryId, featured, search });
  const enriched = await Promise.all(templates.map((t) => enrichTemplate(t, provider)));

  return c.json({ templates: enriched, total, limit, offset }, 200);
}

export async function handleGetTemplate(c: C) {
  const provider = getQueryProvider();
  const id = paramId(c);
  const template = await provider.getTemplate(id);
  if (!template) return c.json({ error: 'Template not found' }, 404);
  const enriched = await enrichTemplate(template, provider);
  return c.json({ template: enriched }, 200);
}

export async function handleCreateTemplate(c: C) {
  const provider = getQueryProvider();
  const raw = await c.req.json();
  const parsed = CreateTemplateBody.safeParse(raw);
  if (!parsed.success)
    return c.json({ error: 'Invalid body', details: parsed.error.format() }, 400);

  const body = parsed.data;
  const jwtPayload = c.get('jwtPayload');
  const id = randomUUID();

  await provider.createTemplate(id, {
    name: body.name,
    description: body.description ?? null,
    workflowData: body.workflowData as any,
    categoryId: body.categoryId ?? null,
    tags: body.tags ?? null,
    authorId: jwtPayload.sub,
    thumbnail: body.thumbnail ?? null,
  });

  return c.json({ id }, 201);
}

export async function handleDeleteTemplate(c: C) {
  const provider = getQueryProvider();
  const id = paramId(c);
  const template = await provider.getTemplate(id);
  if (!template) return c.json({ error: 'Template not found' }, 404);

  await provider.deleteTemplate(id);
  return c.json({ deleted: true }, 200);
}

export async function handleForkTemplate(c: C) {
  const provider = getQueryProvider();
  const id = paramId(c);
  const jwtPayload = c.get('jwtPayload');

  const template = await provider.getTemplate(id);
  if (!template) return c.json({ error: 'Template not found' }, 404);

  await provider.incrementTemplateDownloads(id);
  const workflowId = await provider.saveWorkflow(jwtPayload.sub, {
    ...template.workflowData,
    name: template.name,
    description: template.description || undefined,
  });
  await enrichTemplate(template, provider);

  return c.json({ workflowId, workflowData: template.workflowData, name: template.name }, 201);
}

export async function handleGetReviews(c: C) {
  const provider = getQueryProvider();
  const id = paramId(c);
  const reviews = await provider.listTemplateReviews(id);
  return c.json({ reviews }, 200);
}

export async function handleRateTemplate(c: C) {
  const provider = getQueryProvider();
  const id = paramId(c);
  const raw = await c.req.json();
  const parsed = RateTemplateBody.safeParse(raw);
  if (!parsed.success)
    return c.json({ error: 'Invalid body', details: parsed.error.format() }, 400);

  const jwtPayload = c.get('jwtPayload');
  const template = await provider.getTemplate(id);
  if (!template) return c.json({ error: 'Template not found' }, 404);

  const reviewId = randomUUID();
  await provider.upsertTemplateReview(
    reviewId,
    id,
    jwtPayload.sub,
    parsed.data.rating,
    parsed.data.review ?? null,
  );

  return c.json({ id: reviewId }, 200);
}

export async function handleListCategories(c: C) {
  const provider = getQueryProvider();
  const categories = await provider.listTemplateCategories();
  return c.json({ categories }, 200);
}
