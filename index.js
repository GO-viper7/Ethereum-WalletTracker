const { Client, IntentsBitField } = require("discord.js");
const axios = require("axios");
require('dotenv').config()
const mongoose = require("mongoose");
const walletSchema = require("./schemas/walletSchema");
const mongoPath = process.env.mongoPath;
const keepAlive = require("./keepAlive");
const cheerio = require("cheerio");


const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.GuildMessageReactions,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  await mongoose
    .connect(mongoPath, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((mongoose) => {
      try {
        console.log("Connected to mongo!");
      } catch (err) {
        console.log(err);
      }
    });

  setInterval(async () => {
    const wallets = await walletSchema.find({});
    wallets.forEach(async (data) => {
      let k = await data.channelId;
      let label = await data.label;
      let channel = client.channels.cache.get(k);
      let config = {
        method: "get",
        url: `https://api.etherscan.io/api?module=account&action=txlist&address=${data.wallet}&sort=desc&apikey=${process.env.apiKey}`,
      };
      
      axios(config)
        .then((res) => JSON.parse(JSON.stringify(res.data.result)))
        .then(async (res) => {
          //console.log(res[0].hash, data.hash)
          

          const url = `https://etherscan.io/tx/${res[0].hash}`;
          let anchorLinks = [];
          let values = [];
          let isBuy = [];
          let pnl = 0;
          let config = {
            method: 'get',
            url: url,
            headers: { 
              'Cookie': 'ASP.NET_SessionId=piqf0tymwm51ljf3kju1ai5u; __cflb=02DiuFnsSsHWYH8WqVXcJWaecAw5gpnmeRpQiXzgrBbuv'
            }
          };

         
       
          if(res[0].hash === undefined && data.hash === "0X") {
            return console.log("undefined")
          }
          else if(res[0].hash !== undefined && data.hash === "0X") {
           // console.log(res[0].hash, data.hash)
            //console.log("new hash for " + data.wallet )
            await walletSchema.updateMany(
              { wallet: data.wallet },
              { hash: res[0].hash },
              { multi: true},
              async function(err, numberAffected) {
                if (err) return console.log(err);
                console.log('The number of updated documents was %d', numberAffected);
              }
            );
          }
          else if (res[0].hash !== data.hash && res[0].hash !== undefined && data.hash !== "0X") {
           //console.log(res[0])
           setTimeout(() => {
            axios(config)
              
              .then(response => {
                const html = response.data;
                const $ = cheerio.load(html);
                $('.align-items-baseline').each((index, element) => {
                  const linkText = $(element).text();
                  if(linkText !== undefined) {
                    if(linkText.includes('Swap')) {
                      let str = linkText;
                      let startStr = 'Swap';
                      let endStr = 'Ether';
                      pos = str.indexOf(startStr) + startStr.length;
                      isBuy.push(str.substring(pos, str.indexOf(endStr, pos)));
                    }
                  }
                });
                let x = 0;
                $('.me-1').each((index, element) => {
                  const href = $(element).attr('href');
                  const linkText = $(element).text();
                  if(linkText !== undefined && href !== undefined) {
                    if(href.includes('/token')) {
                      let k = undefined;
                     // console.log(isBuy[x])
                      if(isBuy[x] !== undefined) {
                        if(isBuy[x].includes('For')) {
                          k = "SELL"
                          //need after for
                          //console.log(isBuy[x].slice(isBuy[x].indexOf('For') + 1).replace('or', ''))
                          pnl += Number(isBuy[x].slice(isBuy[x].indexOf('For') + 1).replace('or', ''));
                        } else if(!isBuy[x].includes('NameSwap')) {
                          k = "BUY"
                          //console.log(isBuy[x].replace('or', ''))
                          pnl -= Number(isBuy[x].replace('or', ''));
                        } 
                      }
                      anchorLinks.push({
                        value: `${k} **[Chart](https://www.dextools.io/app/ether/pair-explorer${href.replace('/token','')})**`,
                        name: linkText,
                        inline: true
                      });
                      x++;
                    }
                  }
                  
                });  
                
                $('.gap-1').each((index, element) => {
                  const linkText = $(element).text();
                  if(linkText !== undefined) {
                    if(linkText.includes('$')) {
                      values.push(linkText)
                    }
                  }
                });
              })
              .catch(error => {
                console.error('Error retrieving webpage');
              });
            }, 1000);
            setTimeout(async () => {
              //const isSell = res[0].from.toLowerCase() === data.wallet.toLowerCase();
       
              if(channel !== undefined) {
                await channel.send({
                  embeds: [
                    {
                      url: `https://etherscan.io/tx/${res[0].hash}`,
                      title: `${label} : ALERT! New Transaction`,
                      thumbnail: {
                        url: "https://etherscan.io/images/brandassets/etherscan-logo-circle.jpg",
                      },
                      description: `**From:** ${res[0].from}\n**To:** ${res[0].to}\n**Value:** ${values[0]} USD \n**Txn Hash:** ${res[0].hash}`,
                      fields: [
                        ...anchorLinks,
                        {
                          name: "PNL",
                          value: `${pnl} ETH`,
                        }
                      ],
                      color: 0x243c58,
                      timestamp: new Date(),
                    },
                  ],
                });
                console.log('sent')
              }
                
                
                await walletSchema.updateMany(
                  { wallet: data.wallet },
                  { hash: res[0].hash },
                  { multi: true},
                  async function(err, numberAffected) {
                    if (err) return console.log(err);
                    console.log('The number of updated documents was');
                  }
                );
  
              
            }, 3000)
             
          }
        })
        .catch((error) => {
          console.log(error);
        });
    });
  }, 10000);
});










client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;
  if (interaction.commandName === "track") {
    //check if wallet is already tracked
    const wallet = interaction.options.get("wallet-adress");
    const exists = await walletSchema.findOne({
      wallet: wallet.value,
    });
    console.log(interaction.options.get('channel-name').value)
    if (exists) {
      return interaction.reply({
        content: `This wallet is already being tracked on **${client.channels.cache.get(exists.channelId).name}**`,
      });
    } else {
      let config = {
        method: "get",
        url: `https://api.etherscan.io/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.apiKey}`,
      };
      axios(config)
        .then((res) => JSON.parse(JSON.stringify(res.data.result)))
        .then(async (res) => {
          let len = res[0].hash;
          let channel = interaction.options.get("channel-name");
          let label = interaction.options.get('label')
          console.log(wallet.value, channel.value);
          let userId = interaction.user.id;
          if(channel.value.includes('<') && channel.value.includes('>') && channel.value.includes('#')) {
               let id = channel.value.replace('<', '')
               id = id.replace('>', '')
               id = id.replace('#', '')
               let newer = await client.channels.cache.get(id);
               await new walletSchema({
                  userId: userId,
                  wallet: wallet.value,
                  channelId: newer.id,
                  hash: len,
                  channelName: newer.name,
                  label: label.value
                }).save();
                await interaction.reply(
                  `**${label.value}** : Tracking wallet **${wallet.value}** in channel ${newer}`
                );
          } else { 
              let newChannel = await interaction.guild.channels.create({
            name: channel.value,
  
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: ["0x0000000000000400"],
              },
              {
                id: userId,
                allow: ["0x0000000000000400", "0x0000000000000800"],
              },
            ],
            // i want new channel to be under specific category
            // i also want to set the description of the channel, implement code now
              description: `Wallet: **${wallet.value}**`,
              parent: "1109074895268229200",
            });
            await new walletSchema({
              userId: userId,
              wallet: wallet.value,
              channelId: newChannel.id,
              hash: len,
              channelName: channel.value,
              label: label.value
            }).save();
            await interaction.reply(
              `Tracking wallet **${wallet.value}** in channel ${newChannel}`
            );
          }
          
       })
    }
    
    
  }else if( interaction.commandName === "untrack") {
    let wallet = interaction.options.get("wallet-adress");
    let channel = interaction.options.get("channel-name");
    let userId = interaction.user.id;
    await walletSchema.deleteOne({ userId: userId, wallet: wallet.value, channelName: channel.value });
    await interaction.reply(`Untracked wallet **${wallet.value}** from **${channel.value}**`);
  }else if (interaction.commandName === "wallets") {
    const wallets = await walletSchema.find({channelId: interaction.channel.id})
    if (!wallets) return interaction.reply("No wallet found in this channel!");
    let wall = [];
    wallets.forEach((wallet) => {
      wall.push({
        name: wallet.label,
        value: wallet.wallet,
        inline: true,
      });
    });
    await interaction.reply({
      embeds: [
        {
          title: "Tracket wallets in this channel",
          thumbnail: {
            url: "https://etherscan.io/images/brandassets/etherscan-logo-circle.jpg",
          },
          fields: wall,
          color: 0x243c58,
          footer: {
            text: "Developed by @GoViper",
          },
        },
      ],         
    });

  }
});

client.login(
  process.env.token
);
keepAlive();