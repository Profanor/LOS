import mongoose from 'mongoose';

const friendListSchema = new mongoose.Schema({
    playerWallet: { type: String, ref: 'Player' },
    friendWallet: { type: String, ref: 'Player' },
});

const FriendList = mongoose.model("Friend", friendListSchema);

export default FriendList