export interface OfflineOrder {
  id: string;
  payload: any;
  basketDetails: {
    name_pl: string;
    name_en: string;
    quantity: number;
    price: number;
  }[];
  locale: string;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
}

const DB_NAME = 'namaste-pwa-db';
const STORE_NAME = 'offline-orders';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in the browser'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveOfflineOrder(
  payload: any,
  basketDetails: any[],
  locale: string
): Promise<string> {
  const id = `order_${Date.now()}`;
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const order: OfflineOrder = {
      id,
      payload,
      basketDetails,
      locale,
      createdAt: Date.now(),
      status: 'pending',
    };

    const request = store.add(order);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingOrders(): Promise<OfflineOrder[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const allOrders = request.result as OfflineOrder[];
      const pendingOrders = allOrders.filter(o => o.status === 'pending');
      resolve(pendingOrders);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOrder(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateOrderStatus(
  id: string,
  status: 'pending' | 'syncing' | 'failed'
): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const order = getRequest.result as OfflineOrder;
      if (!order) {
        reject(new Error(`Order with ID ${id} not found in IndexedDB`));
        return;
      }

      order.status = status;
      const updateRequest = store.put(order);

      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}
