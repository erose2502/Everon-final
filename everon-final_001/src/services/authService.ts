// Authentication Service
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Date;
  lastLogin: Date;
  preferences: {
    language: string;
    theme?: string;
  };
}

// Sign up with email and password
export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Create user profile in Firestore
    await createUserProfile(user, displayName);

    return { success: true, user };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login
    await updateLastLogin(userCredential.user.uid);
    
    return { success: true, user: userCredential.user };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { success: false, error: error.message };
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user profile exists, if not create it
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await createUserProfile(user, user.displayName || 'User');
    } else {
      await updateLastLogin(user.uid);
    }

    return { success: true, user };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    return { success: false, error: error.message };
  }
};

// Sign out
export const logout = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Reset password
export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
};

// Create user profile in Firestore
const createUserProfile = async (user: User, displayName: string) => {
  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName,
    photoURL: user.photoURL || undefined,
    createdAt: new Date(),
    lastLogin: new Date(),
    preferences: {
      language: 'auto'
    }
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);
};

// Update last login timestamp
const updateLastLogin = async (uid: string) => {
  await setDoc(doc(db, 'users', uid), {
    lastLogin: new Date()
  }, { merge: true });
};

// Get user profile
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Update user language preference
export const updateLanguagePreference = async (uid: string, language: string) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      preferences: {
        language
      }
    }, { merge: true });
    return { success: true };
  } catch (error: any) {
    console.error('Error updating language preference:', error);
    return { success: false, error: error.message };
  }
};
