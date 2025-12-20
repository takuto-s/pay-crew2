import { Transaction } from "./transaction";

export const transactionTrans = (data: any): Transaction[] | null => {
  if (isTransaction20251220Array(data)) {
    return transaction20251220Trans(data);
  }
  return null;
}

type Transaction20251220 = {
  payer: string;
  participant: string;
  amount: number;
};

const isTransaction20251220 = (data: any): data is Transaction20251220 => {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount)
  );
}

const isTransaction20251220Array = (data: any): data is Transaction20251220[] => {
  return Array.isArray(data) && data.every((item) => isTransaction20251220(item));
}

const transaction20251220Trans = (data: Transaction20251220[]): Transaction[] => {
  return data.map((v) => ({
    payer: v.payer,
    participant: v.participant,
    amount: v.amount,
    memo: "(タイトルなし)",
    date: new Date("1970-01-01T00:00:00Z")
  }));
}