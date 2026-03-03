import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = 'https://wxljeolvbfsefdawfklq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_9vG3zHXjE3kKmnn2cT_VRA_Xsegvhho';
const BUCKET = 'images';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function isSupabaseUrl(url) {
  return url && url.includes(SUPABASE_URL);
}

function isImgbbUrl(url) {
  return url && url.includes('i.ibb.co');
}

function isBase64(str) {
  return str && (str.startsWith('data:image') || str.length > 500);
}

async function downloadImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function decodeBase64(str) {
  const base64Data = str.includes(',') ? str.split(',')[1] : str;
  return Buffer.from(base64Data, 'base64');
}

async function uploadToStorage(buffer, folder) {
  const path = `${folder}/${randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

async function migrateTable(table, column, folder) {
  console.log(`\n--- ${table}.${column} -> ${folder} ---`);

  const { data: rows, error } = await supabase
    .from(table)
    .select(`id, ${column}`)
    .not(column, 'is', null);

  if (error) {
    console.error(`  Failed to read ${table}: ${error.message}`);
    return { migrated: 0, skipped: 0, failed: 0 };
  }

  let migrated = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const url = row[column];

    if (!url || isSupabaseUrl(url)) {
      skipped++;
      continue;
    }

    try {
      let buffer;
      if (isImgbbUrl(url)) {
        buffer = await downloadImage(url);
      } else if (isBase64(url)) {
        buffer = decodeBase64(url);
      } else {
        // Unknown URL format, try downloading
        buffer = await downloadImage(url);
      }

      const newUrl = await uploadToStorage(buffer, folder);

      const { error: updateError } = await supabase
        .from(table)
        .update({ [column]: newUrl })
        .eq('id', row.id);

      if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

      migrated++;
      console.log(`  [OK] ${table} id=${row.id}`);
    } catch (e) {
      failed++;
      console.error(`  [FAIL] ${table} id=${row.id}: ${e.message}`);
    }
  }

  console.log(`  Result: migrated=${migrated}, skipped=${skipped}, failed=${failed}`);
  return { migrated, skipped, failed };
}

async function main() {
  console.log('=== Image Migration: imgbb -> Supabase Storage ===\n');

  const results = [];

  results.push(await migrateTable('profiles', 'avatar_url', 'avatars'));
  results.push(await migrateTable('moments', 'photo_url', 'moments'));
  results.push(await migrateTable('moment_photos', 'photo_url', 'moments'));
  results.push(await migrateTable('wishes', 'photo_url', 'wishes'));

  const total = results.reduce(
    (acc, r) => ({
      migrated: acc.migrated + r.migrated,
      skipped: acc.skipped + r.skipped,
      failed: acc.failed + r.failed,
    }),
    { migrated: 0, skipped: 0, failed: 0 }
  );

  console.log('\n=== TOTAL ===');
  console.log(`Migrated: ${total.migrated}`);
  console.log(`Skipped:  ${total.skipped}`);
  console.log(`Failed:   ${total.failed}`);
}

main().catch(console.error);
