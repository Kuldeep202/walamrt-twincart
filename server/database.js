const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, onValue, push, remove } = require('firebase/database');

const firebaseConfig = {
  apiKey: "AIzaSyA6gFx_ZkxcuiCrT5cwpSM3nRvml5IIKvg",
  authDomain: "walmart-twincart.firebaseapp.com",
  databaseURL: "https://walmart-twincart-default-rtdb.firebaseio.com",
  projectId: "walmart-twincart",
  storageBucket: "walmart-twincart.firebasestorage.app",
  messagingSenderId: "187335924302",
  appId: "1:187335924302:web:7dcf112dc2db6bfe0ac11f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Database paths
const CARTS_PATH = 'carts';
const USERS_PATH = 'users';

// Helper functions
const getCartRef = (cartId) => ref(db, `${CARTS_PATH}/${cartId}`);
const getCartItemsRef = (cartId) => ref(db, `${CARTS_PATH}/${cartId}/items`);
const getCartMembersRef = (cartId) => ref(db, `${CARTS_PATH}/${cartId}/members`);
const getCartHistoryRef = (cartId) => ref(db, `${CARTS_PATH}/${cartId}/history`);

// Initialize function
function initializeFirebase() {
  console.log('Firebase initialized successfully');
  return { app, db };
}

module.exports = {
  db,
  ref,
  set,
  onValue,
  push,
  remove,
  getCartRef,
  getCartItemsRef,
  getCartMembersRef,
  getCartHistoryRef,
  initializeFirebase
};