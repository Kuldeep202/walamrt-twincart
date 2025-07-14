const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const CartManager = require('./cartManager');
const { initializeFirebase, db, ref, set } = require('./database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Firebase
initializeFirebase();
const cartManager = new CartManager(io);

// Socket.io connections
io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  socket.on('createCart', async (username, callback) => {
    try {
      const cartId = await cartManager.createCart(username);
      socket.join(`cart_${cartId}`);
      callback({ success: true, cartId });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('joinCart', async ({ cartId, username }, callback) => {
    try {
      const isValid = await cartManager.validateCart(cartId);
      if (!isValid) throw new Error('Invalid cart ID');

      await cartManager.addCartMember(cartId, username);
      socket.join(`cart_${cartId}`);

      const cartSummary = await cartManager.getCartSummary(cartId);
      callback({ 
        success: true, 
        cart: cartSummary 
      });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('addItem', async ({ cartId, item }, callback) => {
    try {
      console.log("Received addItem:", item);

      if (!cartId || !item || !item.name || item.price == null || !item.addedBy) {
        return callback({ success: false, error: 'Missing item fields' });
      }

      const itemId = uuidv4();
      const itemWithId = {
        ...item,
        id: itemId,
        addedAt: Date.now()
      };

      await set(ref(db, `carts/${cartId}/items/${itemId}`), itemWithId);
      await cartManager.addHistoryEntry(cartId, `${item.addedBy} added ${item.name} ($${item.price.toFixed(2)})`);

      io.to(`cart_${cartId}`).emit('cartItemsUpdate', {
        [itemId]: itemWithId
      });

      callback({ success: true, item: itemWithId });
    } catch (error) {
      console.error("Error adding item:", error.message);
      callback({ success: false, error: error.message });
    }
  });

  socket.on('removeItem', async ({ cartId, itemId, username }, callback) => {
    try {
      const isValid = await cartManager.validateCart(cartId);
      if (!isValid) throw new Error('Invalid cart ID');

      await cartManager.removeCartItem(cartId, itemId, username);
      callback({ success: true });
    } catch (error) {
      callback({ success: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
  });
});

// REST API endpoint
app.get('/api/cart/:id', async (req, res) => {
  try {
    const cart = await cartManager.getCartSummary(req.params.id);
    if (!cart) return res.status(404).json({ error: 'Cart not found' });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
