import { REST, Routes, SlashCommandBuilder } from 'discord.js';


// 登録するコマンドリスト
const commands = [
  // 追加
  new SlashCommandBuilder()
    .setName('insert') // コマンド名 すべて小文字
    .setDescription('支払いを追加します')
    .addUserOption((option) => 
      option
        .setName('支払った人')
        .setDescription('今回の支払いを建て替えた人')
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('返金する人')
        .setDescription('今回の支払いを返金すべき人')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('金額')
        .setDescription('支払いの金額')
        .setRequired(true)
        .setMinValue(1)
    ),
  // 削除
  new SlashCommandBuilder()
    .setName('delete') // コマンド名
    .setDescription('指定したIDのデータを削除します')
    .addIntegerOption((option) => 
      option.setName('id')
      .setDescription('削除したいデータの番号（ID）')
      .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("history")
    .setDescription("支払いの履歴を最新のものから表示します")
    .addIntegerOption((option) => 
      option
      .setName("個数")
      .setDescription("表示する個数")
    ),
  new SlashCommandBuilder()
    .setName("refund")
    .setDescription("支払いを合算したものを表示します")
].map((command) => command.toJSON());

// おまじない　サーバーにコマンドを登録する
const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  throw new Error('環境変数が不足しています');
}

const rest = new REST({ version: '10' }).setToken(token);
console.log('登録開始');
rest
  .put(
    Routes.applicationGuildCommands(clientId, guildId),
    { body: commands },
  )
  .then((v) => console.log('コマンド登録成功'))
  .catch((e) => console.log(e));
// (async () => {
//   try {
//     console.log('登録開始');
//     await rest.put(
//       Routes.applicationGuildCommands(clientId, guildId),
//       { body: commands },
//     );
//     console.log('コマンド登録成功');
//   } catch (error) {
//     console.error(error);
//   }
// })();