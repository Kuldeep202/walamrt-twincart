document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let currentCartId = null;
  let currentUsername = null;

  const usernameInput = document.getElementById('username');
  const cartIdInput = document.getElementById('cart-id');
  const joinCartBtn = document.getElementById('join-cart');
  const createCartBtn = document.getElementById('create-cart');
  const itemNameInput = document.getElementById('item-name');
  const itemPriceInput = document.getElementById('item-price');
  const addItemBtn = document.getElementById('add-item');
  const cartList = document.getElementById('cart-list');
  const membersList = document.getElementById('members-list');
  const historyList = document.getElementById('history-list');
  const cartTotal = document.getElementById('cart-total');
  const shareLinkBtn = document.getElementById('share-link');
  const shareLinkInput = document.getElementById('share-link-input');

  createCartBtn.addEventListener('click', createCart);
  joinCartBtn.addEventListener('click', joinCart);
  addItemBtn.addEventListener('click', addItem);
  shareLinkBtn.addEventListener('click', copyShareLink);

  function createCart() {
    currentUsername = usernameInput.value.trim();
    if (!currentUsername) {
      alert('Please enter your name');
      return;
    }
    socket.emit('createCart', currentUsername, ({ success, cartId, error }) => {
      if (success) {
        currentCartId = cartId;
        cartIdInput.value = cartId;
        updateShareLink();
        alert(`Cart created! Share this ID: ${cartId}`);
      } else {
        alert(`Error: ${error}`);
      }
    });
  }

  function joinCart() {
    currentUsername = usernameInput.value.trim();
    currentCartId = cartIdInput.value.trim();

    if (!currentUsername || !currentCartId) {
      alert('Please enter both your name and cart ID');
      return;
    }

    socket.emit('joinCart', {
      cartId: currentCartId,
      username: currentUsername
    }, ({ success, cart, error }) => {
      if (success) {
        updateShareLink();
        const items = Object.values(cart.items || {});
        const members = Object.values(cart.members || {}).map(m => m.username);
        updateMembersList(members);
        updateCartItems(items);
        calculateTotal();
      } else {
        alert(`Error: ${error}`);
      }
    });
  }

  function addItem() {
    const name = itemNameInput.value.trim();
    const price = parseFloat(itemPriceInput.value);

    // ✅ Ensure currentUsername is set from input if needed
    if (!currentUsername) {
      currentUsername = usernameInput.value.trim();
    }

    if (!currentUsername) {
      alert('Please enter your name before adding items');
      return;
    }

    if (!name || isNaN(price)) {
      alert('Please enter valid item name and price');
      return;
    }

    socket.emit('addItem', {
      cartId: currentCartId,
      item: { name, price, addedBy: currentUsername }
    }, ({ success, item, error }) => {
      if (success) {
        handleItemAdded(item);
      } else {
        alert(`Error: ${error}`);
      }
    });

    itemNameInput.value = '';
    itemPriceInput.value = '';
  }

  function handleItemAdded(item) {
    const li = document.createElement('li');
    li.dataset.id = item.id;
    li.innerHTML = `
      <span class="item-name">${item.name}</span>
      <span class="item-price">$${item.price.toFixed(2)}</span>
      <span class="added-by">Added by: ${item.addedBy}</span>
      ${item.addedBy === currentUsername ? 
        `<button class="remove-item" data-id="${item.id}">×</button>` : ''}
    `;
    cartList.appendChild(li);

    const removeBtn = li.querySelector('.remove-item');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        socket.emit('removeItem', {
          cartId: currentCartId,
          itemId: item.id,
          username: currentUsername
        }, ({ success, error }) => {
          if (!success) alert(`Error: ${error}`);
        });
      });
    }

    addHistoryEntry(`${item.addedBy} added ${item.name} ($${item.price.toFixed(2)})`);
    calculateTotal();
  }

  function updateMembersList(members) {
    membersList.innerHTML = '';
    members.forEach(member => {
      const li = document.createElement('li');
      li.textContent = member;
      membersList.appendChild(li);
    });
  }

  function updateCartItems(items) {
    cartList.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.dataset.id = item.id;
      li.innerHTML = `
        <span class="item-name">${item.name}</span>
        <span class="item-price">$${item.price.toFixed(2)}</span>
        <span class="added-by">Added by: ${item.addedBy}</span>
        ${item.addedBy === currentUsername ? 
          `<button class="remove-item" data-id="${item.id}">×</button>` : ''}
      `;
      cartList.appendChild(li);

      const removeBtn = li.querySelector('.remove-item');
      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          socket.emit('removeItem', {
            cartId: currentCartId,
            itemId: item.id,
            username: currentUsername
          }, ({ success, error }) => {
            if (!success) alert(`Error: ${error}`);
          });
        });
      }
    });
  }

  function calculateTotal() {
    const items = Array.from(document.querySelectorAll('#cart-list li'));
    const total = items.reduce((sum, item) => {
      const priceText = item.querySelector('.item-price').textContent;
      const price = parseFloat(priceText.replace('$', ''));
      return sum + price;
    }, 0);
    cartTotal.textContent = `$${total.toFixed(2)}`;
  }

  function addHistoryEntry(message) {
    const li = document.createElement('li');
    li.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    historyList.appendChild(li);
    historyList.scrollTop = historyList.scrollHeight;
  }

  function updateShareLink() {
    if (currentCartId) {
      const shareLink = `${window.location.origin}?cart=${currentCartId}`;
      shareLinkInput.value = shareLink;
    }
  }

  function copyShareLink() {
    shareLinkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
  }

  function handleError(message) {
    alert(`Error: ${message}`);
  }

  // Check for cart ID in URL
  const urlParams = new URLSearchParams(window.location.search);
  const cartIdFromUrl = urlParams.get('cart');
  if (cartIdFromUrl) {
    cartIdInput.value = cartIdFromUrl;
  }
});
