import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "@react-navigation/native";
import * as Print from "expo-print";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

const ReportsBottons = ({ title, data, groupId, month }) => {
  const [busy, setBusy] = useState(false);
  const user = auth.currentUser;
  const { colors } = useTheme();

  const safeNumber = (v) => (isFinite(Number(v)) ? Number(v) : 0);
  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const buildHtml = () => {
    const head = `
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: Arial, Helvetica, sans-serif; direction: rtl; margin: 24px; }
          h1 { color: #2196f3; font-size: 22px; margin: 0 0 12px; }
          ul { list-style: none; padding: 0; margin: 0; }
          li { margin-bottom: 6px; }
          .badge { display:inline-block; min-width:10px; height:10px; border-radius:5px; margin-left:8px; vertical-align:middle; }
          .row { display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding:6px 0; }
          .muted { color:#666; font-size:12px; }
          .box { border:1px solid #eee; border-radius:8px; padding:12px; }
          pre { white-space: pre-wrap; word-wrap: break-word; }
        </style>
      </head>
    `;
    const header = `<h1>${title}</h1>${
      month ? `<div class="muted">חודש: ${month}</div>` : ""
    }`;

    if (!data || !data.type) {
      return `<html>${head}<body>${header}<p>אין נתונים להצגה.</p></body></html>`;
    }

    if (data.type === "pie") {
      const total = safeNumber(
        data.total ??
          (data.items || []).reduce((s, i) => s + safeNumber(i.amount), 0)
      );
      const list = (data.items || [])
        .map(
          (i) => `
          <li class="row">
            <span>
              <span class="badge" style="background:${
                i.color || "#999"
              }"></span>
              ${escapeHtml(i.name ?? "")}
            </span>
            <span>${safeNumber(i.amount)} ₪ (${
            total ? Math.round((safeNumber(i.amount) / total) * 100) : 0
          }%)</span>
          </li>`
        )
        .join("");

      return `<html>${head}<body>${header}
        <div class="box">
          <ul>${list}</ul>
          <div class="row" style="border-top:1px solid #eee; margin-top:8px; padding-top:8px;">
            <strong>סה״כ</strong><strong>${total} ₪</strong>
          </div>
        </div>
      </body></html>`;
    }

    if (data.type === "bar" || data.type === "line") {
      const list = (data.points || [])
        .map(
          (p) =>
            `<li class="row"><span>${escapeHtml(
              String(p.label ?? "")
            )}</span><span>${safeNumber(p.value)} ₪</span></li>`
        )
        .join("");
      return `<html>${head}<body>${header}<div class="box"><ul>${list}</ul></div></body></html>`;
    }

    if (data.type === "progress") {
      const percent = safeNumber(
        data.valuePercent ?? safeNumber(data.value) * 100
      );
      return `<html>${head}<body>${header}<div class="box">
        <div class="row"><span>ניצול תקציב</span><strong>${Math.round(
          percent
        )}%</strong></div>
      </div></body></html>`;
    }

    return `<html>${head}<body>${header}<pre>${escapeHtml(
      JSON.stringify(data, null, 2)
    )}</pre></body></html>`;
  };

  const fileNameSafe = (base, m) => {
    const safeTitle = String(base || "report")
      .replace(/[^\p{L}\p{N}\-_ ]/gu, "")
      .trim()
      .replace(/\s+/g, "_");
    const suffix = (m || "month").toString().replace(/[^\p{L}\p{N}\-_]/gu, "_");
    const iso = new Date().toISOString().replace(/[:.]/g, "-");
    return `${safeTitle}_${suffix}_${iso}.pdf`;
  };

  const saveToFirestore = async (localUri, name) => {
    if (!groupId) {
      throw new Error("missing-group-id");
    }
    await addDoc(collection(db, "groups", groupId, "reports"), {
      title,
      type: data?.type || "unknown",
      month: month || null,
      data, 
      file: { name, localUri, platform: Platform.OS },
      createdBy: user?.uid || null,
      createdAt: serverTimestamp(),
    });
  };

  const saveToDownloadsAndroid = async (base64Data, name) => {
    const perms =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!perms.granted) {
      const target = FileSystem.documentDirectory + name;
      await FileSystem.writeAsStringAsync(target, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return target;
    }
    const uri = await FileSystem.StorageAccessFramework.createFileAsync(
      perms.directoryUri,
      name,
      "application/pdf"
    );
    await FileSystem.writeAsStringAsync(uri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri; 
  };

  const onDownload = async () => {
    try {
      setBusy(true);
      const html = buildHtml();

      const { base64 } = await Print.printToFileAsync({ html, base64: true });

      const name = fileNameSafe(title, month);
      let localUri;

      if (Platform.OS === "android") {
        localUri = await saveToDownloadsAndroid(base64, name);
      } else {
        localUri = FileSystem.documentDirectory + name;
        await FileSystem.writeAsStringAsync(localUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
      if (!groupId) {
        Alert.alert("שגיאה", "חסר מזהה קבוצה לשמירה.");
        return;
      }
      await saveToFirestore(localUri, name);   

      if (Platform.OS === "ios") {
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(localUri, {
            UTI: "com.adobe.pdf",
            mimeType: "application/pdf",
          });
        }
      }

      Alert.alert("הצלחה", "הדוח נשמר במכשיר ובפיירסטור.");
    } catch (e) {
      console.log("download error:", e);
      if (String(e?.message).includes("missing-group-id")) {
        Alert.alert("שגיאה", "חסר מזהה קבוצה לשמירה.");
      } else {
        Alert.alert("שגיאה", "לא ניתן לשמור את הדוח.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onShare = async () => {
    try {
      setBusy(true);
      const html = buildHtml();
      const { base64 } = await Print.printToFileAsync({ html, base64: true });
      const name = fileNameSafe(title, month);
      const tempUri = FileSystem.cacheDirectory + name;
      await FileSystem.writeAsStringAsync(tempUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("שגיאה", "שיתוף לא נתמך במכשיר הזה");
        return;
      }
      await Sharing.shareAsync(tempUri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
      });
    } catch (e) {
      console.log("share error:", e);
      Alert.alert("שגיאה", "שגיאה בשיתוף הדוח");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.actionsContainer}>
      <TouchableOpacity
        style={[styles.actionButton, {backgroundColor: colors.saveButton}, busy && styles.disabled]}
        disabled={busy}
        onPress={onDownload}
      >
        <Text style={styles.actionText}>להוריד דוח</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.secondaryButton, {backgroundColor: colors.shareButton}, busy && styles.disabled]}
        disabled={busy}
        onPress={onShare}
      >
        <Text style={styles.actionText}>לשלוח דוח</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: "#2196f3",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  secondaryButton: {
    backgroundColor: "#4db6ac",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
  },
  disabled: { opacity: 0.6 },
});

export default ReportsBottons;
