import { ApplicationCommandOptionType, channelMention, ChannelType, ChatInputCommandInteraction, Colors, EmbedBuilder, escapeMarkdown } from "discord.js";
import { MongoClient } from "mongodb";
import { UnarchiveDocument } from "../db";
import { Command } from "./command";

export const UnarchiveCommand: Command = {
    name: "unarchiver",
    description: "unarchiver",
    dmPermission: false,
    ephemeral: true,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "enable",
            description: "Enable auto-unarchive for a thread, channel, or category.",
            options: [
                {
                    type: ApplicationCommandOptionType.Channel,
                    name: "channel",
                    description: "The thread, channel, or category",
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.PublicThread, ChannelType.PrivateThread],
                    required: true
                }
            ]
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "disable",
            description: "Disable auto-unarchive for a thread, channel, or category.",
            options: [
                {
                    type: ApplicationCommandOptionType.Channel,
                    name: "channel",
                    description: "The thread, channel, or category",
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.PublicThread, ChannelType.PrivateThread],
                    required: true
                }
            ]
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "status",
            description: "Display the auto-unarchive status for the given thread, channel, or category.",
            options: [
                {
                    type: ApplicationCommandOptionType.Channel,
                    name: "channel",
                    description: "The thread, channel, or category",
                    channelTypes: [ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.PublicThread, ChannelType.PrivateThread],
                    required: true
                }
            ]
        }
    ],
    execute: async (interaction: ChatInputCommandInteraction) => {
        const mongodb = new MongoClient(process.env.MONGODB_ENDPOINT!);
        try {
            await mongodb.connect();
            const collection = mongodb.db(process.env.DB!).collection<UnarchiveDocument>("unarchive");

            const embed = new EmbedBuilder().setColor(Colors.Aqua);

            const channel = interaction.options.getChannel("channel", true);
            const mention = channel.type == ChannelType.GuildCategory
                ? escapeMarkdown(channel.name)
                : channelMention(channel.id);

            const subcommand = interaction.options.getSubcommand();
            switch (subcommand) {
                case "enable":
                    {
                        const result = await collection.updateOne(
                            { _id: interaction.channelId },
                            { $set: {} },
                            { upsert: true }
                        );
                        result.modifiedCount == 0
                            ? embed.setDescription(`Unarchive is already configured for **${mention}**.`)
                            : embed.setDescription(`Unarchive enabled for **${mention}**.`);
                    }
                    break;
                case "disable":
                    {
                        const result = await collection.updateOne(
                            { _id: interaction.channelId },
                            { $unset: {} },
                            { upsert: true }
                        );
                        result.modifiedCount == 0
                            ? embed.setDescription(`Unarchive is not configured for **${mention}**.`)
                            : embed.setDescription(`Unarchive disabled for **${mention}**.`);
                    }
                    break
                case "status":
                    {
                        const ids = [];
                        let c = await interaction.guild!.channels.fetch(channel.id);
                        while (c) {
                            ids.push(c.id)
                            c = c.parent;
                        }
                        const mentions = await collection
                            .find({ _id: { $in: ids } })
                            .map(x => channelMention(x._id))
                            .toArray();
                        mentions.length == 0
                            ? embed.setDescription(`Unarchive is not configured for **${mention}**.`)
                            : embed.setDescription(`Unarchive disabled for **${mention}**.`);
                    }
                    break
                default:
                    throw 'unknown subcommand';
            }
            return { embeds: [embed] };
        } finally {
            mongodb.close();
        }
    }
}
