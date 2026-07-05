import { logger } from '../utils/logger';
import axios from 'axios';

const BASE = process.env.COGNEE_API_BASE || 'https://tenant-43d2c162-ce90-46b9-a183-da87754746c8.aws.cognee.ai';
const TENANT = process.env.COGNEE_TENANT_ID || '43d2c162-ce90-46b9-a183-da87754746c8';
const KEY = process.env.COGNEE_API_KEY || '';

async function post(path: string, body: any) {
  const url = `${BASE}${path}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (KEY) {
    headers['X-Api-Key'] = KEY;
  }
  const res = await axios.post(url, body, { headers });
  return res.data;
}

export async function remember(content: string, metadata: Record<string, any> = {}, namespace?: string) {
  try {
    const datasetName = namespace || TENANT;
    
    // Step 1: Ingest text into dataset
    await post('/api/v1/add_text', {
      textData: [content],
      datasetName
    });

    // Step 2: Trigger cognify in background (async) — sync mode times out for large texts
    const cognifyResult = await post('/api/v1/cognify', {
      datasets: [datasetName],
      runInBackground: true
    });

    logger.info(`cognee.remember: dataset=${datasetName} status=${cognifyResult?.status || 'started'}`);
    return cognifyResult;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error('cognee.remember error:', msg);
    return null;
  }
}

export async function recall(query: string, namespace?: string, limit = 5) {
  try {
    const datasetName = namespace || TENANT;
    const body = {
      query,
      datasets: [datasetName],
      topK: limit
    };
    return await post('/api/v1/recall', body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error('cognee.recall error:', msg);
    return { results: [] };
  }
}

export async function improve(namespace?: string) {
  try {
    const datasetName = namespace || TENANT;
    return await post('/api/v1/cognify', {
      datasets: [datasetName],
      runInBackground: false
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error('cognee.improve error:', msg);
    return null;
  }
}

export async function forget(dataset: string, namespace?: string) {
  try {
    const datasetName = dataset || namespace || TENANT;
    const body = {
      dataset: datasetName
    };
    return await post('/api/v1/forget', body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    logger.error('cognee.forget error:', msg);
    return null;
  }
}

export default { remember, recall, improve, forget };
