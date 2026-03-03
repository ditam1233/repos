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
  const pairIds = [userId, me.partner_id];

  // Delete wishes and messages for this pair
  await supabase.from('wishes').delete().in('author_id', pairIds);
  await supabase.from('messages').delete().in('sender_id', pairIds);

  // Delete all moments and related data for this pair
  const { data: moments } = await supabase
    .from('moments').select('id').in('author_id', pairIds);
  const momentIds = (moments || []).map(m => m.id);

  if (momentIds.length > 0) {
    await supabase.from('moment_photos').delete().in('moment_id', momentIds);
    await supabase.from('comments').delete().in('moment_id', momentIds);
    await supabase.from('reactions').delete().in('moment_id', momentIds);
    await supabase.from('moments').delete().in('id', momentIds);
  }

  await supabase.from('profiles').update({ partner_id: null, paired_at: null }).eq('id', me.partner_id);
  await supabase.from('profiles').update({ partner_id: null, paired_at: null }).eq('id', userId);
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

export async function getPairStats(userId) {
  const user = await getUser(userId);
  if (!user || !user.partner_id) return { photos: 0, comments: 0, reactions: 0 };
  const pairIds = [userId, user.partner_id];

  const { data: moments } = await supabase
    .from('moments').select('id').in('author_id', pairIds);
  const momentIds = (moments || []).map(m => m.id);
  if (momentIds.length === 0) return { photos: 0, comments: 0, reactions: 0 };

  const { count: photos } = await supabase
    .from('moment_photos').select('id', { count: 'exact', head: true }).in('moment_id', momentIds);
  const { count: comments } = await supabase
    .from('comments').select('id', { count: 'exact', head: true }).in('moment_id', momentIds);
  const { count: reactions } = await supabase
    .from('reactions').select('id', { count: 'exact', head: true }).in('moment_id', momentIds);

  return { photos: photos || 0, comments: comments || 0, reactions: reactions || 0 };
}

export async function getPairRecentPhotos(userId, limit = 4) {
  const user = await getUser(userId);
  if (!user || !user.partner_id) return [];
  const pairIds = [userId, user.partner_id];

  const { data: moments } = await supabase
    .from('moments').select('id').in('author_id', pairIds);
  const momentIds = (moments || []).map(m => m.id);
  if (momentIds.length === 0) return [];

  const { data } = await supabase
    .from('moment_photos')
    .select('photo_url')
    .in('moment_id', momentIds)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data || []).map(p => p.photo_url);
}

async function uploadToStorage(base64, folder) {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteString = atob(base64Data);
  const bytes = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) bytes[i] = byteString.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'image/jpeg' });

  const path = `${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from('images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('images').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadAvatar(userId, base64) {
  try {
    const avatar_url = await uploadToStorage(base64, 'avatars');

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url })
      .eq('id', userId)
      .select()
      .single();

    if (error) return { error: error.message };
    return { user: data };
  } catch (e) {
    return { error: e.message };
  }
}

export async function createMoment(authorId, title, description, date, photosBase64 = []) {
  // Support legacy single photo argument
  const photos = typeof photosBase64 === 'string' ? [photosBase64] : photosBase64;
  let photo_url = null;

  const uploadedUrls = [];
  for (const base64 of photos) {
    uploadedUrls.push(await uploadToStorage(base64, 'moments'));
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
  const { data: photos } = await supabase
    .from('moment_photos')
    .select('photo_url')
    .eq('moment_id', momentId);

  // Delete files from Supabase Storage
  const pathsToDelete = (photos || [])
    .filter(p => p.photo_url?.includes('/storage/v1/object/public/images/'))
    .map(p => p.photo_url.split('/storage/v1/object/public/images/')[1]);

  if (pathsToDelete.length > 0) {
    await supabase.storage.from('images').remove(pathsToDelete);
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

// === Wishes ===

export async function getWishes(userId, partnerId) {
  const { data } = await supabase
    .from('wishes')
    .select('*, profiles:author_id(display_name, username, avatar_url)')
    .or(`author_id.eq.${userId},author_id.eq.${partnerId}`)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createWish(authorId, targetId, { text, description, link, price, photoBase64 }) {
  let photo_url = null;
  if (photoBase64) {
    photo_url = await uploadToStorage(photoBase64, 'wishes');
  }
  const { data, error } = await supabase
    .from('wishes')
    .insert({ author_id: authorId, target_id: targetId, text, description: description || null, link: link || null, price: price || null, photo_url })
    .select('*, profiles:author_id(display_name, username, avatar_url)')
    .single();
  if (error) return null;
  return data;
}

export async function toggleWishCompleted(wishId, isCompleted) {
  const { data, error } = await supabase
    .from('wishes')
    .update({ is_completed: isCompleted })
    .eq('id', wishId)
    .select()
    .single();
  if (error) return null;
  return data;
}

export async function updateWish(wishId, { text, description, link, price, photoBase64 }) {
  const updates = { text, description: description || null, link: link || null, price: price || null };
  if (photoBase64) {
    updates.photo_url = await uploadToStorage(photoBase64, 'wishes');
  }
  const { data, error } = await supabase
    .from('wishes')
    .update(updates)
    .eq('id', wishId)
    .select('*, profiles:author_id(display_name, username, avatar_url)')
    .single();
  if (error) return null;
  return data;
}

export async function deleteWish(wishId) {
  const { error } = await supabase.from('wishes').delete().eq('id', wishId);
  return !error;
}

// === Messages ===

export async function getMessages(userId, partnerId) {
  const { data } = await supabase
    .from('messages')
    .select('*, profiles:sender_id(display_name, username, avatar_url)')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });
  return data || [];
}

export async function getUnreadCount(userId, partnerId) {
  const lastRead = localStorage.getItem(`chat_last_read_${userId}`) || '1970-01-01T00:00:00Z';
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', partnerId)
    .eq('receiver_id', userId)
    .gt('created_at', lastRead);
  if (error) return 0;
  return count || 0;
}

export function markChatRead(userId) {
  localStorage.setItem(`chat_last_read_${userId}`, new Date().toISOString());
}

export async function sendMessage(senderId, receiverId, text) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, text })
    .select('*, profiles:sender_id(display_name, username, avatar_url)')
    .single();
  if (error) return null;
  return data;
}

export async function deleteMessage(messageId) {
  const { error } = await supabase.from('messages').delete().eq('id', messageId);
  return !error;
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
