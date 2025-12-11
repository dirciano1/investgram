// lib/firebase.ts
import { initializeApp } from "firebase/app";

import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  deleteDoc,
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

// ================= CONFIG FIREBASE ==================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ================= LOGIN COM GOOGLE =================
async function loginComGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // pega token JWT
  const token = await user.getIdToken();
  document.cookie = `betgram_token=${token}; path=/; max-age=86400; SameSite=Lax`;

  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  // =====================================================
  // 🔵 USUÁRIO NOVO
  // =====================================================
  if (!snap.exists()) {
    const indicadoPor = localStorage.getItem("indicadoPor") || null;

    await setDoc(ref, {
      uid: user.uid,
      nome: user.displayName || "",
      email: user.email || "",
      foto: user.photoURL || "",
      creditos: 10,
      role: "user",
      criadoEm: Date.now(),
      indicadoPor,
      bonusRecebido: false,
      jaComprou: false,
    });

    if (indicadoPor) {
      await addDoc(collection(db, "indicacoes"), {
        indicadoPor,
        indicado: user.uid,
        data: serverTimestamp(),
        bonusPago: false,
      });
    }

    return user;
  }

  // =====================================================
  // 🔵 LOGIN NORMAL
  // =====================================================
  const data = snap.data() as {
    nome?: string;
    email?: string;
    foto?: string;
    creditos?: number;
    role?: string;
  };

  let roleFinal = data.role;

  if (roleFinal !== "superadmin" && roleFinal !== "admin") {
    roleFinal = "user";
  }

  await updateDoc(ref, {
    nome: data.nome || user.displayName || "",
    email: data.email || user.email || "",
    foto: data.foto || user.photoURL || "",
    creditos: data.creditos ?? 0,
    role: roleFinal,
  });

  return user;
}

// ================= LOGOUT =================
async function sair(): Promise<void> {
  document.cookie = "betgram_token=; path=/; max-age=0";
  await signOut(auth);
}

// ================= EXPORTS ==================
export {
  auth,
  db,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  deleteDoc,
  onAuthStateChanged,
  loginComGoogle,
  sair,
};
