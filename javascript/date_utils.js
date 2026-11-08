const results = [];

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push(ok);
  const shown = String(JSON.stringify(actual)).slice(0, 40);
  console.log(name.padEnd(26) + shown.padEnd(42) + (ok ? "ok" : "MISMATCH expected " + JSON.stringify(expected)));
}

function raises(fn) {
  try {
    fn();
  } catch (e) {
    return true;
  }
  return false;
}

const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isLeap(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInYear(year) {
  return isLeap(year) ? 366 : 365;
}

function daysInMonth(year, month) {
  if (month < 1 || month > 12) {
    throw new Error("month must be 1 to 12");
  }
  if (month === 2 && isLeap(year)) {
    return 29;
  }
  return MONTH_DAYS[month - 1];
}

function isValidDate(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1) {
    return false;
  }
  return day <= daysInMonth(year, month);
}

function needValid(date) {
  if (!isValidDate(date[0], date[1], date[2])) {
    throw new Error("invalid date: " + date.join("-"));
  }
}

function dayOfYear(year, month, day) {
  needValid([year, month, day]);
  let total = day;
  for (let m = 1; m < month; m++) {
    total += daysInMonth(year, m);
  }
  return total;
}

function dayNumber(date) {
  const y = date[0] - 1;
  const base = y * 365 + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400);
  return base + dayOfYear(date[0], date[1], date[2]);
}

function daysBetween(a, b) {
  return dayNumber(b) - dayNumber(a);
}

function compareDates(a, b) {
  const diff = dayNumber(a) - dayNumber(b);
  if (diff < 0) {
    return -1;
  }
  if (diff > 0) {
    return 1;
  }
  return 0;
}

function nextDay(date) {
  const y = date[0];
  const m = date[1];
  const d = date[2];
  if (d < daysInMonth(y, m)) {
    return [y, m, d + 1];
  }
  if (m < 12) {
    return [y, m + 1, 1];
  }
  return [y + 1, 1, 1];
}

function addDays(date, count) {
  needValid(date);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error("count must be a non-negative integer");
  }
  let current = date.slice();
  for (let i = 0; i < count; i++) {
    current = nextDay(current);
  }
  return current;
}

function weekdayIndex(year, month, day) {
  return (dayNumber([year, month, day]) - 1) % 7;
}

function weekdayName(year, month, day) {
  return DAY_NAMES[weekdayIndex(year, month, day)];
}

function isWeekend(year, month, day) {
  return weekdayIndex(year, month, day) >= 5;
}

function pad(n, width) {
  return String(n).padStart(width, "0");
}

function formatDate(date) {
  needValid(date);
  return pad(date[0], 4) + "-" + pad(date[1], 2) + "-" + pad(date[2], 2);
}

function parseDate(text) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) {
    throw new Error("bad date text: " + text);
  }
  const date = [Number(match[1]), Number(match[2]), Number(match[3])];
  needValid(date);
  return date;
}

function longFormat(date) {
  needValid(date);
  return MONTH_NAMES[date[1] - 1] + " " + date[2] + ", " + date[0];
}

function leapYearsBetween(from, to) {
  const found = [];
  for (let y = from; y <= to; y++) {
    if (isLeap(y)) {
      found.push(y);
    }
  }
  return found;
}

function age(birth, today) {
  let years = today[0] - birth[0];
  if (today[1] < birth[1] || (today[1] === birth[1] && today[2] < birth[2])) {
    years--;
  }
  return years;
}

check("leap 2000", isLeap(2000), true);
check("leap 1900", isLeap(1900), false);
check("leap 2024", isLeap(2024), true);
check("leap 2023", isLeap(2023), false);
check("leap 2100", isLeap(2100), false);
check("leap 1996", isLeap(1996), true);
check("days in year 2024", daysInYear(2024), 366);
check("days in year 2023", daysInYear(2023), 365);
check("leap years list", leapYearsBetween(2020, 2030), [2020, 2024, 2028]);
check("leap century", leapYearsBetween(1896, 1904), [1896, 1904]);

console.log();
check("january", daysInMonth(2023, 1), 31);
check("february", daysInMonth(2023, 2), 28);
check("february leap", daysInMonth(2024, 2), 29);
check("april", daysInMonth(2023, 4), 30);
check("december", daysInMonth(2023, 12), 31);
check("month zero", raises(() => daysInMonth(2023, 0)), true);
check("month 13", raises(() => daysInMonth(2023, 13)), true);
check("valid date", isValidDate(2024, 2, 29), true);
check("invalid leap day", isValidDate(2023, 2, 29), false);
check("invalid day zero", isValidDate(2023, 5, 0), false);
check("invalid april 31", isValidDate(2023, 4, 31), false);
check("invalid month", isValidDate(2023, 13, 1), false);
check("invalid decimal", isValidDate(2023, 1, 1.5), false);

console.log();
check("day of year jan 1", dayOfYear(2023, 1, 1), 1);
check("day of year mar 1", dayOfYear(2023, 3, 1), 60);
check("day of year mar 1 leap", dayOfYear(2024, 3, 1), 61);
check("day of year dec 31", dayOfYear(2023, 12, 31), 365);
check("day of year dec 31 leap", dayOfYear(2024, 12, 31), 366);
check("day of year jul 4", dayOfYear(2024, 7, 4), 186);
check("day of year invalid", raises(() => dayOfYear(2023, 2, 30)), true);

console.log();
check("add one day", addDays([2023, 5, 10], 1), [2023, 5, 11]);
check("add zero days", addDays([2023, 5, 10], 0), [2023, 5, 10]);
check("month rollover", addDays([2023, 1, 31], 1), [2023, 2, 1]);
check("year rollover", addDays([2023, 12, 31], 1), [2024, 1, 1]);
check("leap day reached", addDays([2024, 2, 28], 1), [2024, 2, 29]);
check("leap day passed", addDays([2024, 2, 28], 2), [2024, 3, 1]);
check("non leap february", addDays([2023, 2, 28], 1), [2023, 3, 1]);
check("add a year", addDays([2023, 1, 1], 365), [2024, 1, 1]);
check("add a leap year", addDays([2024, 1, 1], 366), [2025, 1, 1]);
check("add negative", raises(() => addDays([2023, 1, 1], -1)), true);
check("add to invalid", raises(() => addDays([2023, 2, 30], 1)), true);

console.log();
check("between same", daysBetween([2023, 1, 1], [2023, 1, 1]), 0);
check("between one year", daysBetween([2023, 1, 1], [2024, 1, 1]), 365);
check("between leap year", daysBetween([2024, 1, 1], [2025, 1, 1]), 366);
check("between whole 2000", daysBetween([2000, 1, 1], [2000, 12, 31]), 365);
check("between backwards", daysBetween([2023, 1, 2], [2023, 1, 1]), -1);
check("compare less", compareDates([2023, 1, 1], [2023, 1, 2]), -1);
check("compare equal", compareDates([2023, 6, 6], [2023, 6, 6]), 0);
check("compare greater", compareDates([2024, 1, 1], [2023, 12, 31]), 1);

console.log();
check("weekday 2024-01-01", weekdayName(2024, 1, 1), "Monday");
check("weekday 2000-01-01", weekdayName(2000, 1, 1), "Saturday");
check("weekday 2024-07-04", weekdayName(2024, 7, 4), "Thursday");
check("weekday index monday", weekdayIndex(2024, 1, 1), 0);
check("weekend saturday", isWeekend(2000, 1, 1), true);
check("weekend sunday", isWeekend(2000, 1, 2), true);
check("not weekend monday", isWeekend(2000, 1, 3), false);
const nextWeek = addDays([2024, 7, 4], 7);
check("same weekday a week later", weekdayName(nextWeek[0], nextWeek[1], nextWeek[2]), "Thursday");

console.log();
check("format", formatDate([2024, 3, 5]), "2024-03-05");
check("format small year", formatDate([987, 1, 2]), "0987-01-02");
check("parse", parseDate("2024-03-05"), [2024, 3, 5]);
check("parse bad text", raises(() => parseDate("2024/03/05")), true);
check("parse bad date", raises(() => parseDate("2023-02-30")), true);
check("parse short", raises(() => parseDate("2024-3-5")), true);
check("long format", longFormat([2024, 3, 5]), "March 5, 2024");
check("format round trip", formatDate(parseDate("1999-12-31")), "1999-12-31");
check("age before birthday", age([2000, 6, 15], [2024, 6, 14]), 23);
check("age on birthday", age([2000, 6, 15], [2024, 6, 15]), 24);
check("age later month", age([2000, 6, 15], [2024, 12, 1]), 24);

console.log();
const start = [2000, 1, 1];
let consistent = true;
for (let n = 0; n <= 800; n++) {
  const moved = addDays(start, n);
  if (daysBetween(start, moved) !== n) {
    consistent = false;
  }
}
check("add and between agree", consistent, true);
const far = addDays(start, 10000);
check("10000 days later", daysBetween(start, far), 10000);
check("far date is valid", isValidDate(far[0], far[1], far[2]), true);
let validAll = true;
let current = [1999, 1, 1];
for (let i = 0; i < 3000; i++) {
  if (!isValidDate(current[0], current[1], current[2])) {
    validAll = false;
  }
  current = nextDay(current);
}
check("3000 valid dates in a row", validAll, true);
check("final date", current, [2007, 3, 22]);

console.log();
console.log("Passed      :", results.filter(Boolean).length, "of", results.length);
console.log("All correct :", results.every(Boolean));
