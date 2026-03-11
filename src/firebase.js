import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBbJcIv0ge24vewFxtHxztkoFJVmZqYgoY",
  authDomain: "breuilsmm.firebaseapp.com",
  projectId: "breuilsmm",
  storageBucket: "breuilsmm.firebasestorage.app",
  messagingSenderId: "1054132921315",
  appId: "1:1054132921315:web:fc5cfd9a0bbf64cec576d6"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);