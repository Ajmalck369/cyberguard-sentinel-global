import {readFile} from 'node:fs/promises';
import pg from 'pg';

if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try {
  const sql=await readFile(new URL('../db/001_init.sql',import.meta.url),'utf8');
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('CyberGuard PostgreSQL schema v1 ready');
} catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
} finally {await client.end();}
