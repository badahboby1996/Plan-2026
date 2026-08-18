import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  writeBatch,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const status = document.querySelector('#syncStatus');
const config = window.HUSTLE_FIREBASE_CONFIG || {};
const configured = config.apiKey && !String(config.apiKey).startsWith('PASTE_') && config.projectId && !String(config.projectId).startsWith('PASTE_');

window.hustleShoppingState = {};
window.hustleShoppingReady = false;

function announce(text) {
  if (status) status.textContent = text;
}

function notify() {
  window.dispatchEvent(new CustomEvent('hustle-shopping-sync'));
}

if (!configured) {
  announce('Локален режим · добави Firebase настройките');
} else {
  try {
    const app = initializeApp(config);
    const auth = getAuth(app);
    await signInAnonymously(auth);
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
    const items = collection(db, 'hustle_family_app', 'badah', 'shopping_items');

    onSnapshot(items, { includeMetadataChanges: true }, snapshot => {
      const next = {};
      snapshot.forEach(item => {
        const data = item.data();
        if (data.checked && data.itemId) next[data.itemId] = true;
      });
      window.hustleShoppingState = next;
      window.hustleShoppingReady = true;
      announce(snapshot.metadata.fromCache ? 'Офлайн · ще се синхронизира' : 'Firebase · синхронизирано');
      notify();
    }, error => {
      console.error('Firebase shopping listener:', error);
      announce('Локален режим · провери Firebase достъпа');
    });

    const safeId = value => encodeURIComponent(value).replaceAll('%', '_');
    window.hustleShoppingSync = {
      async setItem(itemId, checked) {
        const ref = doc(items, safeId(itemId));
        if (checked) {
          await setDoc(ref, {
            itemId,
            list: itemId.split('-')[0],
            checked: true,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } else {
          await deleteDoc(ref);
        }
      },
      async resetList(list) {
        const found = await getDocs(query(items, where('list', '==', list)));
        const batch = writeBatch(db);
        found.forEach(item => batch.delete(item.ref));
        await batch.commit();
      }
    };
  } catch (error) {
    console.error('Firebase initialization:', error);
    announce('Локален режим · провери Firebase настройките');
  }
}
