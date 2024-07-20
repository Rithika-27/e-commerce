const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());

// Database connection with MongoDB
mongoose.connect("mongodb+srv://Rithika-27:Rithika.m27@cluster0.qlq54vi.mongodb.net/e_commerce1", {
    tls: true,
    ssl: true,
    tlsInsecure: true,
}).then(() => {
    console.log("Database connected successfully");
}).catch((error) => {
    console.error("Database connection failed:", error);
});

// API creation
app.get("/", (req, res) => {
    res.send("Express is running");
});

// Image storage engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

app.use('/images', express.static('upload/images'));

// Upload endpoint
app.post('/upload', upload.single('product'), (req, res) => {
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    });
});

// Schema for creating products
const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        required: true,
    }
});

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    } else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
        available: true,
    });
    console.log(product);
    await product.save();
    console.log("saved");
    res.json({
        success: true,
        name: req.body.name,
    });
});

// Creating API for deleting products
app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({ id: req.body.id });
    console.log("removed");
    res.json({
        success: true,
        name: req.body.name
    });
});

// Creating API for getting all products
app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("all products fetched");
    res.send(products);
});

// Schema for User model
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        unique: true,
        required: true,
    },
    password: {
        type: String,
        required: true,
    },
    cartData: {
        type: Object,
        default: {}
    },
    date: {
        type: Date,
        default: Date.now,
    }
});

const User = mongoose.model('User', UserSchema);

// Creating endpoint for user registration
app.post('/signup', async (req, res) => {
    try {
        // Check if the user already exists
        let check = await User.findOne({ email: req.body.email });
        if (check) {
            return res.status(400).json({
                success: false,
                errors: "User already exists"
            });
        }

        // Initialize cart data
        let cart = {};
        for (let i = 0; i < 300; i++) {
            cart[i] = 0;
        }

        // Create new user
        const user = new User({
            name: req.body.username,
            email: req.body.email,
            password: req.body.password,
            cartData: cart,
        });

        await user.save();

        // Create JWT token
        const data = {
            user: {
                id: user.id
            }
        };
        const token = jwt.sign(data, 'secret_ecom', { expiresIn: '1h' });

        res.json({ success: true, token });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

//creating endpoint for userlogin
app.post('/login',async(req,res)=>{
    let user=await User.findOne({email:req.body.email});
    if(user){
        const passCompare=req.body.password==user.password;
        if(passCompare){

            const data={
                user:{
                    id:user.id
                }
            }
            const token=jwt.sign(data,'secret_ecom');
            res.json({success:true,token});

        }
        else{
            res.json({success:false,errors:"wrong password"});
        }
    }
    else{
        res.json({success:false,errors:"wrong mail"});
    }
})
//creating endpoint for newcollection data
app.get('/newcollection',async(req,res)=>{
    let products = await Product.find({});
    let newcollection=products.slice(1).slice(-8);
    console.log("newcollection");
    res.send(newcollection);

})
//creating popular in women
app.get('/popularinwomen',async(req,res)=>{
    let products=await Product.find({category:"women"});
    let popular=products.slice(0,4);
    console.log("popular in women");
    res.send(popular)
})
//creating middleware to fetch user
const fetchUser=async(req,res,next)=>{
    const token=req.header('auth-token');
    if(!token){
        res.status(401).send({errors:"error"});

    }
    else{
        try{
            const data=jwt.verify(token,'secret_ecom');
            req.user=data.user;
            next();

        }catch(error){
            res.status(401).send({errors:"error"});

        }
    }

}

//creating for cart
app.post('/addtocart',fetchUser,async(req,res)=>{
    let userData= await UserSchema.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId]+=1;
    await UserSchema.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("added")
    // console.log(req.body);

})


// Start the server
app.listen(port, (error) => {
    if (!error) {
        console.log("Server running on port " + port);
    } else {
        console.error("Error: " + error);
    }
});
