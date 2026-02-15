const { gmd, toPtt } = require("../gift");
const yts = require("yt-search");
const axios = require("axios");
const {
  downloadContentFromMessage,
  generateWAMessageFromContent,
  normalizeMessageContent,
} = require("gifted-baileys");
const { sendButtons } = require("gifted-btns");


gmd(
  {
    pattern: "sendaudio",
    aliases: ["sendmp3", "dlmp3", "dlaudio"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from url",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer, formatAudio } =
      conText;

    if (!q) {
      await react("❌");
      return reply("Please provide audio url");
    }

    try {
      const buffer = await gmdBuffer(q);
      const convertedBuffer = await formatAudio(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the audio file.");
      }
      await Gifted.sendMessage(
        from,
        {
          audio: convertedBuffer,
          mimetype: "audio/mpeg",
          caption: `> *${botFooter}*`,
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);

gmd(
  {
    pattern: "sendvideo",
    aliases: ["sendmp4", "dlmp4", "dvideo"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from url",
  },
  async (from, Gifted, conText) => {
    const { q, mek, reply, react, sender, botFooter, gmdBuffer, formatVideo } =
      conText;

    if (!q) {
      await react("❌");
      return reply("Please provide video url");
    }

    try {
      const buffer = await gmdBuffer(q);
      const convertedBuffer = await formatVideo(buffer);
      if (buffer instanceof Error) {
        await react("❌");
        return reply("Failed to download the video file.");
      }
      await Gifted.sendMessage(
        from,
        {
          document: convertedBuffer,
          fileName: "Video.mp4",
          mimetype: "video/mp4",
          caption: `> *${botFooter}*`,
        },
        { quoted: mek },
      );
      await react("✅");
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);


async function queryAPI(query, endpoints, conText, timeout = 45000) {
  const { GiftedTechApi, GiftedApiKey } = conText;
  
  for (const endpoint of endpoints) {
    try {
      const apiUrl = `${GiftedTechApi}/api/download/${endpoint}?apikey=${GiftedApiKey}&url=${encodeURIComponent(query)}`;
      
      const res = await axios.get(apiUrl, { timeout });
      
      if (res.data.success && res.data.result?.download_url) {
        return {
          success: true,
          data: res.data,
          endpoint: endpoint,
          download_url: res.data.result.download_url
        };
      }
    } catch (error) {
      continue;
    }
  }
  
  return { success: false, error: "All endpoints failed" };
}

const audioEndpoints = [
  'yta',
  'dlmp3',
  'ytmp3',
  'savetubemp3',
  'savemp3'
];

const videoEndpoints = [
  'ytv',
  'dlmp4',
  'ytmp4',
  'savetubemp4',
  'savemp4'
];

gmd(
  {
    pattern: "play",
    aliases: ["ytmp3", "ytmp3doc", "audiodoc", "yta"],
    category: "downloader",
    react: "🎶",
    description: "Download Audio from Youtube",
  },
  async (from, Gifted, conText) => {
    const {
      q,
      reply,
      react,
      botPic,
      botName,
      botFooter,
      gmdBuffer,
      formatAudio,
    } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a song name");
    }

    try {
      const searchResponse = await yts(q);

      if (!searchResponse.videos.length) {
        return reply("No video found for your query.");
      }

      const firstVideo = searchResponse.videos[0];
      const videoUrl = firstVideo.url;
      
      await react("🔍");
      const endpointResult = await queryAPI(videoUrl, audioEndpoints, conText);
      
      if (!endpointResult.success) {
        await react("❌");
        return reply("All download services are currently unavailable. Please try again later.");
      }
      
      const bufferRes = await gmdBuffer(endpointResult.download_url);
      
      const sizeMB = bufferRes.length / (1024 * 1024);
      if (sizeMB > 20) {
        await reply("File is large, processing might take a while...");
      }

      // const convertedBuffer = await formatAudio(bufferRes);
      const convertedBuffer = bufferRes;
      
      const dateNow = Date.now();
      const buttonId = `play_${firstVideo.id}_${dateNow}`;
      
      await sendButtons(Gifted, from, {
        title: `${botName} 𝐒𝐎𝐍𝐆 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑`,
        text: `⿻ *Title:* ${firstVideo.title}\n⿻ *Duration:* ${firstVideo.timestamp}\n\n*Select download format:*`,
        footer: botFooter,
        image: firstVideo.thumbnail || botPic,
        buttons: [
          { id: `audio_${buttonId}`, text: "Audio 🎶" },
          { id: `voice_${buttonId}`, text: "Voice Message 🔉" },
          { id: `doc_${buttonId}`, text: "Audio Document 📄" },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Watch on Youtube",
              url: firstVideo.url,
            }),
          },
        ],
      });

      const handleResponse = async (event) => {
        const messageData = event.messages[0];
        if (!messageData.message) return;

        const templateButtonReply = messageData.message?.templateButtonReplyMessage;
        if (!templateButtonReply) return;

        const selectedButtonId = templateButtonReply.selectedId;
        const isFromSameChat = messageData.key?.remoteJid === from;
        
        if (!isFromSameChat || !selectedButtonId.includes(dateNow.toString())) return;

        await Gifted.react(messageData.key, "⬇️");

        try {
          if (selectedButtonId.startsWith('audio_')) {
            await Gifted.sendMessage(
              from,
              {
                audio: convertedBuffer,
                mimetype: "audio/mpeg",
              },
              { quoted: messageData }
            );
          } 
          else if (selectedButtonId.startsWith('voice_')) {
            const pttBuffer = await toPtt(convertedBuffer);
            await Gifted.sendMessage(
              from,
              {
                audio: pttBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
              },
              { quoted: messageData }
            );
          } 
          else if (selectedButtonId.startsWith('doc_')) {
            await Gifted.sendMessage(
              from,
              {
                document: convertedBuffer,
                mimetype: "audio/mpeg",
                fileName: `${firstVideo.title}.mp3`.replace(/[^\w\s.-]/gi, ""),
                caption: `${firstVideo.title}`,
              },
              { quoted: messageData }
            );
          } 
          else {
            return;
          }

          await Gifted.react(messageData.key, "✅");
          Gifted.ev.off("messages.upsert", handleResponse);
        } catch (error) {
          console.error("Error sending media:", error);
          await Gifted.react(messageData.key, "❌");
          await Gifted.sendMessage(from, { text: "Failed to send media. Please try again." }, { quoted: messageData });
          Gifted.ev.off("messages.upsert", handleResponse);
        }
      };

      Gifted.ev.on("messages.upsert", handleResponse);

      setTimeout(() => {
        Gifted.ev.off("messages.upsert", handleResponse);
      }, 120000);
      
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);

gmd(
  {
    pattern: "video",
    aliases: ["ytmp4doc", "mp4", "ytmp4", "dlmp4"],
    category: "downloader",
    react: "🎥",
    description: "Download Video from Youtube",
  },
  async (from, Gifted, conText) => {
    const {
      q,
      reply,
      react,
      botPic,
      botName,
      botFooter,
      gmdBuffer,
    } = conText;

    if (!q) {
      await react("❌");
      return reply("Please provide a video name");
    }

    try {
      const searchResponse = await yts(q);

      if (!searchResponse.videos.length) {
        return reply("No video found for your query.");
      }

      const firstVideo = searchResponse.videos[0];
      const videoUrl = firstVideo.url;
      
      await react("🔍");
      const endpointResult = await queryAPI(videoUrl, videoEndpoints, conText);
      
      if (!endpointResult.success) {
        await react("❌");
        return reply("All download services are currently unavailable. Please try again later.");
      }
      
      const buffer = await gmdBuffer(endpointResult.download_url);
      
      const sizeMB = buffer.length / (1024 * 1024);
      if (sizeMB > 20) {
        await reply("File is large, processing might take a while...");
      }
      
      const dateNow = Date.now();
      const buttonId = `video_${firstVideo.id}_${dateNow}`;
      
      await sendButtons(Gifted, from, {
        title: `${botName} 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑`,
        text: `⿻ *Title:* ${firstVideo.title}\n⿻ *Duration:* ${firstVideo.timestamp}\n\n*Select download format:*`,
        footer: botFooter,
        image: firstVideo.thumbnail || botPic,
        buttons: [
          { id: `vid_${buttonId}`, text: "Video 🎥" },
          { id: `doc_${buttonId}`, text: "Video Document 📄" },
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Watch on Youtube",
              url: firstVideo.url,
            }),
          },
        ],
      });

      const handleResponse = async (event) => {
        const messageData = event.messages[0];
        if (!messageData.message) return;

        const templateButtonReply = messageData.message?.templateButtonReplyMessage;
        if (!templateButtonReply) return;

        const selectedButtonId = templateButtonReply.selectedId;
        const isFromSameChat = messageData.key?.remoteJid === from;
        
        if (!isFromSameChat || !selectedButtonId.includes(dateNow.toString())) return;

        await Gifted.react(messageData.key, "⬇️");

        try {
          if (selectedButtonId.startsWith('vid_')) {
            await Gifted.sendMessage(
              from,
              {
                video: buffer,
                mimetype: "video/mp4",
                fileName: `${firstVideo.title}.mp4`.replace(/[^\w\s.-]/gi, ""),
                caption: `🎥 ${firstVideo.title}`,
              },
              { quoted: messageData }
            );
          } 
          else if (selectedButtonId.startsWith('doc_')) {
            await Gifted.sendMessage(
              from,
              {
                document: buffer,
                mimetype: "video/mp4",
                fileName: `${firstVideo.title}.mp4`.replace(/[^\w\s.-]/gi, ""),
                caption: `📄 ${firstVideo.title}`,
              },
              { quoted: messageData }
            );
          } 
          else {
            return;
          }

          await Gifted.react(messageData.key, "✅");
          Gifted.ev.off("messages.upsert", handleResponse);
        } catch (error) {
          console.error("Error sending media:", error);
          await Gifted.react(messageData.key, "❌");
          await Gifted.sendMessage(from, { text: "Failed to send media. Please try again." }, { quoted: messageData });
          Gifted.ev.off("messages.upsert", handleResponse);
        }
      };

      Gifted.ev.on("messages.upsert", handleResponse);

      setTimeout(() => {
        Gifted.ev.off("messages.upsert", handleResponse);
      }, 120000);
      
    } catch (error) {
      console.error("Error during download process:", error);
      await react("❌");
      return reply("Oops! Something went wrong. Please try again.");
    }
  },
);
