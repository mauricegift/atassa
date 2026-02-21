const { gmd, commands, getSetting } = require("../gift");
const fs = require("fs").promises;
const fsA = require("node:fs");
const { S_WHATSAPP_NET } = require("gifted-baileys");
const { Jimp } = require("jimp");
const path = require("path");
const { exec, spawn } = require("node:child_process");
const moment = require("moment-timezone");
const {
  groupCache,
  getGroupMetadata,
  cachedGroupMetadata,
} = require("../gift/connection/groupCache");

gmd(
  {
    pattern: "restart",
    aliases: ["reboot", "restartnow"],
    react: "🔄",
    category: "owner",
    description: "Restart the bot server (owner only)",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser } = conText;

    if (!isSuperUser) return reply("*Owner Only Command*");

    try {
      await react("🔄");
      await reply(
        "🔄 *Restarting bot...*\n\nPlease wait a few seconds for the bot to come back online.",
      );

      setTimeout(() => {
        process.exit(0);
      }, 1500);
    } catch (e) {
      console.error("Restart error:", e);
      await reply("❌ Failed to restart: " + e.message);
    }
  },
);

gmd(
  {
    pattern: "shutdown",
    aliases: ["logout", "logoutnow", "stopbot"],
    react: "🛑",
    category: "owner",
    description: "Logout and shutdown the bot completely (owner only)",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser } = conText;

    if (!isSuperUser) return reply("*Owner Only Command*");

    try {
      await react("🛑");
      await reply(
        "🛑 *Logging out and shutting down...*\n\nThe bot will be completely disconnected. You will need to re-scan QR to reconnect.",
      );

      setTimeout(async () => {
        try {
          await Gifted.logout();
        } catch (logoutErr) {
          console.error("Logout error:", logoutErr);
        }
        process.exit(0);
      }, 1500);
    } catch (e) {
      console.error("Shutdown error:", e);
      await reply("❌ Failed to shutdown: " + e.message);
    }
  },
);

gmd(
  {
    pattern: "owner",
    description: "Shows Owner the Bot",
    category: "owner",
    react: "👑",
  },
  async (from, Gifted, conText) => {
    const { q, mek, react, reply, isSuperUser, ownerName, ownerNumber } =
      conText;

    try {
      if (!isSuperUser) return reply("*Owner Only Command*");

      const vcard =
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${ownerName}\n` +
        "ORG:GIFTED-TECH;\n" +
        `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:${ownerNumber}\n` +
        "END:VCARD";

      await Gifted.sendMessage(
        from,
        {
          contacts: {
            displayName: ownerName,
            contacts: [{ vcard }],
          },
        },
        { quoted: mek },
      );

      await react("✅");
    } catch (e) {
      console.log(e);
      reply(`${e}`);
    }
  },
);

gmd(
  {
    pattern: "shell",
    react: "👑",
    aliases: ["exec", "terminal", "sh", "ex"],
    category: "owner",
    description: "Run shell commands",
  },
  async (from, Gifted, conText) => {
    const { q, mek, react, reply, isSuperUser } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    if (!q) {
      await react("❌");
      return reply("❌ Please provide a shell command!");
    }

    try {
      const options = {
        maxBuffer: 10 * 1024 * 1024,
        encoding: "utf-8",
      };

      exec(q, options, async (err, stdout, stderr) => {
        try {
          if (err) {
            await react("❌");
            return reply(`Error: ${err.message}`);
          }
          if (stderr) {
            await react("⚠️");
            return reply(`stderr: ${stderr}`);
          }

          const zipPath =
            extractFilePath(stdout) ||
            (q.includes("zip") ? extractFilePath(q) : null);
          if (zipPath && fsA.existsSync(zipPath)) {
            await handleZipFile(from, Gifted, mek, react, zipPath);
            return;
          }

          if (stdout) {
            if (stdout.length > 10000) {
              await handleLargeOutput(from, Gifted, mek, react, stdout);
            } else {
              await react("✅");
              await reply(stdout);
            }
          } else {
            await react("✅");
            await reply("Command executed successfully (no output)");
          }
        } catch (error) {
          console.error("Output handling error:", error);
          await react("❌");
          await reply(`❌ Output handling error: ${error.message}`);
        }
      });
    } catch (error) {
      console.error("Exec Error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

function extractFilePath(text) {
  const match = text.match(/(\/[^\s]+\.zip)/);
  return match ? match[0].trim() : null;
}

async function handleZipFile(from, Gifted, mek, react, zipPath) {
  try {
    await react("📦");
    const zipContent = fsA.readFileSync(zipPath);
    const filename = path.basename(zipPath);
    await Gifted.sendMessage(
      from,
      {
        document: zipContent,
        fileName: filename,
        mimetype: "application/zip",
      },
      { quoted: mek },
    );
    fsA.unlinkSync(zipPath);
  } catch (e) {
    console.error("Zip send error:", e);
    throw e;
  }
}

async function handleLargeOutput(from, Gifted, mek, react, stdout) {
  await react("📤");
  let extension = ".txt";
  let mimetype = "text/plain";
  let fileContent = stdout;

  const isPotentialJson =
    /^[\s]*[\{\[]/.test(stdout) && /[\}\]]$/.test(stdout.trim());
  if (isPotentialJson) {
    try {
      const jsonObj = JSON.parse(stdout);
      fileContent = JSON.stringify(jsonObj, null, 2);
      extension = ".json";
      mimetype = "application/json";
    } catch (e) {}
  }

  if (mimetype === "text/plain") {
    if (/<\s*html[\s>]|<!DOCTYPE html>/i.test(stdout)) {
      extension = ".html";
      mimetype = "text/html";
    } else if (
      /<\s*\/?\s*(div|span|p|a|img|body|head|title)[\s>]/i.test(stdout)
    ) {
      extension = ".html";
      mimetype = "text/html";
    } else if (
      /function\s*\w*\s*\(|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|class\s+\w+/i.test(
        stdout,
      )
    ) {
      extension = ".js";
      mimetype = "application/javascript";
    } else if (/^\s*#\s.*|^\s*-\s.*|^\s*\*\s.*|^\s*\d+\.\s.*/.test(stdout)) {
      extension = ".md";
      mimetype = "text/markdown";
    } else if (
      /^\s*(def|class)\s+\w+|^\s*import\s+\w+|^\s*from\s+\w+|^\s*print\(/.test(
        stdout,
      )
    ) {
      extension = ".py";
      mimetype = "text/x-python";
    } else if (
      /^\s*package\s+\w+|^\s*import\s+\w+\.\w+|^\s*public\s+class\s+\w+/.test(
        stdout,
      )
    ) {
      extension = ".java";
      mimetype = "text/x-java-source";
    } else if (/<\?php|\$[a-zA-Z_]+\s*=|function\s+\w+\s*\(/.test(stdout)) {
      extension = ".php";
      mimetype = "application/x-httpd-php";
    } else if (
      /^\s*#include\s+<|^\s*int\s+main\s*\(|^\s*printf\s*\(/.test(stdout)
    ) {
      extension = ".c";
      mimetype = "text/x-csrc";
    } else if (
      /^\s*#include\s+<|^\s*using\s+namespace|^\s*cout\s*<</.test(stdout)
    ) {
      extension = ".cpp";
      mimetype = "text/x-c++src";
    } else if (/^\s*<[?]xml\s+version|<\w+\s+xmlns(:?\w+)?=/.test(stdout)) {
      extension = ".xml";
      mimetype = "application/xml";
    } else if (/^\s*#!\s*\/bin\/bash|^\s*echo\s+\"\$/.test(stdout)) {
      extension = ".sh";
      mimetype = "application/x-sh";
    } else if (/^\s*---\s*$|^\s*title\s*:/m.test(stdout)) {
      extension = ".yml";
      mimetype = "application/x-yaml";
    }
  }

  const filename = `output_${Date.now()}${extension}`;
  await Gifted.sendMessage(
    from,
    {
      document: Buffer.from(fileContent),
      fileName: filename,
      mimetype: mimetype,
    },
    { quoted: mek },
  );
}

gmd(
  {
    pattern: ">",
    on: "body",
    react: "👑",
    category: "owner",
    description: "Quick eval with > prefix (e.g., >botMode, >db, >db.prefix)",
  },
  async (from, Gifted, conText) => {
    const {
      m,
      mek,
      body,
      edit,
      react,
      del,
      args,
      quoted,
      isCmd,
      command,
      isAdmin,
      isBotAdmin,
      isSuperAdmin,
      sender,
      pushName,
      setSudo,
      delSudo,
      q,
      reply,
      config,
      superUser,
      tagged,
      mentionedJid,
      isGroup,
      groupInfo,
      groupName,
      getSudoNumbers,
      authorMessage,
      user,
      groupMember,
      repliedMessage,
      quotedMsg,
      quotedUser,
      isSuperUser,
      botMode,
      botPic,
      botFooter,
      botCaption,
      botVersion,
      groupAdmins,
      participants,
      ownerNumber,
      ownerName,
      botName,
      giftedRepo,
      getMediaBuffer,
      getFileContentType,
      bufferToStream,
      uploadToPixhost,
      uploadToImgBB,
      uploadToGithubCdn,
      uploadToGiftedCdn,
      uploadToCatbox,
      newsletterUrl,
      newsletterJid,
      GiftedTechApi,
      GiftedApiKey,
      botPrefix,
      gmdBuffer,
      gmdJson,
      formatAudio,
      formatVideo,
      timeZone,
    } = conText;

    const text = body?.trim();
    if (!text || !text.startsWith(">")) return;

    if (!isSuperUser) {
      return;
    }

    const code = text.slice(1).trim();
    if (!code) {
      return reply(
        `Please provide code to eval or a function to run.\n\nExamples:\n> db\n> db.prefix\n> botMode\n> 1+1`,
      );
    }

    const { getAllSettings } = require("../gift/database/settings");
    const {
      getEnabledGroupSettings,
      getGroupSetting,
    } = require("../gift/database/groupSettings");

    try {
      const allSettings = await getAllSettings();
      const sudoList = await getSudoNumbers();
      const groupSettings = await getEnabledGroupSettings();
      const isGroup = from.endsWith("@g.us");

      const db = {};
      for (const [key, val] of Object.entries(allSettings)) {
        db[key.toLowerCase()] = val;
      }
      db.sudo_numbers = sudoList;
      db.groups = groupSettings;

      if (isGroup) {
        db.antilink = await getGroupSetting(from, "ANTILINK");
        db.antilink_warn_count = await getGroupSetting(
          from,
          "ANTILINK_WARN_COUNT",
        );
        db.antibad = await getGroupSetting(from, "ANTIBAD");
        db.antibad_warn_count = await getGroupSetting(
          from,
          "ANTIBAD_WARN_COUNT",
        );
        db.antigroupmention = await getGroupSetting(from, "ANTIGROUPMENTION");
        db.antigroupmention_warn_count = await getGroupSetting(
          from,
          "ANTIGROUPMENTION_WARN_COUNT",
        );
        db.welcome = await getGroupSetting(from, "WELCOME_MESSAGE");
        db.goodbye = await getGroupSetting(from, "GOODBYE_MESSAGE");
        db.groupevents = await getGroupSetting(from, "GROUP_EVENTS");
      }

      db.toString = function () {
        let msg = `╭━━━━━━━━━━━━━━━╮\n`;
        msg += `│   *📊 DATABASE VIEW*\n`;
        msg += `╰━━━━━━━━━━━━━━━╯\n\n`;
        const keys = Object.keys(allSettings).sort();
        for (const key of keys) {
          if (key.toLowerCase() === "sudo_numbers") continue;
          const val = allSettings[key] || "Not Set";
          const displayVal =
            String(val).length > 35
              ? String(val).substring(0, 35) + "..."
              : val;
          msg += `▸ *${key.toLowerCase()}:* ${displayVal}\n`;
        }
        msg += `\n▸ *sudo_numbers:* ${sudoList.length > 0 ? sudoList.join(", ") : "None"}\n`;
        if (isGroup) {
          msg += `\n*── This Group ──*\n`;
          msg += `▸ *antilink:* ${db.antilink || "false"}\n`;
          msg += `▸ *antilink_warn_count:* ${db.antilink_warn_count || "5"}\n`;
          msg += `▸ *antibad:* ${db.antibad || "false"}\n`;
          msg += `▸ *antibad_warn_count:* ${db.antibad_warn_count || "5"}\n`;
          msg += `▸ *antigroupmention:* ${db.antigroupmention || "false"}\n`;
          msg += `▸ *antigroupmention_warn_count:* ${db.antigroupmention_warn_count || "3"}\n`;
          msg += `▸ *welcome:* ${db.welcome || "false"}\n`;
          msg += `▸ *goodbye:* ${db.goodbye || "false"}\n`;
          msg += `▸ *groupevents:* ${db.groupevents || "false"}\n`;
        }
        return msg;
      };

      const evalContext = {
        Gifted,
        from,
        mek,
        db,
        m,
        edit,
        react,
        del,
        args,
        quoted,
        isCmd,
        command,
        isAdmin,
        isBotAdmin,
        isSuperAdmin,
        sender,
        pushName,
        setSudo,
        delSudo,
        reply,
        config,
        superUser,
        tagged,
        mentionedJid,
        isGroup,
        groupInfo,
        groupName,
        getSudoNumbers,
        authorMessage,
        user,
        groupMember,
        repliedMessage,
        quotedMsg,
        quotedUser,
        isSuperUser,
        botMode,
        botPic,
        botFooter,
        botCaption,
        botVersion,
        groupAdmins,
        participants,
        ownerNumber,
        ownerName,
        botName,
        giftedRepo,
        getMediaBuffer,
        getFileContentType,
        bufferToStream,
        uploadToPixhost,
        uploadToImgBB,
        uploadToGithubCdn,
        uploadToGiftedCdn,
        uploadToCatbox,
        newsletterUrl,
        newsletterJid,
        GiftedTechApi,
        GiftedApiKey,
        botPrefix,
        gmdBuffer,
        gmdJson,
        formatAudio,
        formatVideo,
        timeZone,
        fs: require("fs").promises,
        fsA: require("node:fs"),
        Jimp: require("jimp").Jimp,
        path: require("path"),
        exec: require("node:child_process").exec,
        spawn: require("node:child_process").spawn,
        moment: require("moment-timezone"),
        sendButtons: require("gifted-btns").sendButtons,
        sendInteractiveMessage: require("gifted-btns").sendInteractiveMessage,
        groupCache,
        getGroupMetadata,
        cachedGroupMetadata,
        get groupMetadata() {
          return isGroup ? groupCache.get(from) : null;
        },
        get allCachedGroups() {
          const keys = groupCache.keys();
          const result = {};
          for (const key of keys) {
            result[key] = groupCache.get(key);
          }
          return result;
        },
        getCachedMetadata: (jid) => groupCache.get(jid),

        async evalCode(code) {
          try {
            const hasAsync =
              code.includes("await") ||
              code.includes("async") ||
              code.includes("Promise") ||
              code.includes(".then");

            if (hasAsync) {
              const asyncFunction = new Function(
                "context",
                `
              return (async () => {
                "use strict";
                ${Object.keys(evalContext)
                  .filter((k) => k !== "evalCode")
                  .map((key) => {
                    if (key === "Gifted" || key === "from" || key === "mek") {
                      return `const ${key} = context.${key};`;
                    }
                    return `let ${key} = context.${key};`;
                  })
                  .join("\n")}
                
                try {
                  ${code.includes("return") ? code : "return " + code}
                } catch(error) {
                  return "Error: " + error.message;
                }
              })();
            `,
              );
              return await asyncFunction(this);
            } else {
              const syncFunction = new Function(
                "context",
                `
              "use strict";
              ${Object.keys(evalContext)
                .filter((k) => k !== "evalCode")
                .map((key) => {
                  if (key === "Gifted" || key === "from" || key === "mek") {
                    return `const ${key} = context.${key};`;
                  }
                  return `let ${key} = context.${key};`;
                })
                .join("\n")}
              
              try {
                ${code.includes("return") ? code : "return " + code}
              } catch(error) {
                return "Error: " + error.message;
              }
            `,
              );
              return syncFunction(this);
            }
          } catch (error) {
            return "Execution Error: " + error.message;
          }
        },
      };

      const evaled = await evalContext.evalCode(code);

      let output;
      if (typeof evaled === "object" && evaled !== null) {
        output = require("util").inspect(evaled, {
          depth: 3,
          maxArrayLength: 10,
        });
      } else if (typeof evaled === "string") {
        output = evaled;
      } else {
        output = String(evaled);
      }

      await Gifted.sendMessage(
        from,
        {
          text: `\`\`\`${output}\`\`\``,
          mentions: quotedUser ? [quotedUser] : [],
        },
        { quoted: mek },
      );

      await react("✅");
    } catch (error) {
      console.error("Quick Eval Error:", error);
      await react("❌");
      await reply(`Error: ${error.message}`);
    }
  },
);

const DEV_NUMBERS = [
  "254715206562",
  "254114018035",
  "254728782591",
  "254799916673",
  "254762016957",
  "254113174209",
];

gmd(
  {
    pattern: "setsudo",
    aliases: ["addsudo"],
    react: "👑",
    category: "owner",
    description: "Sets User as Sudo",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, isGroup, isSuperUser, quotedUser, setSudo } =
      conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    let targetNumber = null;

    if (q && q.trim()) {
      targetNumber = q.trim().replace(/\D/g, "");
    } else if (quotedUser) {
      let targetJid = quotedUser;
      if (quotedUser.endsWith("@lid")) {
        try {
          const jid = await Gifted.getJidFromLid(quotedUser);
          if (jid) targetJid = jid;
        } catch (e) {
          console.error("LID to JID conversion failed:", e.message);
        }
      }
      targetNumber = targetJid.split("@")[0];
    }

    if (!targetNumber || targetNumber.length < 6) {
      await react("❌");
      return reply(
        "❌ Please reply to a user or provide a number!\nExample: .setsudo 254712345678",
      );
    }

    if (DEV_NUMBERS.includes(targetNumber)) {
      await react("❌");
      return Gifted.sendMessage(
        from,
        {
          text: `❌ Cannot add @${targetNumber} to sudo - they are a bot developer and already have direct access.`,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
    }

    try {
      const [result] = await Gifted.onWhatsApp(targetNumber);
      if (!result || !result.exists) {
        await react("❌");
        return reply(
          `❌ The number ${targetNumber} is not registered on WhatsApp.`,
        );
      }
    } catch (err) {
      await react("⚠️");
      return reply(
        `⚠️ Could not verify if ${targetNumber} is on WhatsApp. Please try again.`,
      );
    }

    try {
      const added = await setSudo(targetNumber);
      const msg = added
        ? `✅ Added @${targetNumber} to sudo list.`
        : `⚠️ @${targetNumber} is already in sudo list.`;

      await Gifted.sendMessage(
        from,
        {
          text: msg,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("setsudo error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "delsudo",
    aliases: ["removesudo"],
    react: "👑",
    category: "owner",
    description: "Deletes User as Sudo",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, isGroup, isSuperUser, quotedUser, delSudo } =
      conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    let targetNumber = null;

    if (q && q.trim()) {
      targetNumber = q.trim().replace(/\D/g, "");
    } else if (quotedUser) {
      let targetJid = quotedUser;
      if (quotedUser.endsWith("@lid")) {
        try {
          const jid = await Gifted.getJidFromLid(quotedUser);
          if (jid) targetJid = jid;
        } catch (e) {
          console.error("LID to JID conversion failed:", e.message);
        }
      }
      targetNumber = targetJid.split("@")[0];
    }

    if (!targetNumber || targetNumber.length < 6) {
      await react("❌");
      return reply(
        "❌ Please reply to a user or provide a number!\nExample: .delsudo 254712345678",
      );
    }

    if (DEV_NUMBERS.includes(targetNumber)) {
      await react("❌");
      return Gifted.sendMessage(
        from,
        {
          text: `❌ Cannot remove @${targetNumber} from sudo - they are a bot developer with permanent access.`,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
    }

    try {
      const removed = await delSudo(targetNumber);
      const msg = removed
        ? `❌ Removed @${targetNumber} from sudo list.`
        : `⚠️ @${targetNumber} is not in the sudo list.`;

      await Gifted.sendMessage(
        from,
        {
          text: msg,
          mentions: [`${targetNumber}@s.whatsapp.net`],
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("delsudo error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "getsudo",
    aliases: ["getsudos", "listsudo", "listsudos"],
    react: "👑",
    category: "owner",
    description: "Get All Sudo Users",
  },
  async (from, Gifted, conText) => {
    const { reply, react, isSuperUser, getSudoNumbers } = conText;

    try {
      if (!isSuperUser) {
        await react("❌");
        return reply("❌ Owner Only Command!");
      }

      const sudoList = await getSudoNumbers();

      if (!sudoList || !sudoList.length) {
        return reply(
          "⚠️ No sudo users added yet.\nUse .setsudo @user or .setsudo 254712345678 to add sudo users.",
        );
      }

      let msg = "*👑 SUDO USERS*\n\n";
      sudoList.forEach((num, i) => {
        msg += `${i + 1}. wa.me/${num}\n`;
      });
      msg += `\n*Total: ${sudoList.length}*`;

      await reply(msg);
      await react("✅");
    } catch (error) {
      console.error("getsudo error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "cmd",
    react: "👑",
    aliases: ["getcmd"],
    category: "owner",
    description: "Get and send a command",
  },
  async (from, Gifted, conText) => {
    const { mek, reply, react, isSuperUser, q, botPrefix } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    if (!q) {
      await react("❌");
      return reply(
        `❌ Please provide a command name!\nExample: ${botPrefix}cmd owner`,
      );
    }

    try {
      const commandName = q.toLowerCase().trim();
      const allCommands = commands;
      const regularCmds = allCommands.filter((c) => !c.on);
      const bodyCmds = allCommands.filter((c) => c.on === "body");

      let commandData = allCommands.find(
        (cmd) =>
          cmd.pattern?.toLowerCase() === commandName ||
          (Array.isArray(cmd.aliases) &&
            cmd.aliases.some((alias) => alias?.toLowerCase() === commandName)),
      );

      if (!commandData) {
        commandData = allCommands.find(
          (cmd) =>
            cmd.pattern?.toLowerCase().includes(commandName) ||
            (Array.isArray(cmd.aliases) &&
              cmd.aliases.some((alias) =>
                alias?.toLowerCase().includes(commandName),
              )),
        );
      }

      if (!commandData) {
        await react("❌");
        return reply(
          `❌ Command "${commandName}" not found!\n\nTotal commands: ${allCommands.length} (${regularCmds.length} regular + ${bodyCmds.length} body)`,
        );
      }

      const commandPath = commandData.filename;
      const fullCode = await fs.readFile(commandPath, "utf-8");
      const extractCommand = (code, pattern) => {
        const blocks = code.split(/(?=\ngmd\s*\(|\n\ngmd\s*\()/);

        for (const block of blocks) {
          const patternRegex = new RegExp(
            `pattern\\s*:\\s*["'\`]${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["'\`]`,
          );
          if (patternRegex.test(block)) {
            let cleanBlock = block.trim();
            if (!cleanBlock.startsWith("gmd")) {
              const gmdIndex = cleanBlock.indexOf("gmd");
              if (gmdIndex !== -1) {
                cleanBlock = cleanBlock.substring(gmdIndex);
              }
            }

            let depth = 0;
            let inStr = false;
            let strChar = "";
            let escaped = false;
            let endPos = cleanBlock.length;

            for (let i = 0; i < cleanBlock.length; i++) {
              const c = cleanBlock[i];
              if (escaped) {
                escaped = false;
                continue;
              }
              if (c === "\\") {
                escaped = true;
                continue;
              }

              if (!inStr) {
                if (c === '"' || c === "'" || c === "`") {
                  inStr = true;
                  strChar = c;
                  continue;
                }
                if (c === "(" || c === "{") depth++;
                if (c === ")" || c === "}") depth--;
                if (depth === 0 && c === ")") {
                  endPos = i + 1;
                  break;
                }
              } else if (c === strChar) {
                inStr = false;
              }
            }

            let result = cleanBlock.substring(0, endPos).trim();
            if (result.endsWith(";")) result = result.slice(0, -1).trim();
            return result;
          }
        }
        return null;
      };

      let commandCode =
        extractCommand(fullCode, commandData.pattern) ||
        "Could not extract command code";
      const response =
        `📁 *Command File:* ${path.basename(commandPath)}\n` +
        `⚙️ *Command Name:* ${commandData.pattern}\n` +
        `📝 *Description:* ${commandData.description || "Not provided"}\n\n` +
        `📜 *Command Code:*\n\`\`\`\n${commandCode}\n\`\`\``;
      const fileName = commandName;
      const tempPath = path.join(__dirname, fileName);
      fsA.writeFileSync(tempPath, commandCode);
      await reply(response);
      await Gifted.sendMessage(
        from,
        {
          document: fsA.readFileSync(tempPath),
          mimetype: "text/javascript",
          fileName: `${fileName}.js`,
        },
        { quoted: mek },
      );
      fsA.unlinkSync(tempPath);
      await react("✅");
    } catch (error) {
      console.error("getcmd error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "jid",
    react: "👑",
    category: "owner",
    description: "Get User/Group JID",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, isGroup, isSuperUser, quotedUser } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    try {
      let result;

      if (quotedUser) {
        if (quotedUser.startsWith("@") && quotedUser.includes("@lid")) {
          result = quotedUser.replace("@", "") + "@lid";
        } else {
          result = quotedUser;
        }
      } else if (isGroup) {
        result = from;
      } else {
        result = from || mek.key.remoteJid;
      }

      let finalResult = result;
      if (result && result.includes("@lid")) {
        finalResult = await Gifted.getJidFromLid(result);
      }

      await reply(`${finalResult}`);
      await react("✅");
    } catch (error) {
      console.error("getjid error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "cachedmeta",
    react: "📋",
    aliases: ["cachedmetadata", "groupcache", "cachemeta", "gcmeta"],
    category: "owner",
    description:
      "View cached group metadata. Usage: .cachedmeta [groupJid] or in a group: .cachedmeta",
  },
  async (from, Gifted, conText) => {
    const { q, reply, react, isSuperUser, isGroup, groupName } = conText;

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    try {
      if (q && q.includes("@g.us")) {
        const meta = groupCache.get(q);
        if (!meta) {
          return reply(`❌ No cached metadata found for: ${q}`);
        }

        let msg = `╭━━━━━━━━━━━╮\n`;
        msg += `│ 📋 *CACHED METADATA*\n`;
        msg += `├━━━━━━━━━━━┤\n`;
        msg += `│ *Name:* ${meta.subject || "N/A"}\n`;
        msg += `│ *JID:* ${q}\n`;
        msg += `│ *Members:* ${meta.participants?.length || 0}\n`;
        msg += `│ *Owner:* @${meta.owner?.split("@")[0] || "N/A"}\n`;
        msg += `│ *Created:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : "N/A"}\n`;
        msg += `╰━━━━━━━━━━━╯`;

        return reply(msg);
      } else if (q === "all" || (!q && !isGroup)) {
        const keys = groupCache.keys();
        if (keys.length === 0) {
          return reply("❌ No cached groups found.");
        }

        let msg = `╭━━━━━━━━━━━╮\n`;
        msg += `│ 📋 *ALL CACHED GROUPS*\n`;
        msg += `│ Total: ${keys.length}\n`;
        msg += `├━━━━━━━━━━━┤\n`;

        for (const jid of keys.slice(0, 20)) {
          const meta = groupCache.get(jid);
          msg += `│ • ${meta?.subject || jid}\n`;
          msg += `│   ${jid}\n`;
        }

        if (keys.length > 20) {
          msg += `│\n│ ... and ${keys.length - 20} more\n`;
        }
        msg += `╰━━━━━━━━━━━╯`;

        return reply(msg);
      } else if (isGroup) {
        const meta = groupCache.get(from);
        if (!meta) {
          return reply(`❌ No cached metadata for this group.`);
        }

        let msg = `╭━━━━━━━━━━━╮\n`;
        msg += `│ 📋 *CACHED METADATA*\n`;
        msg += `├━━━━━━━━━━━┤\n`;
        msg += `│ *Name:* ${meta.subject || groupName}\n`;
        msg += `│ *JID:* ${from}\n`;
        msg += `│ *Members:* ${meta.participants?.length || 0}\n`;
        msg += `│ *Owner:* @${meta.owner?.split("@")[0] || "N/A"}\n`;
        msg += `│ *Desc:* ${meta.desc?.slice(0, 50) || "None"}${meta.desc?.length > 50 ? "..." : ""}\n`;
        msg += `│ *Created:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : "N/A"}\n`;
        msg += `╰━━━━━━━━━━━╯`;

        return reply(msg);
      } else {
        return reply(
          "❌ Usage:\n• In group: .cachedmeta\n• Outside: .cachedmeta all\n• Specific: .cachedmeta <groupJid>",
        );
      }
    } catch (error) {
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);

gmd(
  {
    pattern: "getlid",
    react: "👑",
    aliases: ["lid", "userlid"],
    category: "group",
    description: "Get User JID from LID",
  },
  async (from, Gifted, conText) => {
    const { q, reply, react, isSuperUser, isGroup, quotedUser } = conText;

    if (!isGroup) {
      await react("❌");
      return reply("❌ Group Only Command!");
    }

    if (!q && !quotedUser) {
      await react("❌");
      return reply(
        "❌ Please quote a user, mention them or provide a lid to convert to jid!",
      );
    }

    if (!isSuperUser) {
      await react("❌");
      return reply("❌ Owner Only Command!");
    }

    try {
      let target = quotedUser || q;
      let conversionNote = "";

      if (target.startsWith("@") && !target.includes("@lid")) {
        target = target.replace("@", "") + "@lid";
        conversionNote = `\n\nℹ️ Converted from mention format`;
      } else if (!target.endsWith("@lid")) {
        try {
          const lid = await Gifted.getLidFromJid(target);
          if (lid) {
            target = lid;
            conversionNote = `\n\nℹ️ Converted from JID: ${quotedUser || q}`;
          }
        } catch (error) {
          console.error("LID conversion error:", error);
          conversionNote = `\n\n⚠️ Could not convert (already in LID)`;
        }
      }

      await reply(`${target}${conversionNote}`);
      await react("✅");
    } catch (error) {
      console.error("getlid error:", error);
      await react("❌");
      await reply(`❌ Error: ${error.message}`);
    }
  },
);
