import { CATALOG, PRODUCT_BY_ID } from './catalog.mjs';
export { CATALOG };

export const SAVE_VERSION = 1;
export const MAX_QUANTITY = 12;
export const MAX_CART_COUNT = 24;
const MAX_HISTORY = 64;
const MAX_ORDERS = 1000;
const MAX_TOKENS = 10000;
const pagePattern = /^[a-zA-Z0-9:._-]{1,80}$/;
const phoneModes = ['stowed', 'held', 'focused'];
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
const keysAre = (value, keys) => plain(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const isPage = value => typeof value === 'string' && pagePattern.test(value) && !['__proto__', 'constructor', 'prototype'].includes(value);
const isQuantity = value => Number.isSafeInteger(value) && value >= 1 && value <= MAX_QUANTITY;
const isToken = value => typeof value === 'string' && value.length >= 1 && value.length <= 120;
const product = id => typeof id === 'string' && Object.hasOwn(PRODUCT_BY_ID, id) ? PRODUCT_BY_ID[id] : null;
const accepted = state => ({ state, ok: true });
const refused = (state, reason) => ({ state, ok: false, reason });

export function createState() {
  return {
    version: SAVE_VERSION,
    cart: [], orders: [], nextOrderId: 1, readMessage: false,
    page: 'home', history: [], draftQuantity: 1, phone: 'stowed',
    settings: { reopen: 'home', enhanced: true, volume: 0.35, language: 'fr' },
    scroll: {}, usedTokens: []
  };
}

export function cartTotal(state) {
  return state.cart.reduce((sum, line) => sum + product(line.productId).price * line.quantity, 0);
}

export function cartCount(state) {
  return state.cart.reduce((sum, line) => sum + line.quantity, 0);
}

function validLines(lines, ordered = false) {
  if (!Array.isArray(lines) || lines.length > CATALOG.length) return false;
  const ids = new Set();
  let count = 0;
  for (const line of lines) {
    if (!keysAre(line, ordered ? ['productId', 'quantity', 'unitPrice'] : ['productId', 'quantity'])) return false;
    const entry = product(line.productId);
    if (!entry || entry.locked || !isQuantity(line.quantity) || ids.has(line.productId)) return false;
    if (ordered && line.unitPrice !== entry.price) return false;
    count += line.quantity;
    ids.add(line.productId);
  }
  return count <= MAX_CART_COUNT;
}

export function validateState(state) {
  try {
    if (!keysAre(state, ['version', 'cart', 'orders', 'nextOrderId', 'readMessage', 'page', 'history', 'draftQuantity', 'phone', 'settings', 'scroll', 'usedTokens'])) return false;
    if (state.version !== SAVE_VERSION || !validLines(state.cart) || !Number.isSafeInteger(state.nextOrderId) || state.nextOrderId < 1) return false;
    if (typeof state.readMessage !== 'boolean' || !isPage(state.page) || !isQuantity(state.draftQuantity) || !phoneModes.includes(state.phone)) return false;
    if (!Array.isArray(state.history) || state.history.length > MAX_HISTORY || !state.history.every(isPage)) return false;
    if (!keysAre(state.settings, ['reopen', 'enhanced', 'volume', 'language'])) return false;
    if (!['last', 'home'].includes(state.settings.reopen) || typeof state.settings.enhanced !== 'boolean' || !['fr', 'en'].includes(state.settings.language)) return false;
    if (!Number.isFinite(state.settings.volume) || state.settings.volume < 0 || state.settings.volume > 1) return false;
    if (!plain(state.scroll) || Object.keys(state.scroll).length > 128) return false;
    if (!Object.entries(state.scroll).every(([page, value]) => isPage(page) && Number.isFinite(value) && value >= 0 && value <= 1000000)) return false;
    if (!Array.isArray(state.usedTokens) || state.usedTokens.length > MAX_TOKENS || !state.usedTokens.every(isToken) || new Set(state.usedTokens).size !== state.usedTokens.length) return false;
    if (!Array.isArray(state.orders) || state.orders.length > 1) return false;
    let priorId = 0;
    for (const order of state.orders) {
      if (!keysAre(order, ['id', 'lines', 'total', 'status']) || !Number.isSafeInteger(order.id) || order.id !== priorId + 1 || order.id >= state.nextOrderId) return false;
      if (order.status !== 'awaiting-payment' || !validLines(order.lines, true) || order.lines.length === 0) return false;
      if (order.total !== order.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)) return false;
      priorId = order.id;
    }
    return state.nextOrderId === priorId + 1;
  } catch {
    return false;
  }
}

function navigate(state, page, push = true) {
  if (!isPage(page)) return refused(state, 'invalid-page');
  if (state.page === page) return accepted(state);
  return accepted({ ...state, page, history: push ? [...state.history, state.page].slice(-MAX_HISTORY) : state.history });
}

function tokenCheck(state, token) {
  if (!isToken(token)) return 'invalid-token';
  if (state.usedTokens.includes(token)) return 'duplicate-action';
  if (state.usedTokens.length >= MAX_TOKENS) return 'session-limit';
  return null;
}

export function dispatch(state, action) {
  if (!validateState(state)) return refused(state, 'invalid-state');
  if (!plain(action) || typeof action.type !== 'string') return refused(state, 'invalid-action');
  switch (action.type) {
    case 'NAVIGATE': return navigate(state, action.page);
    case 'BACK': {
      if (!state.history.length) return accepted(state);
      return accepted({ ...state, page: state.history.at(-1), history: state.history.slice(0, -1) });
    }
    case 'HOME': return accepted({ ...state, page: 'home', history: [] });
    case 'PHONE': {
      if (!phoneModes.includes(action.mode)) return refused(state, 'invalid-phone-mode');
      if (state.phone === action.mode) return accepted(state);
      const opening = state.phone === 'stowed' && action.mode !== 'stowed';
      return accepted({ ...state, phone: action.mode, ...(opening && state.settings.reopen === 'home' ? { page: 'home', history: [] } : {}) });
    }
    case 'READ_MESSAGE': return accepted(state.readMessage ? state : { ...state, readMessage: true });
    case 'QUANTITY': {
      if (!isQuantity(action.quantity)) return refused(state, 'invalid-quantity');
      return accepted({ ...state, draftQuantity: action.quantity });
    }
    case 'ADD': {
      const entry = product(action.productId);
      if (!entry) return refused(state, 'unknown-product');
      if (entry.locked) return refused(state, 'locked');
      if (!isQuantity(action.quantity)) return refused(state, 'invalid-quantity');
      const tokenError = tokenCheck(state, action.token);
      if (tokenError) return refused(state, tokenError);
      const existing = state.cart.find(line => line.productId === entry.id);
      if ((existing?.quantity ?? 0) + action.quantity > MAX_QUANTITY || cartCount(state) + action.quantity > MAX_CART_COUNT) return refused(state, 'cart-limit');
      const cart = existing ? state.cart.map(line => line.productId === entry.id ? { ...line, quantity: line.quantity + action.quantity } : line) : [...state.cart, { productId: entry.id, quantity: action.quantity }];
      return accepted({ ...state, cart, usedTokens: [...state.usedTokens, action.token] });
    }
    case 'SET_CART_QUANTITY': {
      const existing = state.cart.find(line => line.productId === action.productId);
      if (!existing) return refused(state, 'missing-cart-line');
      if (action.quantity !== 0 && !isQuantity(action.quantity)) return refused(state, 'invalid-quantity');
      if (cartCount(state) - existing.quantity + action.quantity > MAX_CART_COUNT) return refused(state, 'cart-limit');
      const cart = action.quantity === 0 ? state.cart.filter(line => line.productId !== action.productId) : state.cart.map(line => line.productId === action.productId ? { ...line, quantity: action.quantity } : line);
      return accepted({ ...state, cart });
    }
    case 'CHECKOUT': {
      const tokenError = tokenCheck(state, action.token);
      if (tokenError) return refused(state, tokenError);
      if (!state.cart.length) return refused(state, 'empty-cart');
      // Physical settlement is outside this demo; retain the workshop's one-pending-order gate.
      if (state.orders.some(order => order.status === 'awaiting-payment')) return refused(state, 'pending-order');
      if (state.orders.length >= MAX_ORDERS || state.nextOrderId >= Number.MAX_SAFE_INTEGER) return refused(state, 'session-limit');
      const order = {
        id: state.nextOrderId,
        lines: state.cart.map(line => ({ ...line, unitPrice: product(line.productId).price })),
        total: cartTotal(state), status: 'awaiting-payment'
      };
      return accepted({ ...state, cart: [], orders: [...state.orders, order], nextOrderId: state.nextOrderId + 1, usedTokens: [...state.usedTokens, action.token] });
    }
    case 'SET_SETTING': {
      const { key, value } = action;
      const valid = key === 'reopen' ? ['last', 'home'].includes(value) : key === 'enhanced' ? typeof value === 'boolean' : key === 'volume' ? Number.isFinite(value) && value >= 0 && value <= 1 : key === 'language' ? ['fr', 'en'].includes(value) : false;
      if (!valid) return refused(state, 'invalid-setting');
      return accepted({ ...state, settings: { ...state.settings, [key]: value } });
    }
    case 'SAVE_SCROLL': {
      if (!isPage(action.page) || !Number.isFinite(action.value) || action.value < 0 || action.value > 1000000) return refused(state, 'invalid-scroll');
      if (!Object.hasOwn(state.scroll, action.page) && Object.keys(state.scroll).length >= 128) return refused(state, 'session-limit');
      return accepted({ ...state, scroll: { ...state.scroll, [action.page]: action.value } });
    }
    default: return refused(state, 'unknown-action');
  }
}

export function serialize(state) {
  if (!validateState(state)) throw new TypeError('Cannot serialize an invalid phone state.');
  return JSON.stringify(state);
}

export function restore(json) {
  try {
    if (typeof json !== 'string' || json.length > 2000000) return createState();
    const state = JSON.parse(json);
    return validateState(state) ? state : createState();
  } catch {
    return createState();
  }
}
