import { collection, doc, getDoc } from "firebase/firestore";

export async function budgetExceeded(db, groupId, mes) {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    if (!groupSnap.exists()) return;

    const groupData = groupSnap.data();
    const memberIds = groupData.memberIds || [];
    if (!memberIds.length) return;

    const userRef = collection(db, "users");
    const userDocs = [];

    for (const id of memberIds) {
      const uR = doc(userRef, id);
      const uS = await getDoc(uR);
      if (uS.exists()) {
        userDocs.push({ id, ...uS.data() });
      }
    }

    const messages = [];
    for (const user of userDocs) {
      const token = user.expoPushToken;
      if (!token) continue;

      messages.push({
        to: token,
        sound: "default",
        title: "חריגה מתקציב",
        body: mes,
        data: {
          groupId,
          title: "budgetLimit",
        },
      });
    }

    if (!messages.length) return;

    const chunkSize = 100;
    for (let i = 0; i < messages.length; i += chunkSize) {
      const chunk = messages.slice(i, i + chunkSize);

      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
    }
  } catch (error) {
    console.log("Error sending budget notifications:", error);
  }
}
