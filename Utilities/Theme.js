// Theme.js
import { DefaultTheme, DarkTheme } from "@react-navigation/native";

export const CustomLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    // בסיס
    background: "#f7f9fc",
    tabBackground: "#CAF0F8",
    card: "#ffffff",
    text: "#333333",
    textSecondary: "#666666",
    border: "#d6d6d6",

    // ראשי
    primary: "#0077B6",
    secondary: "#90E0EF",
    info: "#1d3557",

    // מצבים
    danger: "#e63946",
    success: "#2a9d8f",
    warning: "#f4a261",

    // טאב בר
    tabInactive: "#90E0EF",
    tabActive: "#0077B6",

    // תוספות
    inputBackground: "#f0f4f8",
    inputPlaceholder: "#a0a0a0",
    headerBackground: "#CAF0F8",
    headerText: "#004a99",
    buttonText: "#ffffff",
    shadow: "#00000033",
    typeColor: "#0077B6",

    // ProgressBar
    progressBackground: "#e0e0e0",
    progressNormal: "#70d6ff",
    progressWarning: "#ffc107",
    progressDanger: "#ff3b30",

    // כרטיסים
    cardBorder: "#e0e0e0",
    memberCardBackground: "#ffffff",
    addCardBackground: "#f4faff",

    // GroupInfo
    modalBackground: "#ffffff",
    modalOverlay: "rgba(0,0,0,0.5)",
    modalButtonBackground: "#e8f0fe",
    modalDeleteBackground: "#ffebee",
    closeText: "#666666",
    accent: "#007bff",
    buttonPrimary: "#0077B6",
    buttonSecondary: "#00A8E8",
    buttonDanger: "#d62828",
    buttonText: "#ffffff",
    userCard: "#d7f1fcff",

    //GroupBudget
    cardBackground: "#ffffff",
    expenseBackground: "#ffffff",
    cardShadow: "#00000033",
    modalInputBorder: "#ccc",
    cardBackground: "#ebebebff",
    saveBudgetButton: "#00A8E8",

    //Raport
    reportBackground: "#ffffff",
    reportText: "#333333",
    reportTextSecondary: "#666666",
    reportBorder: "#ccc",
    reportSelectorBackground: "#f9f9f9",
    reportCardBackground: "#ffffff",
    reportShadow: "#00000033",
    progressColor: "#2196f3",
    saveButton: "#2196f3",
    shareButton: "#4db6ac",

    //USerDetails
    userDetailsBackground: "#f0f2f5",
    userDetailsCard: "#ffffff",
    userDetailsShadow: "#00000033",
    userDetailsTitle: "#333333",
    userDetailsSubtitle: "#666666",
    userDetailsTextSecondary: "#999999",
    userDetailsText: "#333333",

    //AddUsers
    addUsersBackground: "#e6f0ff",
    addUsersCard: "#f7fbff",
    addUsersBorder: "#a8caff",
    addUsersText: "#003366",
    addUsersTitle: "#004a99",
    addUsersSubtitle: "#004a99",
    addUsersPrimary: "#007fff",
    addUsersPrimaryDisabled: "#80cfff",
    addUsersShadow: "#a8caff",
    addUsersButtonText: "#ffffff",
    addUsersEmpty: "#90a4ae",

    //CreateCategory
    createCategoryBackground: "#f0f2f5",
    createCategoryCard: "#ffffff",
    createCategoryBorder: "#e0e0e0",
    createCategoryText: "#333333",
    createCategoryTextSecondary: "#495057",
    createCategoryShadow: "#00000033",
    createCategoryButtonText: "#ffffff",

    //Category
    categoryDetailsBackground: "#f0f2f5",
    categoryDetailsCard: "#ffffff",
    categoryDetailsShadow: "#00000033",
    categoryDetailsTitle: "#333333",
    categoryDetailsSubtitle: "#666666",
    categoryDetailsButtonPrimary: "#2196f3",
    categoryDetailsButtonDanger: "#f44336",
    categoryDetailsButtonText: "#ffffff",
    categoryDetailsExpenseAmount: "#2196f3",
    categoryDetailsBorder: "#ccc",
    categoryDetailsModalBackground: "#ffffff",
    categoryDetailsModalOverlay: "rgba(0,0,0,0.5)",
    categoryDetailsModalText: "#333333",

    //Caht
    chatBackground: "#f5f5f5",
    chatHeaderBackground: "#ffffff",
    chatHeaderBorder: "#e0e0e0",
    chatHeaderText: "#333333",
    chatMyMessageBackground: "#007bff",
    chatMyMessageText: "#ffffff",
    chatOtherMessageBackground: "#ffffff",
    chatOtherMessageText: "#333333",
    chatMessageAuthor: "#333333",
    chatInputBackground: "#f0f0f0",
    chatInputBorder: "#e0e0e0",
    chatSendButtonBackground: "#007bff",
    chatSendButtonIcon: "#ffffff",

    //ListChat
    listChatsBackground: "#ffffff",
    listChatsItemBackground: "#F0F8FF",
    listChatsIcon: "#007bff",
    listChatsName: "#333333",
    listChatsLastMessage: "#555555",
    listChatsNoChats: "#999999",

    //Settings
    settingsBackground: "#a9e7fa",
    settingsButtonBackground: "#ffffff",
    settingsButtonText: "#222222",

    //Genersl
    generalBackground: "#f0f2f5",
    generalCardBackground: "#ffffff",
    generalCardShadow: "#00000022",
    generalTitle: "#333333",
    generalLabel: "#333333",
    generalPrimaryButton: "#6acce4",
    generalPrimaryButtonText: "#ffffff",

    //Notification
    notificationBackground: "#f0f2f5",
    notificationCardBackground: "#ffffff",
    notificationCardShadow: "#00000022",
    notificationTitle: "#333333",
    notificationLabel: "#333333",
    notificationInfo: "#0077B6",

    //Private
    privateBackground: "#f0f2f5",
    privateCardBackground: "#ffffff",
    privateCardShadow: "#00000022",
    privateTitle: "#333333",
    privateLabel: "#333333",
    privateTime: "#0077B6",

    //Help
    helpBackground: "#f0f2f5",
    helpCardBackground: "#ffffff",
    helpCardShadow: "#00000022",
    helpTitle: "#333333",
    helpSubtitle: "#0077B6",
    helpQuestion: "#333333",
    helpAnswer: "#555555",
    helpSupportButtonBackground: "#0077B6",
    helpSupportButtonText: "#ffffff",
    helpVersion: "#777777",
  },
};

export const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    // בסיס
    background: "#121212",
    card: "#1E1E1E",
    text: "#ffffff",
    textSecondary: "#aaaaaa",
    border: "#272729",
    tabBackground: "#1E1E1E",

    // ראשי
    primary: "#90E0EF",
    secondary: "#0077B6",
    info: "#a8dadc",

    // מצבים
    danger: "#ff6b6b",
    success: "#81c784",
    warning: "#ffb74d",

    // טאב בר
    tabInactive: "#90E0EF",
    tabActive: "#ffffff",

    // תוספות
    inputBackground: "#1f1f1f",
    inputPlaceholder: "#aaaaaa",
    headerBackground: "#1E1E1E",
    headerText: "#e0e0e0",
    buttonText: "#ffffff",
    shadow: "#00000099",
    typeColor: "#ffffff",

    // ProgressBar
    progressBackground: "#333333",
    progressNormal: "#70d6ff",
    progressWarning: "#ffc107",
    progressDanger: "#ff3b30",

    // כרטיסים
    cardBorder: "#444444",
    memberCardBackground: "#1E1E1E",
    addCardBackground: "#2a2a2a",

    // GroupInfo
    modalBackground: "#1E1E1E",
    modalOverlay: "rgba(0,0,0,0.7)",
    modalButtonBackground: "#2d3748",
    modalDeleteBackground: "#4a1c1c",
    closeText: "#cccccc",
    accent: "#64b5f6",
    buttonPrimary: "#081828ff",
    buttonSecondary: "#111e29ff",
    buttonDanger: "#361616ff",
    buttonText: "#ffffffff",

    //GroupBudget
    cardBackground: "#1E1E1E",
    expenseBackground: "#2a2a2a",
    cardShadow: "#00000099",
    modalInputBorder: "#444",
    cardBackground: "#212121ff",
    saveBudgetButton: "#0b2136ff",

    //Raport
    reportBackground: "#121212",
    reportText: "#ffffff",
    reportTextSecondary: "#aaaaaa",
    reportBorder: "#444",
    reportSelectorBackground: "#1E1E1E",
    reportCardBackground: "#1E1E1E",
    reportShadow: "#00000099",
    progressColor: "#90E0EF",
    saveButton: "#09141cff",
    shareButton: "#122a27ff",

    //USerDetails
    userDetailsBackground: "#121212",
    userDetailsCard: "#1E1E1E",
    userDetailsShadow: "#00000099",
    userDetailsTitle: "#ffffff",
    userDetailsSubtitle: "#aaaaaa",
    userDetailsTextSecondary: "#777777",
    userDetailsText: "#ffffff",

    //AddUsers
    addUsersBackground: "#121212",
    addUsersCard: "#1E1E1E",
    addUsersBorder: "#333333",
    addUsersText: "#ffffff",
    addUsersTitle: "#90E0EF",
    addUsersSubtitle: "#90E0EF",
    addUsersPrimary: "#64b5f6",
    addUsersPrimaryDisabled: "#2c3e50",
    addUsersShadow: "#00000099",
    addUsersButtonText: "#ffffff",
    addUsersEmpty: "#aaaaaa",

    //CraeteCategory
    createCategoryBackground: "#121212",
    createCategoryCard: "#1E1E1E",
    createCategoryBorder: "#333333",
    createCategoryText: "#ffffff",
    createCategoryTextSecondary: "#aaaaaa",
    createCategoryShadow: "#00000099",
    createCategoryButtonText: "#ffffff",

    //Category
    categoryDetailsBackground: "#121212",
    categoryDetailsCard: "#1E1E1E",
    categoryDetailsShadow: "#00000099",
    categoryDetailsTitle: "#ffffff",
    categoryDetailsSubtitle: "#aaaaaa",
    categoryDetailsButtonPrimary: "#32485cff",
    categoryDetailsButtonDanger: "#5a2727ff",
    categoryDetailsButtonText: "#ffffff",
    categoryDetailsExpenseAmount: "#ffffffff",
    categoryDetailsBorder: "#444",
    categoryDetailsModalBackground: "#1E1E1E",
    categoryDetailsModalOverlay: "rgba(0,0,0,0.7)",
    categoryDetailsModalText: "#ffffff",

    //Chat
    chatBackground: "#121212",
    chatHeaderBackground: "#1E1E1E",
    chatHeaderBorder: "#333333",
    chatHeaderText: "#ffffff",
    chatMyMessageBackground: "#2196f3",
    chatMyMessageText: "#ffffff",
    chatOtherMessageBackground: "#2a2a2a",
    chatOtherMessageText: "#ffffff",
    chatMessageAuthor: "#90caf9",
    chatInputBackground: "#1f1f1f",
    chatInputBorder: "#333333",
    chatSendButtonBackground: "#64b5f6",
    chatSendButtonIcon: "#000000",

    //ListChat
    listChatsBackground: "#121212",
    listChatsItemBackground: "#1E1E1E",
    listChatsIcon: "#64b5f6",
    listChatsName: "#ffffff",
    listChatsLastMessage: "#aaaaaa",
    listChatsNoChats: "#777777",

    //Settings
    settingsBackground: "#121212",
    settingsButtonBackground: "#1E1E1E",
    settingsButtonText: "#ffffff",

    //General
    generalBackground: "#121212",
    generalCardBackground: "#1E1E1E",
    generalCardShadow: "#00000088",
    generalTitle: "#ffffff",
    generalLabel: "#dddddd",
    generalPrimaryButton: "#2196f3",
    generalPrimaryButtonText: "#ffffff",

    //Notification
    notificationBackground: "#121212",
    notificationCardBackground: "#1E1E1E",
    notificationCardShadow: "#00000088",
    notificationTitle: "#ffffff",
    notificationLabel: "#dddddd",
    notificationInfo: "#90E0EF",

    //Private
    privateBackground: "#121212",
    privateCardBackground: "#1E1E1E",
    privateCardShadow: "#00000088",
    privateTitle: "#ffffff",
    privateLabel: "#dddddd",
    privateTime: "#2196f3",

    //Help
    helpBackground: "#121212",
    helpCardBackground: "#1E1E1E",
    helpCardShadow: "#00000088",
    helpTitle: "#ffffff",
    helpSubtitle: "#90E0EF",
    helpQuestion: "#ffffff",
    helpAnswer: "#cccccc",
    helpSupportButtonBackground: "#00B4D8",
    helpSupportButtonText: "#000000",
    helpVersion: "#aaaaaa",
  },

};
