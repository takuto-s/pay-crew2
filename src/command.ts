import assert from "assert";
import { CacheType, ChatInputCommandInteraction, Client } from "discord.js";
import { Transaction, readTransactions, writeTransactions } from "./transaction";
import { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
} from "discord.js";

const GUILD_ID = process.env.GUILD_ID;
assert(GUILD_ID !== undefined);


const confirmButton = new ButtonBuilder()
  .setCustomId('confirm_transaction') // コード内で判別するためのID
  .setLabel('承認する')                // ボタンに表示される文字
  .setStyle(ButtonStyle.Primary);      // ボタンの色（青）

const cancelButton = new ButtonBuilder()
  .setCustomId('cancel_transaction')
  .setLabel('キャンセル')
  .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>()
  .addComponents(confirmButton, cancelButton);
export const insertCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 履歴の読み込み
  const transactions: Transaction[] = readTransactions();

  // 引数の受け取り
  const participant: string = interaction.options.getUser("返金する人", true).id;
  const payer: string = interaction.options.getUser("支払った人", true).id;
  const amount: number = interaction.options.getInteger("金額", true);

  // 新データ作成・追加
  const newData: Transaction = {
    participant,
    payer,
    amount,
  };
  transactions.push(newData);

  // 履歴の書き込み
  writeTransactions(transactions);

  // サーバー情報の取得
  const guild = await client.guilds.fetch(GUILD_ID);

  // idからmemberを取得
  const participantMember = guild.members.cache.get(participant);
  const payerMember = guild.members.cache.get(payer);

  // メッセージ送信
  const replyText: string = `以下の支払いを追加しました。\n\t返金する人: ${
    participantMember === undefined ? ("存在しないユーザー") : participantMember.displayName
  }\n\t払った人: ${
    payerMember === undefined ? ("存在しないユーザー") : payerMember.displayName
  }\n\t金額: ${
    amount
  }`;
  await interaction.reply(replyText);
};

export const deleteCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 履歴の読み込み
  const transactions: Transaction[] = readTransactions();

  // 引数の受け取り
  const index: number = interaction.options.getInteger("id", true);

  // バリデーション
  if (index < 1 || transactions.length < index) {
    await interaction.reply({ content: `ID: ${index} のデータは見つかりませんでした。（1 〜 ${transactions.length} の範囲で指定してください）`, ephemeral: true });
    return;
  }

  // 削除実行
  // indexが一つずれている
  const deletedItem: Transaction = transactions.splice(index - 1, 1)[0];

  // 履歴の書き込み
  writeTransactions(transactions);

  // サーバー情報の取得
  const guild = await client.guilds.fetch(GUILD_ID);

  // idからmemberを取得
  const payerMember = guild.members.cache.get(deletedItem.payer);
  const participantMember = guild.members.cache.get(deletedItem.participant);

  // メッセージ送信
  const replyText: string = `以下の支払いを削除しました。\n\t返金する人: ${
    participantMember === undefined ? ("存在しないユーザー") : participantMember.displayName
  }\n\t払った人: ${
    payerMember === undefined ? ("存在しないユーザー") : payerMember.displayName
  }\n\t金額: ${
    deletedItem.amount
  }`;
  await interaction.reply({ content: replyText });
};

export const historyCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 履歴の読み込み
  const transactions: Transaction[] = readTransactions();

  // 引数の受け取り
  const countNullable: number | null = interaction.options.getInteger("個数");
  const count: number = countNullable === null ? 10 : countNullable;

  // 表示個数
  const showCount: number = transactions.length >= count ? count : transactions.length;

  // サーバー情報の取得
  const guild = await client.guilds.fetch(GUILD_ID);

  // メッセージ送信
  const replyTexts: string[] = [];
  for (const {i, transaction} of transactions
    // indexを1ずらす
    .map((transaction, i) => ({i: i + 1, transaction}))
    // 逆順
    .reverse()
    // 表示個数分だけ取得
    .slice(0, showCount)
  ) {
    // idからmemberを取得
    const payerMember = guild.members.cache.get(transaction.payer);
    const participantMember = guild.members.cache.get(transaction.participant);
    replyTexts.push(
      `${i}: ${
        payerMember === undefined ? "(存在しないユーザー)" : payerMember.displayName
      }が${
        participantMember === undefined ? "(存在しないユーザー)" : participantMember.displayName
      }の分のお金を${transaction.amount}円払った\n`
    );
  }
  if (transactions.length > showCount) {
    replyTexts.push(`(他${transactions.length - showCount}件)`);
  }
  const replyText: string = replyTexts.join("");
  await interaction.reply(replyText);
}

type Refund = {from: string, to: string, amount: number};
const refundList = () => {
  // 履歴の読み込み
  const transactions: Transaction[] = readTransactions();

  const memberAmounts: Map<string, number> = new Map<string, number>();
  for (const transaction of transactions) {
    const payerAmount = memberAmounts.get(transaction.payer);
    memberAmounts.set(transaction.payer, (payerAmount === undefined ? 0 : payerAmount) + transaction.amount);
    
    const participantAmount = memberAmounts.get(transaction.participant);
    memberAmounts.set(transaction.participant, (participantAmount === undefined ? 0 : participantAmount) - transaction.amount)
  }

  type MemberAmount = {member: string, amount: number};
  const positiveMembers: MemberAmount[] = [];
  const negativeMembers: MemberAmount[] = [];
  memberAmounts.forEach((v, k) => {if (v > 0) {
    positiveMembers.push({member: k, amount: v});
  } else if (v < 0) {
    negativeMembers.push({member: k, amount: v});
  }})
  positiveMembers.sort((a, b) => (b.amount - a.amount));
  negativeMembers.sort((a, b) => (b.amount - a.amount));

  const refunds: Refund[] = []
  let pIndex = 0;
  let nIndex = 0;
  while (pIndex < positiveMembers.length && nIndex < negativeMembers.length) {
    if (positiveMembers[pIndex].amount >= -negativeMembers[nIndex].amount) {
      refunds.push({
        from: negativeMembers[nIndex].member, 
        to: positiveMembers[pIndex].member,
        amount: negativeMembers[nIndex].amount
      });
      positiveMembers[pIndex].amount -= negativeMembers[nIndex].amount;
      negativeMembers[nIndex].amount = 0;
      nIndex += 1;
    } else {
      refunds.push({
        from: negativeMembers[nIndex].member, 
        to: positiveMembers[pIndex].member,
        amount: positiveMembers[pIndex].amount
      });
      positiveMembers[pIndex].amount = 0;
      negativeMembers[nIndex].amount -= positiveMembers[pIndex].amount;
      pIndex += 1;
    }
  }
  return refunds;
}

export const listCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  const refunds = refundList();

  const guild = await client.guilds.fetch(GUILD_ID);

  const replyTexts: string[] = [];
  for (const {from, to, amount} of refunds) {
    const fromMember = guild.members.cache.get(from);
    const toMember = guild.members.cache.get(to);
    replyTexts.push(
      `${
        fromMember === undefined ? "(存在しないユーザー)" : fromMember.displayName
      }が${
        toMember === undefined ? "(存在しないユーザー)" : toMember.displayName
      }に${
        -amount
      }円返金する\n`
    );
  }
  const replyText = replyTexts.join("");
  await interaction.reply({
    content:replyText,
    components: [row],
  });
}

export const refundCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 今までの履歴を持ってくる
  const transactions = readTransactions();

  // 受け取った引数はこんな感じで取り出せる
  const refundman = interaction.options.getUser("返金した人", true).id;
  const paymentman = interaction.options.getUser("お金を貸していた人", true).id;

  const refunds = refundList();

  // 借金をしている人のデータを一つずつ取り出して、返金した人と照らし合わせる
  // for (let i = 0; i < negativeRefundMembers.length; i++) {
  //   if (refundman === negativeRefundMembers[i].member) {
  //     // 返金のデータを入れ(refundを見て金額を持ってきてtransactionを更新)
  //     refunds

  //   }
  // }

  // Storage.jsonに新データを追加したものを書き込む
  writeTransactions(transactions);
};
