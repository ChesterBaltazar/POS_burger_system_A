import mongoose from "mongoose";

// For Hotdog Buns
// const Hotdogbnschema = new mongoose.schema({
//    name: { type: String, required: true, unique: true }
// });

// For Hotdog
// const Hotdogschema = new mongoose.schema({
//     name: { type: String, required: true, unique: true }
// });

// export default mongoose.model("Hotdog_bun", "Hotdog", Hotdogbnschema);

//--------------------------------------------------------------------------------------------------------------------

// For Hotdog Buns
const Hotdogbnschema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true}
});

// For Hotdog
const Hotdogschema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true}
});

const HotdogBun = mongoose.model("Hotdog_bun", Hotdogbnschema);
const Hotdog = mongoose.model("Hotdog", Hotdogschema);

export { HotdogBun, Hotdog };
