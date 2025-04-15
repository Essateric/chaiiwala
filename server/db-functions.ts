import { ref, set } from "firebase/database";
import { db } from "./db";

export function writeUserData(userId: string, name: string, email: string) {
  set(ref(db, 'users/' + userId), {
    username: name,
    email: email
  });
}