/**
 * 认证页/分享图日期统一格式：YYYY.MM.DD。
 *
 * 不用本地化日期接口：不同地区设置会输出 11/10/2026 或 2026/11/10，
 * 同一个版本在不同手机上排版不一致。纯函数，方便单测。
 */
export function formatCertDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const pad = (value: number): string => (value < 10 ? `0${value}` : `${value}`);
  return `${year}.${pad(month)}.${pad(day)}`;
}
