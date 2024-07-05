import mongoose from 'mongoose';

const testerSchema = new mongoose.Schema({
    testID: { 
        type: String,
        required: true,
        unique: true
    },
    deviceID: {
        type: String,
        required: true
    },
});

const AuthorizedTester = mongoose.model('AuthorizedTester', testerSchema);

export default AuthorizedTester;