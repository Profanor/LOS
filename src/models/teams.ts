import mongoose, { Document } from 'mongoose';

const teamSchema = new mongoose.Schema({
  teamName: {
    type: String,
    required: true
  },
  owner: {
    walletAddress: {
      type: String,
      required: true
    },
    nickname: {
      type: String,
      required: true
    }
  }
});

interface TeamDocument extends Document {
  teamName: string;
  owner: {
    walletAddress: string;
    nickname: string;
  };
  members?: Array<{
    walletAddress: string;
    nickname: string;
  }>;
  invitations?: Array<{
    walletAddress: string;
    nickname: string;
  }>;
}

const Team = mongoose.model<TeamDocument>('Team', teamSchema);

export default  Team ;