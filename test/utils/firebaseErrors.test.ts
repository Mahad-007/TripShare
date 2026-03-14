import { describe, it, expect } from 'vitest';
import { getFirebaseErrorMessage } from '../../utils/firebaseErrors';

describe('getFirebaseErrorMessage', () => {
  it('returns friendly message for auth/wrong-password', () => {
    expect(getFirebaseErrorMessage('auth/wrong-password')).toBe(
      'Incorrect password. Please try again.'
    );
  });

  it('returns friendly message for auth/email-already-in-use', () => {
    expect(getFirebaseErrorMessage('auth/email-already-in-use')).toBe(
      'This email is already registered. Try signing in instead.'
    );
  });

  it('returns friendly message for auth/invalid-email', () => {
    expect(getFirebaseErrorMessage('auth/invalid-email')).toBe(
      'Please enter a valid email address.'
    );
  });

  it('returns friendly message for auth/user-not-found', () => {
    expect(getFirebaseErrorMessage('auth/user-not-found')).toBe(
      'No account found with this email.'
    );
  });

  it('returns friendly message for auth/too-many-requests', () => {
    expect(getFirebaseErrorMessage('auth/too-many-requests')).toBe(
      'Too many attempts. Please try again later.'
    );
  });

  it('returns friendly message for auth/weak-password', () => {
    expect(getFirebaseErrorMessage('auth/weak-password')).toBe(
      'Password should be at least 6 characters.'
    );
  });

  it('returns default message for unknown error code', () => {
    expect(getFirebaseErrorMessage('auth/unknown-error')).toBe(
      'Something went wrong. Please try again.'
    );
  });

  it('returns default message for empty string', () => {
    expect(getFirebaseErrorMessage('')).toBe(
      'Something went wrong. Please try again.'
    );
  });
});
