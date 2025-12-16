import assert from "assert";
import { CacheType, ChatInputCommandInteraction, Client } from "discord.js";
import { Transaction, readTransactions, writeTransactions } from "./transaction";

const GUILD_ID = process.env.GUILD_ID;

export const insertCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 今までの履歴を持ってくる
  const transactions = readTransactions();

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
  for (const {i, transaction} of transactions.slice(-10).map((transaction, i) => ({i, transaction}))) {
    const payer = members.get(transaction.payer);
    const participant = members.get(transaction.participant);
    replyText += `${i}: ${
      payer === undefined ? "(存在しないユーザー)" : payer.displayName
    }が${
      participant === undefined ? "(存在しないユーザー)" : participant.displayName
    }の分のお金を${transaction.amount}円払った\n`;
  }
  await interaction.reply(replyText);

  // Storage.jsonに新データを追加したものを書き込む
  writeTransactions(transactions);
};

export const deleteCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 1. 今までの履歴を持ってくる
  const transactions = readTransactions();

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
  writeTransactions(transactions);

  assert(GUILD_ID !== undefined);
  const guild = await client.guilds.fetch(GUILD_ID);
  const members = new Map(await guild.members.fetch());

  const payer = members.get(deletedItem.payer);
  const participant = members.get(deletedItem.participant);

  // 6. 完了メッセージ
  const replyText = `以下ののデータを削除しました。\n\t返金する人: ${
    participant === undefined ? ("存在しないユーザー") : participant.displayName
  }\n\t払った人: ${
    payer === undefined ? ("存在しないユーザー") : payer.displayName
  }\n\t金額: ${
    deletedItem.amount
  }`;
  await interaction.reply({ content: replyText });
};