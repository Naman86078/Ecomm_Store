require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

async function createAdmin() {
    // Database se connect karo
    await mongoose.connect(process.env.MONGODB_URI);

    // Chota schema banaya sirf isi script ke liye
    const AdminSchema = new mongoose.Schema({
        email: String,
        password: String,
        name: String,
    });

    const Admin = mongoose.models.Admin || mongoose.model("Admin", AdminSchema);

    // Check karo pehle se admin hai kya
    const existingAdmin = await Admin.findOne({ email: "kumar28naman@gmail.com" });
    if (existingAdmin) {
        console.log("Admin pehle se bana hua hai!");
        process.exit();
    }

    // Password ko lock karo (encrypt)
    const hashedPassword = await bcrypt.hash("palak@2004", 10);

    // Naya admin database me save karo
    await Admin.create({
        email: "kumar28naman@gmail.com",
        password: hashedPassword,
        name: "Admin",
    });

    console.log("Admin ban gaya!");
    console.log("Email: kumar28naman@gmail.com");
    console.log("Password: palak@2004");
    process.exit();
}

createAdmin();