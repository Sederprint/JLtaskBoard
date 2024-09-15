// contacts.js
import { db } from "./key.js";
import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

async function fetchContacts() {
  try {
    const contactsCollection = collection(db, "Contacts");
    const contactsSnapshot = await getDocs(contactsCollection);
    const contactsData = contactsSnapshot.docs.map((doc) => doc.data());

    // Store the contacts data in an object
    const contactsObject = {};
    contactsData.forEach((contact) => {
      contactsObject[contact.name] = {
        email: contact.email,
        phone: contact.phone,
      };
    });

    return contactsObject;
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return null;
  }
}

export { fetchContacts };
