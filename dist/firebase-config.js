"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messaging = void 0;
const app_1 = require("firebase/app");
const messaging_1 = require("firebase/messaging");
const analytics_1 = require("firebase/analytics");
const firebaseConfig = {
    apiKey: "AIzaSyCGU2tWg1GIl6nvEAM2PUwZG1VyeEzFnU8",
    authDomain: "project-los-df9ad.firebaseapp.com",
    projectId: "project-los-df9ad",
    storageBucket: "project-los-df9ad.appspot.com",
    messagingSenderId: "257406410129",
    appId: "1:257406410129:web:523b294d18055361360e30",
    measurementId: "G-MT8YXLLFEX"
};
// Initialize Firebase
const app = (0, app_1.initializeApp)(firebaseConfig);
const analytics = (0, analytics_1.getAnalytics)(app);
// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = (0, messaging_1.getMessaging)(app);
exports.messaging = messaging;
