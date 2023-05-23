require('dotenv').config()
const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

const commands = [
  {
    "name" : "track",
    "description" : "Replies with Pong!",
    "options" : [
      {
        name: "wallet-adress", 
        description: "Enter wallet adress to track",
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: "channel-name",
        description: "Enter new channel name",
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: 'label',
        description: 'Enter label',
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]
  },
  {
    "name" : "untrack",
    "description" : "Untracks wallet",
    "options" : [
      {
        name: "wallet-adress",
        description: "Enter wallet adress to untrack",
        type: ApplicationCommandOptionType.String,
        required: true
      },
      {
        name: "channel-name",
        description: "Enter channel name",
        type: ApplicationCommandOptionType.String,
        required: true
      }
    ]

  },
  {
    "name" : 'latest',
    "description" : "Displays latest transaction",
    "options" : []
  }
]

 const rest = new REST({ version: '9' }).setToken(process.env.token);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands("1106845436830044210", "951617694669635664"),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();