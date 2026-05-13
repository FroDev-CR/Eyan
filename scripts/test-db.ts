import { config } from "dotenv";
config({ path: ".env.local" });
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
console.log("URI presente:", !!uri);
console.log("URI prefijo:", uri?.slice(0, 30));

if (!uri) {
  console.error("FALTA MONGODB_URI");
  process.exit(1);
}

(async () => {
  try {
    console.log("Conectando...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log("OK conectado");
    const dbs = await mongoose.connection.db?.admin().listDatabases();
    console.log("DBs:", dbs?.databases?.map((d: { name: string }) => d.name));
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error("FALLO:", e);
    process.exit(1);
  }
})();
