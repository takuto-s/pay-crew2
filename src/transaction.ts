import assert from "assert";
import { readFileSync, writeFileSync } from "fs";
import { transactionTrans } from "./transaction-trans";

const STORAGE_PATH = "storage.json";

export type TransactionJson = {
  payer: string;
  participant: string;
  amount: number;
  memo: string;
  date: string
};

export type Transaction = {
  payer: string;
  participant: string;
  amount: number;
  memo: string;
  date: Date
};

const isTransaction = (data: any): data is Transaction => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount) &&
    typeof data.memo === "string" &&
    data.date instanceof Date
  );
}

const isTransactionArray = (data: any): data is Transaction[] => {
  return Array.isArray(data) && data.every((item) => isTransaction(item));
}

const isTransactionJson = (data: any): data is TransactionJson => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount) &&
    typeof data.memo === "string" &&
    typeof data.date === "string"
  );
}

const isTransactionJsonArray = (data: any): data is TransactionJson[] => {
  return Array.isArray(data) && data.every((item) => isTransactionJson(item));
}

const transactionArrayParse = (data: any): Transaction[] | null => {
  if (isTransactionJsonArray(data)) {
    return data.map((v) => ({
      payer: v.payer,
      participant: v.participant,
      amount: v.amount,
      memo: v.memo,
      date: new Date(v.date),
    }));
  } else {
    return transactionTrans(data);
  }
}

export const readTransactions = (): Transaction[] => {
  const transactions = transactionArrayParse(JSON.parse(readFileSync(STORAGE_PATH, "utf8")));
  assert(transactions !== null);
  return transactions;
}

export const writeTransactions = (transactions: Transaction[]) => {
  writeFileSync(STORAGE_PATH, JSON.stringify(transactions, undefined, 2));
}