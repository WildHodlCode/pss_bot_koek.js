import 'dotenv/config'
import { Client, Events, GatewayIntentBits } from "discord.js";
import console from 'console';
import fs from 'fs';

const client = new Client({
    intents: GatewayIntentBits.GuildMembers
});

const seeker = "916717948645814344"
const exclude = "968641826867257424"

client.on(Events.ClientReady, async (client: Client) => {
    if (!client.user || !client.application) {
        return;
    }

    try {
        const guild = await client.guilds.fetch(process.env.GUILD_ID!);

        const seekerRole = await guild.roles.fetch(seeker);
        if (!seekerRole) {
            console.log(`Seeker role not found`);
            return;
        }

        const protectedRole = await guild.roles.fetch(exclude);
        if (!protectedRole) {
            console.log(`Protected role not found`);
            return;
        }

        const members = await guild.members.fetch();
        const result = members
            .filter((member, snowflake) => {
                if (!member.joinedAt) {
                    console.log(`No timestamp for ${snowflake}`);
                    return false;
                }
                return member.joinedAt > new Date("2022-01-08") && !seekerRole.members.has(snowflake) && !protectedRole.members.has(snowflake);
            })
            .map((member, snowflake) => [snowflake, member.displayName, member.joinedAt?.toISOString().substring(0, 10)]);

        const file = fs.createWriteStream('members.csv');
        result.forEach(function (v) { file.write(v.join(';') + '\n'); });
        file.end();
    }
    catch (e) {
        console.log(e);
    }
    finally {
        client.destroy();
    }
});

client.login(process.env.DISCORD_TOKEN);
