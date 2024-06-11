import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Cloud Messaging and get a reference to the service
const messaging = getMessaging(app);

export { messaging };
