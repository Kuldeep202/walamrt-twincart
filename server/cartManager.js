const { v4: uuidv4 } = require('uuid');
const {
  getCartRef,
  getCartItemsRef,
  getCartMembersRef,
  getCartHistoryRef,
  set,
  push,
  remove,
  onValue,
  db
} = require('./database');

class CartManager {
  constructor(io) {
    this.io = io;
    this.activeCarts = new Map();
  }

  async createCart(ownerName) {
    const cartId = uuidv4();
    const timestamp = Date.now();

    const cartData = {
      id: cartId,
      owner: ownerName,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'active'
    };

    await set(getCartRef(cartId), cartData);
    await this.addCartMember(cartId, ownerName);

    this.setupCartListeners(cartId);
    return cartId;
  }

  async addCartMember(cartId, username) {
    const memberRef = push(getCartMembersRef(cartId));
    await set(memberRef, {
      username,
      joinedAt: Date.now()
    });
    await this.addHistoryEntry(cartId, `${username} joined the cart`);
  }

  async addCartItem(cartId, itemData) {
    const itemRef = push(getCartItemsRef(cartId));
    const itemId = itemRef.key;
    
    const completeItem = {
      id: itemId,
      ...itemData,
      addedAt: Date.now()
    };

    await set(itemRef, completeItem);
    await this.addHistoryEntry(
      cartId, 
      `${itemData.addedBy} added ${itemData.name} ($${itemData.price.toFixed(2)})`
    );

    return completeItem;
  }

  async removeCartItem(cartId, itemId, username) {
    const itemRef = ref(db, `${CARTS_PATH}/${cartId}/items/${itemId}`);
    await remove(itemRef);
    await this.addHistoryEntry(cartId, `${username} removed an item`);
  }

  async addHistoryEntry(cartId, message) {
    const historyRef = push(getCartHistoryRef(cartId));
    await set(historyRef, {
      message,
      timestamp: Date.now()
    });
  }

  setupCartListeners(cartId) {
    if (this.activeCarts.has(cartId)) return;

    const cartSocketRoom = `cart_${cartId}`;
    this.activeCarts.set(cartId, cartSocketRoom);

    // Items listener
    onValue(getCartItemsRef(cartId), (snapshot) => {
      const items = snapshot.val() || {};
      this.io.to(cartSocketRoom).emit('cartItemsUpdate', items);
    });

    // Members listener
    onValue(getCartMembersRef(cartId), (snapshot) => {
      const members = snapshot.val() || {};
      this.io.to(cartSocketRoom).emit('cartMembersUpdate', members);
    });

    // History listener
    onValue(getCartHistoryRef(cartId), (snapshot) => {
      const history = snapshot.val() || {};
      this.io.to(cartSocketRoom).emit('cartHistoryUpdate', history);
    });
  }

  async getCartSummary(cartId) {
    return new Promise((resolve) => {
      onValue(getCartRef(cartId), (snapshot) => {
        resolve(snapshot.val());
      }, { onlyOnce: true });
    });
  }

  async validateCart(cartId) {
    const cart = await this.getCartSummary(cartId);
    return !!cart;
  }
}

module.exports = CartManager;