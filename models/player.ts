import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  nickname: { 
    type: String, 
    required: true, 
    unique: true 
  },
  walletAddress: { 
    type: String, 
    required: true, 
    unique: true 
  },
  isOnline: { 
    type: Boolean, 
    default: false 
  },
  battleLog: [{ type: String }], 
  notification_BattleRequest: {
    isRead: { 
      type: Boolean, 
      default: false 
    },
    challengers: [{
      nickname: { type: String },
      walletAddress: { type: String },
      timestamp: { type: Date }
    }],
    acceptedChallengers: [{
      nickname: { type: String },
      opponent: { type: String },
      battleScene: { type: String },
      opponentWallet: { type: String },
      walletAddress: { type: String }
    }]
  },
  battleMeta: {
    description: { type: String },
    id: { type: String },
    attributes: [{
      trait_type: { type: String },
      value: { type: String }
    }]
  },
  // Add registrationToken property
  registrationToken: {
    type: String,
    required: false
  },
  // Add reference to Friend model
  friends: [{ type: String, ref: 'FriendList' }],
});

const Player = mongoose.model('Player', playerSchema);

export default Player;