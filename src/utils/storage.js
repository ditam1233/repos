import { supabase } from './supabase';
import bcrypt from 'bcryptjs';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function registerUser(username, password, displayName) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .single();
  if (existing) return { error: 'Имя занято' };

  const code = generateCode();
  const { data, error } = await supabase
    .from('profiles')
    .insert({ username, password: bcrypt.hashSync(password, 10), code, display_name: displayName || username })
    .select()
    .single();
  if (error) return { error: error.message };
  return { user: data };
}

export async function loginUser(username, password) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single();
  if (error || !data) return { error: 'Неверные данные' };

  const isBcrypt = data.password.startsWith('$2');
  if (isBcrypt) {
    if (!bcrypt.compareSync(password, data.password)) return { error: 'Неверные данные' };
  } else {
    // Plaintext password (legacy) — check and migrate to bcrypt
    if (data.password !== password) return { error: 'Неверные данные' };
    await supabase.from('profiles').update({ password: bcrypt.hashSync(password, 10) }).eq('id', data.id);
  }

  return { user: data };
}

export async function getUser(id) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();
  return data;
}

export async function updateProfile(userId, { displayName, password }) {
  const updates = {};
  if (displayName !== undefined) updates.display_name = displayName;
  if (password) updates.password = bcrypt.hashSync(password, 10);
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) return { error: error.message };
  return { user: data };
}

export async function linkPartner(userId, partnerCode) {
  const code = partnerCode.trim().toUpperCase();

  const { data: me } = await supabase
    .from('profiles').select('*').eq('id', userId).single();
  if (me.partner_id) return { error: 'У вас уже есть пара' };

  const { data: partner } = await supabase
    .from('profiles').select('*').eq('code', code).neq('id', userId).single();

  if (!partner) {
    const { data: self } = await supabase
      .from('profiles').select('id').eq('code', code).eq('id', userId).single();
    if (self) return { error: 'Это ваш собственный код' };
    return { error: 'Код не найден. Убедитесь, что партнёр зарегистрирован' };
  }

  if (partner.partner_id) return { error: 'У партнёра уже есть пара' };

  const now = new Date().toISOString();
  const { error: e1 } = await supabase
    .from('profiles').update({ partner_id: partner.id, paired_at: now }).eq('id', userId);
  const { error: e2 } = await supabase
    .from('profiles').update({ partner_id: userId, paired_at: now }).eq('id', partner.id);

  if (e1 || e2) return { error: 'Ошибка при привязке' };
  return { partner };
}

export async function unlinkPartner(userId) {
  const { data: me } = await supabase
    .from('profiles').select('partner_id').eq('id', userId).single();
  if (!me?.partner_id) return;
  await supabase.from('profiles').update({ partner_id: null }).eq('id', me.partner_id);
  await supabase.from('profiles').update({ partner_id: null }).eq('id', userId);
}

export async function updatePairedAt(userId, date) {
  const me = await getUser(userId);
  if (!me?.partner_id) return;
  const iso = new Date(date).toISOString();
  await supabase.from('profiles').update({ paired_at: iso }).eq('id', userId);
  await supabase.from('profiles').update({ paired_at: iso }).eq('id', me.partner_id);
}

export async function getPairMoments(userId) {
  const user = await getUser(userId);
  if (!user || !user.partner_id) return [];
  const pairIds = [userId, user.partner_id];

  const { data } = await supabase
    .from('moments')
    .select('*')
    .in('author_id', pairIds)
    .order('created_at', { ascending: false });

  return data || [];
}

async function uploadToImgbb(base64) {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const form = new FormData();
  form.append('key', process.env.REACT_APP_IMGBB_KEY);
  form.append('image', base64Data);

  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'imgbb upload failed');
  return json.data.url;
}

export async function uploadAvatar(userId, base64) {
  try {
    console.log('uploadAvatar: starting imgbb upload...');
    const avatar_url = await uploadToImgbb(base64);
    console.log('uploadAvatar: imgbb URL =', avatar_url);

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url })
      .eq('id', userId)
      .select()
      .single();

    console.log('uploadAvatar: supabase update result =', { data, error });
    if (error) return { error: error.message };
    return { user: data };
  } catch (e) {
    console.error('uploadAvatar: error =', e);
    return { error: e.message };
  }
}

export async function createMoment(authorId, title, description, date, photosBase64 = []) {
  // Support legacy single photo argument
  const photos = typeof photosBase64 === 'string' ? [photosBase64] : photosBase64;
  let photo_url = null;

  const uploadedUrls = [];
  for (const base64 of photos) {
    try {
      uploadedUrls.push(await uploadToImgbb(base64));
    } catch (e) {
      console.warn('imgbb upload failed:', e.message);
      uploadedUrls.push(base64);
    }
  }

  if (uploadedUrls.length > 0) photo_url = uploadedUrls[0];

  const { data, error } = await supabase
    .from('moments')
    .insert({ author_id: authorId, title, description, date, photo_url })
    .select()
    .single();

  if (error) return null;

  // Insert into moment_photos
  if (uploadedUrls.length > 0) {
    const rows = uploadedUrls.map((url, i) => ({
      moment_id: data.id, photo_url: url, position: i,
    }));
    await supabase.from('moment_photos').insert(rows);
  }

  return data;
}

export async function deleteMoment(momentId) {
  // Delete all photos from imgbb
  const { data: photos } = await supabase
    .from('moment_photos')
    .select('photo_url')
    .eq('moment_id', momentId);

  for (const p of (photos || [])) {
    if (p.photo_url?.includes('i.ibb.co')) {
      try {
        const form = new FormData();
        form.append('key', process.env.REACT_APP_IMGBB_KEY);
        form.append('action', 'delete');
        form.append('url', p.photo_url);
        await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form }).catch(() => {});
      } catch (e) {
        console.warn('imgbb delete failed:', e.message);
      }
    }
  }

  const { error } = await supabase
    .from('moments')
    .delete()
    .eq('id', momentId);

  return !error;
}

export async function getMomentPhotos(momentId) {
  const { data } = await supabase
    .from('moment_photos')
    .select('*')
    .eq('moment_id', momentId)
    .order('position', { ascending: true });
  return data || [];
}

// === Comments ===

export async function getComments(momentId) {
  const { data } = await supabase
    .from('comments')
    .select('*, profiles:author_id(display_name, username, avatar_url)')
    .eq('moment_id', momentId)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function addComment(momentId, authorId, text) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ moment_id: momentId, author_id: authorId, text })
    .select('*, profiles:author_id(display_name, username, avatar_url)')
    .single();
  if (error) return null;
  return data;
}

export async function deleteComment(commentId) {
  const { error } = await supabase.from('comments').delete().eq('id', commentId);
  return !error;
}

// === Reactions ===

export async function getReactions(momentId) {
  const { data } = await supabase
    .from('reactions')
    .select('*')
    .eq('moment_id', momentId);
  return data || [];
}

export async function toggleReaction(momentId, authorId, emoji) {
  // Check if user already has this exact reaction
  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('moment_id', momentId)
    .eq('author_id', authorId)
    .eq('emoji', emoji)
    .single();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    return 'removed';
  }

  // Check if user already reacted (1 reaction per user)
  const { data: userReaction } = await supabase
    .from('reactions')
    .select('id')
    .eq('moment_id', momentId)
    .eq('author_id', authorId)
    .single();

  if (userReaction) {
    // Replace existing reaction
    await supabase.from('reactions').update({ emoji }).eq('id', userReaction.id);
    return 'replaced';
  }

  // Check total reactions on moment (max 2)
  const { count } = await supabase
    .from('reactions')
    .select('id', { count: 'exact', head: true })
    .eq('moment_id', momentId);

  if (count >= 2) return 'limit';

  await supabase.from('reactions').insert({ moment_id: momentId, author_id: authorId, emoji });
  return 'added';
}
