const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

//איפוס ב 1 לחודש
exports.resetBudgetM = functions.pubsub
  .schedule("0 0 1 * *")
  .timeZone("Asia/Jerusalem")
  .onRun(async () => {
    console.log("Run reset =>");

    const now = new Date();
    const yearM = `${now.getFullYear()} - ${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    const groupSnapshot = await db.collection("groups").get();

    for (const groupDoc of groupSnapshot.docs) {
      const groupId = groupDoc.id;

      const categoriesRef = db
        .collection("groups")
        .doc(groupId)
        .collection("categories");
      const categoriesSnapshot = await categoriesRef.get();

      //שמירת ארכיון

      const archiveRef = db
        .collection("groups")
        .doc(groupId)
        .collection("archive")
        .doc(yearM);

      for (const categoryDoc of categoriesSnapshot.docs) {
        const categoryData = categoryDoc();

        //שמירת קטגוריה בארכיון
        const archivedCategoryRef = archiveRef
          .collection("categories")
          .doc(categoryDoc.id);
        await archivedCategoryRef.set({
          ...categoryData,
          archivedAt: now.toISOString(),
        });

        //שמירת ההוצאות בארכיון
        const expensesRef = db
          .collection("groups")
          .doc(groupId)
          .collection("expenses");
        const expensesSnap = await expensesRef
          .where("categoryId", "==", categoryData.id)
          .get();

        for (const expenseDoc of expensesSnap.docs) {
          await archivedCategoryRef
            .collection("expenses")
            .doc(expenseDoc.id)
            .set(expenseDoc.data());

          //מחיקה
          await expenseDoc.ref.delete();
        }

        //מחיקת קטגוריות לא קבעות
        if (categoryData.isRegular) {
          await categoryDoc.ref.update({ budget: 0 });
        } else {
          await categoryData.ref.delete();
        }
      }
    }
    console.log("Reset complate");
    return null;
  });
