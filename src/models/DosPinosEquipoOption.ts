import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Categoría personalizada de «Tipo de equipo» añadida por un coordinador.
 * Las base (Paletera, 1/2/3 ptas) viven en constants; estas son las extra
 * y se comparten globalmente entre todos los coordinadores.
 */
export interface IDosPinosEquipoOption extends Document {
  _id: mongoose.Types.ObjectId;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}

const DosPinosEquipoOptionSchema = new Schema<IDosPinosEquipoOption>(
  {
    value: { type: String, required: true, trim: true, unique: true },
  },
  { timestamps: true }
);

const DosPinosEquipoOption: Model<IDosPinosEquipoOption> =
  mongoose.models.DosPinosEquipoOption ||
  mongoose.model<IDosPinosEquipoOption>(
    "DosPinosEquipoOption",
    DosPinosEquipoOptionSchema
  );

export default DosPinosEquipoOption;
