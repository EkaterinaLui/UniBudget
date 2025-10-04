export const getArchiveId = (year, month) => {
  return `${year}-${String(month).padStart(2, "0")}`;
};