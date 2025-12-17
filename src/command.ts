import assert from "assert";
import { CacheType, ChatInputCommandInteraction, Client, GuildMember } from "discord.js";
import { Transaction, readTransactions, writeTransactions } from "./transaction";

const GUILD_ID = process.env.GUILD_ID;

const historyReplyMsg = (n: number, transactions: Transaction[], members: Map<string, GuildMember>) => {
  assert(0 <= n);
  
  let replyText = "";
  for (const {i, transaction} of transactions
    .map((transaction, i) => ({i: i + 1, transaction}))
    .slice(transactions.length > n ? transactions.length - n : undefined)
    .reverse()
  ) {
    const payer = members.get(transaction.payer);
    const participant = members.get(transaction.participant);
    replyText += `${i}: ${
      payer === undefined ? "(存在しないユーザー)" : payer.displayName
    }が${
      participant === undefined ? "(存在しないユーザー)" : participant.displayName
    }の分のお金を${transaction.amount}円払った\n`;
  }
  if (transactions.length > n) {
    replyText += `(他${transactions.length - n}件)`
  }
  return replyText;
}

export const insertCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 今までの履歴を持ってくる
  const transactions = readTransactions();

  // 受け取った引数はこんな感じで取り出せる
  const participant = interaction.options.getUser("返金する人", true).id;
  const payer = interaction.options.getUser("支払った人", true).id;
  const amount = interaction.options.getInteger("金額", true);

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
  let replyText = historyReplyMsg(10, transactions, members);
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
  if (index < 1 || index > transactions.length) {
    await interaction.reply({ content: `ID: ${index} のデータは見つかりませんでした。（0 〜 ${transactions.length - 1} の範囲で指定してください）`, ephemeral: true });
    return;
  }

  // 4. 削除実行
  // spliceは削除された要素を配列で返すので、何が消えたか取得しておくと親切です
  const deletedItem = transactions.splice(index - 1, 1)[0];

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

export const historyCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  const transactions = readTransactions();

  const t = interaction.options.getInteger("個数");
  const n = t === null ? 10 : t;

  assert(GUILD_ID !== undefined);
  const guild = await client.guilds.fetch(GUILD_ID);
  const members = new Map(await guild.members.fetch());

  let replyText = historyReplyMsg(n, transactions, members);
  await interaction.reply(replyText);
}

export const listCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  const transactions = readTransactions();

  const memberAmounts = new Map<string, number>();
  for (const transaction of transactions) {
    const payerAmount = memberAmounts.get(transaction.payer);
    if (payerAmount === undefined) {
      memberAmounts.set(transaction.payer, transaction.amount);
    } else {
      memberAmounts.set(transaction.payer, payerAmount + transaction.amount)
    }
    
    const participantAmount = memberAmounts.get(transaction.participant);
    if (participantAmount === undefined) {
      memberAmounts.set(transaction.participant, -transaction.amount);
    } else {
      memberAmounts.set(transaction.participant, participantAmount - transaction.amount)
    }
  }

  const positiveRefundMembers: {member: string, amount: number}[] = [];
  const negativeRefundMembers: {member: string, amount: number}[] = [];
  for (const [member, amount] of memberAmounts) {
    if (amount > 0) {
      positiveRefundMembers.push({member, amount});
    } else if (amount < 0) {
      negativeRefundMembers.push({member, amount});
    }
  }
  positiveRefundMembers.sort((a, b) => (b.amount - a.amount));
  negativeRefundMembers.sort((a, b) => (b.amount - a.amount));

  const refunds: {from: string, to: string, amount: number}[] = []
  let positiveRefundMembersIndex = 0;
  let negativeRefundMembersIndex = 0;
  while (positiveRefundMembersIndex < positiveRefundMembers.length && negativeRefundMembersIndex < negativeRefundMembers.length) {
    if (positiveRefundMembers[positiveRefundMembersIndex].amount >= -negativeRefundMembers[negativeRefundMembersIndex].amount) {
      refunds.push({
        from: negativeRefundMembers[negativeRefundMembersIndex].member, 
        to: positiveRefundMembers[positiveRefundMembersIndex].member,
        amount: negativeRefundMembers[negativeRefundMembersIndex].amount
      });
      positiveRefundMembers[positiveRefundMembersIndex].amount -= negativeRefundMembers[negativeRefundMembersIndex].amount;
      negativeRefundMembers[negativeRefundMembersIndex].amount = 0;
      negativeRefundMembersIndex += 1;
    } else {
      refunds.push({
        from: negativeRefundMembers[negativeRefundMembersIndex].member, 
        to: positiveRefundMembers[positiveRefundMembersIndex].member,
        amount: positiveRefundMembers[positiveRefundMembersIndex].amount
      });
      positiveRefundMembers[positiveRefundMembersIndex].amount = 0;
      negativeRefundMembers[negativeRefundMembersIndex].amount -= positiveRefundMembers[positiveRefundMembersIndex].amount;
      positiveRefundMembersIndex += 1;
    }
  }

  assert(GUILD_ID !== undefined);
  const guild = await client.guilds.fetch(GUILD_ID);
  const members = new Map(await guild.members.fetch());

  let replyText = "";
  for (const {from, to, amount} of refunds) {
    const fromMember = members.get(from);
    const toMember = members.get(to);
    replyText += `${
      fromMember === undefined ? "(存在しないユーザー)" : fromMember.displayName
    }が${
      toMember === undefined ? "(存在しないユーザー)" : toMember.displayName
    }に${
      amount
    }円返金する\n`;
  }
  await interaction.reply(replyText);
}

export const refundCmd = async (client: Client<boolean>, interaction: ChatInputCommandInteraction<CacheType>) => {
  // 今までの履歴を持ってくる
  const transactions = readTransactions();

  // 受け取った引数はこんな感じで取り出せる
  const refundman = interaction.options.getUser("返金した人", true).id;
  const paymentman = interaction.options.getUser("お金を貸していた人", true).id;

  const memberAmounts = new Map<string, number>();
  for (const transaction of transactions) {
    const payerAmount = memberAmounts.get(transaction.payer);
    if (payerAmount === undefined) {
      memberAmounts.set(transaction.payer, transaction.amount);
    } else {
      memberAmounts.set(transaction.payer, payerAmount + transaction.amount)
    }
    
    const participantAmount = memberAmounts.get(transaction.participant);
    if (participantAmount === undefined) {
      memberAmounts.set(transaction.participant, -transaction.amount);
    } else {
      memberAmounts.set(transaction.participant, participantAmount - transaction.amount)
    }
  }

  const positiveRefundMembers: {member: string, amount: number}[] = [];
  const negativeRefundMembers: {member: string, amount: number}[] = [];
  for (const [member, amount] of memberAmounts) {
    if (amount > 0) {
      positiveRefundMembers.push({member, amount});
    } else if (amount < 0) {
      negativeRefundMembers.push({member, amount});
    }
  }
  positiveRefundMembers.sort((a, b) => (b.amount - a.amount));
  negativeRefundMembers.sort((a, b) => (b.amount - a.amount));

  const refunds: {from: string, to: string, amount: number}[] = []
  let positiveRefundMembersIndex = 0;
  let negativeRefundMembersIndex = 0;
  while (positiveRefundMembersIndex < positiveRefundMembers.length && negativeRefundMembersIndex < negativeRefundMembers.length) {
    if (positiveRefundMembers[positiveRefundMembersIndex].amount >= -negativeRefundMembers[negativeRefundMembersIndex].amount) {
      refunds.push({
        from: negativeRefundMembers[negativeRefundMembersIndex].member, 
        to: positiveRefundMembers[positiveRefundMembersIndex].member,
        amount: negativeRefundMembers[negativeRefundMembersIndex].amount
      });
      positiveRefundMembers[positiveRefundMembersIndex].amount -= negativeRefundMembers[negativeRefundMembersIndex].amount;
      negativeRefundMembers[negativeRefundMembersIndex].amount = 0;
      negativeRefundMembersIndex += 1;
    } else {
      refunds.push({
        from: negativeRefundMembers[negativeRefundMembersIndex].member, 
        to: positiveRefundMembers[positiveRefundMembersIndex].member,
        amount: positiveRefundMembers[positiveRefundMembersIndex].amount
      });
      positiveRefundMembers[positiveRefundMembersIndex].amount = 0;
      negativeRefundMembers[negativeRefundMembersIndex].amount -= positiveRefundMembers[positiveRefundMembersIndex].amount;
      positiveRefundMembersIndex += 1;
    }
  }

  // 借金をしている人のデータを一つずつ取り出して、返金した人と照らし合わせる
  for (let i = 0; i < negativeRefundMembers.length; i++) {
    if (refundman === negativeRefundMembers[i].member) {
      // 返金のデータを入れ(refundを見て金額を持ってきてtransactionを更新)
      refunds

    }
  }

  // Storage.jsonに新データを追加したものを書き込む
  writeTransactions(transactions);
};
