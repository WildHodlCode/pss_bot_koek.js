import { ThreadChannel } from "discord.js";
import { MongoClient } from "mongodb";
import { UnarchiveDocument } from "../db";

export const onThreadUpdate = async (_: ThreadChannel, thread: ThreadChannel) => {
    const mongodb = new MongoClient(process.env.MONGODB_ENDPOINT!);
    try {
        await mongodb.connect();
        const collection = mongodb.db(process.env.DB!).collection<UnarchiveDocument>("unarchive");

        const ids = [thread.id];
        if (thread.parent) {
            ids.push(thread.parent.id);
            if (thread.parent.parent) {
                ids.push(thread.parent.parent.id);
            }
        }

        const count = await collection.countDocuments({ _id: { $in: ids } });
        if (count > 0 && thread.unarchivable) {
            await thread.setArchived(false);
        }
    } finally {
        mongodb.close();
    }
}
