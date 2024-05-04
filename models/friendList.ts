import mongoose from 'mongoose';

const friendListSchema = new mongoose.Schema({
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    friend: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
});

const FriendList = mongoose.model("Friend", friendListSchema);

export default FriendList