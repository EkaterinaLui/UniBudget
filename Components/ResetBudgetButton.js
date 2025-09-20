import React from "react";
import { TouchableOpacity, Text, Alert, StyleSheet } from "react-native";
import { useTheme } from "@react-navigation/native";
import { db } from "../firebase";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    setDoc,
    updateDoc,
} from "firebase/firestore";

const ResetBudgetsButton = ({ groupId }) => {
    const { colors } = useTheme();

    const reset = async () => {
        try {
            const now = new Date();
            const arhiveId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
            const groupRef = doc(db, "groups", groupId);
            const archiveBase = doc(collection(groupRef, "archive"), arhiveId);

            const archive = doc(collection(groupRef, "archive"), arhiveId);

            await setDoc(archive, {
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                createdAt: new Date(),
            })

            //  לקטגוריות
            const categoriesSnap = await getDocs(
                collection(db, "groups", groupId, "categories")
            );
            for (const cat of categoriesSnap.docs) {
                const data = cat.data();

                // שמירה בארכיון
                await setDoc(
                    doc(collection(archiveBase, "categories"), cat.id),
                    data
                );

                if (data.istemporary) {
                    // קטגוריה זמנית → מוחקים לגמרי
                    await deleteDoc(doc(db, "groups", groupId, "categories", cat.id));
                } else {
                    // קטגוריה רגילה → מאפסים תקציב והוצאות נשמרות
                    await updateDoc(doc(db, "groups", groupId, "categories", cat.id), {
                        budget: 0,
                    });
                }
            }

            //  הוצאות
            const expensesSnap = await getDocs(
                collection(db, "groups", groupId, "expenses")
            );
            for (const exp of expensesSnap.docs) {
                await setDoc(
                    doc(collection(archiveBase, "expenses"), exp.id),
                    exp.data()
                );
                await deleteDoc(doc(db, "groups", groupId, "expenses", exp.id));
            }

            Alert.alert("בוצע", "האיפוס הסתיים בהצלחה (הנתונים נשמרו בארכיון)");
        } catch (error) {
            console.error("שגיאה באיפוס:", error);
            Alert.alert("שגיאה", "האיפוס נכשל, נסה שוב.");
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.danger }]}
            onPress={() =>
                Alert.alert(
                    "איפוס",
                    "האם לאפס את כל ההוצאות? קטגוריות זמניות יימחקו, קבועות יתאפסו.",
                    [
                        { text: "ביטול", style: "cancel" },
                        { text: "אשר", style: "destructive", onPress: reset },
                    ]
                )
            }
        >
            <Text style={[styles.buttonText, { color: colors.buttonText }]}>
                איפוס קבוצה
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 15,
        margin: 20,
        borderRadius: 10,
        alignItems: "center",
    },
    buttonText: { fontSize: 16, fontWeight: "bold" },
});

export default ResetBudgetsButton;
