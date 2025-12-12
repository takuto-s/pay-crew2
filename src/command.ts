import assert from "assert";
import { CacheType, ChatInputCommandInteraction } from "discord.js";
import { readFileSync, writeFileSync } from "fs";
import { client } from ".";

const STORAGE_PATH = "storage.json";
const GUILD_ID = process.env.GUILD_ID;

type Transaction = {
  payer: string;
  participant: string;
  amount: number;
};

function isTransaction(data: any): data is Transaction {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.payer === "string" &&
    typeof data.participant === "string" &&
    typeof data.amount === "number" &&
    !Number.isNaN(data.amount)
  );
}

function isTransactionArray(data: any): data is Transaction[] {
  return Array.isArray(data) && data.every((item) => isTransaction(item));
}

export const insertCmd = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  // 今までの履歴を持ってくる
  const transactions = JSON.parse(readFileSync(STORAGE_PATH, "utf8"));
  assert(isTransactionArray(transactions));

  // 受け取った引数はこんな感じで取り出せる
  const participant = interaction.options.getUser("participant", true).id;
  const payer = interaction.options.getUser("payer", true).id;
  const amount = interaction.options.getInteger("amount", true);

  // 新データ作成
  const newData: Transaction = {
    participant,
    payer,
    amount,
  };
  transactions.push(newData);

  assert(GUILD_ID !== undefined);
  const guild = await client.guilds.fetch(GUILD_ID);

  const members = new Map(await guild.members.fetch());

  // 応答文章作成
  let replyText = "";
  for (const {i, transaction} of transactions.map((transaction, i) => ({i, transaction}))) {
    console.log(transaction);
    replyText += `${i}: ${
      (await guild.members.fetch(transaction.payer)).displayName
    }が${
      (await guild.members.fetch(transaction.participant)).displayName
    }の分のお金を${transaction.amount}円払った\n`;
  }
  await interaction.reply(replyText);

  // Storage.jsonに新データを追加したものを書き込む
  writeFileSync(STORAGE_PATH, JSON.stringify(transactions, undefined, 2));
};

export const deleteCmd = async (interaction: ChatInputCommandInteraction<CacheType>) => {
  // 1. 今までの履歴を持ってくる
  const transactions = JSON.parse(readFileSync(STORAGE_PATH, "utf8"));
  
  // 型アサーション関数（既存のコードにある想定）
  assert(isTransactionArray(transactions)); 

  // 2. Integer(整数)としてインデックスを受け取る
  const index = interaction.options.getInteger("id", true);

  // 3. バリデーション: その番号のデータが本当に存在するか確認
  if (index < 0 || index >= transactions.length) {
    await interaction.reply({ content: `ID: ${index} のデータは見つかりませんでした。（0 〜 ${transactions.length - 1} の範囲で指定してください）`, ephemeral: true });
    return;
  }

  // 4. 削除実行
  // spliceは削除された要素を配列で返すので、何が消えたか取得しておくと親切です
  const deletedItem = transactions.splice(index, 1)[0];

  // 5. 重要: 変更内容をファイルに書き込む（保存）
  writeFileSync(STORAGE_PATH, JSON.stringify(transactions, undefined, 2));

  // 6. 完了メッセージ
  const replyText = `以下ののデータを削除しました。\n\t返金する人: ${deletedItem.participant}\n\t払った人: ${deletedItem.payer}\n\t金額: ${deletedItem.amount}`;
  await interaction.reply({ content: replyText });
};