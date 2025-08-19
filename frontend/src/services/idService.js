import { collection, doc, setDoc, addDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase.js";

export async function createWithId(colPath, data) {
  const ref = await addDoc(collection(db, colPath), { ...data, _createdAt: new Date() });
  await setDoc(ref, { ...data, id: ref.id, _createdAt: new Date() }, { merge: true });
  return ref.id;
}

export async function createWithCustomId(colPath, customId, data) {
  const ref = doc(db, colPath, customId);
  await setDoc(ref, { ...data, id: customId, _createdAt: new Date() }, { merge: true });
  return customId;
}

export async function readById(colPath, id) {
  const snap = await getDoc(doc(db, colPath, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}