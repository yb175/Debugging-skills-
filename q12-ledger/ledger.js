"use strict";

/**
 * @param {string[]} commands
 * @returns {string} Comma-separated BALANCE results, or '' if there are none.
 */

// key : account id , value : balance
const userBalance = new Map();

// key : account_id , value : array consisting {day of settlement,amount}
const userPending = new Map();

// weekly track
// key : acc_id-week : balance
const userWeekly = new Map();
const userDaily = new Map();
const MAX_DAILY_LIMIT = 5000000n;
const MAX_WEEKLY_LIMIT = 10000000n;
function parseCommand(command) {
  return command.split(" ");
}

function isAccountKnown(account_id) {
  return userBalance.has(account_id);
}
// function for initializing the account
function initAccount(account_id, amount) {
  if (isAccountKnown(account_id)) return;
  userBalance.set(account_id, BigInt(amount));
  userPending.set(account_id, []);
}

function parseTimeStamp(timestamp) {
  const parsedtimeStamp = timestamp.split(",");
  let day = parsedtimeStamp[0];
  let time = parsedtimeStamp[1] != null ? parsedtimeStamp[1] : 0;
  return [parseInt(day), parseInt(time)];
}
function isWeekend(day) {
  return day % 7 == 6 || day % 7 == 0;
}
function wireSettlement(timestamp, account_id, amount) {
  let [day, time] = parseTimeStamp(timestamp);

  let effectiveDay = day;
  if (isWeekend(day)) {
    while (isWeekend(effectiveDay)) effectiveDay++;
  } else if (time < 17) {
    effectiveDay = day;
  } else {
    effectiveDay = day + 1;
    while (isWeekend(effectiveDay)) effectiveDay++;
  }
  userPending.get(account_id).push([effectiveDay, BigInt(amount)]);
}
function ACHSettlement(timestamp, account_id, amount) {
  let [day, time] = parseTimeStamp(timestamp);
  let effectiveDay = day;
  amount = BigInt(amount) ; 
  if (isWeekend(day)) {
    while (isWeekend(effectiveDay)) effectiveDay++;
  } else if (time < 20) {
    effectiveDay = day;
  } else {
    effectiveDay = day + 1;
    while (isWeekend(effectiveDay)) effectiveDay++;
  }
  const DAILY_KEY = `${account_id}-${effectiveDay}`;
  const WEEKLY_KEY = `${account_id}-${Math.floor((effectiveDay - 1) / 7)}`;

  if (!userDaily.has(DAILY_KEY)) {
    userDaily.set(DAILY_KEY, 0n);
  }
  if (!userWeekly.has(WEEKLY_KEY)) {
    userWeekly.set(WEEKLY_KEY, 0n);
  }

  let currDailyAmt = userDaily.get(DAILY_KEY) + amount;
  let currWeeklyAmt = userWeekly.get(WEEKLY_KEY) + amount;

  if (currDailyAmt > MAX_DAILY_LIMIT || currWeeklyAmt > MAX_WEEKLY_LIMIT){
    return;
  }
  userDaily.set(DAILY_KEY, currDailyAmt);
  userWeekly.set(WEEKLY_KEY, currWeeklyAmt);
  let submissionDay = effectiveDay + 1;
  while (isWeekend(submissionDay)) submissionDay++;
  userPending.get(account_id).push([submissionDay, amount]);
}
function getBalance(account_id, timestamp) {
  let balance = userBalance.get(account_id);
  let [day, time] = parseTimeStamp(timestamp);

  for (let due of userPending.get(account_id)) {
    let [duedate, amount] = due;
    if (duedate <= day) {
      balance += amount;
    }
  }
  return balance;
}
function processLedger(commands) {
  const result = [];
  userBalance.clear();
  userPending.clear();
  userDaily.clear();
  userWeekly.clear();
  for (let command of commands) {
    const parsedCommand = parseCommand(command);
    if (parsedCommand[0] == "INIT") {
      let [action, account_id, amount] = parsedCommand;
      initAccount(account_id, amount);
    } else if (parsedCommand[0] == "FUND") {
      let [action, timestamp, account_id, method, amount] = parsedCommand;
      if (!isAccountKnown(account_id)) continue;
      if (method === "WIRE") {
        wireSettlement(timestamp, account_id, amount);
      } else if (method === "ACH") {
        // will implement later
        ACHSettlement(timestamp, account_id, amount);
      } else if (method === "STABLECOIN") {
        let [day, time] = parseTimeStamp(timestamp);
        userPending.get(account_id).push([day, BigInt(amount)]);
      }
    } else if (parsedCommand[0] == "BALANCE") {
      let [action, timestamp, account_id] = parsedCommand;
      if (!isAccountKnown(account_id)) {
        result.push("FAILURE");
        continue;
      }

      result.push(`${getBalance(account_id, timestamp)}`);
    }
  }
  return result.join(",");
}

module.exports = { processLedger };
