import assert from "assert";
import { readFileSync, writeFileSync } from "fs";

const STORAGE_PATH = "storage.json";

export type Transaction = {
  payer: string;
  participant: string;
  amount: number;
};

const isTransaction = (data: any): data is Transaction => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount)
  );
}

const isTransactionArray = (data: any): data is Transaction[] => {
  return Array.isArray(data) && data.every((item) => isTransaction(item));
}

export const readTransactions = (): Transaction[] => {
  const transactions = JSON.parse(readFileSync(STORAGE_PATH, "utf8"));
  assert(isTransactionArray(transactions));
  return transactions;
}

export const writeTransactions = (transactions: Transaction[]) => {
  writeFileSync(STORAGE_PATH, JSON.stringify(transactions, undefined, 2));
}