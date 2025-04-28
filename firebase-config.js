// Importa as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBTCO4oWoellikX8ZHFa4DtVwgfNpKmU04",
    authDomain: "walletpessoal.firebaseapp.com",
    databaseURL: "https://walletpessoal-default-rtdb.firebaseio.com",
    projectId: "walletpessoal",
    storageBucket: "walletpessoal.firebasestorage.app",
    messagingSenderId: "462718027395",
    appId: "1:462718027395:web:468f10c76db8bc0417bdb6",
    measurementId: "G-PC0MGYDT14"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o banco de dados
const database = getDatabase(app);

// Inicializa o Analytics (opcional)
const analytics = getAnalytics(app);

export { database, analytics };
