const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // Get from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://axiom-ba8ef.firebaseio.com",
});

const db = admin.firestore();

module.exports ={admin,db};
