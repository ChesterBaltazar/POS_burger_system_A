import mongoose from "mongoose";
// For Burger Buns
// const Burgerschema = new mongoose.Schema({
//    name: { type: String, required: true, unique: true }
// });
// For Burger Patties
// const Pattieschema = new mongoose.Schema({
//     name: { type: String, required: true, unique: true }
// });
// export default mongoose.model("Burger_bun", "Burger_Patties", Burgerschema);

// -------------------------------------------------------------------------------------------------------------------------------

// For Burger Buns
const Burgerschema = new mongoose.Schema({
   name: { type: String, required: true, unique: true },
   quantity: { type: Number, required: true}
});

// For Burger Patties
const Pattieschema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    quantity: { type: Number, required: true}
});

const BurgerBun = mongoose.model("Burger_bun", Burgerschema);
const BurgerPatty = mongoose.model("Burger_pattie", Pattieschema);

export { BurgerBun, BurgerPatty };
