import { supabase } from './supabase';

let channelCounter = 0;

export function subscribeToMessages(userId, partnerId, onNewMessage) {
  const channel = supabase
    .channel(`messages-${userId}-${++channelCounter}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        const msg = payload.new;
        const isPairMsg =
          (msg.sender_id === userId && msg.receiver_id === partnerId) ||
          (msg.sender_id === partnerId && msg.receiver_id === userId);
        if (isPairMsg) onNewMessage(msg);
      }
    )
    .subscribe();
  return channel;
}

export function subscribeToMoments(userId, partnerId, onInsert, onDelete) {
  const pairIds = [userId, partnerId];
  const channel = supabase
    .channel(`moments-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'moments' },
      (payload) => {
        if (pairIds.includes(payload.new.author_id)) onInsert(payload.new);
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'moments' },
      (payload) => {
        if (payload.old?.id) onDelete(payload.old);
      }
    )
    .subscribe();
  return channel;
}

export function unsubscribe(channel) {
  if (channel) supabase.removeChannel(channel);
}
