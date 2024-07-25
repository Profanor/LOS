import mongoose, { Document } from 'mongoose';

// Define interface for RoyalRumble document
interface RoyalRumbleDocument extends Document {
    rumbleName: string;
    rumbleReward: number;
    owner: {
        nickname: string;
        walletAddress: string;
    };
    participants?: Array<{
        walletAddress: string;
        nickname: string;
    }>;
}

const royalRumbleSchema = new mongoose.Schema({
    rumbleName: {
        type: String,
        required: true,
        unique: true
    },
    rumbleReward: {
        type: Number,
        required: true
    },
    owner: {
        nickname: {
            type: String,
            required: true
        },
        walletAddress: {
            type: String,
            required: true
        }
    },
    participants: [{
        walletAddress: {
            type: String
        },
        nickname: {
            type: String
        }
    }]
});

const RoyalRumble = mongoose.model<RoyalRumbleDocument>('RoyalRumble', royalRumbleSchema);

export default RoyalRumble;
