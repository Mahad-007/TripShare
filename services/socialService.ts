import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { sendNotification } from './notificationService';

// --- Likes (path: trips/{tripId}/media/{mediaId}/likes/{userId}) ---

export async function toggleLike(
  tripId: string,
  mediaId: string,
  userId: string
): Promise<boolean> {
  const likeRef = doc(db, 'trips', tripId, 'media', mediaId, 'likes', userId);
  const snap = await getDoc(likeRef);

  if (snap.exists()) {
    await deleteDoc(likeRef);
    return false;
  } else {
    await setDoc(likeRef, { createdAt: new Date().toISOString() });
    return true;
  }
}

export async function fetchLikeStates(
  posts: { tripId: string; mediaId: string; id: string }[],
  userId: string
): Promise<Map<string, { liked: boolean; count: number }>> {
  const result = new Map<string, { liked: boolean; count: number }>();

  await Promise.all(
    posts.map(async (post) => {
      const [userLikeSnap, allLikesSnap] = await Promise.all([
        getDoc(doc(db, 'trips', post.tripId, 'media', post.mediaId, 'likes', userId)),
        getDocs(collection(db, 'trips', post.tripId, 'media', post.mediaId, 'likes')),
      ]);
      result.set(post.id, {
        liked: userLikeSnap.exists(),
        count: allLikesSnap.size,
      });
    })
  );

  return result;
}

// --- Follows (dual-write: users/{A}/following/{B} + users/{B}/followers/{A}) ---

export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  batch.set(doc(db, 'users', currentUserId, 'following', targetUserId), { createdAt: now });
  batch.set(doc(db, 'users', targetUserId, 'followers', currentUserId), { createdAt: now });
  await batch.commit();

  sendNotification(
    targetUserId,
    'new_follower',
    'You have a new follower!',
    { userId: currentUserId }
  ).catch(() => {});
}

export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'users', currentUserId, 'following', targetUserId));
  batch.delete(doc(db, 'users', targetUserId, 'followers', currentUserId));
  await batch.commit();
}

export async function isFollowing(
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', currentUserId, 'following', targetUserId));
  return snap.exists();
}

export async function fetchFollowStates(
  userIds: string[],
  currentUserId: string
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();

  await Promise.all(
    userIds.map(async (uid) => {
      if (uid === currentUserId) {
        result.set(uid, false);
        return;
      }
      const snap = await getDoc(doc(db, 'users', currentUserId, 'following', uid));
      result.set(uid, snap.exists());
    })
  );

  return result;
}

export function subscribeToFollowers(
  userId: string,
  callback: (followerIds: string[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'users', userId, 'followers'), (snapshot) => {
    callback(snapshot.docs.map((d) => d.id));
  });
}

export function subscribeToFollowing(
  userId: string,
  callback: (followingIds: string[]) => void
): Unsubscribe {
  return onSnapshot(collection(db, 'users', userId, 'following'), (snapshot) => {
    callback(snapshot.docs.map((d) => d.id));
  });
}

export async function getFollowerCount(userId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'users', userId, 'followers'));
  return snap.size;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const snap = await getDocs(collection(db, 'users', userId, 'following'));
  return snap.size;
}
