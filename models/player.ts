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
  registrationToken: {
    type: String,
    required: false
  },
  friendRequests: [{
    senderWallet: String,
    senderNickname: String,
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    timestamp: Date,
    status: { type: String, enum: ['Pending', 'Accepted', 'Declined'], default: 'Pending' }
  }],
  friendRequestNotifications: [{
    senderWallet: String,
    receiverWallet: String,
    status: { type: String, enum: ['Pending', 'Accepted', 'Declined'] },
    timestamp: { type: Date, default: Date.now }
  }],
  friends: [{ type: String, ref: 'Player' }],
});

const Player = mongoose.model('Player', playerSchema);

export default Player;