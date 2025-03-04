import { NextRequest } from 'next/server';
import type { ZodType } from 'zod';

export async function validateRequest<T>(schema: ZodType<T>, request: NextRequest) {
  const query = request.method === 'GET' ? Object.fromEntries(request.nextUrl.searchParams.entries()) : await request.json()
  
  const parseResult = schema.safeParse(query);
  if (!parseResult.success) {
    return { error: parseResult.error.errors[0].message }
  }

  return parseResult.data;
}
