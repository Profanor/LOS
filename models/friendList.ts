import mongoose from 'mongoose';

const friendListSchema = new mongoose.Schema({
    playerWallet: { type: String, ref: 'Player' },
    friendWallet: { type: String, ref: 'Player' },
    status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' },
    timestamp: { type: Date, default: Date.now }
});

const FriendList = mongoose.model("FriendList", friendListSchema);

export default FriendList